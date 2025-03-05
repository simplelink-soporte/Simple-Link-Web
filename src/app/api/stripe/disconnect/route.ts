import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia'
})

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: false
    }
  }
)

export async function POST() {
  try {
    // Obtener la conexión actual de Stripe
    const { data: connections, error: fetchError } = await supabase
      .from('stripe_connections')
      .select('*')
      .eq('empresa_id', process.env.NEXT_PUBLIC_DEFAULT_USER_ID!)

    if (fetchError) {
      console.error('Error al obtener la conexión de Stripe:', fetchError)
      return NextResponse.json({ success: false, error: 'Error al obtener la conexión' }, { status: 500 })
    }

    const connection = connections?.[0]
    if (!connection) {
      return NextResponse.json({ success: false, error: 'No hay cuenta conectada' })
    }

    // Desvincular la cuenta de Stripe
    await stripe.oauth.deauthorize({
      client_id: process.env.NEXT_PUBLIC_STRIPE_CLIENT_ID!,
      stripe_user_id: connection.stripe_account_id
    })

    // Eliminar el registro de la base de datos
    const { error: deleteError } = await supabase
      .from('stripe_connections')
      .delete()
      .eq('empresa_id', process.env.NEXT_PUBLIC_DEFAULT_USER_ID!)

    if (deleteError) {
      console.error('Error al eliminar la conexión de Stripe:', deleteError)
      return NextResponse.json({ success: false, error: 'Error al eliminar la conexión' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error al desconectar la cuenta:', error)
    return NextResponse.json({ success: false, error: 'Error al desconectar la cuenta' }, { status: 500 })
  }
} 