import { customAlphabet } from 'nanoid';
import { supabaseAdmin } from '@/lib/supabase/admin';
// Importar mercadopago correctamente desde la biblioteca que tengas configurada en tu proyecto
import { mercadopago } from '@/lib/mercadopago';
// Añadir axios para llamadas API directas
import axios from 'axios';

// No necesitamos configurar aquí el token, asumimos que ya está configurado en @/lib/mercadopago

// Generador de IDs para clientes
const nanoid = customAlphabet('1234567890abcdef', 10);

/**
 * Interfaz para los datos de caché del cliente de MercadoPago
 */
interface MercadoPagoCustomerCache {
  mercadoPagoCustomerId: string;
  userId: string;
  empresaId: string;
  mercadoPagoUserId: string;
  lastUsed: string;
  status: 'active' | 'inactive';
}

/**
 * Servicio para gestionar clientes de MercadoPago
 */
class MercadoPagoCustomerService {
  /**
   * Obtiene un cliente existente o crea uno nuevo si no existe
   * @param userId ID del usuario en nuestra aplicación
   * @param empresaId ID de la empresa en nuestra aplicación
   * @param mercadoPagoUserId ID de usuario de MercadoPago del vendedor (club/empresa)
   * @param userData Datos del usuario (email, metadata) enviados desde el frontend
   * @returns Datos del cliente obtenido/creado
   */
  async getOrCreateCustomer(
    userId: string, 
    empresaId: string,
    mercadoPagoUserId: string,
    userData?: { email: string; metadata: any }
  ): Promise<MercadoPagoCustomerCache> {
    console.log('[MercadoPagoCustomerService] 🔍 Buscando cliente:', {
      userId,
      empresaId,
      mercadoPagoUserId,
      hasUserData: !!userData
    });

    try {
      // 1. Primero buscamos en nuestra BD si ya tenemos un cliente activo
      const { data: activeCustomer, error } = await supabaseAdmin
        .from('mercadopago_customers')
        .select('*')
        .match({
          user_id: userId,
          empresa_id: empresaId,
          mercadopago_user_id: mercadoPagoUserId,
          status: 'active'
        })
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('[MercadoPagoCustomerService] ❌ Error al buscar cliente:', error);
        throw error;
      }

      // Si encontramos un cliente activo, verificamos que exista en MercadoPago
      if (activeCustomer) {
        try {
          console.log('[MercadoPagoCustomerService] 🔍 Cliente encontrado, verificando en MercadoPago:', 
            activeCustomer.mercadopago_customer_id);
          
          // 2. Verificar que el cliente existe en MercadoPago usando la nueva API
          const mpCustomer = await mercadopago.customers.get({
            customerId: activeCustomer.mercadopago_customer_id
          });

          if (mpCustomer && mpCustomer.id) {
            console.log('[MercadoPagoCustomerService] ✅ Cliente validado en MercadoPago');
            
            // 3. Si no está activo en nuestra BD, reactivarlo
            if (activeCustomer.status !== 'active') {
              await supabaseAdmin
                .from('mercadopago_customers')
                .update({
                  status: 'active',
                  last_used: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                })
                .match({ id: activeCustomer.id });
              
              console.log('[MercadoPagoCustomerService] 🔄 Cliente reactivado');
            } else {
              // Solo actualizar last_used si ya está activo
              await this.updateCustomerLastUsed(activeCustomer.id);
            }

            // 4. Devolver datos del cliente
            return {
              mercadoPagoCustomerId: activeCustomer.mercadopago_customer_id,
              empresaId,
              userId,
              mercadoPagoUserId,
              lastUsed: new Date().toISOString(),
              status: 'active' as const
            };
          }
        } catch (mpError: any) {
          console.error('[MercadoPagoCustomerService] ❌ Error al verificar cliente en MercadoPago:', mpError);
          console.log('[MercadoPagoCustomerService] 🔄 El cliente no existe en MercadoPago, marcando como inactivo');
          
          // Si el cliente no existe en MercadoPago, marcarlo como inactivo
          await supabaseAdmin
            .from('mercadopago_customers')
            .update({
              status: 'inactive',
              last_payment_error: mpError.message || 'Cliente no encontrado en MercadoPago',
              updated_at: new Date().toISOString()
            })
            .match({ id: activeCustomer.id });
        }
      }

      // Si no encontramos un cliente o no es válido, creamos uno nuevo
      return await this.createNewCustomer(userId, empresaId, mercadoPagoUserId, userData);
    } catch (error) {
      console.error('[MercadoPagoCustomerService] ❌ Error inesperado:', error);
      throw error;
    }
  }

  /**
   * Actualiza la fecha de último uso de un cliente
   * @param customerId ID del cliente en nuestra BD
   */
  private async updateCustomerLastUsed(customerId: string): Promise<void> {
    try {
      await supabaseAdmin
        .from('mercadopago_customers')
        .update({
          last_used: new Date().toISOString()
        })
        .match({ id: customerId });
    } catch (error) {
      console.error('[MercadoPagoCustomerService] ❌ Error al actualizar last_used:', error);
      // No lanzamos el error, no es crítico
    }
  }

  /**
   * Busca un cliente en MercadoPago por email
   * @param email Email del cliente
   * @returns Datos del cliente o null si no existe
   */
  private async findCustomerByEmail(email: string): Promise<any | null> {
    try {
      console.log('[MercadoPagoCustomerService] 🔍 Buscando cliente por email:', email);
      
      // Usar axios para llamar directamente a la API de MercadoPago
      const response = await axios.get('https://api.mercadopago.com/v1/customers/search', {
        headers: {
          'Authorization': `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        },
        params: { email }
      });
      
      console.log('[MercadoPagoCustomerService] 📥 Resultado de búsqueda:', 
        response.data ? `Total: ${response.data.paging?.total || 0}` : 'No hay respuesta');

      // Verificar si hay resultados
      if (response.status === 200 && 
          response.data?.results && 
          response.data.results.length > 0) {
        
        console.log('[MercadoPagoCustomerService] ✅ Cliente encontrado por email, ID:', 
          response.data.results[0].id);
        
        return response.data.results[0];
      }
      
      console.log('[MercadoPagoCustomerService] ℹ️ No se encontró cliente con ese email');
      return null;
    } catch (error: any) {
      console.error('[MercadoPagoCustomerService] ❌ Error al buscar cliente por email:', {
        message: error.message,
        status: error.response?.status,
        response: error.response?.data || 'No hay datos de respuesta'
      });
      return null;
    }
  }

  /**
   * Crea un nuevo cliente en MercadoPago y lo registra en nuestra BD
   * @param userId ID del usuario en nuestra aplicación
   * @param empresaId ID de la empresa en nuestra aplicación
   * @param mercadoPagoUserId ID de usuario de MercadoPago del vendedor (club/empresa)
   * @param userData Datos del usuario (email, metadata) enviados desde el frontend
   * @returns Datos del cliente creado
   */
  private async createNewCustomer(
    userId: string, 
    empresaId: string,
    mercadoPagoUserId: string,
    userData?: { email: string; metadata: any }
  ): Promise<MercadoPagoCustomerCache> {
    console.log('[MercadoPagoCustomerService] 🆕 Iniciando creación de cliente:', {
      userId,
      empresaId,
      mercadoPagoUserId,
      hasUserData: !!userData
    });

    let mpCustomerId: string;
    let user: any = {};

    // Intentar obtener información de usuario para la creación
    if (userData && userData.email) {
      user = {
        email: userData.email,
        ...userData.metadata
      };
      
      console.log('[MercadoPagoCustomerService] ℹ️ Usando datos proporcionados desde el frontend');
    } else {
      try {
        console.log('[MercadoPagoCustomerService] 🔍 Buscando datos de usuario en BD');
        
        const { data, error } = await supabaseAdmin
          .from('auth_users')
          .select('email, first_name, last_name, metadata')
          .eq('id', userId)
          .single();
          
        if (error || !data) {
          console.error('[MercadoPagoCustomerService] ❌ Error al buscar usuario en BD:', error);
          throw new Error('Usuario no encontrado en la base de datos');
        }
        
        console.log('[MercadoPagoCustomerService] ✅ Datos de usuario obtenidos de BD');
        user = data;
      } catch (dbError) {
        console.error('[MercadoPagoCustomerService] ❌ Error al consultar BD:', dbError);
        throw new Error('Error al obtener datos del usuario');
      }
    }

    // Verificar que tenemos un email para el cliente
    if (!user.email) {
      console.error('[MercadoPagoCustomerService] ❌ No se encontró email para el usuario');
      throw new Error('Se requiere email para crear un cliente en MercadoPago');
    }

    console.log('[MercadoPagoCustomerService] 📋 Datos disponibles para crear cliente:', {
      email: user.email,
      hasFirstName: !!user.first_name,
      hasLastName: !!user.last_name
    });

    // Paso 1: Intentar buscar cliente existente por email para evitar duplicados
    try {
      const existingCustomer = await this.findCustomerByEmail(user.email);
      
      if (existingCustomer && existingCustomer.id) {
        console.log('[MercadoPagoCustomerService] ✅ Cliente encontrado por email, reutilizando:', existingCustomer.id);
        mpCustomerId = existingCustomer.id;
      } else {
        // Si no existe, crear un nuevo cliente utilizando directamente la API REST
        try {
          console.log('[MercadoPagoCustomerService] 🆕 Creando nuevo cliente en MercadoPago mediante API directa');
          
          // Preparar datos mínimos necesarios según la documentación
          const customerData = {
            email: user.email
          };
          
          // Agregar datos opcionales solo si están disponibles
          if (user.first_name) {
            Object.assign(customerData, { first_name: user.first_name });
          }
          
          if (user.last_name) {
            Object.assign(customerData, { last_name: user.last_name });
          }
          
          // Registrar payload para debugging
          console.log('[MercadoPagoCustomerService] 📤 Datos para crear cliente:', JSON.stringify(customerData, null, 2));
          
          // Llamar directamente a la API de MercadoPago en lugar de usar el SDK
          const response = await axios.post(
            'https://api.mercadopago.com/v1/customers',
            customerData,
            {
              headers: {
                'Authorization': `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
              }
            }
          );
          
          if (response.status >= 200 && response.status < 300 && response.data && response.data.id) {
            console.log('[MercadoPagoCustomerService] ✅ Cliente creado correctamente vía API directa:', {
              id: response.data.id,
              status: response.status
            });
            
            mpCustomerId = response.data.id;
            
            // Actualizar los metadatos en una operación separada
            try {
              await axios.put(
                `https://api.mercadopago.com/v1/customers/${mpCustomerId}`,
                {
                  metadata: {
                    user_id: userId,
                    empresa_id: empresaId,
                    mercadopago_user_id: mercadoPagoUserId,
                    source: 'simple_link_web',
                    created_at: new Date().toISOString()
                  }
                },
                {
                  headers: {
                    'Authorization': `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
                    'Content-Type': 'application/json'
                  }
                }
              );
              console.log('[MercadoPagoCustomerService] ✅ Metadatos actualizados correctamente');
            } catch (metadataError) {
              console.warn('[MercadoPagoCustomerService] ⚠️ No se pudieron actualizar metadatos, pero el cliente fue creado:', metadataError);
            }
          } else {
            console.error('[MercadoPagoCustomerService] ❌ Respuesta inesperada de la API:', {
              status: response.status,
              data: response.data
            });
            throw new Error(`Error al crear cliente: respuesta inesperada (${response.status})`);
          }
        } catch (apiError: any) {
          // Mejorar el registro detallado del error
          console.error('[MercadoPagoCustomerService] ❌ Error al crear cliente mediante API directa:', {
            message: apiError.message,
            response: apiError.response?.data || 'No hay datos de respuesta',
            status: apiError.response?.status || 'No hay status',
            request: apiError.request ? 'Request enviado' : 'Request no enviado'
          });
          
          // Si falló la API directa, intentar como último recurso el SDK original
          console.log('[MercadoPagoCustomerService] 🔄 Intentando como último recurso el SDK');
          try {
            // Crear customer con el SDK como último recurso
            const sdkResponse = await mercadopago.customers.create({ email: user.email } as any);
            
            if (sdkResponse && sdkResponse.id) {
              console.log('[MercadoPagoCustomerService] ✅ Cliente creado vía SDK (último recurso):', sdkResponse.id);
              mpCustomerId = sdkResponse.id;
            } else {
              throw new Error('Respuesta inválida del SDK');
            }
          } catch (sdkError: any) {
            console.error('[MercadoPagoCustomerService] ❌ Todos los intentos de crear cliente fallaron:', sdkError);
            
            const errorDetail = apiError.response?.data?.message || 
                               apiError.message || 
                               'Error desconocido';
            
            throw new Error(`Error al crear cliente en MercadoPago: ${errorDetail}`);
          }
        }
      }
    } catch (error) {
      console.error('[MercadoPagoCustomerService] ❌ Error al crear cliente:', error);
      throw error;
    }

    // 4. Registrar cliente en nuestra BD
    try {
      console.log('[MercadoPagoCustomerService] 💾 Guardando cliente en BD:', {
        user_id: userId,
        empresa_id: empresaId,
        mercadopago_user_id: mercadoPagoUserId,
        mercadopago_customer_id: mpCustomerId
      });
      
      // Primero verificamos si ya existe un registro para este cliente
      const { data: existingRecord } = await supabaseAdmin
        .from('mercadopago_customers')
        .select('id, status')
        .match({
          user_id: userId,
          empresa_id: empresaId,
          mercadopago_user_id: mercadoPagoUserId
        })
        .single();
      
      if (existingRecord) {
        console.log('[MercadoPagoCustomerService] ℹ️ Cliente ya registrado en BD, actualizando:', existingRecord.id);
        
        // Si ya existe, solo actualizamos
        const { error: updateError } = await supabaseAdmin
          .from('mercadopago_customers')
          .update({
            mercadopago_customer_id: mpCustomerId,
            status: 'active',
            last_used: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .match({ id: existingRecord.id });
        
        if (updateError) {
          console.error('[MercadoPagoCustomerService] ❌ Error al actualizar cliente en BD:', updateError);
          throw updateError;
        }
        
        console.log('[MercadoPagoCustomerService] ✅ Cliente actualizado en BD');
      } else {
        // Si no existe, lo creamos
        console.log('[MercadoPagoCustomerService] 🆕 Creando nuevo registro en BD');
        
        const { data: newCustomer, error } = await supabaseAdmin
          .from('mercadopago_customers')
          .insert({
            user_id: userId,
            empresa_id: empresaId,
            mercadopago_user_id: mercadoPagoUserId,
            mercadopago_customer_id: mpCustomerId,
            last_used: new Date().toISOString(),
            metadata: {
              mp_created_at: new Date().toISOString(),
              initial_creation: true,
              user_email: user.email
            }
          })
          .select()
          .single();

        if (error) {
          console.error('[MercadoPagoCustomerService] ❌ Error al guardar cliente en BD:', error);
          throw error;
        }

        console.log('[MercadoPagoCustomerService] ✅ Cliente registrado en BD:', newCustomer.id);
      }

      return {
        mercadoPagoCustomerId: mpCustomerId,
        empresaId,
        userId,
        mercadoPagoUserId,
        lastUsed: new Date().toISOString(),
        status: 'active'
      };
    } catch (dbError) {
      console.error('[MercadoPagoCustomerService] ❌ Error al registrar cliente en BD:', dbError);
      throw new Error(`Error al registrar cliente en base de datos: ${dbError instanceof Error ? dbError.message : 'Error desconocido'}`);
    }
  }

  /**
   * Lista las tarjetas de un cliente
   * @param customerId ID del cliente en MercadoPago
   * @returns Lista de tarjetas
   */
  async listCards(customerId: string): Promise<any[]> {
    try {
      console.log('[MercadoPagoCustomerService] 🔍 Obteniendo tarjetas del cliente:', customerId);
      
      // Usar el cliente de tarjetas para obtener la lista
      // En una versión futura se implementará
      // Por ahora devolvemos un array vacío
      return [];
    } catch (error) {
      console.error('[MercadoPagoCustomerService] ❌ Error al obtener tarjetas:', error);
      return [];
    }
  }
}

// Instancia global del servicio
export const mercadoPagoCustomerService = new MercadoPagoCustomerService();
