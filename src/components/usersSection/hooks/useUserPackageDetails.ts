"use client"

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/supabase'
import { toast } from 'sonner'
import type { UserPackage } from '../types'

interface UseUserPackageDetailsProps {
  userId: string
  empresaId: string
}

interface PackageDetails {
  id: string
  name: string
  class_count: number
  price: number
  expiration_days: number
  advance_booking_days: number
}

export interface UserPackageWithDetails {
  userPackage: UserPackage
  packageDetails: PackageDetails
}

export function useUserPackageDetails({ userId, empresaId }: UseUserPackageDetailsProps) {
  const supabase = createClientComponentClient<Database>()
  const queryClient = useQueryClient()

  // Función para obtener los detalles del paquete
  const fetchUserPackageDetails = async (): Promise<UserPackageWithDetails[]> => {
    if (!userId || !empresaId) return []

    const { data: userPackages, error: userPackagesError } = await supabase
      .from('user_packages')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')

    if (userPackagesError) {
      throw new Error('Error al obtener los paquetes del usuario')
    }

    if (!userPackages?.length) return []

    const packageIds = userPackages.map(up => up.package_id)
    const { data: packages, error: packagesError } = await supabase
      .from('packages')
      .select('*')
      .eq('empresa_id', empresaId)
      .in('id', packageIds)

    if (packagesError) {
      throw new Error('Error al obtener los detalles de los paquetes')
    }

    return userPackages.map(userPackage => {
      const packageDetails = packages.find(p => p.id === userPackage.package_id)
      if (!packageDetails) {
        console.warn(`No se encontraron detalles para el paquete con ID: ${userPackage.package_id}`)
        return null
      }
      return {
        userPackage: { ...userPackage, empresa_id: empresaId },
        packageDetails
      }
    }).filter((item): item is UserPackageWithDetails => item !== null)
  }

  // Query para obtener los detalles
  const query = useQuery({
    queryKey: ['userPackages', userId, empresaId],
    queryFn: fetchUserPackageDetails,
    enabled: Boolean(userId && empresaId)
  })

  // Mutación para eliminar un paquete
  const deletePackage = useMutation({
    mutationFn: async (userPackageId: string) => {
      const { error } = await supabase
        .from('user_packages')
        .delete()
        .eq('id', userPackageId)
        .eq('user_id', userId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userPackages', userId, empresaId] })
      toast.success('Paquete eliminado exitosamente')
    },
    onError: (error) => {
      console.error('Error al eliminar el paquete:', error)
      toast.error('Error al eliminar el paquete')
    }
  })

  return {
    ...query,
    deletePackage
  }
} 