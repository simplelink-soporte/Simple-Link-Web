import { ChangeEvent, useCallback, useState } from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Search, X } from 'lucide-react';
import { motion } from 'framer-motion';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  theme?: 'light' | 'dark';
}

export function SearchBar({
  value,
  onChange,
  placeholder = 'Buscar ítems...',
  className,
  theme = 'light'
}: SearchBarProps) {
  const [isFocused, setIsFocused] = useState(false);
  
  const handleChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  }, [onChange]);
  
  const handleClear = useCallback(() => {
    onChange('');
  }, [onChange]);
  
  return (
    <div className={cn(
      "relative",
      className
    )}>
      <div className={cn(
        "absolute left-3 top-1/2 -translate-y-1/2 text-gray-400",
        "transition-opacity duration-200",
        (isFocused || value) ? "opacity-0" : "opacity-100"
      )}>
        <Search className="h-4 w-4" />
      </div>
      
      <Input
        type="text"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className={cn(
          "pl-10 pr-10 py-2 h-10 transition-all duration-200",
          "focus:ring-2 focus:ring-offset-0",
          theme === 'dark'
            ? "bg-neutral-800 border-neutral-700 text-white placeholder:text-gray-500 focus:ring-blue-800"
            : "bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:ring-blue-200"
        )}
      />
      
      {value && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          className={cn(
            "absolute right-3 top-1/2 -translate-y-1/2",
            "h-5 w-5 rounded-full flex items-center justify-center",
            theme === 'dark' 
              ? "bg-neutral-700 text-gray-300 hover:bg-neutral-600" 
              : "bg-gray-200 text-gray-500 hover:bg-gray-300"
          )}
          onClick={handleClear}
          aria-label="Limpiar búsqueda"
        >
          <X className="h-3 w-3" />
        </motion.button>
      )}
    </div>
  );
}
