'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { formPublishService } from '@/lib/services/forms/publish-service';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { PublishedForm } from '@/types/forms/publish';
import { useOrganization } from '@/contexts/OrganizationContext';
import { ShiftFormProvider } from '@/components/shifts-registration/context/ShiftFormContext';
import { ShiftRegistrationForm } from '@/components/shifts-registration/ShiftRegistrationForm';

/**
 * Página principal para el formulario público de turnos
 * Refactorizada con una arquitectura más modular y mantenible
 */
export default function ShiftFormPage() {
  const params = useParams();
  const [form, setForm] = useState<PublishedForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { setOrganization } = useOrganization();

  useEffect(() => {
    const loadForm = async () => {
      try {
        if (!params.slug) {
          throw new Error('No se encontró el formulario');
        }

        const formData = await formPublishService.getBySlug(params.slug as string);
        console.log('Formulario cargado:', formData);
        
        // Actualizar el contexto de la organización
        if (formData.empresa_id) {
          setOrganization({
            id: formData.empresa_id,
            name: formData.settings?.business_name || 'Empresa',
            business_name: formData.settings?.business_name || null,
            email: null,
            phone: null,
            address: null,
            city: null,
            state: null,
            is_active: true,
            settings: null,
            created_at: null,
            updated_at: null,
            auth_user_id: null,
            plan_type: 'FREE',
            onboarding: null,
            country: null,
            zip_code: null,
            plan_id: null,
            plan_updated_at: null,
          });
        }

        setForm(formData);
        
        // Incrementar contador de vistas
        await formPublishService.incrementViews(params.slug as string);
      } catch (error) {
        console.error('Error al cargar el formulario:', error);
        setError('No se pudo cargar el formulario. Por favor, verifica la URL.');
      } finally {
        setLoading(false);
      }
    };

    loadForm();
  }, [params.slug, setOrganization]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Formulario no encontrado</AlertTitle>
          <AlertDescription>
            El formulario que buscas no existe o ha sido eliminado.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <ShiftFormProvider formData={form}>
      <div className="min-h-screen bg-background">
        <ShiftRegistrationForm form={form} />
      </div>
    </ShiftFormProvider>
  );
}
