"use client"

import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { toast } from 'sonner'
import type { Database } from '@/types/supabase'
import { useCurrentEmpresa } from '@/hooks/useCurrentEmpresa'
import { queryKeys } from '@/config/query-keys'
import { useState, useEffect } from 'react'
import { useOrganization } from '@/contexts/OrganizationContext'

interface UseCompanyLinkProps {
  branchId?: string
  classId?: string
}

interface CompanyLink {
  slug: string
  url: string
  hasExistingLink: boolean
}

const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    // Reemplazar espacios y caracteres especiales por guiones
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    // Eliminar acentos
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
}

async function fetchCompanyLink(empresaId: string, branchId?: string): Promise<CompanyLink | null> {
  const supabase = createClientComponentClient<Database>()

  try {
    console.log('fetchCompanyLink - Buscando link para empresa_id:', empresaId);
    
    // Verificar si existe un link
    const { data: existingLink, error } = await supabase
      .from('company_links')
      .select('slug')
      .eq('empresa_id', empresaId)
      .eq('type', 'classes')
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Error al buscar link:', error);
      throw error
    }

    if (!existingLink) {
      console.log('No se encontró link para la empresa:', empresaId);
      return null
    }

    console.log('Link encontrado:', existingLink);
    return {
      slug: existingLink.slug,
      url: `${window.location.origin}/clases/${existingLink.slug}`,
      hasExistingLink: true
    }
  } catch (err) {
    console.error('Error al obtener el link de la empresa:', err)
    throw err
  }
}

async function getUniqueSlug(supabase: ReturnType<typeof createClientComponentClient<Database>>, baseSlug: string): Promise<string> {
  let slug = baseSlug
  let counter = 1
  let isUnique = false

  while (!isUnique) {
    const { data } = await supabase
      .from('company_links')
      .select('slug')
      .eq('slug', slug)
      .single()

    if (!data) {
      isUnique = true
    } else {
      slug = `${baseSlug}-${counter}`
      counter++
    }
  }

  return slug
}

async function generateCompanyLinkFn(empresaId: string, customSlug: string): Promise<CompanyLink> {
  const supabase = createClientComponentClient<Database>()

  try {
    console.log('generateCompanyLinkFn - Creando link para empresa_id:', empresaId);
    
    // Verificar si el slug está disponible
    const { data: existingSlug } = await supabase
      .from('company_links')
      .select('slug')
      .eq('slug', customSlug)
      .single()

    if (existingSlug) {
      throw new Error('Este link ya está en uso')
    }

    // Crear el nuevo link con el slug personalizado
    const { data: newLink, error: createError } = await supabase
      .from('company_links')
      .insert({
        empresa_id: empresaId,
        slug: customSlug,
        type: 'classes',
        is_active: true,
        settings: {
          theme: {
            primary_color: '#000000',
            logo_url: null
          },
          features: {
            allow_guest: true,
            require_auth: false,
            show_prices: true
          },
          restrictions: {
            max_bookings_per_user: null,
            advance_days: null
          }
        }
      })
      .select('slug')
      .single()

    if (createError) {
      console.error('Error al crear link:', createError);
      throw createError;
    }

    console.log('Link creado exitosamente:', newLink);
    return {
      slug: newLink.slug,
      url: `${window.location.origin}/clases/${newLink.slug}`,
      hasExistingLink: true
    }
  } catch (err) {
    console.error('Error al generar el link:', err)
    throw err
  }
}

async function updateCompanyLinkFn(empresaId: string, customSlug: string): Promise<CompanyLink> {
  const supabase = createClientComponentClient<Database>()

  try {
    console.log('updateCompanyLinkFn - Actualizando link para empresa_id:', empresaId);
    
    // Verificar si el slug está disponible
    const { data: existingSlug } = await supabase
      .from('company_links')
      .select('slug')
      .eq('slug', customSlug)
      .not('empresa_id', 'eq', empresaId) // Excluir el registro actual
      .single()

    if (existingSlug) {
      throw new Error('Este link ya está en uso')
    }

    // Buscar el link existente para esta empresa
    const { data: existingLink, error: findError } = await supabase
      .from('company_links')
      .select('id')
      .eq('empresa_id', empresaId)
      .eq('type', 'classes')
      .single()
    
    if (findError && findError.code !== 'PGRST116') {
      console.error('Error al buscar link existente:', findError);
      throw findError;
    }
    
    if (!existingLink) {
      console.log('No se encontró link existente, creando uno nuevo');
      // Si no existe, crear uno nuevo
      return generateCompanyLinkFn(empresaId, customSlug);
    }

    // Actualizar el link existente
    const { data: updatedLink, error: updateError } = await supabase
      .from('company_links')
      .update({ slug: customSlug })
      .eq('empresa_id', empresaId)
      .eq('type', 'classes')
      .select('slug')
      .single()

    if (updateError) {
      console.error('Error al actualizar link:', updateError);
      throw updateError;
    }

    console.log('Link actualizado exitosamente:', updatedLink);
    return {
      slug: updatedLink.slug,
      url: `${window.location.origin}/clases/${updatedLink.slug}`,
      hasExistingLink: true
    }
  } catch (err) {
    console.error('Error al actualizar el link:', err)
    throw err
  }
}

export function useCompanyLink({ branchId, classId }: UseCompanyLinkProps = {}) {
  const { empresa } = useCurrentEmpresa()
  const { organization } = useOrganization() // Obtener también el contexto de organización
  const queryClient = useQueryClient()
  const [defaultSlug, setDefaultSlug] = useState('')

  // Determinar el ID de empresa a usar, priorizando el de useCurrentEmpresa
  const empresaId = empresa?.id || organization?.id
  
  // Obtener el slug por defecto cuando se carga la empresa
  useEffect(() => {
    // Usar el nombre de la empresa o de la organización
    const name = empresa?.name || organization?.name
    if (name) {
      setDefaultSlug(generateSlug(name))
    }
  }, [empresa?.name, organization?.name])

  const query = useQuery({
    queryKey: queryKeys.companyLink.byBranch(branchId || 'default'),
    queryFn: () => {
      if (!empresaId) {
        console.error('No se encontró ID de empresa para buscar links');
        throw new Error('No se encontró la empresa asociada')
      }
      console.log('useCompanyLink - Consultando link para empresa_id:', empresaId);
      return fetchCompanyLink(empresaId, branchId)
    },
    enabled: !!empresaId,
    staleTime: 1000 * 60 * 30, // 30 minutos
    gcTime: 1000 * 60 * 60, // 1 hora
  })

  const generateLinkMutation = useMutation({
    mutationFn: async (customSlug: string) => {
      if (!empresaId) throw new Error('No se encontró la empresa asociada')
      console.log('Generando link para empresa_id:', empresaId);
      return generateCompanyLinkFn(empresaId, customSlug)
    },
    onSuccess: (data) => {
      queryClient.setQueryData(
        queryKeys.companyLink.byBranch(branchId || 'default'),
        data
      )
      toast.success('Link generado exitosamente')
    },
    onError: (error: Error) => {
      console.error('Error al generar el link:', error)
      toast.error('Error al generar el link')
    }
  })

  const updateLinkMutation = useMutation({
    mutationFn: async (customSlug: string) => {
      if (!empresaId) throw new Error('No se encontró la empresa asociada')
      console.log('Actualizando link para empresa_id:', empresaId);
      return updateCompanyLinkFn(empresaId, customSlug)
    },
    onSuccess: (data) => {
      queryClient.setQueryData(
        queryKeys.companyLink.byBranch(branchId || 'default'),
        data
      )
      toast.success('Link actualizado exitosamente')
    },
    onError: (error: Error) => {
      console.error('Error al actualizar el link:', error)
      toast.error('Error al actualizar el link')
    }
  })

  const copyToClipboard = async () => {
    if (!query.data?.url) return

    try {
      await navigator.clipboard.writeText(query.data.url)
      toast.success('Link copiado al portapapeles')
    } catch (err) {
      console.error('Error al copiar al portapapeles:', err)
      toast.error('Error al copiar el link')
    }
  }

  return {
    companyLink: query.data?.url || null,
    currentSlug: query.data?.slug || '',
    isLoading: query.isLoading || generateLinkMutation.isPending || updateLinkMutation.isPending,
    error: query.error || generateLinkMutation.error || updateLinkMutation.error,
    copyToClipboard,
    generateLink: generateLinkMutation.mutate,
    updateLink: updateLinkMutation.mutate,
    hasExistingLink: query.data?.hasExistingLink || false,
    defaultSlug
  }
} 