import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface TotalPriceProps {
  total: number;
  theme: 'light' | 'dark';
  /** Clases adicionales para el componente */
  className?: string;
  /** Deshabilitar animación para evitar conflictos con animaciones padre */
  disableAnimation?: boolean;
}

/**
 * Formatea el precio para mostrar siempre dos decimales y separar
 * la parte entera de la decimal para aplicar estilos diferentes
 */
function formatPrice(price: number): { integerPart: string; decimalPart: string } {
  // Formatear el número para que siempre tenga dos decimales
  const formatted = price.toFixed(2);
  
  // Dividir en parte entera y decimal
  const [integerPart, decimalPart] = formatted.split('.');
  
  return {
    integerPart,
    decimalPart
  };
}

export function TotalPrice({ 
  total, 
  theme, 
  className,
  disableAnimation = false
}: TotalPriceProps) {
  // Formatear el precio
  const { integerPart, decimalPart } = formatPrice(total);
  
  // Estilo para la parte decimal (más apagada)
  const decimalStyle = cn(
    "opacity-40",
    theme === 'dark' ? "text-gray-300" : "text-gray-600"
  );
  
  // Si la animación está deshabilitada, renderizamos sin motion
  if (disableAnimation) {
    return (
      <div 
        className={cn(
          "flex flex-col items-center justify-center py-2",
          className
        )}
      >
        {/* Título de Precio Total */}
        <p className={cn(
          "text-sm font-semibold mb-2",
          theme === 'dark' ? "text-gray-400" : "text-gray-500"
        )}>
          Precio Total
        </p>

        {/* Precio con decimales estilizados */}
        <p className={cn(
          "text-4xl font-semibold leading-none mb-4",
          theme === 'dark' ? "text-white" : "text-gray-900"
        )}>
          €{integerPart}<span className={decimalStyle}>.{decimalPart}</span>
        </p>

        {/* Indicador de Pago Seguro */}
        <div className="flex items-center justify-center gap-2">
          <svg
            className="w-4 h-4 text-emerald-500"
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
            theme === 'dark' ? "text-gray-400" : "text-gray-500"
          )}>
            Pago seguro garantizado
          </span>
        </div>
      </div>
    );
  }

  // Con animación (comportamiento original)
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ 
        duration: 0.25,
        ease: "easeInOut",
        delay: 0.05
      }}
      className={cn(
        "flex flex-col items-center justify-center py-2",
        className
      )}
    >
      {/* Título de Precio Total */}
      <p className={cn(
        "text-sm font-semibold mb-2",
        theme === 'dark' ? "text-gray-400" : "text-gray-500"
      )}>
        Precio Total
      </p>

      {/* Precio con decimales estilizados */}
      <p className={cn(
        "text-4xl font-semibold leading-none mb-4",
        theme === 'dark' ? "text-white" : "text-gray-900"
      )}>
        €{integerPart}<span className={decimalStyle}>.{decimalPart}</span>
      </p>

      {/* Indicador de Pago Seguro */}
      <div className="flex items-center justify-center gap-2">
        <svg
          className="w-4 h-4 text-emerald-500"
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
          theme === 'dark' ? "text-gray-400" : "text-gray-500"
        )}>
          Pago seguro garantizado
        </span>
      </div>
    </motion.div>
  );
} 