import { memo, useCallback } from 'react';
import { Plus, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface QuantitySelectorProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  theme?: 'light' | 'dark';
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

export const QuantitySelector = memo(function QuantitySelector({
  value,
  onChange,
  min = 0,
  max = 100,
  theme = 'light',
  size = 'medium',
  className
}: QuantitySelectorProps) {
  const handleDecrease = useCallback(() => {
    if (value > min) {
      onChange(value - 1);
    }
  }, [value, min, onChange]);

  const handleIncrease = useCallback(() => {
    if (value < max) {
      onChange(value + 1);
    }
  }, [value, max, onChange]);

  // Determinar las clases según el tamaño
  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return {
          container: "gap-1.5",
          button: "h-6 w-6",
          icon: "h-2.5 w-2.5",
          text: "text-xs min-w-[14px] font-medium"
        };
      case 'large':
        return {
          container: "gap-3",
          button: "h-10 w-10",
          icon: "h-4 w-4",
          text: "text-base min-w-[24px] font-semibold"
        };
      default: // medium
        return {
          container: "gap-2",
          button: "h-8 w-8",
          icon: "h-3.5 w-3.5",
          text: "text-sm min-w-[18px] font-medium"
        };
    }
  };

  const sizeClasses = getSizeClasses();

  return (
    <div 
      className={cn(
        "flex items-center", 
        sizeClasses.container,
        className
      )}
    >
      <motion.div
        whileHover={{ scale: value > min ? 1.1 : 1 }}
        whileTap={{ scale: value > min ? 0.9 : 1 }}
        role="button"
        tabIndex={0}
        onClick={handleDecrease}
        onKeyDown={(e) => e.key === 'Enter' && handleDecrease()}
        className={cn(
          sizeClasses.button,
          "rounded-full flex items-center justify-center transition-colors",
          value <= min 
            ? "opacity-50 cursor-not-allowed" 
            : "cursor-pointer",
          theme === 'dark'
            ? value > min 
              ? "bg-blue-900/20 text-blue-400 hover:bg-blue-800/30" 
              : "bg-neutral-800 text-neutral-600"
            : value > min 
              ? "bg-blue-100 text-blue-600 hover:bg-blue-200" 
              : "bg-gray-100 text-gray-400"
        )}
        aria-label="Disminuir cantidad"
      >
        <Minus className={sizeClasses.icon} />
      </motion.div>
      
      <span className={cn(
        sizeClasses.text,
        "text-center",
        theme === 'dark' ? "text-white" : "text-gray-900"
      )}>
        {value}
      </span>
      
      <motion.div
        whileHover={{ scale: value < max ? 1.1 : 1 }}
        whileTap={{ scale: value < max ? 0.9 : 1 }}
        role="button"
        tabIndex={0}
        onClick={handleIncrease}
        onKeyDown={(e) => e.key === 'Enter' && handleIncrease()}
        className={cn(
          sizeClasses.button,
          "rounded-full flex items-center justify-center transition-colors",
          value >= max 
            ? "opacity-50 cursor-not-allowed" 
            : "cursor-pointer",
          theme === 'dark'
            ? value < max 
              ? "bg-blue-900/20 text-blue-400 hover:bg-blue-800/30" 
              : "bg-neutral-800 text-neutral-600"
            : value < max 
              ? "bg-blue-100 text-blue-600 hover:bg-blue-200" 
              : "bg-gray-100 text-gray-400"
        )}
        aria-label="Aumentar cantidad"
      >
        <Plus className={sizeClasses.icon} />
      </motion.div>
    </div>
  );
});
