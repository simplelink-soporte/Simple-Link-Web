'use client';

import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { OrganizationProvider } from '@/contexts/OrganizationContext';
import { FormProvider } from '@/contexts/FormContext';
import { useInitialForm } from '@/hooks/forms/use-initial-form';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

interface FormsLayoutProps {
  children: React.ReactNode;
}

// Componente de seguridad para asegurar la autenticación
function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  // Si no hay usuario después de cargar, redirigir al login
  if (!isLoading && !user) {
    console.log('AuthGuard - Usuario no autenticado, redirigiendo a login');
    router.push('/admin/login');
    return null;
  }

  // Verificar si el usuario tiene permisos de administrador
  if (!isLoading && user) {
    const hasAdminAccess = user.role === 'admin' || user.role === 'superadmin';
    
    if (!hasAdminAccess) {
      console.log('AuthGuard - Usuario sin permisos de administrador:', user.role);
      router.push('/unauthorized');
      return null;
    }
  }

  // Renderizar el contenedor con el estado de carga o el contenido
  return (
    <div className="fixed inset-0 overflow-hidden z-0">
      <main className="absolute inset-0 lg:left-[240px]">
        <div className="absolute inset-[8px]">
          <div className="bg-white rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.02)] w-full h-full overflow-auto scrollbar-none">
            <div className="px-6 py-4">
              {isLoading ? (
                <div className="h-full w-full flex items-center justify-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800"></div>
                    <p className="text-sm text-gray-500">Verificando autenticación...</p>
                  </div>
                </div>
              ) : (
                children
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// Componente envoltorio para usar hooks
function WrappedFormProvider({ children }: { children: React.ReactNode }) {
  const { initialForm, isLoading, error } = useInitialForm();
  const router = useRouter();

  // Mostrar estado de carga
  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800"></div>
          <p className="text-sm text-gray-500">Cargando formulario...</p>
        </div>
      </div>
    );
  }

  // Mostrar error si existe
  if (error) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="p-4 bg-red-50 rounded-lg">
            <p className="text-red-600">{error.message}</p>
          </div>
          <Button
            variant="outline"
            onClick={() => router.push('/admin/dashboard')}
          >
            Volver al Dashboard
          </Button>
        </div>
      </div>
    );
  }

  // Si no hay formulario inicial después de la carga, mostrar error
  if (!initialForm) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="p-4 bg-yellow-50 rounded-lg">
            <p className="text-yellow-600">No se pudo inicializar el formulario</p>
          </div>
          <Button
            variant="outline"
            onClick={() => router.push('/admin/dashboard')}
          >
            Volver al Dashboard
          </Button>
        </div>
      </div>
    );
  }

  console.log('✅ Renderizando FormProvider con initialForm:', initialForm);

  return (
    <FormProvider initialForm={initialForm}>
      {children}
    </FormProvider>
  );
}

// Componente principal del layout
export default function FormsLayout({ children }: FormsLayoutProps) {
  return (
    <AuthProvider>
      <AuthGuard>
        <OrganizationProvider>
          <WrappedFormProvider>
            {children}
          </WrappedFormProvider>
        </OrganizationProvider>
      </AuthGuard>
    </AuthProvider>
  );
} 