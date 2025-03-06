import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

// Tipo para el resultado del estado de onboarding
interface OnboardingStatusResult {
  id: string | null
  onboarding: string | null
  isCompleted: boolean
}

// Variable para caché en memoria
let cachedOnboardingStatus: OnboardingStatusResult | null = null
let lastCachedTimestamp = 0
const CACHE_TTL = 30000 // 30 segundos en milisegundos

// Función para obtener el estado de onboarding
const fetchOnboardingStatus = async (userId: string | undefined): Promise<OnboardingStatusResult> => {
  if (!userId) {
    return { id: null, onboarding: null, isCompleted: false }
  }

  // Verificar si podemos usar la caché
  const now = Date.now()
  if (cachedOnboardingStatus && (now - lastCachedTimestamp) < CACHE_TTL) {
    console.log('🔄 Usando caché de onboarding status')
    return cachedOnboardingStatus
  }

  try {
    console.log('📡 Consultando estado de onboarding desde la base de datos')
    const { data, error } = await supabase
      .from('empresas')
      .select('id, onboarding')
      .eq('auth_user_id', userId)
      .maybeSingle()

    if (error) {
      console.warn('⚠️ Error al verificar estado del onboarding:', error.message)
      return { id: null, onboarding: null, isCompleted: false }
    }

    if (!data) {
      return { id: null, onboarding: null, isCompleted: false }
    }

    const result = {
      id: data.id,
      onboarding: data.onboarding,
      isCompleted: data.onboarding === 'Completo'
    }

    // Actualizar la caché en memoria
    cachedOnboardingStatus = result
    lastCachedTimestamp = now

    return result
  } catch (error) {
    console.error('❌ Error en fetchOnboardingStatus:', error)
    return { id: null, onboarding: null, isCompleted: false }
  }
}

// Hook para usar el estado de onboarding con caché
export function useOnboardingStatus(options = { skipCache: false }) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['onboardingStatus', user?.id],
    queryFn: () => {
      // Si se solicita explícitamente saltar la caché
      if (options.skipCache) {
        cachedOnboardingStatus = null
      }
      return fetchOnboardingStatus(user?.id)
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutos
    cacheTime: 1000 * 60 * 10, // 10 minutos
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: 15000, // Solo refrescar cada 15 segundos durante el onboarding
  })
}

// Función para invalidar manualmente la caché
export function invalidateOnboardingCache() {
  cachedOnboardingStatus = null
  lastCachedTimestamp = 0
} 