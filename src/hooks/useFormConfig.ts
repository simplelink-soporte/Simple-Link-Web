'use client';

import { useEffect, useState } from 'react';
import { useForm } from '@/contexts/FormContext';
import { createSupabaseClient } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';

interface FormConfig {
  empresaId: string | null;
  isLoading: boolean;
  error: Error | null;
  type: 'bookings' | 'classes' | null;
}

export function useFormConfig(slug: string | undefined) {
  const { state } = useForm();
  const { user, isLoading: authLoading } = useAuth();
  const { organization, isLoading: orgLoading } = useOrganization();
  const [config, setConfig] = useState<FormConfig>({
    empresaId: null,
    isLoading: true,
    error: null,
    type: 'bookings'
  });

  const supabase = createSupabaseClient();

  useEffect(() => {
    const validateConfig = async () => {
      try {
        // Esperar a que la autenticación y la organización estén listas
        if (authLoading || orgLoading) {
          return;
        }

        // Si no hay usuario autenticado, establecer error
        if (!user) {
          setConfig(prev => ({
            ...prev,
            isLoading: false,
            error: new Error('Usuario no autenticado')
          }));
          return;
        }

        // Si tenemos organización, usar su ID
        if (organization) {
          setConfig({
            empresaId: organization.id,
            isLoading: false,
            error: null,
            type: 'bookings'
          });
          return;
        }

        // Si no hay organización pero hay slug, intentar obtener el ID
        if (!organization && slug) {
          const finalEmpresaId = await fetchEmpresaIdFromSlug(slug);
          setConfig({
            empresaId: finalEmpresaId,
            isLoading: false,
            error: null,
            type: 'bookings'
          });
          return;
        }

        // Si no hay ni organización ni slug, establecer error
        setConfig(prev => ({
          ...prev,
          isLoading: false,
          error: new Error('Se requiere una organización o un slug válido')
        }));

      } catch (err) {
        const error = err as Error;
        console.error('[useFormConfig] Error:', error);
        setConfig(prev => ({
          ...prev,
          isLoading: false,
          error,
          type: null
        }));
      }
    };

    validateConfig();
  }, [user, organization, authLoading, orgLoading, slug]);

  async function fetchEmpresaIdFromSlug(slug: string): Promise<string> {
    const { data, error } = await supabase
      .from('company_links')
      .select('empresa_id')
      .eq('slug', slug)
      .single();

    if (error || !data) throw new Error('Empresa no encontrada');
    return data.empresa_id;
  }

  return config;
} 