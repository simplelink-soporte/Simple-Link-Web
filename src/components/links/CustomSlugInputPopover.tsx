import { useState, useEffect } from 'react'
import { Edit, HelpCircle, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useOrganization } from '@/contexts/OrganizationContext'
import { Alert, AlertDescription } from "@/components/ui/alert"

interface CustomSlugInputPopoverProps {
  onUpdate: (slug: string) => void
  isLoading: boolean
  defaultSlug?: string
  linkType: 'classes' | 'bookings'
  children?: React.ReactNode
}

export function CustomSlugInputPopover({ 
  onUpdate, 
  isLoading, 
  defaultSlug = '', 
  linkType,
  children 
}: CustomSlugInputPopoverProps) {
  const [slug, setSlug] = useState(defaultSlug)
  const [isOpen, setIsOpen] = useState(false)
  const [paymentOptions, setPaymentOptions] = useState<string[]>(["local"])
  const { loadStripeConnection } = useOrganization()
  const [stripeConnection, setStripeConnection] = useState<{
    stripe_account_id: string;
    charges_enabled: boolean;
    account_status: string;
  } | null>(null);
  const [isLoadingStripe, setIsLoadingStripe] = useState(false);
  const [stripeError, setStripeError] = useState<string | null>(null);
  const [stripeVerified, setStripeVerified] = useState(false);

  const basePath = linkType === 'classes' ? '/clases/' : '/reservas/'

  const checkStripeConnection = async () => {
    // Si ya verificamos anteriormente y no hay conexión válida, no necesitamos verificar de nuevo
    if (stripeVerified && !isValidStripeConnection(stripeConnection)) {
      return false;
    }
    
    // Si ya verificamos anteriormente y hay conexión válida, no necesitamos verificar de nuevo
    if (stripeVerified && isValidStripeConnection(stripeConnection)) {
      return true;
    }
    
    setIsLoadingStripe(true);
    setStripeError(null);
    
    try {
      const connection = await loadStripeConnection();
      setStripeConnection(connection);
      setStripeVerified(true);
      
      return isValidStripeConnection(connection);
    } catch (error) {
      console.error("Error al verificar la conexión de Stripe:", error);
      setStripeError("Error al verificar la conexión de Stripe");
      setStripeConnection(null);
      return false;
    } finally {
      setIsLoadingStripe(false);
    }
  };

  const isValidStripeConnection = (connection: any) => {
    return connection && 
           connection.stripe_account_id && 
           connection.charges_enabled && 
           connection.account_status === 'active';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (slug.trim()) {
      onUpdate(slug.trim())
      setIsOpen(false)
    }
  }

  const optionsRequiringStripe = ["garantia", "sena", "completo"];

  const togglePaymentOption = async (value: string) => {
    // Si está intentando desmarcar una opción, permitirlo siempre
    if (paymentOptions.includes(value)) {
      setPaymentOptions(prev => prev.filter(item => item !== value));
      return;
    }
    
    // Si está intentando marcar una opción que requiere Stripe
    if (optionsRequiringStripe.includes(value)) {
      const isValid = await checkStripeConnection();
      
      if (!isValid) {
        // No permitir seleccionar la opción si no hay conexión válida
        return;
      }
    }
    
    // Si llegamos aquí, podemos agregar la opción
    setPaymentOptions(prev => [...prev, value]);
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        {children || (
          <Button
            disabled={isLoading}
            className="h-8 w-8 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            variant="ghost" 
            size="icon"
            title="Editar enlace"
          >
            <Edit className="h-3.5 w-3.5" />
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent 
        className="w-96 p-5" 
        align="end"
        sideOffset={4}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <h4 className="font-medium text-sm text-gray-900">
              Personaliza tu enlace
            </h4>
            <p className="text-xs text-gray-500">
              Elige un nombre único para tu enlace de {linkType === 'classes' ? 'clases' : 'reservas'}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <span className="text-xs font-mono text-gray-500">{basePath}</span>
              <div className="flex-1">
                <Input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase())}
                  placeholder="mi-empresa"
                  className={cn(
                    "h-8 bg-gray-50 text-xs font-mono",
                    "placeholder:text-gray-400",
                    "focus-visible:ring-0 focus-visible:ring-offset-0 focus:ring-0 focus:ring-offset-0",
                    "border-gray-200 focus:border-gray-200 focus-visible:border-gray-200",
                    "outline-none shadow-none",
                    "transition-none"
                  )}
                  pattern="[a-z0-9-]+"
                  title="Solo letras minúsculas, números y guiones"
                />
              </div>
            </div>
          </div>

          {linkType === 'bookings' && (
            <>
              <Separator className="my-3" />
              
              <div className="space-y-2">
                <div>
                  <h4 className="font-medium text-sm text-gray-900">
                    Métodos de pago disponibles
                  </h4>
                  <p className="text-xs text-gray-500">Puedes seleccionar múltiples opciones</p>
                </div>
                
                {isLoadingStripe && (
                  <div className="flex items-center justify-center space-x-2 py-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-500" />
                    <p className="text-xs text-gray-500">Verificando configuración de Stripe...</p>
                  </div>
                )}

                {stripeError && (
                  <Alert variant="destructive" className="py-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      {stripeError}
                    </AlertDescription>
                  </Alert>
                )}

                {stripeVerified && !isValidStripeConnection(stripeConnection) && !isLoadingStripe && (
                  <Alert className="bg-amber-50 text-amber-800 border-amber-200 py-2">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    <AlertDescription className="text-xs">
                      Para habilitar opciones de pago con tarjeta, debe conectar su cuenta de Stripe en la configuración.
                    </AlertDescription>
                  </Alert>
                )}
                
                <div className="space-y-3 mt-3">
                  <TooltipProvider>
                    <div className="flex items-start space-x-3">
                      <Checkbox 
                        id="local" 
                        checked={paymentOptions.includes("local")}
                        onCheckedChange={() => togglePaymentOption("local")}
                        className="mt-1"
                      />
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="local" className="text-sm font-medium">
                            Pago en el local
                          </Label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-5 w-5 rounded-full p-0">
                                <HelpCircle className="h-3.5 w-3.5 text-gray-400" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-72 text-xs">
                              <p>El cliente pagará directamente en el establecimiento</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <p className="text-xs text-gray-500">El cliente pagará directamente en el establecimiento</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3">
                      <Checkbox 
                        id="garantia" 
                        checked={paymentOptions.includes("garantia")}
                        onCheckedChange={() => togglePaymentOption("garantia")}
                        className="mt-1"
                        disabled={stripeVerified && !isValidStripeConnection(stripeConnection) || isLoadingStripe}
                      />
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center justify-between">
                          <Label 
                            htmlFor="garantia" 
                            className={`text-sm font-medium ${stripeVerified && !isValidStripeConnection(stripeConnection) ? 'text-gray-400' : ''}`}
                          >
                            Garantía con tarjeta
                          </Label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-5 w-5 rounded-full p-0">
                                <HelpCircle className="h-3.5 w-3.5 text-gray-400" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-72 text-xs">
                              <p>Se solicita tarjeta como garantía que se cobrará en caso de no asistencia</p>
                              {stripeVerified && !isValidStripeConnection(stripeConnection) && (
                                <p className="text-amber-600 mt-1">Requiere cuenta de Stripe conectada</p>
                              )}
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <p className="text-xs text-gray-500">Se solicita tarjeta como garantía que se cobrará en caso de no asistencia</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3">
                      <Checkbox 
                        id="sena" 
                        checked={paymentOptions.includes("sena")}
                        onCheckedChange={() => togglePaymentOption("sena")}
                        className="mt-1"
                        disabled={stripeVerified && !isValidStripeConnection(stripeConnection) || isLoadingStripe}
                      />
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center justify-between">
                          <Label 
                            htmlFor="sena" 
                            className={`text-sm font-medium ${stripeVerified && !isValidStripeConnection(stripeConnection) ? 'text-gray-400' : ''}`}
                          >
                            Pago de seña
                          </Label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-5 w-5 rounded-full p-0">
                                <HelpCircle className="h-3.5 w-3.5 text-gray-400" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-72 text-xs">
                              <p>El cliente paga un porcentaje por adelantado como reserva</p>
                              {stripeVerified && !isValidStripeConnection(stripeConnection) && (
                                <p className="text-amber-600 mt-1">Requiere cuenta de Stripe conectada</p>
                              )}
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <p className="text-xs text-gray-500">El cliente paga un porcentaje por adelantado como reserva</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3">
                      <Checkbox 
                        id="completo" 
                        checked={paymentOptions.includes("completo")}
                        onCheckedChange={() => togglePaymentOption("completo")}
                        className="mt-1"
                        disabled={stripeVerified && !isValidStripeConnection(stripeConnection) || isLoadingStripe}
                      />
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center justify-between">
                          <Label 
                            htmlFor="completo" 
                            className={`text-sm font-medium ${stripeVerified && !isValidStripeConnection(stripeConnection) ? 'text-gray-400' : ''}`}
                          >
                            Pago completo
                          </Label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-5 w-5 rounded-full p-0">
                                <HelpCircle className="h-3.5 w-3.5 text-gray-400" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-72 text-xs">
                              <p>El cliente paga el monto total por adelantado</p>
                              {stripeVerified && !isValidStripeConnection(stripeConnection) && (
                                <p className="text-amber-600 mt-1">Requiere cuenta de Stripe conectada</p>
                              )}
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <p className="text-xs text-gray-500">El cliente paga el monto total por adelantado</p>
                      </div>
                    </div>
                  </TooltipProvider>
                </div>
              </div>
            </>
          )}

          <div className="flex justify-end pt-2">
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsOpen(false)}
                className={cn(
                  "text-xs text-gray-600 hover:text-gray-900",
                  "hover:bg-gray-100",
                  "h-7 px-2"
                )}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={!slug.trim() || isLoading}
                variant="ghost"
                className={cn(
                  "text-xs text-gray-900 hover:text-gray-900",
                  "hover:bg-gray-100",
                  "font-medium",
                  "h-7 px-2"
                )}
              >
                Actualizar
              </Button>
            </div>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  )
}