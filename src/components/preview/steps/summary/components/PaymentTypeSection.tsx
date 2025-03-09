import { X, Plus, ChevronDown, ChevronRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { PaymentType, PAYMENT_TYPES, PaymentTypeEnum } from "../types";
import { useState, useEffect, useRef } from "react";
import { PaymentTypeList } from "./PaymentTypeList";

// Filtrar solo los tipos de pago que queremos mostrar
const FILTERED_PAYMENT_TYPES = PAYMENT_TYPES.filter(type => 
  !['card', 'cash'].includes(type.id)
);

interface PaymentTypeSectionProps {
  theme: 'light' | 'dark';
  selectedType: PaymentTypeEnum | null;
  onShowTypes: () => void;
  onRemoveType: () => void;
  onShowCardModal?: () => void;
  viewType?: 'mobile' | 'desktop';
  onSelectType?: (type: PaymentTypeEnum) => void;
  empresaId?: string;
}

export function PaymentTypeSection({
  theme,
  selectedType,
  onShowTypes,
  onRemoveType,
  onShowCardModal,
  viewType = 'desktop',
  onSelectType,
  empresaId
}: PaymentTypeSectionProps) {
  const selectedTypeData = selectedType ? PAYMENT_TYPES.find(t => t.id === selectedType) : null;
  const [showList, setShowList] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Manejar clics fuera del componente para cerrar la lista
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowList(false);
      }
    };

    if (showList) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showList]);

  // Función para manejar la selección directa de un tipo de pago
  const handleSelectPaymentType = (type: PaymentTypeEnum) => {
    if (onSelectType) {
      onSelectType(type);
      setShowList(false);
    } else {
      // Si no se proporciona onSelectType, utilizar el comportamiento tradicional
      onShowTypes();
    }
  };

  // Manejar el clic en el selector
  const handleSelectorClick = () => {
    if (viewType === 'desktop' && onSelectType) {
      // En vista desktop con onSelectType, mostrar/ocultar la lista
      setShowList(!showList);
    } else {
      // En otros casos, usar el comportamiento tradicional
      onShowTypes();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, delay: 0.3 }}
      className="space-y-3 relative"
      ref={containerRef}
    >
      {!selectedTypeData ? (
        <motion.div
          whileHover={{ scale: 1.0, boxShadow: "none" }}
          whileTap={{ scale: 1.0, boxShadow: "none" }}
          onClick={handleSelectorClick}
          className={cn(
            "w-full rounded-lg cursor-pointer",
            "transition-all duration-200",
            "bg-white dark:bg-neutral-900",
            "border border-gray-100 dark:border-neutral-800",
            "hover:border-gray-200 dark:hover:border-neutral-700",
            "shadow-none",
            "h-[52px] flex items-center px-4"
          )}
        >
          <div className="flex items-center gap-3 w-full justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-1.5 rounded-md transition-colors",
                theme === 'dark' 
                  ? "bg-neutral-800" 
                  : "bg-gray-50"
              )}>
                <ChevronRight className={cn(
                  "h-4 w-4",
                  theme === 'dark' ? "text-gray-400" : "text-gray-500"
                )} />
              </div>
              <span className={cn(
                "text-[15px]",
                theme === 'dark' ? "text-gray-400" : "text-gray-500"
              )}>
                Seleccionar tipo de pago
              </span>
            </div>
            {viewType === 'desktop' && onSelectType && (
              <ChevronDown className={cn(
                "h-4 w-4 transition-transform duration-300",
                showList ? "transform rotate-180" : "",
                theme === 'dark' ? "text-gray-400" : "text-gray-500"
              )} />
            )}
          </div>
        </motion.div>
      ) : (
        <motion.div
          whileHover={{ scale: 1.0, boxShadow: "none" }}
          whileTap={{ scale: 1.0, boxShadow: "none" }}
          onClick={viewType === 'desktop' && onSelectType ? () => setShowList(!showList) : undefined}
          className={cn(
            "w-full rounded-lg",
            viewType === 'desktop' && onSelectType ? "cursor-pointer" : "",
            "transition-all duration-200",
            "p-3",
            "bg-white dark:bg-neutral-900",
            "border border-gray-100 dark:border-neutral-800",
            "hover:border-gray-200 dark:hover:border-neutral-700",
            "shadow-none"
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-1.5 rounded-md transition-colors",
                theme === 'dark' 
                  ? "bg-neutral-800" 
                  : "bg-gray-50"
              )}>
                <Check className={cn(
                  "h-4 w-4",
                  theme === 'dark' ? "text-green-400" : "text-green-500"
                )} />
              </div>
              <div className="flex flex-col">
                <span className={cn(
                  "text-sm font-medium",
                  theme === 'dark' ? "text-gray-200" : "text-gray-900"
                )}>
                  {selectedTypeData?.name || selectedType}
                </span>
                <span className={cn(
                  "text-xs",
                  theme === 'dark' ? "text-gray-400" : "text-gray-500"
                )}>
                  {selectedTypeData?.description || ''}
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {viewType === 'desktop' && onSelectType && (
                <ChevronDown className={cn(
                  "h-4 w-4 transition-transform duration-300",
                  showList ? "transform rotate-180" : "",
                  theme === 'dark' ? "text-gray-400" : "text-gray-500"
                )} />
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveType();
                }}
                className={cn(
                  "p-1.5 rounded-lg transition-colors",
                  theme === 'dark' 
                    ? "text-gray-400 hover:bg-neutral-700"
                    : "text-gray-400 hover:bg-gray-100"
                )}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Lista de tipos de pago desplegable (solo en vista desktop con onSelectType) */}
      <AnimatePresence>
        {showList && viewType === 'desktop' && onSelectType && (
          <motion.div
            initial={{ opacity: 0, y: -5, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -5, height: 0 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "absolute left-0 right-0 z-50 mt-2 origin-top",
              "rounded-lg shadow-lg",
              "overflow-hidden",
              theme === 'dark' ? "bg-neutral-900" : "bg-white",
              "border",
              theme === 'dark' ? "border-neutral-700" : "border-gray-200"
            )}
          >
            <PaymentTypeList
              theme={theme}
              selectedType={selectedType}
              onSelect={handleSelectPaymentType}
              paymentTypes={FILTERED_PAYMENT_TYPES}
              isExpanded={true}
              noContainer={true}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
} 