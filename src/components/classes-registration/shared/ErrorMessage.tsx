"use client"

import { IconAlertCircle } from '@tabler/icons-react'
import type { ClassRegistrationError } from '../types/error'

interface ErrorMessageProps {
  error: ClassRegistrationError | Error | string
}

export function ErrorMessage({ error }: ErrorMessageProps) {
  const errorMessage = typeof error === 'string' 
    ? error 
    : error instanceof Error 
      ? error.message 
      : error.message || 'Ha ocurrido un error'

  return (
    <div className="w-full py-12">
      <div className="p-4 rounded-lg bg-red-50 flex items-start gap-3">
        <IconAlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-red-800">
            Error
          </p>
          <p className="text-sm text-red-700">{errorMessage}</p>
        </div>
      </div>
    </div>
  )
} 