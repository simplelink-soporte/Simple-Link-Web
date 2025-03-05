import { FormStepField } from "@/types/form-steps";
import { PreviewContainer } from "../layout/PreviewContainer";
import { Button } from "@/components/ui/button";
import { Share2, Download, MapPin, Calendar, Clock, QrCode, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from 'react';
import { useSummaryBooking } from '@/components/preview/steps/summary/hooks/use-summary-booking';
import { toast } from 'sonner';
import { useForm } from '@/contexts/FormContext';
import type { ServiceResponse } from '@/services/bookingService';

interface FarewellPreviewProps {
  field: FormStepField;
  theme: 'light' | 'dark';
  viewType: "mobile" | "desktop";
  onNext: () => void;
  onPrev: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

// Separamos los datos en un objeto más organizado
const RESERVATION_DATA = {
  datetime: {
    icon: Calendar,
    title: "Fecha y Hora",
    primary: "Jueves 25 de Enero, 2024",
    secondary: "15:00 - 16:30",
  },
  location: {
    icon: MapPin,
    title: "Ubicación",
    primary: "Sucursal Centro",
    secondary: "Av. Principal 123, Ciudad",
  },
  court: {
    icon: Clock,
    title: "Cancha",
    primary: "Cancha Principal",
    secondary: "Cubierta • Cristal Panorámico",
  },
  code: {
    icon: QrCode,
    title: "Código de Reserva",
    primary: "#PAD12345",
    secondary: "Presenta este código al llegar",
  },
} as const;

function LoadingView({ theme }: { theme: 'light' | 'dark' }) {
  return (
    <div className="min-h-full flex flex-col items-center justify-center p-8">
      <Loader2 className={cn(
        "h-8 w-8 animate-spin mb-4",
        theme === 'dark' ? "text-gray-400" : "text-gray-500"
      )} />
      <h2 className={cn(
        "text-lg font-semibold mb-2",
        theme === 'dark' ? "text-white" : "text-gray-900"
      )}>
        Procesando tu reserva
      </h2>
      <p className={cn(
        "text-sm text-center",
        theme === 'dark' ? "text-gray-400" : "text-gray-500"
      )}>
        Por favor, espera mientras confirmamos tu reserva...
      </p>
    </div>
  );
}

function ErrorView({ error, theme, onRetry }: { 
  error: Error | null; 
  theme: 'light' | 'dark';
  onRetry: () => void;
}) {
  return (
    <div className="min-h-full flex flex-col items-center justify-center p-8">
      <h2 className={cn(
        "text-lg font-semibold mb-2 text-red-500"
      )}>
        Error al procesar tu reserva
      </h2>
      <p className={cn(
        "text-sm text-center mb-4",
        theme === 'dark' ? "text-gray-400" : "text-gray-500"
      )}>
        {error?.message || 'Hubo un problema al crear tu reserva'}
      </p>
      <Button 
        onClick={onRetry}
        variant="outline"
        className={theme === 'dark' ? "border-neutral-800" : ""}
      >
        Intentar nuevamente
      </Button>
    </div>
  );
}

export function FarewellPreview({ 
  field, 
  theme, 
  viewType,
  onNext,
  onPrev
}: FarewellPreviewProps) {
  const [bookingStatus, setBookingStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [bookingError, setBookingError] = useState<Error | null>(null);
  const [bookingDetails, setBookingDetails] = useState<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const bookingAttemptedRef = useRef(false);
  const { state } = useForm();

  const {
    handleCreateBooking,
    isValid,
    validationErrors,
    currentPayment,
    isCreating
  } = useSummaryBooking({
    onSuccess: () => {
      setBookingStatus('success');
      audioRef.current?.play().catch(console.error);
    },
    onError: (error) => {
      setBookingError(error);
      setBookingStatus('error');
    }
  });

  // Efecto para crear la reserva al montar el componente
  useEffect(() => {
    let isMounted = true;
    let abortController = new AbortController();

    const createBooking = async () => {
      try {
        // Evitar múltiples intentos de creación
        if (bookingAttemptedRef.current || !isValid || !handleCreateBooking || isCreating) {
          if (!isValid) {
            const errors = validationErrors.map(err => err.message).join('\n');
            throw new Error(`Validación fallida:\n${errors}`);
          }
          return;
        }

        // Marcar que ya se intentó crear la reserva
        bookingAttemptedRef.current = true;

        console.log('[FarewellPreview] Iniciando creación de reserva', {
          isValid,
          validationErrors,
          currentPayment,
          isCreating
        });

        const result = await handleCreateBooking();
        
        if (!isMounted || abortController.signal.aborted) return;

        if (result?.error) {
          throw new Error(result.error.message);
        }

        if (!result) {
          console.log('[FarewellPreview] Creación cancelada o en progreso');
          return;
        }

        setBookingDetails({
          datetime: {
            icon: Calendar,
            title: "Fecha y Hora",
            primary: state.shift.date,
            secondary: `${state.shift.startTime} - ${state.shift.endTime}`,
          },
          location: {
            icon: MapPin,
            title: "Ubicación",
            primary: state.location.branchName,
            secondary: "Sede Principal",
          },
          court: {
            icon: Clock,
            title: "Cancha",
            primary: state.shift.courtName,
            secondary: "Reserva Confirmada",
          },
          code: {
            icon: QrCode,
            title: "Código de Reserva",
            primary: result?.data?.id || "#PAD12345",
            secondary: "Presenta este código al llegar",
          },
        });

        if (isMounted) {
          console.log('[FarewellPreview] Reserva creada exitosamente');
          setBookingStatus('success');
        }
      } catch (error: unknown) {
        if (!isMounted || abortController.signal.aborted) return;
        
        console.error('[FarewellPreview] Error al crear reserva:', error);
        setBookingError(error as Error);
        setBookingStatus('error');
        toast.error((error as Error).message);
      }
    };

    // Inicializar audio
    audioRef.current = new Audio('/sonidos/bell-congratulations-epic-stock-media-1-00-01.mp3');
    audioRef.current.volume = 0.5;

    createBooking();

    return () => {
      isMounted = false;
      abortController.abort();
      audioRef.current?.pause();
      audioRef.current = null;
      // No resetear bookingAttemptedRef aquí para mantener el estado entre re-renders
    };
  }, [handleCreateBooking, isValid, validationErrors, currentPayment, isCreating, state]); // Dependencias actualizadas

  if (bookingStatus === 'loading') {
    return (
      <PreviewContainer viewType={viewType} theme={theme}>
        <LoadingView theme={theme} />
      </PreviewContainer>
    );
  }

  if (bookingStatus === 'error') {
    return (
      <PreviewContainer viewType={viewType} theme={theme}>
        <ErrorView 
          error={bookingError} 
          theme={theme}
          onRetry={() => window.location.reload()} 
        />
      </PreviewContainer>
    );
  }

  // Manejadores de acciones
  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Reserva de Padel',
          text: `Reserva confirmada para ${RESERVATION_DATA.datetime.primary} a las ${RESERVATION_DATA.datetime.secondary}`,
          url: window.location.href,
        });
      }
    } catch (error) {
      console.error('Error compartiendo:', error);
    }
  };

  const handleDownload = () => {
    console.log('Descargando comprobante...');
  };

  return (
    <PreviewContainer viewType={viewType} theme={theme}>
      <div className="min-h-full flex flex-col">
        {/* Encabezado con animación */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-8"
        >
          <div className={cn(
            "mx-auto w-12 h-12 rounded-full mb-4 flex items-center justify-center",
            theme === 'dark' ? 'bg-neutral-800/50' : 'bg-gray-100'
          )}>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ 
                type: "spring",
                stiffness: 300,
                damping: 20,
                delay: 0.2
              }}
              className={cn(
                "w-6 h-6 rounded-full",
                theme === 'dark' ? 'bg-neutral-700' : 'bg-gray-900'
              )}
            />
          </div>
          <h1 className={cn(
            "text-xl font-semibold mb-2",
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          )}>
            ¡Reserva Exitosa!
          </h1>
          <p className={cn(
            "text-sm",
            theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
          )}>
            Tu reserva ha sido confirmada
          </p>
        </motion.div>

        {/* Detalles de la reserva */}
        <div className="flex-1 px-6">
          <div className={cn(
            "rounded-xl overflow-hidden",
            theme === 'dark' ? 'bg-neutral-900/50' : 'bg-gray-50'
          )}>
            {Object.entries(RESERVATION_DATA).map(([key, data], index) => {
              const Icon = data.icon;
              return (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + (index * 0.1) }}
                  className={cn(
                    "flex items-start gap-4 p-4",
                    index !== Object.entries(RESERVATION_DATA).length - 1 && 
                    (theme === 'dark' ? 'border-b border-neutral-800' : 'border-b border-gray-200')
                  )}
                >
                  <div className={cn(
                    "p-2 rounded-lg",
                    theme === 'dark' ? 'bg-neutral-800' : 'bg-white'
                  )}>
                    <Icon className={cn(
                      "w-4 h-4",
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                    )} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-xs font-medium mb-1",
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                    )}>
                      {data.title}
                    </p>
                    <p className={cn(
                      "text-sm font-medium truncate",
                      theme === 'dark' ? 'text-white' : 'text-gray-900'
                    )}>
                      {data.primary}
                    </p>
                    <p className={cn(
                      "text-xs truncate",
                      theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
                    )}>
                      {data.secondary}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Acciones */}
        <motion.div 
          className="p-6 space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <div className="flex justify-center gap-4">
            <Button
              onClick={handleShare}
              variant="outline"
              className={cn(
                "flex-1 gap-2",
                theme === 'dark' ? 'border-neutral-800 hover:bg-neutral-800' : 'hover:bg-gray-100'
              )}
            >
              <Share2 className="w-4 h-4" />
              Compartir
            </Button>
            <Button
              onClick={handleDownload}
              variant="outline"
              className={cn(
                "flex-1 gap-2",
                theme === 'dark' ? 'border-neutral-800 hover:bg-neutral-800' : 'hover:bg-gray-100'
              )}
            >
              <Download className="w-4 h-4" />
              Descargar
            </Button>
          </div>

          <p className={cn(
            "text-xs text-center",
            theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
          )}>
            Te hemos enviado un email con todos los detalles
          </p>

          <Button
            onClick={onNext}
            variant="ghost"
            className="w-full text-sm font-medium"
          >
            Finalizar
          </Button>
        </motion.div>
      </div>
    </PreviewContainer>
  );
} 