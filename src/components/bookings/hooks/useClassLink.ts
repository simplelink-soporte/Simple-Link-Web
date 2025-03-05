import { useState, useEffect, useCallback } from 'react'
import { useCompanyLink } from './useCompanyLink'
import { toast } from 'sonner'

interface UseClassLinkProps {
  branchId?: string
  classId?: string
}

export function useClassLink({ branchId, classId }: UseClassLinkProps) {
  const [classLink, setClassLink] = useState<string | null>(null)
  const { companyLink, isLoading, error } = useCompanyLink({ branchId })

  useEffect(() => {
    if (companyLink && classId) {
      setClassLink(`${companyLink}/${classId}`)
    } else {
      setClassLink(null)
    }
  }, [companyLink, classId])

  const copyToClipboard = useCallback(async () => {
    if (!classLink) {
      toast.error('No hay un link disponible para copiar')
      return
    }

    try {
      await navigator.clipboard.writeText(classLink)
      toast.success('Link de la clase copiado al portapapeles')
    } catch (err) {
      console.error('Error al copiar al portapapeles:', err)
      toast.error('Error al copiar el link')
    }
  }, [classLink])

  return {
    classLink,
    isLoading,
    error,
    copyToClipboard
  }
} 