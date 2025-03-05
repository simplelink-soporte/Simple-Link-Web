'use client';

import { useQuery } from '@tanstack/react-query';
import { useOrganization } from '@/contexts/OrganizationContext';
import type { PublishedForm } from '@/types/forms/publish';
import { queryKeys } from '@/config/query-keys';

interface UseInitialFormResult {
  initialForm: PublishedForm | null;
  isLoading: boolean;
  error: Error | null;
}

async function getInitialForm(empresaId: string): Promise<PublishedForm> {
  return {
    id: crypto.randomUUID(),
    empresa_id: empresaId,
    slug: '',
    status: 'published',
    isCustomizable: true
  };
}

export function useInitialForm(): UseInitialFormResult {
  const { organization } = useOrganization();

  const { data: initialForm, isLoading, error } = useQuery({
    queryKey: queryKeys.forms.initial(organization?.id),
    queryFn: () => {
      if (!organization?.id) {
        throw new Error('No se encontró la organización');
      }
      return getInitialForm(organization.id);
    },
    enabled: !!organization?.id,
    staleTime: 1000 * 60 * 30, // 30 minutos
    gcTime: 1000 * 60 * 60, // 1 hora
    retry: false
  });

  return {
    initialForm: initialForm || null,
    isLoading,
    error: error as Error | null
  };
}