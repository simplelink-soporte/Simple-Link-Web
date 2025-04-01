'use client';

import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { CardBrandIcon } from '@/components/classes-registration/components/CardBrandIcon';
import { cn } from '@/lib/utils';
import { CardItemProps } from './types';

/**
 * Componente CardItem que muestra una tarjeta guardada con su información
 * Este componente es agnóstico de la pasarela de pago y puede utilizarse
 * tanto con Stripe como con MercadoPago
 */
export function CardItem({
  card,
  isSelected = false,
  onClick,
  onDelete,
  theme = 'light',
  viewType = 'desktop'
}: CardItemProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.01, x: 2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "p-3 rounded-lg cursor-pointer",
        "flex items-center justify-between mb-1 mx-1",
        "transition-all duration-200 ease-in-out",
        viewType === 'mobile' ? "flex-wrap" : "", // Permitir wrap en móvil si es necesario
        isSelected 
          ? "bg-gray-100 border border-gray-200" 
          : "hover:bg-gray-50"
      )}
    >
      <div className={cn(
        "flex items-center gap-3",
        viewType === 'mobile' ? "w-full mb-1" : ""
      )}>
        <div className={cn(
          "p-2 rounded-md",
          isSelected ? "bg-white" : "bg-gray-50",
          "transition-colors duration-200"
        )}>
          <CardBrandIcon 
            brand={card.brand} 
            theme={theme}
            className={cn(
              "h-4 w-4",
              isSelected ? "text-green-500" : "text-gray-500"
            )} 
          />
        </div>
        <div className="space-y-1">
          <span className={cn(
            "text-sm font-medium text-gray-900",
            "transition-colors duration-200"
          )}>
            {card.brand.charAt(0).toUpperCase() + card.brand.slice(1)} **** {card.last4}
          </span>
        </div>
      </div>
      
      {/* Información de vencimiento */}
      <div className={cn(
        "flex items-center justify-end",
        viewType === 'mobile' ? "w-full mt-1 justify-between" : ""
      )}>
        <span className={cn(
          "text-xs text-gray-500",
          "transition-colors duration-200"
        )}>
          Exp: {card.expMonth.toString().padStart(2, '0')}/{card.expYear}
        </span>
        
        {isSelected && (
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-center justify-center ml-2"
          >
            <Check className="h-4 w-4 text-green-500" />
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
