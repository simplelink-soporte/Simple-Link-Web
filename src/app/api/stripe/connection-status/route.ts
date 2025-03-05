import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

// Cliente normal para empresas
const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: false
    }
  }
)

// Cliente con service role para stripe_connections
const serviceClient = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    db: {
      schema: 'public'
    }
  }
)

export async function GET(request: Request) {
  try {
    console.log('📍 Verificando estado de conexión Stripe')

    // Crear cliente de Supabase con el contexto de la solicitud
    const supabase = createRouteHandlerClient<Database>({ cookies })

    // Obtener la sesión actual
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    if (sessionError || !session) {
      console.error('❌ No se encontró sesión activa:', sessionError)
      return NextResponse.json({ 
        connected: false,
        error: 'No autenticado'
      })
    }

    const userId = session.user.id

    // Obtener la empresa del usuario actual
    const { data: empresa, error: empresaError } = await supabase
      .from('empresas')
      .select('id')
      .eq('auth_user_id', userId)
      .single()

    if (empresaError || !empresa) {
      console.error('❌ Error al obtener la empresa:', empresaError)
      return NextResponse.json({ 
        connected: false,
        error: 'Empresa no encontrada'
      })
    }

    console.log('✅ Empresa encontrada:', empresa.id)

    // Buscar la conexión de Stripe para esta empresa
    const { data: connection, error: connectionError } = await supabase
      .from('stripe_connections')
      .select('*')
      .eq('empresa_id', empresa.id)
      .single()

    if (connectionError) {
      console.error('❌ Error al verificar la conexión:', connectionError)
      return NextResponse.json({ 
        connected: false,
        error: 'Error al verificar la conexión'
      })
    }

    // Si no hay conexión
    if (!connection) {
      console.log('ℹ️ No se encontró conexión de Stripe para la empresa:', empresa.id)
      return NextResponse.json({ 
        connected: false 
      })
    }

    console.log('✅ Conexión encontrada para la empresa:', empresa.id)

    // Retornar el estado de la conexión
    return NextResponse.json({
      connected: true,
      email: connection.stripe_account_email,
      accountId: connection.stripe_account_id,
      status: connection.account_status,
      charges_enabled: connection.charges_enabled,
      payouts_enabled: connection.payouts_enabled,
      requirements: connection.requirements
    })

  } catch (error) {
    console.error('❌ Error general al verificar conexión:', error)
    return NextResponse.json({ 
      connected: false,
      error: 'Error interno del servidor'
    })
  }
} 