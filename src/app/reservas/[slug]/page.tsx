'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { formPublishService } from '@/lib/services/forms/publish-service';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { PublishedForm } from '@/types/forms/publish';
import { useOrganization } from '@/contexts/OrganizationContext';
import { ShiftFormProvider } from '@/components/shifts-registration/context/ShiftFormContext';
import { ShiftRegistrationForm } from '@/components/shifts-registration/ShiftRegistrationForm';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Página principal para el formulario público de turnos (versión refactorizada)
 * Implementación basada en arquitectura modular con separación de responsabilidades
 */
export default function ShiftFormPageNew() {
  const params = useParams();
  const router = useRouter();
  const [form, setForm] = useState<PublishedForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { setOrganization } = useOrganization();
  const { user, isLoading: authLoading } = useAuth();
  const [availablePaymentMethods, setAvailablePaymentMethods] = useState<string[]>(['local']);
  
  // Verificar autenticación a nivel de página
  useEffect(() => {
    // Solo ejecutar cuando haya terminado la carga de autenticación
    if (!authLoading) {
      if (!user) {
        // Si no hay usuario autenticado, redirigir a login
        const currentUrl = window.location.href;
        const encodedRedirectUrl = encodeURIComponent(currentUrl);
        const loginUrl = `/login?redirectTo=${encodedRedirectUrl}`;
        
        console.log('Página de turnos: Usuario no autenticado, redirigiendo a:', loginUrl);
        router.replace(loginUrl); // Usar replace en lugar de push para evitar volver atrás
      } else {
        console.log('Página de turnos: Usuario autenticado, cargando formulario');
      }
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const loadForm = async () => {
      try {
        if (!params.slug) {
          throw new Error('No se encontró el formulario');
        }

        const formData = await formPublishService.getBySlug(params.slug as string);
        console.log('Formulario cargado (versión nueva):', formData);
        
        // Extraer los métodos de pago disponibles
        if (formData.settings?.paymentMethods?.available && 
            Array.isArray(formData.settings.paymentMethods.available) && 
            formData.settings.paymentMethods.available.length > 0) {
          setAvailablePaymentMethods(formData.settings.paymentMethods.available);
          console.log('Métodos de pago disponibles:', formData.settings.paymentMethods.available);
        } else {
          // Valor predeterminado si no hay métodos configurados
          setAvailablePaymentMethods(['local']);
          console.log('No se encontraron métodos de pago configurados, usando valor predeterminado');
        }
        
        // Actualizar el contexto de la organización
        if (formData.empresa_id) {
          // Obtener el país desde los metadatos del formulario
          const countryFromMetadata = formData.metadata?.country || null;
          console.log('🌍 País obtenido desde los metadatos del formulario:', countryFromMetadata);

          // El tipo Organization es exactamente igual a la tabla empresas en supabase
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
            country: countryFromMetadata, // Usar el país desde los metadatos
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
      <div className="container mx-auto px-0 py-0">
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
      <div className="container mx-auto px-0 py-0">
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
    <ShiftFormProvider formData={form} empresaId={form.empresa_id || ''} availablePaymentMethods={availablePaymentMethods}>
      <div className="min-h-screen bg-white">
        <div className="container mx-auto px-0 py-0">
          <div className="max-w-3xl mx-auto">
            <ShiftRegistrationForm form={form} />
          </div>
        </div>
      </div>
    </ShiftFormProvider>
  );
}
