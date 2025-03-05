"use client"

import { useEffect, useState } from 'react'
import { createSupabaseClient } from '@/lib/supabase'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { ClassRegistrationForm } from '@/components/classes-registration'

export default function ClasesPage() {
  const [empresas, setEmpresas] = useState<Array<{ id: string; name: string }>>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadEmpresas() {
      try {
        const supabase = createSupabaseClient()
        const { data, error } = await supabase
          .from('empresas')
          .select('id, name')
          .eq('is_active', true)
          .order('name')

        if (error) throw error
        setEmpresas(data || [])
      } catch (error) {
        console.error('Error al cargar empresas:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadEmpresas()
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">Cargando...</div>
      </div>
    )
  }

  return (
    <div className={cn(
      "flex-1",
      "w-full h-full",
      "overflow-y-auto scrollbar-none"
    )}>
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            Empresas Disponibles
          </h1>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {empresas.map((empresa) => (
              <Link
                key={empresa.id}
                href={`/clases/${empresa.id}`}
                className="block p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow"
              >
                <h2 className="text-xl font-semibold text-gray-900">
                  {empresa.name}
                </h2>
              </Link>
            ))}
          </div>
        </div>
      </div>
      <ClassRegistrationForm />
    </div>
  )
} 