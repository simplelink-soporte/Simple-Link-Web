import { cn } from "@/lib/utils";
import { Check, CreditCard, Wallet, Building } from "lucide-react";
import { PaymentType, PaymentTypeEnum, PAYMENT_TYPES } from "../types";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useMemo } from "react";
import { GuaranteeConfirmationModal } from "./GuaranteeConfirmationModal";

// Función para obtener el icono correspondiente a cada tipo de pago
function getPaymentTypeIcon(typeId: string) {
  switch (typeId) {
    case 'guarantee':
      return CreditCard;
    case 'club':
      return Building;
    case 'advance':
    case 'full':
    default:
      return Wallet;
  }
}

// Nombres de opciones de pago a excluir
const EXCLUDED_PAYMENT_OPTIONS = [
  'Efectivo',
  'Tarjeta de crédito/débito'
];

interface PaymentTypeItemProps {
  type: PaymentType;
  isSelected: boolean;
  onClick: () => void;
  theme: 'light' | 'dark';
}

function PaymentTypeItem({ type, isSelected, onClick, theme }: PaymentTypeItemProps) {
  const Icon = getPaymentTypeIcon(type.id);
  
  return (
    <motion.div
      whileHover={{ scale: 1.01, x: 2, boxShadow: "none" }}
      whileTap={{ scale: 0.98, boxShadow: "none" }}
      onClick={onClick}
      className={cn(
        "p-3 rounded-lg cursor-pointer",
        "flex items-center justify-between mb-1 mx-1",
        "transition-all duration-200 ease-in-out",
        "shadow-none",
        // Estilos según selección y tema
        theme === 'dark'
          ? isSelected 
            ? "bg-neutral-700" 
            : "hover:bg-neutral-800/50"
          : isSelected 
            ? "bg-gray-100" 
            : "hover:bg-gray-50"
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn(
          "p-2 rounded-md",
          theme === 'dark' 
            ? isSelected ? "bg-neutral-600" : "bg-neutral-800" 
            : isSelected ? "bg-white" : "bg-gray-50",
          "transition-colors duration-200"
        )}>
          <Icon className={cn(
            "h-4 w-4",
            isSelected
              ? theme === 'dark' ? "text-green-400" : "text-green-500"
              : theme === 'dark' ? "text-gray-400" : "text-gray-500"
          )} />
        </div>
        <div className="space-y-1">
          <p className={cn(
            "text-sm font-medium",
            theme === 'dark' ? "text-white" : "text-gray-900",
            "transition-colors duration-200"
          )}>
            {type.name}
          </p>
          <p className={cn(
            "text-xs",
            theme === 'dark' ? "text-gray-400" : "text-gray-500",
            "transition-colors duration-200"
          )}>
            {type.description}
          </p>
        </div>
      </div>
      {isSelected && (
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={cn(
            "h-1 w-1"
          )}
        >
          {/* Check eliminado */}
        </motion.div>
      )}
    </motion.div>
  );
}

interface PaymentTypeListProps {
  theme: 'light' | 'dark';
  selectedType: PaymentTypeEnum | null;
  onSelect: (type: PaymentTypeEnum) => void;
  paymentTypes: PaymentType[];
  isExpanded?: boolean;
  noContainer?: boolean;
}

export function PaymentTypeList({
  theme,
  selectedType,
  onSelect,
  paymentTypes,
  isExpanded = false,
  noContainer = false
}: PaymentTypeListProps) {
  // Estado para controlar la visibilidad del modal de confirmación de garantía
  const [showGuaranteeModal, setShowGuaranteeModal] = useState(false);
  // Estado temporal para almacenar el tipo de pago seleccionado antes de confirmar
  const [pendingGuaranteeSelection, setPendingGuaranteeSelection] = useState<PaymentTypeEnum | null>(null);
  
  // Filtrar las opciones de pago para excluir Efectivo y Tarjeta de crédito/débito
  const filteredPaymentTypes = useMemo(() => {
    return paymentTypes.filter(type => !EXCLUDED_PAYMENT_OPTIONS.includes(type.name));
  }, [paymentTypes]);
  
  // Función para manejar la selección de un tipo de pago y asegurar
  // que se actualiza el estado global
  const handleTypeSelect = (type: PaymentTypeEnum) => {
    console.log(`[PaymentTypeList] Seleccionando tipo de pago: ${type}`);
    
    // Obtener información completa del tipo seleccionado
    const typeInfo = filteredPaymentTypes.find(t => t.id === type);
    
    // Añadir información detallada en los logs
    console.log(`[PaymentTypeList] Detalles del tipo seleccionado:`, {
      id: type,
      name: typeInfo?.name || type,
      description: typeInfo?.description || 'Sin descripción',
      requiresCard: typeInfo?.requiresCard || false
    });
    
    // Si es tipo garantía, mostrar el modal de confirmación
    if (type === 'guarantee') {
      setPendingGuaranteeSelection(type);
      setShowGuaranteeModal(true);
      return;
    }
    
    // Para otros tipos, seleccionar directamente
    onSelect(type);
  };
  
  // Manejadores para el modal de garantía
  const handleGuaranteeConfirm = () => {
    // El usuario aceptó la garantía
    if (pendingGuaranteeSelection) {
      onSelect(pendingGuaranteeSelection);
    }
    setShowGuaranteeModal(false);
    setPendingGuaranteeSelection(null);
  };
  
  const handleGuaranteeCancel = () => {
    // El usuario rechazó la garantía, no hacemos nada con la selección
    setShowGuaranteeModal(false);
    setPendingGuaranteeSelection(null);
  };
  
  // Contenido de los elementos de la lista
  const listContent = (
    <div className="py-3 px-2">
      <AnimatePresence>
        {filteredPaymentTypes.map((type) => (
          <PaymentTypeItem
            key={`${type.id}-${type.name}`}
            type={type}
            isSelected={selectedType === type.id}
            onClick={() => handleTypeSelect(type.id)}
            theme={theme}
          />
        ))}
      </AnimatePresence>
    </div>
  );

  // Si no se necesita contenedor, devolver solo el contenido
  if (noContainer) {
    return (
      <>
        {listContent}
        <GuaranteeConfirmationModal 
          isOpen={showGuaranteeModal} 
          onClose={() => setShowGuaranteeModal(false)}
          onConfirm={handleGuaranteeConfirm}
          onCancel={handleGuaranteeCancel}
          theme={theme}
        />
      </>
    );
  }
  
  // Caso normal: devolver con el contenedor
  return (
    <>
      <div
        className={cn(
          "relative",
          noContainer ? "" : "p-3",
          isExpanded ? "max-h-none overflow-visible" : "max-h-[300px] overflow-y-auto scrollbar-hide",
          "rounded-lg",
          !noContainer && "border shadow-sm",
          !noContainer && theme === 'dark' 
            ? "border-neutral-800 bg-neutral-900"
            : "border-gray-100 bg-white",
        )}
      >
        <div className={cn(
          "space-y-1",
          noContainer && "py-2 px-1"
        )}>
          {filteredPaymentTypes.map((type) => (
            <PaymentTypeItem
              key={`${type.id}-${type.name}`}
              type={type}
              isSelected={selectedType === type.id}
              onClick={() => handleTypeSelect(type.id)}
              theme={theme}
            />
          ))}
        </div>
      </div>
      
      <GuaranteeConfirmationModal 
        isOpen={showGuaranteeModal} 
        onClose={() => setShowGuaranteeModal(false)}
        onConfirm={handleGuaranteeConfirm}
        onCancel={handleGuaranteeCancel}
        theme={theme}
      />
    </>
  );
} 