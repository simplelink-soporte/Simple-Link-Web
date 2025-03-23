'use client'

import { useState, useEffect, Suspense } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { HelpCircle, Loader2, LogOut, Building } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useOnboarding } from "../../context/OnboardingContext"
import { loadStripe } from "@stripe/stripe-js"
import axios from "axios"
import { toast } from "sonner"
import { useSearchParams } from "next/navigation"

const fadeInVariants = {
  hidden: { 
    opacity: 0,
    y: 20
  },
  visible: { 
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: "easeOut"
    }
  }
}

interface BankAccount {
  cbu: string
  alias: string
  holder: string
}

// Configuración de Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

// Función para iniciar el proceso de OAuth de Stripe
const initiateStripeConnect = async () => {
  try {
    // Debugging: verificar variables de entorno
    console.log('📍 Variables de entorno:', {
      clientId: process.env.NEXT_PUBLIC_STRIPE_CLIENT_ID,
      appUrl: process.env.NEXT_PUBLIC_APP_URL,
    })

    // Construir la URL de autorización
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: process.env.NEXT_PUBLIC_STRIPE_CLIENT_ID!,
      scope: 'read_write',
      redirect_uri: 'https://app.simple-link.com/api/stripe/callback',
      'stripe_user[country]': 'AR',
      'stripe_user[business_type]': 'company',
      'stripe_user[product_description]': 'Reservas deportivas',
      state: 'origin:onboarding', // Usar el mismo formato que en BillingSettings para consistencia
    })

    const connectUrl = `https://connect.stripe.com/oauth/v2/authorize?${params.toString()}`
    console.log('📍 URL de conexión generada:', connectUrl)
    window.location.href = connectUrl
  } catch (error: any) {
    console.error("Error al conectar con Stripe:", error)
    toast.error("Error al conectar con Stripe. Por favor, intenta nuevamente.")
  }
}

export function IntegrationsStep() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <IntegrationsStepContent />
    </Suspense>
  )
}

function IntegrationsStepContent() {
  const { completeAndAdvance, completedSteps } = useOnboarding()
  const [isConnecting, setIsConnecting] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false)
  const [connectedEmail, setConnectedEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<string>("")
  const [accountId, setAccountId] = useState<string>("")
  const [charges_enabled, setChargesEnabled] = useState<boolean>(false)
  const [payouts_enabled, setPayoutsEnabled] = useState<boolean>(false)

  // Verificar el estado de conexión al cargar el componente
  useEffect(() => {
    const checkStripeConnection = async () => {
      try {
        setError(null)
        const response = await axios.get('/api/stripe/connection-status')
        console.log('Estado de conexión:', response.data)
        setIsConnected(response.data.connected)
        if (response.data.email) {
          setConnectedEmail(response.data.email)
        }
        setStatus(response.data.status)
        setAccountId(response.data.accountId)
        setChargesEnabled(response.data.charges_enabled)
        setPayoutsEnabled(response.data.payouts_enabled)
      } catch (error) {
        console.error("Error al verificar la conexión de Stripe:", error)
        setIsConnected(false)
        setConnectedEmail("")
        setError("No se pudo verificar el estado de la conexión")
      }
    }

    checkStripeConnection()
  }, [])

  // Manejar errores de la URL
  useEffect(() => {
    const error = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')
    const step = searchParams.get('step')
    
    // Ignoramos el caso cuando el usuario decide volver voluntariamente
    if (error === 'access_denied' && errorDescription?.includes('user denied')) {
      console.log('📍 Usuario decidió volver voluntariamente')
      return
    }
    
    // Solo manejamos otros tipos de errores
    if (error && !step) {
      setError(decodeURIComponent(error))
      setIsConnecting(false)
    }
  }, [searchParams])

  const handleConnect = async () => {
    try {
      setError(null)
      setIsConnecting(true)
      await initiateStripeConnect()
    } catch (error: any) {
      console.error("Error en la conexión:", error)
      setError(error.message || "Error al iniciar la conexión con Stripe")
      setIsConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    try {
      await axios.post('/api/stripe/disconnect')
      setIsConnected(false)
      setConnectedEmail("")
    } catch (error) {
      console.error("Error al desconectar:", error)
    }
  }

  const confirmDisconnect = () => {
    setIsConnected(false)
    setConnectedEmail("")
    setShowDisconnectDialog(false)
  }

  const handleContinue = () => {
    completeAndAdvance(2)
  }

  return (
    <motion.div
      className="p-2 md:p-6"
      initial="hidden"
      animate="visible"
      variants={fadeInVariants}
    >
      <div className="max-w-2xl space-y-8">
        {/* Sección de Stripe */}
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold">Conecta tu cuenta de Stripe</h2>
              <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                Requerido
              </span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle className="h-4 w-4 text-gray-400" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">
                      Stripe es una plataforma de pagos segura que te permite procesar pagos en línea.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="space-y-3">
              <p className="text-sm text-gray-500">
                Con Stripe, puedes procesar pagos con tarjetas de crédito y débito de manera rápida y segura. 
                El dinero se depositará directamente en tu cuenta bancaria.
              </p>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs font-medium text-gray-700 mb-2">
                  Beneficios de usar Stripe:
                </p>
                <ul className="space-y-2">
                  <li className="text-xs text-gray-500 flex items-start">
                    <span className="h-1 w-1 rounded-full bg-gray-300 mt-1.5 mr-2 shrink-0" />
                    <span>Solicita tarjeta como garantía y realiza cobros automáticos por cancelaciones o reservas</span>
                  </li>
                  <li className="text-xs text-gray-500 flex items-start">
                    <span className="h-1 w-1 rounded-full bg-gray-300 mt-1.5 mr-2 shrink-0" />
                    <span>Flexibilidad total: acepta pagos con tarjetas de crédito, débito y métodos locales</span>
                  </li>
                  <li className="text-xs text-gray-500 flex items-start">
                    <span className="h-1 w-1 rounded-full bg-gray-300 mt-1.5 mr-2 shrink-0" />
                    <span>Depósitos inmediatos en tu cuenta bancaria con liquidaciones automáticas</span>
                  </li>
                  <li className="text-xs text-gray-500 flex items-start">
                    <span className="h-1 w-1 rounded-full bg-gray-300 mt-1.5 mr-2 shrink-0" />
                    <span>Seguridad de nivel bancario y protección contra fraudes</span>
                  </li>
                  <li className="text-xs text-gray-500 flex items-start">
                    <span className="h-1 w-1 rounded-full bg-gray-300 mt-1.5 mr-2 shrink-0" />
                    <span>Panel de control intuitivo para gestionar pagos, reembolsos y reportes</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Estado de la conexión */}
          <div className="space-y-4">
            {isConnected ? (
              <div className="bg-gray-50 rounded-lg p-6 space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                    <p className="text-sm text-gray-600">
                      {connectedEmail}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <p className="text-sm text-gray-600">
                        Estado de cuenta: <span className="text-gray-900">{status === 'active' ? 'Activa' : status === 'pending' ? 'Pendiente' : 'Inactiva'}</span>
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-gray-600">
                        ID de cuenta: <span className="text-gray-900 font-mono">{accountId}</span>
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-gray-600">
                        Cobros habilitados: <span className="text-gray-900">{charges_enabled ? 'Sí' : 'No'}</span>
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-gray-600">
                        Pagos habilitados: <span className="text-gray-900">{payouts_enabled ? 'Sí' : 'No'}</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <Button
                onClick={handleConnect}
                className="w-full sm:w-auto bg-[#635bff]/90 hover:bg-[#635bff] text-white transition-colors"
                disabled={isConnecting}
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin text-white" />
                    Conectando...
                  </>
                ) : (
                  "Conectar con Stripe"
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Botón de continuar */}
        <div className="mt-8 flex justify-end">
          <Button
            onClick={handleContinue}
            className="px-8"
          >
            {isConnected ? "Continuar" : "Lo haré luego"}
          </Button>
        </div>

        {/* Diálogo de confirmación para desconectar */}
        <AlertDialog open={showDisconnectDialog} onOpenChange={setShowDisconnectDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Desconectar cuenta de Stripe?</AlertDialogTitle>
              <AlertDialogDescription>
                Al desconectar tu cuenta de Stripe, no podrás procesar pagos hasta que vuelvas a conectarla.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setShowDisconnectDialog(false)}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDisconnect}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Desconectar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-red-600">
              Error: {error}
            </p>
          </div>
        )}
      </div>
    </motion.div>
  )
} 