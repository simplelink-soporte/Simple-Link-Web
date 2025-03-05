import { BaseField } from './base/BaseField';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface TextInputProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  required?: boolean;
  theme?: 'light' | 'dark';
  icon?: React.ReactNode;
  className?: string;
}

export function TextInput({
  label,
  value,
  onChange,
  placeholder,
  error,
  required,
  theme = 'light',
  icon,
  className
}: TextInputProps) {
  return (
    <BaseField
      label={label}
      error={error}
      required={required}
      theme={theme}
      className={className}
    >
      <div className="relative">
        {icon && (
          <div className={cn(
            "absolute left-3 top-1/2 -translate-y-1/2",
            theme === 'dark' ? "text-gray-400" : "text-gray-500"
          )}>
            {icon}
          </div>
        )}
        
        <Input
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(
            "transition-colors",
            icon && "pl-10",
            theme === 'dark' 
              ? "bg-gray-900 border-gray-800 text-gray-100 placeholder:text-gray-500"
              : "bg-white border-gray-200 text-gray-900 placeholder:text-gray-400",
            error && "border-red-500 focus-visible:ring-red-500"
          )}
        />
      </div>
    </BaseField>
  );
} 