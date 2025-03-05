"use client"

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/supabase'
import type { ClassPackage } from '../types/models'

interface UserPackageFromDB {
  id: string
  user_id: string
  package_id: string
  sessions_left: number
  expires_at: string
  status: 'active' | 'expired' | 'cancelled'
  created_at: string
  updated_at: string
}

export class UserPackageService {
  private supabase = createClientComponentClient<Database>()

  async createUserPackage(packageData: ClassPackage, userId: string): Promise<UserPackageFromDB> {
    try {
      // Calcular la fecha de expiración
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + packageData.expiration_days)

      const { data: userPackage, error } = await this.supabase
        .from('user_packages')
        .insert({
          user_id: userId,
          package_id: packageData.id,
          sessions_left: packageData.numberOfClasses,
          expires_at: expiresAt.toISOString(),
          status: 'active'
        })
        .select()
        .single()

      if (error) throw error

      return userPackage as UserPackageFromDB
    } catch (error) {
      console.error('❌ Error al crear el paquete de usuario:', error)
      throw error
    }
  }

  async getUserActivePackages(userId: string): Promise<UserPackageFromDB[]> {
    try {
      const { data: userPackages, error } = await this.supabase
        .from('user_packages')
        .select(`
          *,
          package:packages (
            branch_ids,
            name
          )
        `)
        .eq('user_id', userId)
        .eq('status', 'active')
        .gte('expires_at', new Date().toISOString())
        .gt('sessions_left', 0)

      if (error) throw error

      return userPackages as UserPackageFromDB[]
    } catch (error) {
      console.error('❌ Error al obtener los paquetes activos del usuario:', error)
      throw error
    }
  }

  async updateSessionsLeft(userPackageId: string, newSessionsCount: number): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('user_packages')
        .update({ sessions_left: newSessionsCount })
        .eq('id', userPackageId)

      if (error) throw error
    } catch (error) {
      console.error('❌ Error al actualizar las sesiones restantes:', error)
      throw error
    }
  }
} 