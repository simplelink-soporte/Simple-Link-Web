import { LoadingSpinner } from "./loading-spinner"

interface PageLoadingStateProps {
  message?: string
}

export function PageLoadingState({ message = "Cargando..." }: PageLoadingStateProps) {
  return (
    <div className="h-full w-full flex items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        <LoadingSpinner size="md" />
        <p className="text-sm text-gray-500">{message}</p>
      </div>
    </div>
  )
}

export function PageErrorState({ message = "Ha ocurrido un error" }: { message?: string }) {
  return (
    <div className="h-full w-full flex items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        <p className="text-sm text-red-500">{message}</p>
      </div>
    </div>
  )
}

export function PageEmptyState({ message = "No hay datos disponibles" }: { message?: string }) {
  return (
    <div className="h-full w-full flex items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        <p className="text-sm text-gray-500">{message}</p>
      </div>
    </div>
  )
} 