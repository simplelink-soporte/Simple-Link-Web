"use client"

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
// import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Toaster } from 'sonner'
import { AuthProvider } from '@/contexts/AuthContext'
import { OrganizationProvider } from '@/contexts/OrganizationContext'
import { BranchProvider } from '@/contexts/BranchContext'
import { FormItemsProvider } from '@/contexts/FormItemsContext'
import { PaymentGatewayProvider } from '@/providers/PaymentGatewayProvider'
import { useEffect } from 'react'
import { initEmailJS, checkEmailJSConfig } from '@/lib/emailjs'

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // 5 minutos
        gcTime: 1000 * 60 * 30, // 30 minutos
        refetchOnWindowFocus: false, // Evitar refetch al cambiar de pestaña
        refetchOnReconnect: 'always',
        refetchOnMount: false,
        retry: (failureCount, error) => {
          if (error instanceof Error && error.message.includes('404')) {
            return false
          }
          return failureCount < 2
        },
        retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 10000)
      },
      mutations: {
        retry: 1,
        retryDelay: 1000
      }
    }
  })
}

// Mantener una instancia del cliente para el navegador
let browserQueryClient: QueryClient | undefined = undefined

function getQueryClient() {
  if (typeof window === 'undefined') {
    // Servidor: Siempre crear un nuevo cliente
    return makeQueryClient()
  }
  // Cliente: Crear el cliente una sola vez
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient()
  }
  return browserQueryClient
}

export function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient()
  
  // Inicializar EmailJS
  useEffect(() => {
    // Verificar la configuración de EmailJS
    const isConfigValid = checkEmailJSConfig();
    
    if (isConfigValid) {
      initEmailJS();
    } else {
      console.warn('EmailJS no se inicializó debido a configuración incompleta');
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <PaymentGatewayProvider>
          <OrganizationProvider>
            <BranchProvider>
              <FormItemsProvider>
                {children}
              </FormItemsProvider>
            </BranchProvider>
          </OrganizationProvider>
        </PaymentGatewayProvider>
      </AuthProvider>
      <Toaster 
        position="bottom-right"
        expand={false}
        closeButton
        theme="light"
        toastOptions={{
          style: {
            background: 'white',
            border: '1px solid #f4f4f5',
            color: '#18181b',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
            fontSize: '0.875rem',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          },
          className: 'font-mono',
          descriptionClassName: 'text-zinc-600 text-sm',
          actionClassName: 'font-mono',
        }}
      />
      {/* Devtools de React Query desactivados
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
      */}
    </QueryClientProvider>
  )
} 