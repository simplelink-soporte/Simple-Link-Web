import { FormStepField } from "@/types/form-steps";
import { PreviewContainer } from "../layout/PreviewContainer";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useState } from "react";
import { NavigationButtons } from "../layout/NavigationButtons";
import { Check } from "lucide-react";

interface StepComponentProps {
  field: FormStepField;
  theme: 'light' | 'dark';
  viewType: "mobile" | "desktop";
  onNext: () => void;
  onPrev: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

const availableCoupons = [
  { 
    id: '1', 
    name: 'WELCOME2024',
    type: 'Descuento • 15%',
    description: 'Descuento para nuevos usuarios',
    validUntil: '28 Feb 2024',
    conditions: [
      'Válido solo para primera reserva',
      'No acumulable con otras promociones',
      'Mínimo 2 horas de reserva'
    ]
  },
  { 
    id: '2', 
    name: 'SUMMER',
    type: 'Descuento • 20%',
    description: 'Descuento especial de verano',
    validUntil: '31 Mar 2024',
    conditions: [
      'Válido de lunes a viernes',
      'Aplicable en todas las canchas',
      'Reserva mínima de 1 hora'
    ]
  }
];

export function CouponsPreview({ 
  field, 
  theme, 
  viewType,
  onNext,
  onPrev,
  isFirstStep,
  isLastStep 
}: StepComponentProps) {
  const { title, description } = field;
  const [selectedCoupon, setSelectedCoupon] = useState<string | null>(null);

  return (
    <PreviewContainer viewType={viewType} theme={theme}>
      <div className="min-h-full flex flex-col">
        <div className="pb-4">
          <div className="text-center space-y-1">
            <h1 className={cn(
              "text-base font-semibold transition-colors",
              theme === 'dark' ? "text-white" : "text-gray-900"
            )}>
              {title || "Cupones de Descuento"}
            </h1>
            <p className={cn(
              "text-[11px] transition-colors px-6",
              theme === 'dark' ? "text-gray-400" : "text-gray-500"
            )}>
              {description || "Aplica un cupón para obtener descuentos especiales"}
            </p>
          </div>
        </div>

        <div className="flex-1 pb-24">
          <div className="space-y-3 px-4">
            {availableCoupons.map((coupon, index) => {
              const isSelected = selectedCoupon === coupon.id;
              
              return (
                <motion.button
                  key={coupon.id}
                  onClick={() => setSelectedCoupon(coupon.id)}
                  className={cn(
                    "w-full text-left rounded-xl p-4",
                    "transition-all duration-200 ease-in-out",
                    "relative overflow-hidden",
                    theme === 'dark' 
                      ? isSelected
                        ? "bg-zinc-800 hover:bg-neutral-800 text-white"
                        : "bg-neutral-900 hover:bg-neutral-800 text-gray-200"
                      : isSelected
                        ? "bg-gray-100 hover:bg-gray-200 text-gray-900"
                        : "bg-gray-50 hover:bg-gray-100 text-gray-800"
                  )}
                  initial={{ opacity: 0 }}
                  animate={{ 
                    opacity: 1,
                    scale: isSelected ? 1.01 : 1,
                    transition: { 
                      delay: index * 0.1,
                      scale: { 
                        duration: 0.3,
                        ease: [0.16, 1, 0.3, 1]
                      }
                    }
                  }}
                >
                  {isSelected && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ 
                        opacity: 1,
                        scale: 1,
                        transition: { 
                          duration: 0.2,
                          ease: [0.16, 1, 0.3, 1],
                        }
                      }}
                      exit={{ 
                        opacity: 0,
                        scale: 0.95,
                        transition: {
                          duration: 0.15,
                          ease: "easeOut"
                        }
                      }}
                      className={cn(
                        "absolute inset-0 z-0",
                        theme === 'dark' 
                          ? "bg-zinc-800"
                          : "bg-gray-100"
                      )}
                    />
                  )}

                  <div className="relative z-10 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <h3 className={cn(
                          "font-medium text-sm transition-colors",
                          theme === 'dark' ? "text-white" : "text-gray-900"
                        )}>
                          {coupon.name}
                        </h3>
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "text-[9px] font-medium px-1.5 py-0.5 rounded-full",
                            theme === 'dark' 
                              ? "bg-blue-500/20 text-blue-400"
                              : "bg-blue-50 text-blue-600"
                          )}>
                            {coupon.type}
                          </span>
                          <p className={cn(
                            "text-[10px] transition-colors",
                            theme === 'dark' ? "text-gray-500" : "text-gray-500"
                          )}>
                            Válido hasta: {coupon.validUntil}
                          </p>
                        </div>
                      </div>

                      {isSelected && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{
                            type: "spring",
                            stiffness: 300,
                            damping: 20
                          }}
                          className={cn(
                            "rounded-full flex items-center justify-center",
                            theme === 'dark' 
                              ? "bg-white" 
                              : "bg-black",
                            "h-5 w-5"
                          )}
                        >
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{
                              type: "spring",
                              stiffness: 300,
                              damping: 20,
                              delay: 0.1
                            }}
                          >
                            <Check 
                              className={cn(
                                "h-3 w-3",
                                theme === 'dark' 
                                  ? "text-black" 
                                  : "text-white"
                              )} 
                              strokeWidth={2.5}
                            />
                          </motion.div>
                        </motion.div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <p className={cn(
                        "text-[11px] transition-colors",
                        theme === 'dark' ? "text-gray-400" : "text-gray-600"
                      )}>
                        {coupon.description}
                      </p>

                      <div className={cn(
                        "border-t border-dashed my-3",
                        theme === 'dark' ? "border-gray-700" : "border-gray-200"
                      )} />

                      <div className="space-y-1">
                        <p className={cn(
                          "text-[10px] font-medium",
                          theme === 'dark' ? "text-gray-400" : "text-gray-600"
                        )}>
                          Condiciones:
                        </p>
                        <ul className="space-y-1">
                          {coupon.conditions.map((condition, i) => (
                            <li
                              key={i}
                              className={cn(
                                "text-[9px] flex items-center gap-1",
                                theme === 'dark' ? "text-gray-500" : "text-gray-500"
                              )}
                            >
                              <span className="h-1 w-1 rounded-full bg-current" />
                              {condition}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>

        <NavigationButtons
          onNext={onNext}
          onPrev={onPrev}
          isFirstStep={isFirstStep}
          isLastStep={isLastStep}
          theme={theme}
          viewType={viewType}
          isNextDisabled={!selectedCoupon}
        />
      </div>
    </PreviewContainer>
  );
} 