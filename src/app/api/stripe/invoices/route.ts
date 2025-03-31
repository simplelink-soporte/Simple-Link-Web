import { NextResponse } from 'next/server';
import { Stripe } from 'stripe';
import { supabase } from '@/lib/supabase';
import { getUserRole, isAdmin } from '@/lib/auth';
import { stripeConnectionService } from '@/services/stripeConnectionService';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import type { Database } from '@/types/supabase';

/**
 * Endpoint para obtener facturas desde Stripe
 * Usa autenticación con Supabase y obtiene la cuenta de Stripe desde la base de datos
 */
export async function GET(request: Request) {
  try {
    // 1. Verificar autenticación con Supabase usando el enfoque server-side
    const cookieStore = cookies();
    const supabaseServerClient = createServerComponentClient<Database>({ cookies: () => cookieStore });
    const { data: { session } } = await supabaseServerClient.auth.getSession();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    
    // Verificar si el usuario tiene permisos administrativos
    if (!isAdmin(session.user)) {
      return NextResponse.json({ error: 'Se requieren permisos de administrador' }, { status: 403 });
    }

    // 2. Obtener parámetros de consulta
    const url = new URL(request.url);
    const empresaId = url.searchParams.get('empresaId') || session.user.app_metadata?.empresa_id;
    const limit = url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')!) : 100;
    const status = url.searchParams.get('status') as 'draft' | 'open' | 'paid' | 'uncollectible' | 'void' | undefined;
    const customer = url.searchParams.get('customer') || undefined;
    
    if (!empresaId) {
      return NextResponse.json({ error: 'Se requiere empresaId' }, { status: 400 });
    }

    // 3. Obtener la conexión de Stripe desde la base de datos
    const connection = await stripeConnectionService.getConnection(empresaId);
    
    if (!connection) {
      return NextResponse.json({ error: 'No hay conexión de Stripe para esta empresa' }, { status: 404 });
    }
    
    if (connection.isArgentina) {
      return NextResponse.json({ 
        message: 'Empresa argentina detectada, no se utiliza Stripe', 
        invoices: []
      });
    }

    if (!connection.stripe_account_id || connection.stripe_account_id === 'no-stripe-required') {
      return NextResponse.json({ error: 'No hay cuenta de Stripe configurada' }, { status: 404 });
    }

    // 4. Inicializar Stripe con la clave secreta del servidor
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      console.error('STRIPE_SECRET_KEY no está configurada en las variables de entorno');
      return NextResponse.json({ error: 'Error de configuración del servidor' }, { status: 500 });
    }
    
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2025-02-24.acacia',
      stripeAccount: connection.stripe_account_id // Importante: usar la cuenta del club
    });

    // 5. Listar facturas
    const invoices = await stripe.invoices.list({
      limit,
      status,
      customer,
    });

    // 6. Mapear a formato interno (simplificado para la API)
    const mappedInvoices = invoices.data.map(invoice => ({
      id: invoice.id,
      invoice_number: invoice.number || `FAC-${invoice.created.toString().slice(-8)}`,
      customer_id: typeof invoice.customer === 'string' ? invoice.customer : '',
      customer_name: invoice.customer_name || (invoice.customer_email || 'Cliente'),
      date: new Date(invoice.created * 1000).toISOString(),
      due_date: invoice.due_date 
        ? new Date(invoice.due_date * 1000).toISOString() 
        : new Date(invoice.created * 1000 + 30 * 24 * 60 * 60 * 1000).toISOString(),
      amount: invoice.total / 100,
      status: invoice.status === 'paid' ? 'paid' :
              invoice.status === 'open' ? 'pending' :
              invoice.status === 'uncollectible' ? 'overdue' :
              invoice.status === 'void' ? 'cancelled' : 'pending',
      branch_id: invoice.metadata?.branch_id || '',
      created_at: new Date(invoice.created * 1000).toISOString(),
      updated_at: new Date().toISOString(),
      court_type: invoice.metadata?.court_type,
      court_time: invoice.metadata?.court_time,
      class_type: invoice.metadata?.class_type,
      stripe_hosted_url: invoice.hosted_invoice_url,
      stripe_pdf_url: invoice.invoice_pdf
    }));

    return NextResponse.json({ invoices: mappedInvoices });
  } catch (error: any) {
    console.error('Error al obtener facturas de Stripe:', error);
    return NextResponse.json({ 
      error: 'Error al obtener facturas', 
      details: error.message 
    }, { status: 500 });
  }
}
