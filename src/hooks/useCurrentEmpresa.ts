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
}

export function useCurrentEmpresa() {
  const [empresa, setEmpresa] = useState<EmpresaData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const supabase = createSupabaseClient()

  useEffect(() => {
    const loadEmpresa = async () => {
      try {
        // Intentar obtener datos del localStorage
        const storedEmpresaId = localStorage.getItem('empresaId')
        const storedEmpresaData = localStorage.getItem('empresaData')

        if (storedEmpresaId && storedEmpresaData) {
          setEmpresa(JSON.parse(storedEmpresaData))
          setIsLoading(false)
          return
        }

        // Si no hay datos en localStorage, verificar la sesión
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session) {
          router.push('/admin/login')
          return
        }

        // Buscar la empresa del usuario
        const { data: empresaData, error } = await supabase
          .from('empresas')
          .select('id, name, is_active, plan_type, auth_user_id')
          .eq('auth_user_id', session.user.id)
          .single()

        if (error || !empresaData) {
          console.error('Error al cargar empresa:', error)
          router.push('/admin/login')
          return
        }

        // Guardar en localStorage y estado
        localStorage.setItem('empresaId', empresaData.id)
        localStorage.setItem('empresaData', JSON.stringify(empresaData))
        setEmpresa(empresaData)
      } catch (error) {
        console.error('Error al cargar datos de empresa:', error)
        router.push('/admin/login')
      } finally {
        setIsLoading(false)
      }
    }

    loadEmpresa()
  }, [router])

  return {
    empresa,
    isLoading,
    empresaId: empresa?.id
  }
} 