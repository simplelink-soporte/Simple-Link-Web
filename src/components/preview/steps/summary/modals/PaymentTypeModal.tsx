'use client';

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { PaymentType, PAYMENT_TYPES } from "../types";
import { useStripeConnection } from "@/hooks/useStripeConnection";
import { toast } from "sonner";
import { PaymentTypeCarousel } from "../components/PaymentTypeCarousel";

// Filtrar solo los tipos de pago que queremos mostrar
const FILTERED_PAYMENT_TYPES = PAYMENT_TYPES.filter(type => 
  !['card', 'cash'].includes(type.id)
);

interface PaymentTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: 'light' | 'dark';
  viewType: "mobile" | "desktop";
  onSelect: (type: PaymentType['id']) => void;
  onShowCardModal: () => void;
  isPublicView?: boolean;
  empresaId: string;
}

export function PaymentTypeModal({
  isOpen,
  onClose,
  theme,
  viewType,
  onSelect,
  onShowCardModal,
  isPublicView = false,
  empresaId
}: PaymentTypeModalProps) {
  const [selectedType, setSelectedType] = useState<PaymentType | null>(null);
  const { isConnected, isLoading, error, stripeAccountId } = useStripeConnection(empresaId);
  const [verifyingToast, setVerifyingToast] = useState<string | null>(null);

  // Agregar logs para debugging
  useEffect(() => {
    if (isOpen) {
      console.log('[PaymentTypeModal] Estado de conexión:', {
        empresaId,
        isConnected,
        isLoading,
        error,
        stripeAccountId
      });
    }
  }, [isOpen, empresaId, isConnected, isLoading, error, stripeAccountId]);

  // Detección automática de selección de garantía desde localStorage
  useEffect(() => {
    if (isOpen) {
      // Verificar si hay una marca en localStorage para seleccionar garantía automáticamente
      const shouldAutoSelectGuarantee = window.localStorage.getItem('auto_select_guarantee') === 'true';
      const timestamp = window.localStorage.getItem('guarantee_selection_timestamp');
      
      // Verificar que la marca no sea muy antigua (menos de 30 segundos)
      const isTimestampValid = timestamp && (Date.now() - parseInt(timestamp)) < 30000;
      
      if (shouldAutoSelectGuarantee && isTimestampValid) {
        console.log('[PaymentTypeModal] Detectada selección automática de garantía');
        
        // Encontrar el tipo de pago "guarantee"
        const guaranteeType = FILTERED_PAYMENT_TYPES.find(type => type.id === 'guarantee');
        
        if (guaranteeType) {
          console.log('[PaymentTypeModal] Procesando selección automática de garantía');
          // Simular la selección del tipo garantía
          setSelectedType(guaranteeType);
          
          // Verificar la conexión con Stripe y proceder si todo está bien
          if (isLoading) {
            const toastId = toast.loading('Verificando conexión con Stripe...').toString();
            setVerifyingToast(toastId);
          } else if (error) {
            toast.error('Error al verificar la conexión con Stripe');
            // Limpiar localStorage
            window.localStorage.removeItem('auto_select_guarantee');
            window.localStorage.removeItem('guarantee_selection_timestamp');
          } else if (!isConnected) {
            toast.error('El club debe configurar Stripe para aceptar garantías');
            // Limpiar localStorage
            window.localStorage.removeItem('auto_select_guarantee');
            window.localStorage.removeItem('guarantee_selection_timestamp');
          } else {
            // Si todo está bien, proceder con la selección automática
            console.log('[PaymentTypeModal] Selección automática exitosa, cerrando modal');
            onClose();
            onSelect('guarantee');
            
            // Disparar un evento custom para notificar que se completó la selección
            // Emitir el evento tanto en document como en window para garantizar compatibilidad
            document.dispatchEvent(new CustomEvent('guarantee-selection-completed'));
            window.dispatchEvent(new CustomEvent('guarantee-selection-completed'));
            
            // Mostrar el modal de tarjeta
            if (onShowCardModal) {
              onShowCardModal();
            } else {
              toast.error('Error: No se puede mostrar el formulario de tarjeta');
            }
            
            // Limpiar localStorage
            window.localStorage.removeItem('auto_select_guarantee');
            window.localStorage.removeItem('guarantee_selection_timestamp');
          }
        }
      }
    }
  }, [isOpen, isConnected, isLoading, error, onClose, onSelect, onShowCardModal]);

  // Limpiar toast al cerrar el modal
  useEffect(() => {
    if (!isOpen && verifyingToast) {
      toast.dismiss(verifyingToast);
      setVerifyingToast(null);
    }
  }, [isOpen, verifyingToast]);

  // Actualizar estado cuando cambia la conexión
  useEffect(() => {
    if (verifyingToast) {
      if (!isLoading) {
        toast.dismiss(verifyingToast);
        setVerifyingToast(null);

        if (error) {
          toast.error('Error al verificar la conexión con Stripe');
        } else if (!isConnected) {
          toast.error('El club debe configurar Stripe para aceptar garantías');
        } else if (selectedType?.id === 'guarantee') {
          // Proceder con la selección
          onClose();
          onSelect('guarantee');
          if (onShowCardModal) {
            onShowCardModal();
          } else {
            toast.error('Error: No se puede mostrar el formulario de tarjeta');
          }
        }
      }
    }
  }, [isLoading, error, isConnected, verifyingToast, selectedType, onClose, onSelect, onShowCardModal]);

  const handleTypeSelect = async (type: PaymentType) => {
    setSelectedType(type);

    if (type.id === 'guarantee') {
      if (isLoading) {
        const toastId = toast.loading('Verificando conexión con Stripe...').toString();
        setVerifyingToast(toastId);
        return;
      }

      if (error) {
        toast.error('Error al verificar la conexión con Stripe');
        return;
      }

      if (!isConnected) {
        toast.error('El club debe configurar Stripe para aceptar garantías');
        return;
      }

      // Si todo está bien, proceder
      onClose();
      onSelect(type.id);
      
      // Disparar evento de selección completada para ambos contextos
      document.dispatchEvent(new CustomEvent('guarantee-selection-completed'));
      window.dispatchEvent(new CustomEvent('guarantee-selection-completed'));
      
      if (onShowCardModal) {
        onShowCardModal();
      } else {
        toast.error('Error: No se puede mostrar el formulario de tarjeta');
      }
    } else {
      onSelect(type.id);
      onClose();
    }
  };

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <>
          {/* Overlay con efecto de blur mejorado */}
          <motion.div
            initial={{ 
              opacity: 0,
              backdropFilter: "blur(0px)",
              WebkitBackdropFilter: "blur(0px)"
            }}
            animate={{ 
              opacity: 1,
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)"
            }}
            exit={{ 
              opacity: 0,
              backdropFilter: "blur(0px)",
              WebkitBackdropFilter: "blur(0px)"
            }}
            transition={{ 
              duration: 0.2,
              ease: "easeInOut"
            }}
            className={cn(
              "fixed inset-0",
              "z-[100]",
              theme === 'dark'
                ? "bg-neutral-900/40"
                : "bg-white/40",
              "backdrop-blur-[8px]",
              "transition-all duration-200"
            )}
            onClick={onClose}
          />

          {/* Modal con animación mejorada */}
          <motion.div
            initial={viewType === "mobile" 
              ? { 
                  y: "100%",
                  opacity: 1,
                  scale: 1
                }
              : { 
                  y: 20,
                  opacity: 0,
                  scale: 0.95
                }
            }
            animate={{ 
              y: 0,
              opacity: 1,
              scale: 1
            }}
            exit={viewType === "mobile"
              ? { 
                  y: "100%",
                  opacity: 1,
                  scale: 1
                }
              : { 
                  y: 20,
                  opacity: 0,
                  scale: 0.95
                }
            }
            transition={{
              duration: 0.2,
              ease: [0.32, 0.72, 0, 1]
            }}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "fixed z-[101]",
              viewType === "mobile"
                ? "bottom-0 left-0 right-0 max-h-[90vh]"
                : "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] max-h-[85vh]",
              theme === 'dark' 
                ? "bg-neutral-900/95" 
                : "bg-white/95",
              "shadow-2xl",
              "rounded-t-xl overflow-hidden",
              "flex flex-col",
              "ring-1",
              theme === 'dark'
                ? "ring-white/10"
                : "ring-black/5",
              "backdrop-blur-sm",
              "will-change-transform"
            )}
          >
            {/* Header con animación sutil */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.15, delay: 0.05 }}
              className={cn(
                "flex-none border-b",
                theme === 'dark'
                  ? "border-white/[0.08]"
                  : "border-black/[0.06]"
              )}
            >
              <div className="p-4 pb-3">
                {viewType === "mobile" && (
                  <div className="flex justify-center -mt-2 mb-3">
                    <div className={cn(
                      "w-10 h-1 rounded-full",
                      theme === 'dark' 
                        ? "bg-white/[0.08]" 
                        : "bg-black/[0.06]"
                    )} />
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className={cn(
                      viewType === "mobile" ? "text-base" : "text-lg",
                      "font-medium mb-1",
                      theme === 'dark' ? "text-white/90" : "text-gray-900"
                    )}>
                      Tipo de Pago
                    </h3>
                    <p className={cn(
                      "text-sm",
                      theme === 'dark' ? "text-white/60" : "text-gray-500"
                    )}>
                      Selecciona cómo deseas realizar el pago
                    </p>
                  </div>
                  <button
                    onClick={onClose}
                    className={cn(
                      "p-1.5 rounded-md transition-colors self-start -mt-1",
                      theme === 'dark' 
                        ? "text-white/60 hover:bg-white/[0.08]"
                        : "text-gray-500 hover:bg-black/[0.04]"
                    )}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Content con animación sutil */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.15, delay: 0.1 }}
              className="flex-1 overflow-y-auto min-h-0 relative"
            >
              <div className="p-4">
                <PaymentTypeCarousel
                  paymentTypes={FILTERED_PAYMENT_TYPES}
                  onSelect={handleTypeSelect}
                  theme={theme}
                  selectedTypeId={selectedType?.id}
                  isLoading={isLoading}
                />
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
} 