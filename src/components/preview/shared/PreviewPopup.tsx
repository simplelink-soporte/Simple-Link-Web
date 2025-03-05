import { motion, AnimatePresence } from "framer-motion";
import { X, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect } from "react";

interface PreviewPopupProps {
  isOpen: boolean;
  onClose: () => void;
  theme: 'light' | 'dark';
  duration?: number;
}

export function PreviewPopup({
  isOpen,
  onClose,
  theme,
  duration = 3000
}: PreviewPopupProps) {
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose, duration]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 100 }}
          transition={{ type: "spring", damping: 20, stiffness: 300 }}
          className={cn(
            "fixed right-4 bottom-4",
            "px-4 py-3 rounded-lg shadow-lg",
            "flex items-center gap-3",
            theme === 'dark' 
              ? "bg-neutral-800 text-white border border-neutral-700" 
              : "bg-white text-gray-900 border border-gray-200",
            "z-50 max-w-sm"
          )}
        >
          <AlertCircle className={cn(
            "h-5 w-5 flex-shrink-0",
            theme === 'dark' ? "text-neutral-400" : "text-gray-500"
          )} />
          <p className="text-sm">
            Esta acción solo está disponible en la vista pública
          </p>
          <button
            onClick={onClose}
            className={cn(
              "p-1 rounded-md transition-colors flex-shrink-0",
              theme === 'dark' 
                ? "text-gray-400 hover:bg-neutral-700"
                : "text-gray-600 hover:bg-gray-100"
            )}
          >
            <X className="h-4 w-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
} 