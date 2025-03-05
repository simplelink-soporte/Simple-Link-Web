import { supabase } from '@/lib/supabase'
import { BranchFormData, BranchInsert, Branch } from '@/types/branch'

function isValidUUID(uuid: string) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

async function getEmpresaIdByUserId(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('empresas')
    .select('id')
    .eq('auth_user_id', userId)
    .single();

  if (error) throw error;
  return data?.id || null;
}

export const branchService = {
  async getBranchById(branchId: string): Promise<{ data: Branch | null, error: any }> {
    try {
      console.log('📍 Obteniendo sede por ID:', branchId)
      
      const { data, error } = await supabase
        .from('sedes')
        .select('*')
        .eq('id', branchId)
        .single()

      if (error) throw error

      if (data) {
        if (typeof data.opening_hours === 'string') {
          try {
            data.opening_hours = JSON.parse(data.opening_hours)
          } catch (e) {
            console.error('Error al parsear opening_hours:', e)
            data.opening_hours = {}
          }
        }

        if (!data.opening_hours || typeof data.opening_hours !== 'object') {
          data.opening_hours = {}
        }
      }

      console.log('✅ Sede encontrada:', data)
      return { data, error: null }
    } catch (error: any) {
      console.error('❌ Error al obtener sede:', error)
      return {
        data: null,
        error: {
          message: error.message || 'Error al obtener la sede',
          details: error.details,
          hint: error.hint
        }
      }
    }
  },

  transformFormDataToDbFormat(formData: BranchFormData, organizationId: string): BranchInsert {
    if (!organizationId) {
      throw new Error('El ID de la organización es requerido')
    }

    if (!isValidUUID(organizationId)) {
      throw new Error('El formato del ID de la organización no es válido')
    }

    const insertData: BranchInsert = {
      organization_id: organizationId,
      empresa_id: organizationId,
      name: formData.name.trim(),
      address: formData.address?.trim() || null,
      phone: formData.phone?.trim() || null,
      manager_id: formData.manager?.trim() || null,
      is_active: formData.isActive ?? true,
      opening_hours: formData.opening_hours || {},
      settings: formData.settings || {}
    }

    console.log('📍 Datos preparados para inserción/actualización:', insertData)
    return insertData
  },

  async createBranch(formData: any, userId: string): Promise<{ data: Branch | null, error: any }> {
    try {
      console.log('📍 Iniciando creación de sede para usuario:', userId)

      const empresaId = await getEmpresaIdByUserId(userId)
      if (!empresaId) {
        throw new Error('No se encontró la empresa asociada al usuario')
      }

      console.log('📍 ID de empresa encontrado:', empresaId)
      
      const branchData = {
        organization_id: empresaId,
        empresa_id: empresaId,
        name: formData.name,
        address: formData.address,
        phone: formData.phone,
        manager_id: formData.manager_id,
        is_active: formData.is_active,
        opening_hours: formData.opening_hours,
        settings: formData.settings
      }

      console.log('📍 Datos a insertar:', branchData)

      const { data, error } = await supabase
        .from('sedes')
        .insert([branchData])
        .select()
        .single()

      if (error) {
        console.error('❌ Error de Supabase al crear sede:', error)
        
        if (error.code === '23503') {
          throw new Error('Error de referencia: La empresa especificada no existe')
        } else if (error.code === '23505') {
          throw new Error('Ya existe una sede con ese nombre')
        } else {
          throw error
        }
      }

      if (!data) {
        throw new Error('No se recibieron datos después de crear la sede')
      }

      console.log('✅ Sede creada exitosamente:', data)
      return { data, error: null }
    } catch (error: any) {
      console.error('❌ Error al crear sede:', error)
      return { 
        data: null, 
        error: {
          message: error.message || 'Error al crear la sede',
          details: error.details,
          hint: error.hint
        }
      }
    }
  },

  async updateBranch(branchId: string, formData: BranchFormData, userId: string): Promise<{ data: Branch | null, error: any }> {
    try {
      console.log('📍 Iniciando actualización de sede:', { branchId, userId })
      
      const empresaId = await getEmpresaIdByUserId(userId)
      if (!empresaId) {
        throw new Error('No se encontró la empresa asociada al usuario')
      }

      console.log('📍 ID de empresa encontrado:', empresaId)
      
      // Transformar los datos al formato esperado por la base de datos
      const branchData = {
        name: formData.name.trim(),
        address: formData.address?.trim() || null,
        phone: formData.phone?.trim() || null,
        manager_id: formData.manager?.trim() || null, // Asegurarnos de que se guarde como manager_id
        is_active: formData.isActive,
        opening_hours: formData.opening_hours || {},
        settings: formData.settings || {},
        empresa_id: empresaId,
        organization_id: empresaId,
        updated_at: new Date().toISOString()
      }

      console.log('📍 Datos transformados:', branchData)

      // Primero verificamos que la sede exista y pertenezca a la empresa
      const { data: existingBranch, error: checkError } = await supabase
        .from('sedes')
        .select('*')
        .eq('id', branchId)
        .eq('empresa_id', empresaId)
        .single()

      if (checkError || !existingBranch) {
        throw new Error('No se encontró la sede o no tienes permisos para editarla')
      }

      // Realizamos la actualización
      const { data, error } = await supabase
        .from('sedes')
        .update(branchData)
        .eq('id', branchId)
        .select('*')
        .single()

      if (error) {
        console.error('❌ Error de Supabase al actualizar sede:', error)
        
        if (error.code === '23503') {
          throw new Error('Error de referencia: La empresa especificada no existe')
        } else if (error.code === '23505') {
          throw new Error('Ya existe una sede con ese nombre')
        } else {
          throw error
        }
      }

      if (!data) {
        throw new Error('No se recibieron datos después de actualizar la sede')
      }

      console.log('✅ Sede actualizada exitosamente:', data)
      return { data, error: null }
    } catch (error: any) {
      console.error('❌ Error al actualizar sede:', error)
      return { 
        data: null, 
        error: {
          message: error.message || 'Error al actualizar la sede',
          details: error.details,
          hint: error.hint
        }
      }
    }
  },

  async deleteBranch(branchId: string, userId: string): Promise<{ success: boolean, error: any }> {
    try {
      console.log('📍 Iniciando eliminación de sede:', { branchId, userId })
      
      // Primero verificamos que el usuario tenga permisos sobre la sede
      const empresaId = await getEmpresaIdByUserId(userId)
      if (!empresaId) {
        throw new Error('No se encontró la empresa asociada al usuario')
      }

      console.log('📍 ID de empresa encontrado:', empresaId)

      // Verificamos que la sede exista y pertenezca a la empresa
      const { data: existingBranch, error: checkError } = await supabase
        .from('sedes')
        .select('*')
        .eq('id', branchId)
        .eq('empresa_id', empresaId)
        .single()

      if (checkError || !existingBranch) {
        throw new Error('No se encontró la sede o no tienes permisos para eliminarla')
      }

      // Realizamos la eliminación
      const { error } = await supabase
        .from('sedes')
        .delete()
        .eq('id', branchId)
        .eq('empresa_id', empresaId)

      if (error) {
        console.error('❌ Error de Supabase al eliminar sede:', error)
        throw error
      }

      console.log('✅ Sede eliminada exitosamente')
      return { success: true, error: null }
    } catch (error: any) {
      console.error('❌ Error al eliminar sede:', error)
      return { 
        success: false, 
        error: {
          message: error.message || 'Error al eliminar la sede',
          details: error.details,
          hint: error.hint
        }
      }
    }
  }
} 