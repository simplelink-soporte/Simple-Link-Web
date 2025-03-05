"use client"

interface LoadingSpinnerProps {
  message?: string
}

export function LoadingSpinner({ message = 'Cargando...' }: LoadingSpinnerProps) {
  return (
    <div className="w-full text-center py-12">
      <div className="w-16 h-16 border-4 border-gray-200 border-t-black rounded-full animate-spin mx-auto" />
      <p className="mt-4 text-sm text-gray-500">{message}</p>
    </div>
  )
} 