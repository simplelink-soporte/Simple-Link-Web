import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

// Inicializar Stripe con la clave secreta
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
  typescript: true,
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

export async function GET(request: Request) {
  // Declarar la variable redirectUrl fuera del bloque try principal para que esté disponible en el catch exterior
  let redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL}/admin/onboarding`;
  
  try {
    console.log('📍 Iniciando proceso de callback de Stripe')
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const error = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')
    const state = searchParams.get('state') || ''
    
    // Extraer el origen del parámetro state si tiene el formato "origin:valor"
    let origin = 'onboarding'; // Valor por defecto
    if (state.includes('origin:')) {
      origin = state.split(':')[1];
    }

    console.log('📍 Parámetros de origen:', { state, origin });

    // Determinar la URL de redirección basada en el origen
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.simple-link.com';
    const cleanBaseUrl = baseUrl.replace(/\/$/, ''); // Eliminar barra final si existe
    
    redirectUrl = origin === 'settings' 
      ? `${cleanBaseUrl}/admin/dashboard/settings?tab=integrations` 
      : `${cleanBaseUrl}/admin/onboarding`

    // Crear cliente de Supabase con el contexto de la solicitud
    const supabase = createRouteHandlerClient<Database>({ cookies })

    // Obtener la sesión actual
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    if (sessionError || !session) {
      console.error('❌ No se encontró sesión activa:', sessionError)
      return NextResponse.redirect(
        `${redirectUrl}?error=no_auth`
      )
    }

    const userId = session.user.id

    console.log('📍 Parámetros recibidos:', { 
      code: code ? '***' : null,
      error,
      errorDescription,
      state,
      origin,
      redirectUrl,
      userId: userId ? '***' : null
    })

    // Si el usuario decidió volver voluntariamente, no lo tratamos como error
    if (error === 'access_denied' && errorDescription?.includes('user denied')) {
      console.log('📍 Usuario decidió volver voluntariamente')
      return NextResponse.redirect(redirectUrl)
    }

    if (error) {
      console.error('❌ Error en la autorización de Stripe:', error)
      return NextResponse.redirect(`${redirectUrl}?error=${error}`)
    }

    if (!code) {
      console.error('❌ No se recibió código de autorización')
      return NextResponse.redirect(`${redirectUrl}?error=missing_code`)
    }

    // Intercambiar el código por el token de acceso
    console.log('📍 Intercambiando código por token de acceso')
    try {
      const response = await stripe.oauth.token({
        grant_type: 'authorization_code',
        code
      })

      console.log('✅ Token de acceso obtenido:', {
        hasStripeUserId: !!response.stripe_user_id,
        scope: response.scope
      })

      if (!response.stripe_user_id) {
        throw new Error('No se recibió el ID de la cuenta de Stripe')
      }

      const connectedAccountId = response.stripe_user_id
      
      // Obtener los detalles de la cuenta conectada
      console.log('📍 Obteniendo detalles de la cuenta:', connectedAccountId)
      const account = await stripe.accounts.retrieve(connectedAccountId)

      // Obtener el ID de la empresa basado en el auth_user_id
      console.log('📍 Buscando empresa del usuario:', userId)
      const { data: empresa, error: empresaError } = await supabase
        .from('empresas')
        .select('id')
        .eq('auth_user_id', userId)
        .single()

      if (empresaError || !empresa) {
        console.error('❌ Error al obtener la empresa:', empresaError)
        return NextResponse.redirect(`${redirectUrl}?error=empresa_not_found`)
      }

      console.log('✅ Empresa encontrada:', empresa.id)

      // Primero eliminamos cualquier conexión existente
      console.log('📍 Eliminando conexiones existentes')
      const { error: deleteError } = await supabase
        .from('stripe_connections')
        .delete()
        .eq('empresa_id', empresa.id)

      if (deleteError) {
        console.error('❌ Error al eliminar conexiones existentes:', deleteError)
      }

      // Guardar los datos en Supabase
      console.log('📍 Guardando nueva conexión en Supabase')
      const { error: dbError } = await supabase
        .from('stripe_connections')
        .insert({
          empresa_id: empresa.id,
          stripe_account_id: connectedAccountId,
          stripe_account_email: account.email?.toString() || null,
          account_status: account.charges_enabled ? 'active' : 'pending',
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled,
          requirements: JSON.stringify(account.requirements || null)
        })

      if (dbError) {
        console.error('❌ Error al guardar en Supabase:', dbError)
        return NextResponse.redirect(`${redirectUrl}?error=database_error`)
      }

      console.log('✅ Conexión guardada exitosamente')
      return NextResponse.redirect(`${redirectUrl}?success=true`)

    } catch (stripeError: any) {
      console.error('❌ Error en la autenticación de Stripe:', {
        message: stripeError.message,
        type: stripeError.type,
        raw: stripeError.raw
      })
      
      const errorMessage = encodeURIComponent(stripeError.message || 'Error en la autenticación')
      return NextResponse.redirect(
        `${redirectUrl}?error=${errorMessage}`
      )
    }
  } catch (error: any) {
    console.error('❌ Error general en el callback:', error)
    return NextResponse.redirect(
      `${redirectUrl}?error=unexpected_error`
    )
  }
}