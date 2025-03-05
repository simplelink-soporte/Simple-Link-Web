"use client"

import { createSupabaseClient } from '@/lib/supabase'
import type { Database } from '@/types/supabase'
import type { ClassPackage, PackageFeatureIcon, BranchInfo, UserPackageFromDB } from '../types/models'

interface PackageFromDB {
  id: string
  empresa_id: string
  name: string
  class_count: number
  price: number
  expiration_days: number
  advance_booking_days: number
  branch_ids: string[]
  include_private_classes: boolean
  tag: string | null
  available_payment_methods: string[]
  status: 'active' | 'inactive' | 'archived'
  empresa?: {
    id: string
    name: string
    is_active: boolean | null
  } | {
    id: string
    name: string
    is_active: boolean | null
  }[]
}

export class PackageService {
  private supabase = createSupabaseClient()

  private async getBranchesInfo(branchIds: string[]): Promise<BranchInfo[]> {
    if (!branchIds || branchIds.length === 0) return []

    try {
      const { data: sedes, error } = await this.supabase
        .from('sedes')
        .select('id, name, address, phone')
        .in('id', branchIds)
        .eq('is_active', true)

      if (error) {
        console.error('❌ Error al obtener sedes:', error.message)
        return []
      }

      return sedes.map(sede => ({
        id: sede.id,
        name: sede.name,
        address: sede.address,
        phone: sede.phone
      }))
    } catch (error) {
      console.error('❌ Error inesperado al obtener sedes:', error)
      return []
    }
  }

  private async transformPackageFromDB(dbPackage: PackageFromDB): Promise<ClassPackage> {
    // Obtener información de las sedes
    const branches = await this.getBranchesInfo(dbPackage.branch_ids)

    return {
      id: dbPackage.id,
      title: dbPackage.name,
      description: `Paquete de ${dbPackage.class_count} sesiones`,
      price: Number(dbPackage.price),
      numberOfClasses: dbPackage.class_count,
      features: [
        { icon: 'calendar' as PackageFeatureIcon, text: `${dbPackage.class_count} sesiones` },
        { icon: 'clock' as PackageFeatureIcon, text: `Validez por ${dbPackage.expiration_days} días` },
        { icon: 'check' as PackageFeatureIcon, text: dbPackage.include_private_classes ? 'Incluye sesiones privadas' : 'Solo sesiones grupales' }
      ],
      isPopular: dbPackage.tag === 'Más Elegido',
      expiration_days: dbPackage.expiration_days,
      advance_booking_days: dbPackage.advance_booking_days,
      include_private_classes: dbPackage.include_private_classes,
      available_payment_methods: dbPackage.available_payment_methods,
      branch_ids: dbPackage.branch_ids,
      branches,
      tag: dbPackage.tag,
      status: dbPackage.status
    }
  }

  async getPackages(empresaId: string): Promise<ClassPackage[]> {
    try {
      const startTime = performance.now()
      console.log('🔍 Buscando paquetes para empresa:', empresaId)

      const { data: { session }, error: sessionError } = await this.supabase.auth.getSession()
      
      if (sessionError) {
        console.error('❌ Error de sesión:', sessionError.message)
        throw new Error('Error al verificar la sesión')
      }

      if (!session) {
        console.warn('⚠️ No hay sesión activa')
        return []
      }

      // Obtener paquetes
      const { data: packages, error: packagesError } = await this.supabase
        .from('packages')
        .select(`
          *,
          empresa:empresas!packages_empresa_id_fkey (
            id,
            name,
            is_active
          )
        `)
        .eq('empresa_id', empresaId)
        .eq('status', 'active')
        .not('status', 'eq', 'archived')
        .order('price', { ascending: true })

      if (packagesError) {
        console.error('❌ Error al obtener paquetes:', packagesError.message)
        throw packagesError
      }

      if (!packages || packages.length === 0) {
        console.log('ℹ️ No se encontraron paquetes activos')
        return []
      }

      // Verificar que la empresa esté activa y filtrar paquetes
      const validPackages = packages
        .filter(pkg => pkg.empresa && (Array.isArray(pkg.empresa) ? pkg.empresa[0]?.is_active : pkg.empresa.is_active))
        .map(pkg => ({
          ...pkg,
          empresa: Array.isArray(pkg.empresa) ? pkg.empresa[0] : pkg.empresa
        })) as PackageFromDB[]

      if (validPackages.length === 0) {
        console.log('ℹ️ No hay paquetes válidos disponibles')
        return []
      }

      // Transformar los paquetes (ahora incluye la obtención de sedes)
      const transformedPackages = await Promise.all(
        validPackages.map(pkg => this.transformPackageFromDB(pkg))
      )
      
      const endTime = performance.now()
      console.log(`✨ Proceso completado en ${(endTime - startTime).toFixed(2)}ms`)
      console.log(`📦 Total paquetes: ${transformedPackages.length}`)

      return transformedPackages

    } catch (error) {
      console.error('❌ Error al obtener paquetes:', error)
      throw error
    }
  }

  private generateFeatures(config: {
    number_of_classes: number
    expiration_days: number
    include_private_classes: boolean
    advance_booking_days: number
  }) {
    return [
      { icon: 'calendar' as PackageFeatureIcon, text: `${config.number_of_classes} sesiones` },
      { icon: 'clock' as PackageFeatureIcon, text: `Validez por ${config.expiration_days} días` },
      { icon: 'check' as PackageFeatureIcon, text: config.include_private_classes ? 'Incluye sesiones privadas' : 'Solo sesiones grupales' },
      { icon: 'calendar-check' as PackageFeatureIcon, text: `Reserva con ${config.advance_booking_days} días de anticipación` }
    ]
  }

  async getPackageById(packageId: string): Promise<ClassPackage | null> {
    try {
      const { data: pkg, error } = await this.supabase
        .from('packages')
        .select('*')
        .eq('id', packageId)
        .single()

      if (error) throw error
      if (!pkg) return null

      return this.transformPackageFromDB(pkg as PackageFromDB)
    } catch (error) {
      console.error('❌ Error al obtener el paquete:', error)
      throw error
    }
  }

  async createUserPackage(packageId: string, userId: string, empresaId?: string): Promise<UserPackageFromDB | null> {
    try {
      console.log('🎁 Creando paquete de usuario...')
      
      // 1. Obtener información del paquete
      const { data: packageData, error: packageError } = await this.supabase
        .from('packages')
        .select('class_count, expiration_days')
        .eq('id', packageId)
        .single()

      if (packageError) {
        console.error('❌ Error al obtener información del paquete:', packageError.message)
        throw packageError
      }

      if (!packageData) {
        console.error('❌ No se encontró el paquete')
        return null
      }

      // 2. Calcular fecha de expiración
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + packageData.expiration_days)

      // 3. Crear el registro de user_package
      const { data: userPackage, error: createError } = await this.supabase
        .from('user_packages')
        .insert({
          user_id: userId,
          package_id: packageId,
          sessions_left: packageData.class_count,
          expires_at: expiresAt.toISOString(),
          status: 'active',
          empresa_id: empresaId
        })
        .select('*')
        .single()

      if (createError) {
        console.error('❌ Error al crear el paquete de usuario:', createError.message)
        throw createError
      }

      console.log('✅ Paquete de usuario creado exitosamente')
      return userPackage
    } catch (error) {
      console.error('❌ Error inesperado al crear el paquete de usuario:', error)
      throw error
    }
  }
} 