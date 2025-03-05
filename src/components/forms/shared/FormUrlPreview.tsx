import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Copy, Check, Globe } from 'lucide-react';
import { FormUrlConfig } from '@/types/forms/publish';
import { motion, AnimatePresence } from 'framer-motion';

interface FormUrlPreviewProps {
  urlConfig: FormUrlConfig;
  isPublished: boolean;
  onUrlChange?: (config: FormUrlConfig) => void;
  className?: string;
}

export function FormUrlPreview({ 
  urlConfig, 
  isPublished,
  onUrlChange,
  className 
}: FormUrlPreviewProps) {
  const [copied, setCopied] = useState(false);
  const formUrl = urlConfig.customDomain 
    ? `https://${urlConfig.customDomain}/${urlConfig.slug}`
    : `${window.location.origin}/forms/${urlConfig.slug}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Error al copiar:', err);
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="relative">
        <Input
          value={formUrl}
          readOnly
          className={cn(
            "pr-20 text-sm font-mono bg-gray-50/50",
            !isPublished && "opacity-50 cursor-not-allowed",
            "border-gray-200 hover:border-gray-300 transition-colors"
          )}
        />
        <div className="absolute right-1 top-1/2 -translate-y-1/2">
          <AnimatePresence mode="wait">
            <motion.div
              key={copied ? 'copied' : 'copy'}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCopy}
                disabled={!isPublished}
                className={cn(
                  "h-7 px-2 gap-1.5",
                  copied && "text-green-600"
                )}
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    <span className="text-xs">Copiado</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span className="text-xs">Copiar</span>
                  </>
                )}
              </Button>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {!isPublished && (
        <p className="text-[10px] text-gray-500">
          Este enlace estará disponible cuando publiques el formulario
        </p>
      )}
    </div>
  );
} 