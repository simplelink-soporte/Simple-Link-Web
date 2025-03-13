import { useQuery } from '@tanstack/react-query'
import { useOrganization } from '@/contexts/OrganizationContext'
import { classQueryService } from '@/services/classQueryService'
import type { ClassQueryOptions, TransformedClass } from '@/types/classes'
import { format } from 'date-fns'

interface UseClassesOptions extends Omit<ClassQueryOptions, 'empresaId' | 'date'> {
  date?: Date | string
  includeCompleted?: boolean
}

export function useClasses(options: UseClassesOptions) {
  const { organization } = useOrganization()

  return useQuery({
    queryKey: ['classes', options.date, options.branchId, organization?.id, options.includeCompleted],
    queryFn: async () => {
      if (!organization?.id) {
        console.warn('⚠️ useClasses - No hay organización activa')
        return []
      }

      // Formatear la fecha a YYYY-MM-DD si está presente
      const formattedDate = options.date 
        ? options.date instanceof Date
          ? format(options.date, 'yyyy-MM-dd')
          : options.date
        : format(new Date(), 'yyyy-MM-dd'); // Si no hay fecha, usar hoy

      console.log('🔄 useClasses - Consultando clases:', {
        date: formattedDate,
        branchId: options.branchId,
        empresaId: organization.id,
        includeCompleted: options.includeCompleted
      })

      const result = await classQueryService.getClassesByDate(formattedDate, {
        ...options,
        date: formattedDate, // Asegurarse de que date sea string
        empresaId: organization.id
      })

      if (result.error) {
        console.error('❌ useClasses - Error:', result.error)
        throw new Error(result.error.message)
      }

      // Transformar las clases al formato de visualización
      const transformedClasses = classQueryService.transformClassesToBookingFormat(
        result.data || [],
        formattedDate
      )

      console.log('✅ useClasses - Clases obtenidas:', {
        total: transformedClasses.length,
        date: formattedDate,
        includeCompleted: options.includeCompleted
      })

      return transformedClasses
    },
    enabled: Boolean(organization?.id),
    staleTime: 1000 * 60 * 5, // 5 minutos
    gcTime: 1000 * 60 * 15, // 15 minutos
    retry: 2
  })
} 