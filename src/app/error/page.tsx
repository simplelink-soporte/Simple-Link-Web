'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function ErrorPage() {
  const router = useRouter()

  useEffect(() => {
    // Limpiar cualquier estado de error después de 5 segundos
    const timer = setTimeout(() => {
      router.push('/')
    }, 5000)

    return () => clearTimeout(timer)
  }, [router])

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Ha Ocurrido un Error
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Lo sentimos, ha ocurrido un error inesperado. Serás redirigido automáticamente en 5 segundos.
          </p>
        </div>
        
        <div className="mt-8 space-y-4">
          <button
            onClick={() => router.back()}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Volver Atrás
          </button>
          
          <button
            onClick={() => router.push('/')}
            className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Ir al Inicio
          </button>
        </div>
      </div>
    </div>
  )
} 