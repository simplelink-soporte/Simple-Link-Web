import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { createSupabaseClient } from '@/lib/supabase'
import type { Database } from '@/types/supabase'
import { toast } from 'sonner'

type Organization = Database['public']['Tables']['empresas']['Row']

// Clave para el timestamp de la última consulta
const LAST_FETCH_KEY = 'org_last_fetch_timestamp'

// Variable para almacenar en memoria el resultado de la última consulta
let cachedOrganizationData: Organization | null = null

export default function useOrganization() {
  const { user } = useAuth()
  const supabase = createSupabaseClient()
  
  const { data: organization, isLoading, error } = useQuery({
    queryKey: ['organization', user?.id],
    queryFn: async () => {
      try {
        // Si no hay usuario, no hacemos la consulta
        if (!user?.id) {
          throw new Error('Usuario no autenticado')
        }

        // Verificar si debemos usar la caché
        const shouldUseCachedData = checkShouldUseCachedData()
        if (shouldUseCachedData && cachedOrganizationData) {
          console.log('🔄 Usando datos de organización en caché de memoria')
          return cachedOrganizationData
        }

        // Consultar la base de datos
        console.log('📡 Consultando datos de organización desde la base de datos')
        const { data: empresaData, error: empresaError } = await supabase
          .from('empresas')
          .select('*')
          .eq('auth_user_id', user.id)
          .eq('is_active', true)
          .maybeSingle()

        if (empresaError) {
          console.error('Error al cargar empresa:', empresaError)
          toast.error('Error al cargar la información de la empresa')
          throw empresaError
        }
        
        if (!empresaData) {
          console.debug('No se encontró la empresa para el usuario:', user.id)
          return null
        }

        // Guardar la hora de la última consulta exitosa
        saveLastFetchTimestamp()
        // Actualizar la caché en memoria
        cachedOrganizationData = empresaData

        return empresaData
      } catch (error) {
        console.error('Error al cargar la empresa:', error)
        throw error
      }
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 15, // 15 minutos (aumentado de 5 minutos)
    cacheTime: 1000 * 60 * 30, // 30 minutos
    retry: 1,
    refetchOnWindowFocus: false, // Evitar recargas al cambiar entre ventanas
    refetchOnMount: false, // Evitar recargas al montar componentes
    refetchOnReconnect: false // Evitar recargas al reconectar
  })

  return {
    organization,
    organizationId: organization?.id || null,
    isLoading,
    error
  }
}

// Función para guardar el timestamp de la última consulta exitosa
function saveLastFetchTimestamp() {
  const timestamp = Date.now()
  try {
    localStorage.setItem(LAST_FETCH_KEY, timestamp.toString())
  } catch (e) {
    console.error('Error al guardar timestamp en localStorage:', e)
  }
}

// Función para verificar si debemos usar la caché basado en el tiempo
function checkShouldUseCachedData(): boolean {
  try {
    const lastFetchStr = localStorage.getItem(LAST_FETCH_KEY)
    if (!lastFetchStr) return false
    
    const lastFetch = parseInt(lastFetchStr)
    const now = Date.now()
    const diffMinutes = (now - lastFetch) / (1000 * 60)
    
    // Si la última consulta fue hace menos de 10 minutos, usar caché
    return diffMinutes < 10
  } catch (e) {
    console.error('Error al verificar timestamp en localStorage:', e)
    return false
  }
} 