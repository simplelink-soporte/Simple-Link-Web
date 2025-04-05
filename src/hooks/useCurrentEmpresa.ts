"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseClient } from '@/lib/supabase'

interface EmpresaData {
  id: string
  name: string
  is_active: boolean
  plan_type: string
  auth_user_id: string
  country?: string
}

export function useCurrentEmpresa() {
  const [empresa, setEmpresa] = useState<EmpresaData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const supabase = createSupabaseClient()

  useEffect(() => {
    const loadEmpresa = async () => {
      try {
        // Si no hay datos en localStorage o queremos asegurar datos actualizados, verificar la sesión
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session) {
          // Si no hay sesión activa, limpiar localStorage y redirigir a login
          localStorage.removeItem('empresaId')
          localStorage.removeItem('empresaData')
          router.push('/admin/login')
          return
        }

        // Siempre buscar la empresa del usuario para tener datos actualizados
        const { data: empresaData, error } = await supabase
          .from('empresas')
          .select('id, name, is_active, plan_type, auth_user_id, country')
          .eq('auth_user_id', session.user.id)
          .single()

        if (error || !empresaData) {
          console.error('Error al cargar empresa:', error)
          localStorage.removeItem('empresaId')
          localStorage.removeItem('empresaData')
          router.push('/admin/login')
          return
        }

        // Guardar los datos actualizados en localStorage y estado
        localStorage.setItem('empresaId', empresaData.id)
        localStorage.setItem('empresaData', JSON.stringify(empresaData))
        setEmpresa(empresaData)
        setIsLoading(false)
        
        // Verificar explícitamente si tenemos el campo country
        if (empresaData.country) {
          console.log(`✅ useCurrentEmpresa: País de la empresa detectado: "${empresaData.country}"`);
        } else {
          console.log(`⚠️ useCurrentEmpresa: No se detectó país para la empresa`);
        }
      } catch (error) {
        console.error('Error al cargar datos de empresa:', error)
        router.push('/admin/login')
      } finally {
        setIsLoading(false)
      }
    }

    loadEmpresa()
  }, [router, supabase])

  return { empresa, isLoading }
}