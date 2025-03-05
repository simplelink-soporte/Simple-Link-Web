"use client"

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/supabase'
import { StripeService } from './stripeService'

export class UserService {
  private supabase = createClientComponentClient<Database>()
  private stripeService = new StripeService()

  async createOrGetUser(authUser: {
    id: string
    email: string
    user_metadata: { name?: string; full_name?: string }
  }) {
    try {
      console.log('👤 Creando o recuperando usuario:', authUser.email)

      // Primero intentamos obtener el usuario
      const { data: existingUser, error: getUserError } = await this.supabase
        .from('usuarios')
        .select('*')
        .eq('id', authUser.id)
        .single()

      if (getUserError && getUserError.code !== 'PGRST116') {
        throw getUserError
      }

      if (existingUser) {
        console.log('✅ Usuario existente encontrado:', existingUser.email)
        return existingUser
      }

      // Si no existe, lo creamos
      const { data: newUser, error: createError } = await this.supabase
        .from('usuarios')
        .insert({
          id: authUser.id,
          email: authUser.email,
          nombre: authUser.user_metadata.name || authUser.user_metadata.full_name || authUser.email,
          estado: 'activo',
          metadata: {}
        })
        .select()
        .single()

      if (createError) throw createError

      // Crear customer en Stripe
      try {
        const customerId = await this.stripeService.createCustomer({
          email: authUser.email,
          nombre: authUser.user_metadata.name || authUser.user_metadata.full_name || authUser.email,
          userId: authUser.id
        })

        // Actualizar el usuario con el customer_id
        const { error: updateError } = await this.supabase
          .from('usuarios')
          .update({ 
            client_id_stripe: customerId,
            updated_at: new Date().toISOString()
          })
          .eq('id', authUser.id)

        if (updateError) {
          console.error('❌ Error al actualizar usuario con customer_id:', updateError)
          // No lanzamos el error para no interrumpir el flujo
        } else {
          console.log('✅ Usuario actualizado con customer_id:', customerId)
        }
      } catch (stripeError) {
        console.error('❌ Error al crear customer en Stripe:', stripeError)
        // No lanzamos el error para no interrumpir el flujo
      }

      console.log('✅ Nuevo usuario creado:', newUser)
      return newUser
    } catch (error) {
      console.error('❌ Error en createOrGetUser:', error)
      throw error
    }
  }

  async createVinculacion(userId: string, empresaId: string) {
    try {
      console.log('🔗 Creando vinculación:', { userId, empresaId })

      // Verificar si ya existe una vinculación
      const { data: existingVinculacion, error: getError } = await this.supabase
        .from('vinculaciones')
        .select('*')
        .eq('user_id', userId)
        .eq('empresa_id', empresaId)
        .single()

      if (getError && getError.code !== 'PGRST116') {
        throw getError
      }

      if (existingVinculacion) {
        console.log('✅ Vinculación existente encontrada')
        return existingVinculacion
      }

      // Si no existe, creamos la vinculación
      const { data: newVinculacion, error: createError } = await this.supabase
        .from('vinculaciones')
        .insert({
          user_id: userId,
          empresa_id: empresaId,
          estado: 'activo',
          metadata: {}
        })
        .select()
        .single()

      if (createError) throw createError

      console.log('✅ Nueva vinculación creada:', newVinculacion)
      return newVinculacion
    } catch (error) {
      console.error('❌ Error en createVinculacion:', error)
      throw error
    }
  }
} 