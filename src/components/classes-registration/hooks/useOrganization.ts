'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { OrganizationService } from '../services'
import type { Organization } from '../types/models'
import { createClassRegistrationError, type ClassRegistrationError } from '../types/error'

// Caché en memoria para organizaciones
const organizationCache = new Map<string, { data: Organization; timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutos

export function useOrganization(empresaId: string) {
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<ClassRegistrationError | null>(null)
  const mountedRef = useRef(true)
  const loadingRef = useRef(false)
  const organizationService = useRef(new OrganizationService()).current

  const loadOrganization = useCallback(async (force: boolean = false) => {
    if (loadingRef.current || !mountedRef.current) return

    try {
      loadingRef.current = true
      if (mountedRef.current) setIsLoading(true)

      // Verificar caché si no es forzado
      if (!force) {
        const cached = organizationCache.get(empresaId)
        if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
          if (mountedRef.current) {
            setOrganization(cached.data)
            setError(null)
            return
          }
        }
      }

      const org = await organizationService.getOrganizationBySlug(empresaId)
      
      if (!mountedRef.current) return

      if (!org) {
        throw createClassRegistrationError(
          'VALIDATION_ERROR',
          'Organización no encontrada'
        )
      }

      // Actualizar caché
      organizationCache.set(empresaId, {
        data: org,
        timestamp: Date.now()
      })

      setOrganization(org)
      setError(null)
    } catch (err) {
      console.error('Error al cargar la organización:', err)
      if (mountedRef.current) {
        setError(
          createClassRegistrationError(
            'LOAD_ERROR',
            err instanceof Error ? err.message : 'Error al cargar la organización'
          )
        )
        setOrganization(null)
      }
    } finally {
      if (mountedRef.current) setIsLoading(false)
      loadingRef.current = false
    }
  }, [empresaId, organizationService])

  // Efecto para la carga inicial
  useEffect(() => {
    mountedRef.current = true

    loadOrganization()

    return () => {
      mountedRef.current = false
    }
  }, [loadOrganization])

  return {
    organization,
    isLoading,
    error,
    reloadOrganization: useCallback(() => loadOrganization(true), [loadOrganization])
  }
} 