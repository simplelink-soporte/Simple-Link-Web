import { X, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { PaymentType, PAYMENT_TYPES } from "../types";

interface PaymentTypeSectionProps {
  theme: 'light' | 'dark';
  selectedType: PaymentType['id'] | null;
  onShowTypes: () => void;
  onRemoveType: () => void;
  onShowCardModal?: () => void;
}

export function PaymentTypeSection({
  theme,
  selectedType,
  onShowTypes,
  onRemoveType,
  onShowCardModal
}: PaymentTypeSectionProps) {
  const selectedTypeData = selectedType ? PAYMENT_TYPES.find(t => t.id === selectedType) : null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, delay: 0.3 }}
      className="space-y-3"
    >
      {!selectedTypeData ? (
        <button
          onClick={onShowTypes}
          className={cn(
            "w-full h-[52px] rounded-lg",
            "transition-all duration-200",
            "bg-white dark:bg-neutral-900",
            "border border-gray-100 dark:border-neutral-800",
            "hover:border-gray-200 dark:hover:border-neutral-700",
            "shadow-none",
            "flex items-center"
          )}
        >
          <div className="flex items-center gap-3 px-4">
            <Plus className={cn(
              "h-[18px] w-[18px]",
              theme === 'dark' ? "text-gray-400" : "text-gray-500"
            )} />
            <span className={cn(
              "text-[15px] font-medium",
              theme === 'dark' ? "text-gray-400" : "text-gray-500"
            )}>
              Tipo de Pago
            </span>
          </div>
        </button>
      ) : (
        <div className={cn(
          "p-3 rounded-lg",
          "transition-all duration-200",
          "bg-white dark:bg-neutral-900",
          "border border-gray-100 dark:border-neutral-800",
          "shadow-none"
        )}>
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className={cn(
                "text-sm font-medium",
                theme === 'dark' 
                  ? "text-gray-200"
                  : "text-gray-900"
              )}>
                {selectedTypeData.name}
              </span>
              <span className={cn(
                "text-xs mt-1",
                theme === 'dark' 
                  ? "text-gray-400"
                  : "text-gray-500"
              )}>
                {selectedTypeData.description}
              </span>
            </div>
            <button
              onClick={onRemoveType}
              className={cn(
                "p-1.5 rounded-lg transition-colors duration-200",
                "shadow-none",
                theme === 'dark' 
                  ? "text-gray-400 hover:bg-neutral-800"
                  : "text-gray-400 hover:bg-gray-50"
              )}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
} 