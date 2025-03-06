import { supabase } from '@/lib/supabase'

interface CompanyData {
  name: string
  email: string
  phone: string
  country: string
}

class OnboardingCompanyService {
  async getOrCreateCompany(userId: string) {
    if (!userId) {
      throw new Error('ID de usuario requerido')
    }

    try {
      console.log('📍 Verificando empresa existente para usuario:', userId)

      // 1. Buscar empresa existente
      const { data: existingCompany, error: searchError } = await supabase
        .from('empresas')
        .select('*')
        .eq('auth_user_id', userId)
        .single()

      if (searchError && searchError.code !== 'PGRST116') {
        console.error('Error al buscar empresa:', searchError)
        throw searchError
      }

      // Si existe, retornarla
      if (existingCompany) {
        console.log('✅ Empresa existente encontrada:', existingCompany)
        return { data: existingCompany, error: null }
      }

      // 2. Obtener el plan FREE por defecto
      const { data: freePlan, error: planError } = await supabase
        .from('subscription_plans')
        .select('id')
        .eq('code', 'FREE')
        .single()

      if (planError) {
        console.error('Error al obtener plan FREE:', planError)
        throw planError
      }

      // 3. Crear nueva empresa con los valores correctos
      console.log('📝 Creando nueva empresa para el usuario')
      
      const now = new Date().toISOString()
      const { data: newCompany, error: createError } = await supabase
        .from('empresas')
        .insert({
          name: 'Nueva Empresa',
          auth_user_id: userId,
          is_active: true,
          plan_type: 'FREE',
          plan_id: freePlan.id,
          plan_updated_at: now,
          onboarding: 'Empresa',
          created_at: now,
          updated_at: now
        })
        .select()
        .single()

      if (createError) {
        console.error('Error al crear empresa:', createError)
        throw createError
      }

      console.log('✅ Nueva empresa creada:', newCompany)
      return { data: newCompany, error: null }

    } catch (error: any) {
      console.error('Error en getOrCreateCompany:', error)
      return {
        data: null,
        error: {
          message: error.message || 'Error al obtener/crear la empresa',
          code: error.code,
          details: error.details
        }
      }
    }
  }

  async updateCompany(userId: string, data: CompanyData, empresaId?: string) {
    try {
      console.log('📍 Actualizando empresa para usuario:', userId)

      // Validaciones
      if (!data.name?.trim()) throw new Error('El nombre de la empresa es requerido')
      if (!data.email?.trim()) throw new Error('El email de la empresa es requerido')
      if (!data.phone?.trim()) throw new Error('El teléfono de la empresa es requerido')
      if (!data.country?.trim()) throw new Error('El país de la empresa es requerido')

      // Validar formato de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(data.email)) {
        throw new Error('El formato del email no es válido')
      }

      // Construir la consulta base
      let query = supabase
        .from('empresas')
        .update({
          name: data.name.trim(),
          business_name: data.name.trim(),
          email: data.email.trim(),
          phone: data.phone.trim(),
          country: data.country.trim(),
          updated_at: new Date().toISOString(),
          // No actualizamos plan_type, plan_id, ni plan_updated_at aquí
          // ya que esos campos se manejan en otro flujo
        })
      
      // Si tenemos el ID de empresa, filtrar por ID que es más eficiente
      if (empresaId) {
        query = query.eq('id', empresaId)
      } else {
        // De lo contrario, usar auth_user_id
        query = query.eq('auth_user_id', userId)
      }

      // Ejecutar la actualización
      const { data: updatedCompany, error: updateError } = await query
        .select()
        .single()

      if (updateError) {
        console.error('❌ Error al actualizar empresa:', updateError)
        throw updateError
      }

      console.log('✅ Empresa actualizada:', updatedCompany)
      return { data: updatedCompany, error: null }

    } catch (error: any) {
      console.error('❌ Error en updateCompany:', error)
      return {
        data: null,
        error: {
          message: error.message || 'Error al actualizar la empresa',
          code: error.code,
          details: error.details
        }
      }
    }
  }
}

export const onboardingCompanyService = new OnboardingCompanyService() 