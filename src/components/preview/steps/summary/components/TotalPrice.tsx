import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface TotalPriceProps {
  total: number;
  theme: 'light' | 'dark';
}

export function TotalPrice({ total, theme }: TotalPriceProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center"
    >
      {/* Título de Precio Total */}
      <p className={cn(
        "text-lg md:text-base font-semibold mb-4 md:mb-3",
        theme === 'dark' ? "text-gray-400" : "text-gray-500"
      )}>
        Precio Total
      </p>

      {/* Precio */}
      <p className={cn(
        "text-6xl md:text-6xl font-semibold leading-none mb-6 md:mb-4",
        theme === 'dark' ? "text-white" : "text-gray-900"
      )}>
        €{total}
      </p>

      {/* Indicador de Pago Seguro */}
      <div className="flex items-center justify-center gap-2">
        <svg
          className="w-5 h-5 md:w-4 md:h-4 text-emerald-500"
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
          "text-sm md:text-xs font-medium",
          theme === 'dark' ? "text-gray-400" : "text-gray-500"
        )}>
          Pago seguro garantizado
        </span>
      </div>
    </motion.div>
  );
} 