import { NextResponse } from 'next/server';
import { createInvoiceService } from '@/services/stripe-invoice.service';
import { getUserRole, isAdmin } from '@/lib/auth';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import type { Database } from '@/types/supabase';
import { Stripe } from 'stripe';

// Función auxiliar para crear un cliente en Stripe si no existe
async function createCustomerIfNeeded(
  userId: string,
  email: string | null | undefined,
  name: string | null | undefined,
  stripeAccountId: string
): Promise<string | null> {
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
      stripeAccount: stripeAccountId || undefined
    });
    
    // Crear un nuevo cliente en Stripe
    const customer = await stripe.customers.create({
      email: email || undefined,
      name: name || undefined,
      metadata: {
        userId,
        source: 'simple-link-web',
        created_at: new Date().toISOString()
      }
    });
    
    // Actualizar el ID del cliente en la base de datos
    const supabaseServerClient = createServerComponentClient<Database>({ 
      cookies
    });
    
    // Almacenar ID de cliente Stripe en la tabla stripe_customers (no en usuarios)
    try {
      // Primero, obtener la estructura de columnas de la tabla para determinar el nombre correcto
      const { data: columnInfo, error: columnError } = await supabaseServerClient
        .rpc('get_table_columns', { table_name: 'stripe_customers' });
        
      if (columnError) {
        console.error('❌ Error al obtener información de las columnas:', columnError);
        return customer.id; // Retornar el ID aunque no se pueda guardar en la BD
      }
      
      // Determinar si la columna se llama 'customer_id' o 'stripe_customer_id'
      const columnData: Record<string, string> = {
        user_id: userId
      };
      
      if (columnInfo && Array.isArray(columnInfo) && columnInfo.some((col: any) => col.column_name === 'stripe_customer_id')) {
        console.log('✅ Detectada columna: stripe_customer_id');
        columnData.stripe_customer_id = customer.id;
      } else {
        console.log('✅ Usando columna: customer_id');
        columnData.customer_id = customer.id;
      }
      
      // Verificar si existe la columna stripe_account_id
      if (columnInfo && Array.isArray(columnInfo) && columnInfo.some((col: any) => col.column_name === 'stripe_account_id')) {
        columnData.stripe_account_id = stripeAccountId || '';
      }
      
      // Insertar o actualizar el registro
      const { error } = await supabaseServerClient
        .from('stripe_customers')
        .upsert(columnData, { 
          onConflict: 'user_id' 
        });
      
      if (error) {
        console.error('❌ Error al guardar el ID de cliente en la base de datos:', error);
        // No retornar null aquí, ya tenemos el ID de cliente aunque no se guarde en BD
      }
      
      return customer.id;
    } catch (dbError) {
      console.error('❌ Error al interactuar con la base de datos:', dbError);
      // Devolver el ID aunque haya error en base de datos
      return customer.id; 
    }
  } catch (error) {
    console.error('❌ Error al crear cliente en Stripe:', error);
    return null;
  }
}

interface ClassInvoiceRequestBody {
  paymentIntentId: string;
  stripeAccountId: string;
  customerId: string;
  amount: number;
  description: string;
  customerEmail: string;
  empresaId: string;
  classId?: string;
  branchId?: string;
  paymentType: 'full' | 'deposit';
  metadata?: Record<string, string>;
  customerName?: string;
}

/**
 * Endpoint para crear facturas de Stripe para registros de clases
 * Maneja la lógica del servidor para la creación de facturas seguras
 */
export async function POST(request: Request) {
  // Generar un ID único para esta solicitud (para logging)
  const requestId = crypto.randomUUID();
  
  console.log(`🟢 [${requestId}] Nueva solicitud de factura de clase recibida`);

  try {
    // Extraer datos de la solicitud
    const body: ClassInvoiceRequestBody = await request.json();
    
    // Validar datos requeridos
    if (!body.description) {
      return NextResponse.json({ success: false, error: { message: 'Falta descripción del servicio' } }, { status: 400 });
    }
    
    // Inicializar estructura de respuesta
    let result: {
      success: boolean;
      invoiceId?: string;
      invoiceUrl?: string;
      pdfUrl?: string;
      error?: any;
    } = { success: false };

    // 1. Verificar autenticación con Supabase
    const supabaseServerClient = createServerComponentClient<Database>({ 
      cookies
    });
    
    const { data: { session } } = await supabaseServerClient.auth.getSession();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    
    // 2. Obtener los datos del cuerpo de la solicitud
    console.log('🔄 [API] Solicitud de creación de factura para clase recibida:', {
      paymentIntentId: body.paymentIntentId,
      classId: body.classId,
      paymentType: body.paymentType,
      isManualBooking: body.metadata?.is_manual_booking === 'true'
    });
    
    // Verificar si es una factura manual o una factura normal
    const isManualInvoice = body.metadata?.is_manual_booking === 'true';
    
    if (isManualInvoice) {
      // Para facturas manuales, necesitamos usar un enfoque diferente que NO dependa de PaymentIntent
      console.log('📋 [API] Creando factura manual para clase');
      console.log('🔄 [API] Usando cuenta Stripe del club:', body.stripeAccountId);
      
      try {
        // Verificar si tenemos la información del usuario directamente del cliente
        const useProvidedCustomerInfo = body.customerEmail && body.customerName;
        let userData: { id: string; email?: string; nombre?: string; } | null = null;
        
        if (!useProvidedCustomerInfo) {
          // Si no recibimos información directa, obtener desde la base de datos
          const { data, error } = await supabaseServerClient
            .from('usuarios')
            .select('id, nombre, email')
            .eq('id', body.customerId)
            .single();
          
          if (error || !data) {
            console.error('❌ [API] Error al obtener información del usuario:', error);
            return NextResponse.json({ 
              success: false, 
              error: { message: 'No se pudo obtener la información del usuario' } 
            }, { status: 400 });
          }
          
          userData = data;
        } else {
          // Usar datos proporcionados directamente
          userData = {
            id: body.customerId,
            email: body.customerEmail,
            nombre: body.customerName
          };
          console.log('✅ [API] Usando información de cliente proporcionada directamente:', userData);
        }
        
        // Verificar que tenemos un stripeAccountId válido
        if (!body.stripeAccountId) {
          console.error('❌ [API] Error: No se proporcionó un stripeAccountId válido');
          return NextResponse.json({ 
            success: false, 
            error: { message: 'Se requiere un ID de cuenta de Stripe válido' } 
          }, { status: 400 });
        }
        
        // Inicializar Stripe con la cuenta correcta
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
          apiVersion: '2025-02-24.acacia',
          stripeAccount: body.stripeAccountId // Usar la cuenta del club, no la de Simple Link
        });
        
        // Buscar o crear el cliente en Stripe directamente
        let stripeCustomerId: string | undefined;
        
        try {
          // Si tenemos email, buscar por email primero
          if (userData.email) {
            console.log('🔍 [API] Buscando cliente en Stripe por email:', userData.email);
            const customers = await stripe.customers.list({
              email: userData.email,
              limit: 1
            });
            
            if (customers.data.length > 0) {
              stripeCustomerId = customers.data[0].id;
              console.log('✅ [API] Cliente de Stripe encontrado por email:', stripeCustomerId);
            }
          }
          
          // Si no encontramos por email, buscar en stripe_customers
          if (!stripeCustomerId) {
            console.log('🔍 [API] Buscando cliente en tabla stripe_customers');
            const { data: stripeCustomerData } = await supabaseServerClient
              .from('stripe_customers')
              .select('*')
              .eq('user_id', userData.id)
              .single();
              
            if (stripeCustomerData) {
              // Intentar extraer el ID de cliente según el nombre de columna
              stripeCustomerId = 
                stripeCustomerData.stripe_customer_id || 
                stripeCustomerData.customer_id;
                
              if (stripeCustomerId) {
                console.log('✅ [API] Cliente de Stripe encontrado en base de datos:', stripeCustomerId);
              }
            }
          }
          
          // Si aún no tenemos ID de cliente, crear uno nuevo
          if (!stripeCustomerId) {
            console.log('➕ [API] Creando nuevo cliente en Stripe');
            const newCustomer = await stripe.customers.create({
              email: userData.email || undefined,
              name: userData.nombre || `Cliente ${userData.id}`,
              metadata: {
                userId: userData.id,
                source: 'simple-link-web',
                created_at: new Date().toISOString()
              }
            });
            
            stripeCustomerId = newCustomer.id;
            console.log('✅ [API] Nuevo cliente de Stripe creado:', stripeCustomerId);
            
            // Guardar ID en base de datos
            try {
              await supabaseServerClient
                .from('stripe_customers')
                .upsert({
                  user_id: userData.id,
                  // Intentar usar el nombre de columna que más probablemente exista
                  // Esto es un hack pero es mejor que fallar
                  ...(
                    await supabaseServerClient.from('stripe_customers').select('stripe_customer_id').limit(1).maybeSingle()
                    ? { stripe_customer_id: stripeCustomerId }
                    : { customer_id: stripeCustomerId }
                  )
                }, {
                  onConflict: 'user_id'
                });
            } catch (dbError) {
              console.error('⚠️ [API] Error al guardar el ID de cliente:', dbError);
              // Continuamos aunque haya error al guardar
            }
          }
        } catch (err) {
          const stripeError = err as Error;
          console.error('❌ [API] Error al interactuar con Stripe:', stripeError);
          return NextResponse.json({
            success: false,
            error: {
              message: stripeError.message || 'Error al crear o buscar el cliente en Stripe',
              details: stripeError
            }
          }, { status: 500 });
        }
        
        if (!stripeCustomerId) {
          return NextResponse.json({ 
            success: false, 
            error: { message: 'No se pudo obtener o crear el ID de cliente en Stripe' } 
          }, { status: 400 });
        }
        
        // Crear la factura directamente, sin depender de un PaymentIntent real
        const requestId = `mci_${Date.now().toString(36)}`;
        console.log(`🧾 [${requestId}] Creando factura manual para clase`);
        
        try {
          // Preparar metadatos para la factura
          const enhancedMetadata = {
            ...body.metadata,
            resource_type: 'class',
            customer_email: userData.email || '',
            customer_name: userData.nombre || '',
            is_manual_booking: 'true',
            booking_date: new Date().toISOString(),
            payment_method: 'manual'
          };
          
          // Crear una factura vacía primero
          const invoice = await stripe.invoices.create({
            customer: stripeCustomerId,
            collection_method: 'charge_automatically',
            description: body.description,
            currency: 'eur',
            metadata: enhancedMetadata
          });
          
          console.log(`✅ [${requestId}] Factura creada:`, invoice.id);
          
          // Añadir el item a la factura
          await stripe.invoiceItems.create({
            customer: stripeCustomerId,
            invoice: invoice.id,
            amount: Math.round(body.amount * 100), // Convertir a centavos
            currency: 'eur',
            description: body.description,
            metadata: enhancedMetadata
          });
          
          console.log(`✅ [${requestId}] Item añadido a la factura`);
          
          // Finalizar la factura
          const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id);
          console.log(`✅ [${requestId}] Factura finalizada`);
          
          // Marcar como pagada inmediatamente (ya que es una reserva manual)
          const paidInvoice = await stripe.invoices.pay(finalizedInvoice.id, {
            paid_out_of_band: true
          });
          
          console.log(`✅ [${requestId}] Factura marcada como pagada`);
          
          // Construir respuesta
          result = {
            success: true,
            invoiceId: paidInvoice.id,
            invoiceUrl: paidInvoice.hosted_invoice_url || undefined,
            pdfUrl: paidInvoice.invoice_pdf || undefined
          };
        } catch (invoiceError: any) {
          console.error('❌ [API] Error al crear factura:', invoiceError);
          return NextResponse.json({
            success: false,
            error: {
              message: invoiceError.message || 'Error al crear la factura',
              code: invoiceError.code || 'unknown_stripe_error',
              type: invoiceError.type || 'StripeError'
            }
          }, { status: 500 });
        }
      } catch (err) {
        console.error('❌ Error inesperado al procesar factura manual:', err);
        return NextResponse.json({ 
          success: false, 
          error: { message: 'Error inesperado al procesar la factura manual' } 
        }, { status: 500 });
      }
    } else {
      // Para facturas normales, usamos el flujo estándar
      // 3. Preparar metadatos específicos para el registro de clase
      const isDepositPayment = body.paymentType === 'deposit';
      const depositPercentage = body.metadata?.deposit_percentage || '30';
      
      // Crear una descripción legible para la factura
      // Eliminar IDs técnicos de la descripción visible para el cliente
      const readableDescription = body.description.replace(/\s-\s[a-zA-Z0-9-]+$/, '');
      
      // Usamos directamente la descripción proporcionada sin añadir prefijo "Factura:"
      // Esto evita la duplicación del nombre de la clase
      const invoiceDescription = readableDescription;
      
      // Crear metadatos mejorados siguiendo el patrón del sistema de turnos
      const enhancedMetadata = {
        ...body.metadata,
        // Información de tipo de recurso
        resource_type: 'class',
        is_class_booking: 'true',
        
        // Mantener el tipo de pago original sin sobrescribirlo
        payment_type: body.paymentType,
        
        // Información descriptiva sobre el tipo de pago
        payment_description: isDepositPayment 
          ? `Seña (${depositPercentage}%)`
          : 'Pago completo',
        
        // Otros metadatos útiles
        class_id: body.classId || 'no-class-id',
        branch_id: body.branchId || 'no-branch-id',
        empresa_id: body.empresaId,
        customer_email: body.customerEmail,
        payment_date: new Date().toISOString()
      };

      // 4. Utilizar el servicio de facturas existente (ejecutándose en el servidor)
      // Manejar diferente las facturas manuales
      result = await createInvoiceService.createAndSendInvoice({
        paymentIntentId: body.paymentIntentId,
        stripeAccountId: body.stripeAccountId,
        customerId: body.customerId,
        amount: body.amount,
        description: invoiceDescription,
        metadata: enhancedMetadata
      });
    }

    if (!result.success) {
      console.error(`❌ [API] Error al crear factura:`, result.error);
      return NextResponse.json({ 
        success: false, 
        error: result.error || { message: 'Error desconocido al crear factura' } 
      }, { status: 500 });
    }

    console.log(`✅ [API] Factura creada exitosamente:`, {
      invoiceId: result.invoiceId,
      invoiceUrl: result.invoiceUrl
    });

    return NextResponse.json({
      success: true,
      invoiceId: result.invoiceId,
      invoiceUrl: result.invoiceUrl,
      pdfUrl: result.pdfUrl
    });
  } catch (error) {
    console.error(`❌ [API] Error inesperado al crear factura para clase:`, error);
    return NextResponse.json({ 
      success: false, 
      error: {
        message: error instanceof Error ? error.message : 'Error inesperado',
        code: 'unexpected_error'
      } 
    }, { status: 500 });
  }
}
