'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { formPublishService } from '@/lib/services/forms/publish-service';
import { PublicFormContent } from '@/components/public-form/PublicFormContent';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { FormProvider } from '@/contexts/FormContext';
import { PublishedForm } from '@/types/forms/publish';
import { useOrganization } from '@/contexts/OrganizationContext';

export default function PublicFormPage() {
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
            // Otros campos requeridos por la organización
            name: formData.settings?.business_name || 'Empresa',
            business_name: formData.settings?.business_name || 'Empresa',
            email: '',
            phone: '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
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
    <FormProvider initialForm={form}>
      <div className="min-h-screen bg-background">
        <PublicFormContent form={form} />
      </div>
    </FormProvider>
  );
} 