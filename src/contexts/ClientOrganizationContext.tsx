"use client"

import { createContext, useContext, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createSupabaseClient } from '@/lib/supabase'
import type { Database } from '@/types/supabase'

type Organization = Database['public']['Tables']['empresas']['Row']

interface ClientOrganizationContextType {
  organization: Organization | null
  isLoading: boolean
  error: Error | null
}

interface CompanyLink {
  empresa_id: string
}

const ClientOrganizationContext = createContext<ClientOrganizationContextType | undefined>(undefined)

// Clave para el caché del link de empresa
const COMPANY_LINK_CACHE_KEY = 'company_link_cache'
const COMPANY_LINK_CACHE_DURATION = 1000 * 60 * 60 // 1 hora

// Funciones de caché para el link de empresa
function getCachedCompanyLink(empresaId: string): CompanyLink | null {
  try {
    const cache = localStorage.getItem(COMPANY_LINK_CACHE_KEY)
    if (!cache) return null

    const { data, timestamp, id } = JSON.parse(cache)
    const isExpired = Date.now() - timestamp > COMPANY_LINK_CACHE_DURATION
    
    if (isExpired || id !== empresaId) {
      localStorage.removeItem(COMPANY_LINK_CACHE_KEY)
      return null
    }

    return data as CompanyLink
  } catch {
    return null
  }
}

function setCachedCompanyLink(empresaId: string, data: CompanyLink) {
  try {
    const cache = {
      data,
      timestamp: Date.now(),
      id: empresaId
    }
    localStorage.setItem(COMPANY_LINK_CACHE_KEY, JSON.stringify(cache))
  } catch {
    // Si hay error al guardar en caché, simplemente lo ignoramos
  }
}

export function ClientOrganizationProvider({ children, empresaId }: { children: React.ReactNode, empresaId?: string }) {
  const supabase = createSupabaseClient()

  // Primero, buscar el empresa_id usando el slug
  const { data: companyLink, isLoading: isLoadingLink, error: linkError } = useQuery({
    queryKey: ['companyLink', empresaId],
    queryFn: async (): Promise<CompanyLink | null> => {
      try {
        if (!empresaId) return null

        // Intentar obtener del caché primero
        const cachedLink = getCachedCompanyLink(empresaId)
        if (cachedLink) {
          console.log('✅ Link encontrado en caché:', cachedLink)
          return cachedLink
        }

        console.log('🔍 Buscando link de empresa con slug:', empresaId)
        const { data: link, error: linkError } = await supabase
          .from('company_links')
          .select('empresa_id')
          .eq('slug', empresaId)
          .eq('is_active', true)
          .single()

        if (linkError) {
          // Solo logueamos errores que no sean de "no resultados"
          if (linkError.code !== 'PGRST116') {
            console.error('❌ Error al buscar link:', linkError)
          }
          throw linkError
        }
        
        if (!link) {
          throw new Error('No se encontró el link de la empresa')
        }

        // Guardar en caché
        setCachedCompanyLink(empresaId, link)
        console.log('✅ Link encontrado y cacheado:', link)
        return link
      } catch (error) {
        // Solo logueamos errores que no sean de "no resultados"
        if ((error as any)?.code !== 'PGRST116') {
          console.error('❌ Error al buscar link:', error)
        }
        throw error
      }
    },
    enabled: !!empresaId,
    gcTime: COMPANY_LINK_CACHE_DURATION, // Tiempo de caché para garbage collection
    staleTime: COMPANY_LINK_CACHE_DURATION // Tiempo antes de considerar los datos obsoletos
  })

  // Luego, buscar la información de la empresa usando el empresa_id
  const { data: organization, isLoading: isLoadingOrg, error: orgError } = useQuery({
    queryKey: ['organization', companyLink?.empresa_id],
    queryFn: async () => {
      try {
        if (!companyLink?.empresa_id) return null

        console.log('🔍 Buscando empresa con ID:', companyLink.empresa_id)
        const { data: org, error: orgError } = await supabase
          .from('empresas')
          .select('*')
          .eq('id', companyLink.empresa_id)
          .eq('is_active', true)
          .single()

        if (orgError) throw orgError
        
        if (!org) {
          throw new Error('No se encontró la empresa')
        }

        console.log('✅ Empresa encontrada:', org)
        return org
      } catch (error) {
        console.error('❌ Error al cargar la empresa:', error)
        throw error
      }
    },
    enabled: !!companyLink?.empresa_id
  })

  const value = useMemo(() => ({
    organization: organization || null,
    isLoading: isLoadingLink || isLoadingOrg,
    error: linkError || orgError || null
  }), [organization, isLoadingLink, isLoadingOrg, linkError, orgError])

  return (
    <ClientOrganizationContext.Provider value={value}>
      {children}
    </ClientOrganizationContext.Provider>
  )
}

export function useClientOrganizationContext() {
  const context = useContext(ClientOrganizationContext)
  if (context === undefined) {
    throw new Error('useClientOrganizationContext debe ser usado dentro de un ClientOrganizationProvider')
  }
  return context
} 