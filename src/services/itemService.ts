import { createSupabaseClient } from '@/lib/supabase'
import { type Database } from '@/types/supabase'
import { type Item, type ItemType } from '@/types/items'

const supabase = createSupabaseClient()

export const itemService = {
  async getItems(branchId?: string): Promise<Item[]> {
    try {
      let query = supabase
        .from('items')
        .select('*')
        .eq('is_active', true)

      if (branchId) {
        query = query.eq('sede_id', branchId)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error al obtener items:', error)
      throw error
    }
  },

  async getItemsByType(type: ItemType, branchId?: string): Promise<Item[]> {
    try {
      let query = supabase
        .from('items')
        .select('*')
        .eq('type', type)
        .eq('is_active', true)

      if (branchId) {
        query = query.eq('sede_id', branchId)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error al obtener items por tipo:', error)
      throw error
    }
  },

  async createItem(item: Omit<Item, 'id'>, sedeId: string) {
    try {
      console.log('📍 Iniciando creación de item:', { item, sedeId })

      if (!sedeId) throw new Error('El ID de la sede es requerido')

      // Obtener la sede y verificar empresa_id
      const { data: sede, error: sedeError } = await supabase
        .from('sedes')
        .select('id, empresa_id, name')
        .eq('id', sedeId)
        .single()

      if (sedeError) throw sedeError
      if (!sede) throw new Error('Sede no encontrada')
      if (!sede.empresa_id) throw new Error('La sede no tiene una empresa asociada')

      // Validaciones
      const { stock, defaultDuration } = this.validateItemData(item)
      const duration_pricing = this.validatePricing(item.duration_pricing || {})

      // Validar y preparar campos de depósito
      const requires_deposit = item.requires_deposit ?? false
      const deposit_amount = requires_deposit ? this.validateDepositAmount(item.deposit_amount) : null

      // Crear item
      const { data, error } = await supabase
        .from('items')
        .insert([{
          name: item.name,
          type: item.type,
          duration_pricing,
          default_duration: defaultDuration,
          stock,
          requires_deposit,
          deposit_amount,
          is_active: true,
          empresa_id: sede.empresa_id,
          sede_id: sedeId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single()

      if (error) throw error
      if (!data) throw new Error('No se pudo crear el item')

      console.log('✅ Item creado exitosamente:', data)
      return this.dbItemToAppItem(data)
    } catch (error: any) {
      console.error('❌ Error en createItem:', error)
      throw new Error(`Error al crear item: ${error.message}`)
    }
  },

  async updateItem(id: string, item: Omit<Item, 'id'>, sedeId: string) {
    try {
      console.log('📍 Iniciando actualización de item:', { id, item, sedeId })

      if (!sedeId) throw new Error('El ID de la sede es requerido')
      if (!id) throw new Error('El ID del item es requerido')

      // Validaciones
      const { stock, defaultDuration } = this.validateItemData(item)
      const duration_pricing = this.validatePricing(item.duration_pricing || {})

      // Validar y preparar campos de depósito
      const requires_deposit = item.requires_deposit ?? false
      const deposit_amount = requires_deposit ? this.validateDepositAmount(item.deposit_amount) : null

      // Obtener la sede y verificar empresa_id
      const { data: sede, error: sedeError } = await supabase
        .from('sedes')
        .select('id, empresa_id')
        .eq('id', sedeId)
        .single()

      if (sedeError) throw sedeError
      if (!sede) throw new Error('Sede no encontrada')

      // Actualizar el item
      const { data, error } = await supabase
        .from('items')
        .update({
          name: item.name,
          type: item.type,
          duration_pricing,
          default_duration: defaultDuration,
          stock,
          requires_deposit,
          deposit_amount,
          is_active: item.is_active ?? true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('sede_id', sedeId)
        .select()
        .single()

      if (error) throw error
      if (!data) throw new Error('No se pudo actualizar el item')

      console.log('✅ Item actualizado exitosamente:', data)
      return this.dbItemToAppItem(data)
    } catch (error: any) {
      console.error('❌ Error en updateItem:', error)
      throw new Error(`Error al actualizar item: ${error.message}`)
    }
  },

  async deleteItem(id: string, sedeId: string) {
    try {
      console.log('📍 Desactivando item:', { id, sedeId })

      if (!id) throw new Error('El ID del item es requerido')
      if (!sedeId) throw new Error('El ID de la sede es requerido')

      // En lugar de eliminar, actualizamos is_active a false
      const { data, error } = await supabase
        .from('items')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('sede_id', sedeId)
        .select()
        .single()

      if (error) throw error
      if (!data) throw new Error('No se pudo desactivar el item')

      console.log('✅ Item desactivado exitosamente')
      return this.dbItemToAppItem(data)
    } catch (error: any) {
      console.error('❌ Error en deleteItem:', error)
      throw new Error(`Error al desactivar item: ${error.message}`)
    }
  },

  dbItemToAppItem(dbItem: Database['public']['Tables']['items']['Row']): Item {
    return {
      id: dbItem.id,
      name: dbItem.name,
      type: dbItem.type,
      duration_pricing: dbItem.duration_pricing || {},
      default_duration: dbItem.default_duration || 60,
      stock: dbItem.stock,
      requires_deposit: dbItem.requires_deposit ?? false,
      deposit_amount: dbItem.deposit_amount,
      is_active: dbItem.is_active ?? true
    }
  },

  validateItemData(item: Omit<Item, 'id'>) {
    if (!item.name?.trim()) throw new Error('El nombre es requerido')
    if (!item.type) throw new Error('El tipo es requerido')
    if (item.stock === undefined || item.stock === null) throw new Error('El stock es requerido')
    
    const stock = Number(item.stock)
    if (isNaN(stock) || stock < 0) throw new Error('El stock debe ser un número válido no negativo')

    const defaultDuration = Number(item.default_duration) || 60
    if (isNaN(defaultDuration) || defaultDuration <= 0) {
      throw new Error('La duración por defecto debe ser un número válido mayor a 0')
    }

    return { stock, defaultDuration }
  },

  validatePricing(pricing: Record<string, number> = {}) {
    const duration_pricing: Record<string, number> = {}
    
    Object.entries(pricing).forEach(([duration, price]) => {
      const numDuration = Number(duration)
      const numPrice = Number(price)
      
      if (isNaN(numDuration) || isNaN(numPrice)) {
        throw new Error('Los precios y duraciones deben ser números válidos')
      }
      if (numPrice < 0) {
        throw new Error('Los precios no pueden ser negativos')
      }
      
      duration_pricing[numDuration] = numPrice
    })

    return duration_pricing
  },

  validateDepositAmount(amount: number | null | undefined): number | null {
    if (amount === null || amount === undefined) {
      throw new Error('El monto del depósito es requerido cuando requires_deposit es true')
    }

    const depositAmount = Number(amount)
    if (isNaN(depositAmount) || depositAmount < 0) {
      throw new Error('El monto del depósito debe ser un número válido no negativo')
    }

    return depositAmount
  }
} 