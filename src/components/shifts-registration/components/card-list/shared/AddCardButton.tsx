'use client';

import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AddCardButtonProps } from './types';

/**
 * Botón para agregar una nueva tarjeta - Componente agnóstico de pasarela
 * Este componente puede ser utilizado tanto en la implementación de Stripe
 * como en la de MercadoPago
 */
export function AddCardButton({
  onClick,
  theme = 'light',
  viewType = 'desktop'
}: AddCardButtonProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.01, x: 2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "p-3 rounded-lg cursor-pointer",
        "flex items-center gap-3 mb-1 mx-1",
        "transition-all duration-200 ease-in-out",
        "hover:bg-gray-50",
        viewType === 'mobile' ? "w-full justify-start" : ""
      )}
    >
      <div className="p-2 rounded-md bg-gray-50 transition-colors duration-200">
        <Plus className="h-4 w-4 text-gray-500" />
      </div>
      <span className="text-sm font-medium text-gray-900">Agregar nueva tarjeta</span>
    </motion.div>
  );
}
