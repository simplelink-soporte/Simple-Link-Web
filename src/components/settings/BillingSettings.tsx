"use client"

import React, { useState, useEffect, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Icons } from "@/components/ui/icons"
import { NewBankAccountModal } from "@/components/settings/NewBankAccountModal"
import { useAuth } from "@/contexts/AuthContext"
import { useToast } from "@/components/ui/use-toast"
import { Skeleton } from "@/components/ui/skeleton"
import { useOrganization } from "@/contexts/OrganizationContext"
import { motion } from "framer-motion"
import { StripeDisconnectWarning } from "@/components/ui/stripe-disconnect-warning"
import { stripeConnectionService } from '@/services/stripeConnectionService'
import { useQueryClient } from "@tanstack/react-query"
import { MercadoPagoDisconnectWarning } from "../ui/mercadopago-disconnect-warning"
import { useSearchParams } from "next/navigation"

interface BillingConfig {
  mercadoPagoConnected: boolean
  bankAccountConnected: boolean
}

interface StripeConnection {
  id: string
  empresa_id: string
  stripe_account_id: string
  account_type: string
  account_status: string
  created_at: string
  updated_at: string
  account_details?: {
    business_type?: string
    charges_enabled?: boolean
    payouts_enabled?: boolean
    requirements?: {
      currently_due: string[]
      eventually_due: string[]
      past_due: string[]
    }
  }
  stripe_account_email: string
}

export function BillingSettings() {
  const { user } = useAuth()
  const { organization } = useOrganization()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [showDisconnectWarning, setShowDisconnectWarning] = useState(false)
  const [showMpDisconnectWarning, setShowMpDisconnectWarning] = useState(false)
  const [isConnectingMP, setIsConnectingMP] = useState(false)
  const [config, setConfig] = useState<BillingConfig>({
    mercadoPagoConnected: false,
    bankAccountConnected: false
  })
  const [showBankModal, setShowBankModal] = useState(false)
  const queryClient = useQueryClient()

  // Consulta para obtener la información de la cuenta de Stripe
  const { data: stripeConnection, isLoading: isLoadingStripe } = useQuery<StripeConnection>({
    queryKey: ['stripeConnection', organization?.id],
    queryFn: async () => {
      try {
        if (!organization?.id) {
          throw new Error('No hay organización seleccionada')
        }
        
        console.log('📍 Consultando conexión de Stripe para empresa:', organization.id)
        const response = await fetch(`/api/stripe/connection/${organization.id}`)
        
        if (!response.ok) {
          throw new Error(`Error al cargar la información de Stripe: ${response.status}`)
        }
        
        const data = await response.json()
        console.log('✅ Datos de conexión Stripe recibidos:', data)
        
        // Si no hay datos o la conexión no existe, retornamos null
        if (!data || !data.id) {
          return null
        }
        
        return data
      } catch (error) {
        console.error('❌ Error fetching Stripe connection:', error)
        return null // En caso de error, retornamos null
      }
    },
    enabled: !!organization?.id
  })

  // Verificar si el país es compatible con Mercado Pago
  const isMercadoPagoSupported = useMemo(() => {
    // Solo Argentina es compatible para mostrar la opción de Mercado Pago
    const supportedCountries = ['Argentina'];
    return organization?.country ? supportedCountries.includes(organization.country) : false;
  }, [organization?.country]);

  // Estado para manejar la conexión de Mercado Pago
  const { data: mpConnection, isLoading: isLoadingMP } = useQuery({
    queryKey: ['mercadoPagoConnection', organization?.id],
    queryFn: async () => {
      if (!organization?.id) {
        throw new Error('No hay organización seleccionada');
      }
      
      try {
        console.log('📍 Consultando conexión de Mercado Pago para empresa:', organization.id);
        const response = await fetch(`/api/mercadopago/connection/${organization.id}`);
        
        if (!response.ok) {
          console.error(`❌ Error al cargar la información de Mercado Pago: ${response.status}`);
          throw new Error(`Error al cargar la información de Mercado Pago: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('✅ Respuesta de API Mercado Pago:', data);
        
        if (data.error || !data.country_supported) {
          console.log('⚠️ País no soportado o error en la respuesta:', data.error || 'País no soportado');
          return { country_supported: false, connection: null };
        }
        
        console.log('🔗 Estado de conexión Mercado Pago:', data.connection ? 'Conectado' : 'No conectado');
        return {
          country_supported: true,
          connection: data.connection || null
        };
      } catch (error) {
        console.error('❌ Error fetching MercadoPago connection:', error);
        return { country_supported: false, connection: null };
      }
    },
    enabled: organization?.id ? true : false, // Siempre verificar la conexión si tenemos ID de organización
    refetchOnWindowFocus: true,
    staleTime: 1000 * 60 * 5, // Caché de 5 minutos
  });

  const handleInputChange = (field: keyof BillingConfig, value: boolean) => {
    setConfig(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleStripeConnect = async () => {
    try {
      if (!organization?.id) {
        toast({
          title: "Error",
          description: "No se encontró la empresa asociada",
          variant: "destructive"
        })
        return
      }

      // Construir la URL de autorización
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
      const params = new URLSearchParams({
        response_type: 'code',
        client_id: process.env.NEXT_PUBLIC_STRIPE_CLIENT_ID!,
        scope: 'read_write',
        redirect_uri: `${baseUrl.replace(/\/$/, '')}/api/stripe/callback`,
        'stripe_user[country]': 'AR',
        'stripe_user[business_type]': 'company',
        'stripe_user[product_description]': 'Reservas deportivas',
        state: 'origin:settings', // Indicar que venimos de settings
      })

      const connectUrl = `https://connect.stripe.com/oauth/authorize?${params.toString()}`
      window.location.href = connectUrl
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo iniciar la conexión con Stripe",
        variant: "destructive"
      })
    }
  }

  const handleStripeDisconnect = async () => {
    try {
      if (!stripeConnection?.id) {
        throw new Error('No hay conexión de Stripe para desconectar')
      }

      // Usar el servicio para eliminar la conexión
      const success = await stripeConnectionService.deleteConnection(stripeConnection.id)

      if (!success) {
        throw new Error('Error al desconectar Stripe')
      }

      toast({
        title: "Éxito",
        description: "Cuenta de Stripe desconectada correctamente"
      })
      
      // Cerrar el diálogo de confirmación
      setShowDisconnectWarning(false)

      // Invalidar la consulta para actualizar la UI
      await queryClient.invalidateQueries({ queryKey: ['stripeConnection'] })
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo desconectar la cuenta de Stripe",
        variant: "destructive"
      })
    }
  }

  const handleMercadoPagoConnect = async () => {
    try {
      if (!organization?.id) {
        setIsConnectingMP(false);
        toast({
          title: "Error",
          description: "No se encontró la empresa asociada",
          variant: "destructive"
        })
        return
      }

      // Solicitar URL de autorización al backend
      const response = await fetch(`/api/mercadopago/connect?empresa_id=${organization.id}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        setIsConnectingMP(false);
        throw new Error(errorData.error || 'Error al iniciar la conexión con Mercado Pago');
      }
      
      const { url } = await response.json();
      
      // Registrar el inicio de la conexión
      console.log('Redirigiendo a Mercado Pago OAuth:', url);
      
      // Mostrar mensaje informativo antes de redirigir
      toast({
        title: "Conectando con Mercado Pago",
        description: "Serás redirigido a Mercado Pago para autorizar la conexión",
        variant: "default"
      });
      
      // Pequeña demora para permitir que se muestre el toast
      setTimeout(() => {
        // Redirigir al usuario a la página de autorización de Mercado Pago
        window.location.href = url;
      }, 1000);
      
    } catch (error) {
      setIsConnectingMP(false);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo iniciar la conexión con Mercado Pago",
        variant: "destructive"
      })
    }
  }

  const handleMercadoPagoDisconnect = async () => {
    try {
      if (!mpConnection?.connection?.id) {
        throw new Error('No hay conexión de Mercado Pago para desconectar')
      }

      const response = await fetch(`/api/mercadopago/connection/${mpConnection.connection.id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('Error al desconectar Mercado Pago')
      }

      toast({
        title: "Éxito",
        description: "Cuenta de Mercado Pago desconectada correctamente"
      })
      
      // Cerrar el diálogo de confirmación
      setShowMpDisconnectWarning(false)

      // Invalidar la consulta para actualizar la UI
      await queryClient.invalidateQueries({ queryKey: ['mercadoPagoConnection'] })
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo desconectar la cuenta de Mercado Pago",
        variant: "destructive"
      })
    }
  }

  const hasPendingRequirements = stripeConnection?.account_details?.requirements?.currently_due && 
    stripeConnection.account_details.requirements.currently_due.length > 0

  useEffect(() => {
    const success = searchParams.get('success')
    const mpSuccess = searchParams.get('mp_success')
    const error = searchParams.get('error')
    
    if (success === 'true' || mpSuccess === 'true') {
      toast({
        title: "¡Conexión exitosa!",
        description: "Tu cuenta de Mercado Pago ha sido conectada exitosamente.",
        variant: "default"
      })
      // Actualizar datos inmediatamente
      if (organization?.id) {
        console.log('🔄 Invalidando consulta de Mercado Pago después de conexión exitosa');
        queryClient.invalidateQueries({ queryKey: ['mercadoPagoConnection', organization.id] })
      }
    } else if (error) {
      let errorMessage = "No se pudo conectar con Mercado Pago."
      
      switch (error) {
        case 'auth_failed':
          errorMessage = "La autorización fue rechazada o cancelada."
          break
        case 'token_failed':
          errorMessage = "Error al obtener token de acceso."
          break
        case 'user_info_failed':
          errorMessage = "Error al obtener información del usuario."
          break
        case 'country_not_supported':
          errorMessage = "Mercado Pago solo está disponible para empresas de Argentina o México."
          break
        case 'db_failed':
          errorMessage = "Error al guardar la conexión en la base de datos."
          break
        case 'missing_params':
          errorMessage = "Faltan parámetros requeridos para la conexión."
          break
        case 'invalid_company':
          errorMessage = "No se encontró la empresa asociada."
          break
        case 'configuration_error':
          errorMessage = "Error de configuración en el servidor."
          break
      }
      
      toast({
        title: "Error de conexión",
        description: errorMessage,
        variant: "destructive"
      })
    }
    
    // Limpiar parámetros de URL después de procesarlos
    if (success || mpSuccess || error) {
      // En Next.js no podemos modificar directamente los parámetros URL sin navegación,
      // por lo que usaremos la History API para limpiar la URL sin recargar la página
      const url = new URL(window.location.href)
      url.searchParams.delete('success')
      url.searchParams.delete('mp_success')
      url.searchParams.delete('error')
      window.history.replaceState({}, '', url.toString())
    }
  }, [searchParams, toast, organization?.id, queryClient])

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.3 }}
      className="space-y-8"
    >
      {/* Contenedor de dos columnas para pasarelas de pago */}
      <div className="space-y-4">
        <h3 className="text-xl font-medium">Pasarelas de pago</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Sección de Stripe */}
          <Card className="w-full">
            <CardHeader className="!pb-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Stripe</h2>
                {/* Logo eliminado a petición del usuario */}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {isLoadingStripe ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-gray-500 mb-4 leading-relaxed">
                      {stripeConnection 
                        ? "Tu cuenta de Stripe está conectada y lista para procesar pagos."
                        : "Conecta Stripe para procesar pagos con tarjeta y más métodos."}
                    </p>

                    {stripeConnection ? (
                      <div className="space-y-3">
                        <div className="space-y-1 text-sm">
                          <p className="text-gray-600">
                            Cuenta: {stripeConnection.stripe_account_email}
                          </p>
                          <p className="text-gray-600">
                            Estado: {stripeConnection.account_status}
                          </p>
                          {hasPendingRequirements && (
                            <div className="text-amber-600">
                              <p>Requisitos pendientes: {stripeConnection.account_details?.requirements?.currently_due?.length}</p>
                              <Button
                                variant="link"
                                className="h-auto p-0 text-amber-600 hover:text-amber-700"
                                onClick={() => window.open('https://dashboard.stripe.com', '_blank')}
                              >
                                Completar requisitos →
                              </Button>
                            </div>
                          )}
                          <div className="mt-3">
                            <Button
                              variant="link"
                              className="h-auto p-0 text-gray-500 hover:text-gray-700 transition-colors"
                              onClick={() => setShowDisconnectWarning(true)}
                            >
                              Desconectar cuenta
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <Button
                        variant="link"
                        className="h-auto p-0 text-gray-900 hover:text-gray-700 transition-colors"
                        onClick={handleStripeConnect}
                      >
                        Conectar
                      </Button>
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Sección de Mercado Pago - Solo visible para empresas de Argentina o México */}
          {isMercadoPagoSupported && (
            <Card className="w-full">
              <CardHeader className="!pb-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Mercado Pago</h2>
                  {/* Logo eliminado a petición del usuario */}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {isLoadingMP && (
                    <div className="space-y-4">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-10 w-32" />
                    </div>
                  )}
                  
                  {!isLoadingMP && (
                    <>
                      {!isMercadoPagoSupported ? (
                        <div className="text-sm text-muted-foreground">
                          <p>Mercado Pago solo está disponible para empresas de Argentina o México.</p>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm text-gray-500 mb-4 leading-relaxed">
                            {mpConnection?.connection 
                              ? "Tu cuenta de Mercado Pago está conectada y lista para procesar pagos."
                              : "Conecta tu cuenta de Mercado Pago para procesar pagos."}
                          </p>

                          {mpConnection?.connection ? (
                            <div className="space-y-3">
                              <div className="space-y-1 text-sm">
                                <p className="text-gray-600">
                                  Cuenta: {mpConnection.connection.mercadopago_email}
                                </p>
                                <p className="text-gray-600">
                                  Estado: <span className="font-medium">Activo</span>
                                </p>
                                <Button
                                  variant="link"
                                  className="h-auto p-0 text-gray-500 hover:text-gray-700 transition-colors"
                                  onClick={() => setShowMpDisconnectWarning(true)}
                                >
                                  Desconectar cuenta
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => {
                                  setIsConnectingMP(true)
                                  handleMercadoPagoConnect()
                                }}
                                disabled={isConnectingMP}
                              >
                                {isConnectingMP ? (
                                  <>
                                    <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                                    Conectando...
                                  </>
                                ) : (
                                  <>Conectar Mercado Pago</>
                                )}
                              </Button>
                            </div>
                          )}
                        </>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Sección de Ayuda */}
      <div className="border-t border-gray-100 pt-4">
        <div className="flex flex-col gap-2">
          <p className="text-sm text-gray-900">
            ¿Necesitas ayuda?
          </p>
          <div className="text-sm text-gray-500">
            <p>Contáctenos en:</p>
            <div className="mt-1 space-y-1">
              <p className="text-gray-600">
                <a 
                  href="mailto:soportesimplelink@gmail.com"
                  className="hover:text-gray-900 transition-colors"
                >
                  soportesimplelink@gmail.com
                </a>
              </p>
              <p className="text-gray-600">
                <a 
                  href="https://www.simple-link.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-gray-900 transition-colors"
                >
                  www.simple-link.com
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
      <div>
        <StripeDisconnectWarning 
          show={showDisconnectWarning}
          onConfirm={handleStripeDisconnect}
          onCancel={() => setShowDisconnectWarning(false)}
        />

        <MercadoPagoDisconnectWarning 
          show={showMpDisconnectWarning}
          onConfirm={handleMercadoPagoDisconnect}
          onCancel={() => setShowMpDisconnectWarning(false)}
        />

        <NewBankAccountModal 
          open={showBankModal}
          onOpenChange={setShowBankModal}
          onConfirm={() => handleInputChange('bankAccountConnected', true)}
        />
      </div>
    </motion.div>
  )
}