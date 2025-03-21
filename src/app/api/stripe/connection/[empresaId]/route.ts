import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

// Crear cliente de Supabase con la clave anónima
const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: false
    }
  }
)

export async function GET(
  request: NextRequest,
  { params }: { params: { empresaId: string } }
) {
  try {
    // Asegurarse de que params es una promesa resuelta
    const empresaId = await Promise.resolve(params.empresaId)
    
    if (!empresaId) {
      console.error('❌ empresaId no proporcionado en la ruta')
      return NextResponse.json(
        { error: 'ID de empresa no proporcionado' },
        { status: 400 }
      )
    }

    console.log('📍 Buscando conexión de Stripe para empresa:', empresaId)

    // Consulta usando el cliente de Supabase
    const { data, error } = await supabase
      .from('stripe_connections')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error) {
      console.error('❌ Error al consultar stripe_connections:', error)
      
      if (error.code === 'PGRST116') {
        return NextResponse.json({
          stripeAccountId: null,
          isConnected: false,
          reason: 'no_connection_found'
        })
      }
      
      return NextResponse.json(
        { error: 'Error al verificar la conexión con Stripe' },
        { status: 500 }
      )
    }

    console.log('✅ Conexión Stripe encontrada:', {
      id: data.id,
      stripeAccountId: data.stripe_account_id,
      accountStatus: data.account_status
    })

    // Transformar los datos para que coincidan con lo que espera el frontend
    const transformedData = {
      id: data.id,
      empresa_id: data.empresa_id,
      stripe_account_id: data.stripe_account_id,
      stripe_account_email: data.stripe_account_email,
      account_status: data.account_status,
      created_at: data.created_at,
      updated_at: data.updated_at,
      account_details: {
        charges_enabled: data.charges_enabled,
        payouts_enabled: data.payouts_enabled,
        requirements: data.requirements || {
          currently_due: [],
          eventually_due: [],
          past_due: []
        }
      }
    }

    return NextResponse.json(transformedData)
  } catch (error) {
    console.error('❌ Error general al obtener la conexión de Stripe:', error)
    return NextResponse.json(
      { error: 'Error al verificar la conexión con Stripe' },
      { status: 500 }
    )
  }
} 