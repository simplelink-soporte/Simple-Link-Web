/**
 * BaseField: Componente base para campos de formulario
 * 
 * Proporciona una estructura consistente para campos de entrada,
 * incluyendo manejo de labels, errores y temas visuales.
 * 
 * @example
 * <BaseField label="Email" required error={errors.email}>
 *   <Input type="email" {...register('email')} />
 * </BaseField>
 */
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface BaseFieldProps {
  label?: string;
  error?: string;
  required?: boolean;
  theme?: 'light' | 'dark';
  children: React.ReactNode;
  className?: string;
}

export function BaseField({
  label,
  error,
  required,
  theme = 'light',
  children,
  className
}: BaseFieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <label className={cn(
          "block text-sm font-medium",
          theme === 'dark' ? "text-gray-200" : "text-gray-700"
        )}>
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      {children}
      
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs text-red-500"
        >
          {error}
        </motion.p>
      )}
    </div>
  );
} 