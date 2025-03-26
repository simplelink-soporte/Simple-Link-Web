import { NextResponse } from 'next/server'
import { mercadoPagoConnectionService } from '@/services/mercadoPagoConnectionService'
import { supabase } from '@/lib/supabase'

export async function GET(
  req: Request,
  { params }: { params: { empresaId: string } }
) {
  try {
    const empresaId = params.empresaId
    
    if (!empresaId) {
      return NextResponse.json({ error: 'ID de empresa requerido' }, { status: 400 })
    }
    
    // Verificar si la empresa es de Argentina o México
    const { data: empresa, error: empresaError } = await supabase
      .from('empresas')
      .select('country')
      .eq('id', empresaId)
      .single()
      
    if (empresaError || !empresa) {
      console.error('Error al obtener información de la empresa:', empresaError)
      return NextResponse.json({ error: 'No se pudo obtener información de la empresa' }, { status: 400 })
    }
    
    // Validar país
    const countrySupported = mercadoPagoConnectionService.isCountrySupported(empresa.country)
    
    if (!countrySupported) {
      return NextResponse.json({ 
        error: 'Mercado Pago solo está disponible para empresas de Argentina o México',
        country_supported: false
      })
    }
    
    const connection = await mercadoPagoConnectionService.getConnection(empresaId)
    
    if (!connection) {
      return NextResponse.json({ 
        country_supported: true,
        connection: null
      })
    }
    
    // No retornamos tokens sensibles al cliente
    const sanitizedConnection = {
      id: connection.id,
      empresa_id: connection.empresa_id,
      mercadopago_user_id: connection.mercadopago_user_id,
      mercadopago_email: connection.mercadopago_email,
      account_status: connection.account_status,
      created_at: connection.created_at,
      updated_at: connection.updated_at
    }
    
    return NextResponse.json({
      country_supported: true,
      connection: sanitizedConnection
    })
  } catch (error) {
    console.error('Error al obtener conexión de Mercado Pago:', error)
    return NextResponse.json({ error: 'Error al obtener datos de conexión' }, { status: 500 })
  }
}
