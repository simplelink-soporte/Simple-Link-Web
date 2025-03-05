'use client';

import { useState } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { useOrganization } from '@/contexts/OrganizationContext';
import { companyLinksService } from '@/services/company-links.service';
import { toast } from 'sonner';

const isDevelopment = process.env.NODE_ENV === 'development';

interface FormPublishConfig {
  title: string;
  description?: string;
  theme?: 'light' | 'dark';
  customization?: {
    colors?: {
      primary?: string;
      secondary?: string;
    };
    logo?: {
      url?: string;
      position?: 'left' | 'center' | 'right';
    };
  };
  fields?: any[];
}

interface PublishedForm {
  id: string;
  slug: string;
  status: 'published';
}

interface DevelopmentConfig {
  userId: string;
  empresaId: string;
}

const getDevelopmentConfig = (): DevelopmentConfig | null => {
  if (!isDevelopment) return null;

  const userId = process.env.NEXT_PUBLIC_DEFAULT_USER_ID;
  const empresaId = process.env.NEXT_PUBLIC_DEFAULT_EMPRESA_ID;

  if (!userId || !empresaId) {
    console.warn('[useFormPublishing] Variables de entorno no configuradas para desarrollo');
    return null;
  }

  return { userId, empresaId };
};

export function useFormPublishing() {
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { user, isLoading: authLoading } = useAuth();
  const { organization, isLoading: orgLoading } = useOrganization();
  const devConfig = getDevelopmentConfig();

  // Manejar estados de carga
  if (authLoading || orgLoading) {
    return {
      isPublishing: true,
      error: null,
      publishForm: async () => {
        throw new Error('Cargando...');
      }
    };
  }

  // En desarrollo, permitir continuar con la configuración de desarrollo
  if (!user && !devConfig) {
    return {
      isPublishing: false,
      error: new Error('Usuario no autenticado'),
      publishForm: async () => {
        throw new Error('Usuario no autenticado');
      }
    };
  }

  // En desarrollo, permitir continuar sin organización si hay configuración de desarrollo
  if (!organization && !devConfig) {
    return {
      isPublishing: false,
      error: new Error('No hay organización seleccionada'),
      publishForm: async () => {
        throw new Error('No hay organización seleccionada');
      }
    };
  }

  const handleError = (err: unknown): Error => {
    const error = err instanceof Error ? err : new Error('Error desconocido al publicar el formulario');
    setError(error);
    toast.error(error.message);
    return error;
  };

  const publishForm = async (config: FormPublishConfig): Promise<PublishedForm> => {
    setError(null);
    
    // En desarrollo, usamos valores por defecto
    const effectiveUserId = devConfig?.userId || user?.id;
    const effectiveOrganizationId = devConfig?.empresaId || organization?.id;

    if (!effectiveUserId) {
      throw handleError(new Error('Debes iniciar sesión para publicar formularios'));
    }

    if (!effectiveOrganizationId) {
      throw handleError(new Error('Se requiere una organización válida'));
    }

    setIsPublishing(true);
    console.log('[useFormPublishing] 📝 Iniciando publicación:', {
      title: config.title
    });

    try {
      const link = await companyLinksService.createOrUpdateLink({
        empresaId: effectiveOrganizationId,
        type: 'bookings',
        name: config.title,
        settings: {
          title: config.title,
          description: config.description,
          theme: {
            primary_color: config.customization?.colors?.primary,
            logo_url: config.customization?.logo?.url
          },
          features: {
            allow_guest: true,
            require_auth: false,
            show_prices: true
          }
        }
      });

      console.log('[useFormPublishing] ✅ Link creado:', link);
      toast.success('Formulario publicado exitosamente');

      return {
        id: link.id,
        slug: link.slug,
        status: 'published'
      };
    } catch (err) {
      console.error('[useFormPublishing] ❌ Error al publicar:', err);
      throw handleError(err);
    } finally {
      setIsPublishing(false);
    }
  };

  return {
    isPublishing,
    error,
    publishForm
  };
} 