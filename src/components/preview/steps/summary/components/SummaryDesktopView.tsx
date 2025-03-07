import React from 'react';
import { cn } from '@/lib/utils';
import { useResponsiveStyles } from '../hooks/useResponsiveStyles';
import { SummaryStepField } from "@/components/steps/summary/types";
import { PaymentMethod, PaymentTypeEnum, Calculations } from '../types';
import { PriceBreakdown } from './PriceBreakdown';
import { PaymentSection } from './PaymentSection';
import { PaymentTypeSection } from './PaymentTypeSection';
import { CouponsSection } from './CouponsSection';
import { TotalPrice } from './TotalPrice';
import { useForm } from '@/contexts/FormContext';
import { Calendar, Clock, MapPin, ChevronRight } from 'lucide-react';

interface SummaryDesktopViewProps {
  theme: 'light' | 'dark';
  field: SummaryStepField;
  selectedPaymentMethod: PaymentMethod | null;
  selectedPaymentType: PaymentTypeEnum | null;
  calculations: Calculations;
  appliedCoupon: any; // Tipo más específico si está disponible
  onShowItemsDetails: () => void;
  onShowPaymentMethods: () => void;
  onShowPaymentTypes: () => void;
  onShowCouponsPanel: () => void;
  onRemoveCoupon: () => void;
  onSelectPaymentMethod: (method: PaymentMethod | null) => void;
  onSelectPaymentType: (type: string | null) => void;
  handleReservar: () => void;
  isPublicView: boolean;
  // Props adicionales requeridas por los componentes internos
  onUpdateMethod: (method: PaymentMethod) => Promise<void>;
  empresaId: string;
}

/**
 * Componente que muestra la vista de escritorio del paso de resumen
 * con un diseño de dos columnas a pantalla completa
 */
export function SummaryDesktopView({
  theme,
  field,
  selectedPaymentMethod = null,
  selectedPaymentType = null,
  calculations,
  appliedCoupon = null,
  onShowItemsDetails,
  onShowPaymentMethods,
  onShowPaymentTypes,
  onShowCouponsPanel,
  onRemoveCoupon = () => {},
  onSelectPaymentMethod = () => {},
  onSelectPaymentType = () => {},
  handleReservar = () => {},
  isPublicView = false,
  onUpdateMethod = async () => Promise.resolve(),
  empresaId = ''
}: SummaryDesktopViewProps) {
  const { state } = useForm();

  // Extraer los datos de la reserva del estado global con verificación de nulos
  const courtName = state?.shift?.courtName || 'Pista sin nombre';
  const dateFormatted = state?.shift?.date ? new Date(state.shift.date).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }) : '01/01/2024';
  
  const timeStart = state?.shift?.startTime || '18:00';
  const timeEnd = state?.shift?.endTime || '19:30';
  const timeFormatted = `${timeStart} - ${timeEnd}`;
  const locationName = state?.location?.branchName || 'Ubicación no especificada';

  // Proporcionar un valor por defecto para calculations si es undefined
  const safeCalculations = calculations || {
    selectedItems: [],
    courtPrice: 0,
    itemsTotal: 0,
    subtotal: 0,
    discount: 0,
    total: 0
  };

  return (
    <div className={cn(
      "w-full h-full",
      theme === 'dark' ? 'bg-neutral-900' : 'bg-gray-50'
    )}>
      {/* Contenedor principal a pantalla completa */}
      <div className="w-full px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 2xl:px-24 py-6">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Columna izquierda - Métodos de pago (con proporción adaptable) */}
          <div className="w-full md:w-1/2 lg:w-[55%] xl:w-[60%]">
            <div className={cn(
              "rounded-xl shadow-sm",
              theme === 'dark' ? 'bg-neutral-800 border-neutral-700' : 'bg-white border border-gray-100'
            )}>
              <div className="p-5">
                <h2 className={cn(
                  "text-xl font-semibold mb-4",
                  theme === 'dark' ? 'text-white' : 'text-gray-800'
                )}>
                  Selecciona forma de pago
                </h2>
                
                {/* Sección de tipo de pago */}
                <div className="mb-6">
                  <h3 className={cn(
                    "text-base font-medium mb-2",
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  )}>
                    Tipo de pago
                  </h3>
                  <PaymentTypeSection
                    theme={theme}
                    selectedType={selectedPaymentType}
                    onShowTypes={onShowPaymentTypes}
                    onRemoveType={() => onSelectPaymentType(null)}
                  />
                </div>
                
                {/* Sección de método de pago */}
                <div className="mb-6">
                  <h3 className={cn(
                    "text-base font-medium mb-2",
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  )}>
                    Método de pago
                  </h3>
                  <PaymentSection
                    theme={theme}
                    selectedMethod={selectedPaymentMethod}
                    onShowMethods={onShowPaymentMethods}
                    onRemoveMethod={() => onSelectPaymentMethod(null)}
                    onUpdateMethod={onUpdateMethod}
                    empresaId={empresaId}
                    viewType="desktop"
                  />
                </div>
                
                {/* Sección de cupones */}
                <div className="mb-4">
                  <h3 className={cn(
                    "text-base font-medium mb-2",
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  )}>
                    Cupones y descuentos
                  </h3>
                  <CouponsSection
                    theme={theme}
                    appliedCoupon={appliedCoupon}
                    onShowCoupons={onShowCouponsPanel}
                    onRemoveCoupon={onRemoveCoupon}
                  />
                </div>
              </div>
            </div>
            
            {/* Botón de reserva para vista pública */}
            {isPublicView && (
              <div className="mt-4">
                <button
                  onClick={handleReservar}
                  className={cn(
                    "w-full py-3 px-4 rounded-lg text-base font-medium flex items-center justify-center gap-2 transition-colors",
                    "bg-primary text-white hover:bg-primary/90",
                    (!selectedPaymentMethod || !selectedPaymentType) && "opacity-70 cursor-not-allowed"
                  )}
                  disabled={!selectedPaymentMethod || !selectedPaymentType}
                >
                  <span>Confirmar Reserva</span>
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            )}
          </div>
          
          {/* Columna derecha - Resumen (con proporción adaptable) */}
          <div className="w-full md:w-1/2 lg:w-[45%] xl:w-[40%]">
            {/* Panel de detalles de la reserva */}
            <div className={cn(
              "rounded-xl shadow-sm mb-6",
              theme === 'dark' ? 'bg-neutral-800 border-neutral-700' : 'bg-white border border-gray-100'
            )}>
              <div className="p-5">
                <h2 className={cn(
                  "text-xl font-semibold mb-4",
                  theme === 'dark' ? 'text-white' : 'text-gray-800'
                )}>
                  Detalles de la reserva
                </h2>
                
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <MapPin className={cn(
                      "h-5 w-5 mt-0.5 flex-shrink-0",
                      theme === 'dark' ? 'text-primary/80' : 'text-primary'
                    )} />
                    <div>
                      <p className={cn(
                        "font-medium text-base",
                        theme === 'dark' ? 'text-white' : 'text-gray-800'
                      )}>
                        {courtName}
                      </p>
                      <p className={cn(
                        "text-sm",
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                      )}>
                        {locationName}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <Calendar className={cn(
                      "h-5 w-5 mt-0.5 flex-shrink-0",
                      theme === 'dark' ? 'text-primary/80' : 'text-primary'
                    )} />
                    <div>
                      <p className={cn(
                        "font-medium text-base",
                        theme === 'dark' ? 'text-white' : 'text-gray-800'
                      )}>
                        Fecha
                      </p>
                      <p className={cn(
                        "text-sm",
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                      )}>
                        {dateFormatted}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <Clock className={cn(
                      "h-5 w-5 mt-0.5 flex-shrink-0",
                      theme === 'dark' ? 'text-primary/80' : 'text-primary'
                    )} />
                    <div>
                      <p className={cn(
                        "font-medium text-base",
                        theme === 'dark' ? 'text-white' : 'text-gray-800'
                      )}>
                        Horario
                      </p>
                      <p className={cn(
                        "text-sm",
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                      )}>
                        {timeFormatted}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Panel de resumen de precios */}
            <div className={cn(
              "rounded-xl shadow-sm",
              theme === 'dark' ? 'bg-neutral-800 border-neutral-700' : 'bg-white border border-gray-100'
            )}>
              <div className="p-5">
                <h2 className={cn(
                  "text-xl font-semibold mb-4",
                  theme === 'dark' ? 'text-white' : 'text-gray-800'
                )}>
                  Resumen de precios
                </h2>
                
                {/* Desglose de precios */}
                <div className="mb-4">
                  <PriceBreakdown
                    theme={theme}
                    calculations={safeCalculations}
                    onShowItemsDetails={onShowItemsDetails}
                    viewType="desktop"
                  />
                </div>
                
                {/* Separador */}
                <div className={cn(
                  "border-t my-4",
                  theme === 'dark' ? 'border-neutral-700' : 'border-gray-200'
                )}></div>
                
                {/* Precio total */}
                <div className="flex justify-between items-center">
                  <p className={cn(
                    "text-lg font-semibold",
                    theme === 'dark' ? 'text-white' : 'text-gray-800'
                  )}>
                    Total a pagar:
                  </p>
                  <p className={cn(
                    "text-2xl font-bold",
                    theme === 'dark' ? 'text-white' : 'text-gray-800'
                  )}>
                    €{safeCalculations.total}
                  </p>
                </div>

                {/* Indicador de pago seguro */}
                <div className="flex items-center justify-center gap-2 mt-4">
                  <svg
                    className={cn(
                      "w-4 h-4",
                      theme === 'dark' ? 'text-emerald-400' : 'text-emerald-500'
                    )}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                  <span className={cn(
                    "text-xs font-medium",
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                  )}>
                    Pago seguro garantizado
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 