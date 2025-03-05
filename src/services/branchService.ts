"use client"

import { createSupabaseClient } from '@/lib/supabase'
import type { Database } from '@/types/supabase'
import type { Branch, BranchFormData, OpeningHours } from '@/types/branch'

// Singleton instance
const supabase = createSupabaseClient('client')

function isValidUUID(uuid: string) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

export const branchService = {
  transformFormDataToDbFormat(formData: BranchFormData, organizationId: string): BranchInsert {
    if (!organizationId) {
      throw new Error('El ID de la organización es requerido')
    }

    if (!isValidUUID(organizationId)) {
      throw new Error('El formato del ID de la organización no es válido')
    }

    const opening_hours = formData.schedule.reduce((acc, day) => ({
      ...acc,
      [day.day]: {
        isOpen: day.isOpen,
        timeRanges: day.timeRanges
      }
    }), {})

    return {
      name: formData.name,
      address: formData.address,
      phone: formData.phone,
      manager_id: formData.manager || null,
      is_active: formData.isActive,
      opening_hours,
      settings: {},
      empresa_id: organizationId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  },

  async getBranches(empresaId: string) {
    try {
      console.log('📍 Obteniendo sedes para empresa:', empresaId)

      const { data, error } = await supabase
        .from('sedes')
        .select('*')
        .eq('empresa_id', empresaId)
        .eq('is_active', true)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('❌ Error al obtener sedes:', error)
        return { data: null, error }
      }

      if (!data || data.length === 0) {
        console.log('⚠️ No se encontraron sedes activas')
        return { data: [], error: null }
      }

      console.log('✅ Sedes obtenidas:', data.length)
      return { data: data as Branch[], error: null }
    } catch (error: any) {
      console.error('❌ Error en getBranches:', error)
      return { 
        data: null, 
        error: {
          message: error.message || 'Error al obtener las sedes',
          details: error.details
        }
      }
    }
  },

  async getCurrentBranch(empresaId: string) {
    try {
      const saved = localStorage.getItem(`currentBranch_${empresaId}`)
      if (!saved) return null

      const branch = JSON.parse(saved) as Branch
      return branch
    } catch (error) {
      console.error('❌ Error al obtener sede actual:', error)
      return null
    }
  },

  async setCurrentBranch(empresaId: string, branch: Branch | null) {
    try {
      if (branch) {
        localStorage.setItem(`currentBranch_${empresaId}`, JSON.stringify(branch))
      } else {
        localStorage.removeItem(`currentBranch_${empresaId}`)
      }
    } catch (error) {
      console.error('❌ Error al guardar sede actual:', error)
    }
  },

  async createBranch(formData: BranchFormData, empresaId: string): Promise<{ data: Branch | null, error: any }> {
    try {
      console.log('📍 Creando nueva sede:', { formData, empresaId })

      const branchData = {
        name: formData.name,
        address: formData.address,
        phone: formData.phone,
        manager_id: formData.manager_id,
        is_active: formData.is_active,
        opening_hours: formData.opening_hours,
        settings: formData.settings || {},
        empresa_id: empresaId
      }

      const { data, error } = await supabase
        .from('sedes')
        .insert([branchData])
        .select()
        .single()

      if (error) {
        console.error('❌ Error al crear sede:', error)
        throw error
      }

      console.log('✅ Sede creada exitosamente:', data)
      return { data, error: null }
    } catch (error: any) {
      console.error('❌ Error al crear sede:', error)
      return {
        data: null,
        error: {
          message: error.message || 'Error al crear la sede',
          details: error.details
        }
      }
    }
  },

  async updateBranch(branchId: string, formData: BranchFormData, empresaId: string): Promise<{ data: Branch | null, error: any }> {
    try {
      console.log('📍 Iniciando actualización de sede:', { branchId, formData, empresaId })

      // Validaciones básicas
      if (!branchId) {
        throw new Error('ID de sede inválido')
      }

      if (!formData.name?.trim() || !formData.address?.trim() || !formData.phone?.trim()) {
        throw new Error('Faltan campos requeridos')
      }

      // Preparar datos para Supabase
      const branchData: Partial<Branch> = {
        name: formData.name.trim(),
        address: formData.address.trim(),
        phone: formData.phone.trim(),
        manager_id: formData.manager_id,
        is_active: formData.is_active,
        opening_hours: {
          schedule: formData.opening_hours.schedule,
          timezone: formData.timezone
        },
        settings: formData.settings || {},
        empresa_id: empresaId,
        updated_at: new Date().toISOString()
      }

      console.log('📤 Datos a enviar:', JSON.stringify(branchData, null, 2))

      // Actualizar en Supabase
      const { data, error: updateError } = await supabase
        .from('sedes')
        .update(branchData)
        .eq('id', branchId)
        .eq('empresa_id', empresaId)
        .select()
        .single()

      if (updateError) {
        console.error('❌ Error en actualización:', updateError)
        throw updateError
      }

      if (!data) {
        throw new Error('No se recibieron datos de la actualización')
      }

      console.log('✅ Sede actualizada exitosamente:', data)
      return { data, error: null }

    } catch (error: any) {
      console.error('❌ Error en updateBranch:', error)
      return {
        data: null,
        error: {
          message: error.message || 'Error al actualizar la sede',
          details: error.details || error
        }
      }
    }
  },

  async deleteBranch(branchId: string): Promise<{ error: any }> {
    try {
      console.log('📍 Eliminando sede:', branchId)

      const { error } = await supabase
        .from('sedes')
        .delete()
        .eq('id', branchId)

      if (error) {
        console.error('❌ Error al eliminar sede:', error)
        throw error
      }

      console.log('✅ Sede eliminada exitosamente')
      return { error: null }
    } catch (error: any) {
      console.error('❌ Error al eliminar sede:', error)
      return {
        error: {
          message: error.message || 'Error al eliminar la sede',
          details: error.details
        }
      }
    }
  }
} 