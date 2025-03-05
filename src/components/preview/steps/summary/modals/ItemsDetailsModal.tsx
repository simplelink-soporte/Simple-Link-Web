import { motion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ItemsDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: 'light' | 'dark';
  viewType: "mobile" | "desktop";
  items: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
    total: number;
  }>;
  isPublicView?: boolean;
}

export function ItemsDetailsModal({
  isOpen,
  onClose,
  theme,
  viewType,
  items,
  isPublicView = false
}: ItemsDetailsModalProps) {
  if (!isOpen) return null;

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.5 }}
        exit={{ opacity: 0 }}
        className={cn(
          "bg-black z-[60]",
          isPublicView 
            ? "fixed inset-0" 
            : "absolute top-0 left-0 w-full h-screen"
        )}
        onClick={onClose}
      />
      <motion.div
        initial={viewType === "mobile" ? { y: "100%" } : { opacity: 0, scale: 0.95 }}
        animate={viewType === "mobile" ? { y: "30%" } : { opacity: 1, scale: 1 }}
        exit={viewType === "mobile" ? { y: "100%" } : { opacity: 0, scale: 0.95 }}
        transition={
          viewType === "mobile" 
            ? { type: "spring", damping: 25, stiffness: 300 }
            : { duration: 0.2 }
        }
        className={cn(
          viewType === "mobile"
            ? "rounded-t-xl h-[70vh]"
            : "w-[480px] rounded-xl max-h-[85vh]",
          theme === 'dark' ? "bg-neutral-900" : "bg-white",
          "shadow-xl z-[70] flex flex-col",
          isPublicView 
            ? viewType === "mobile"
              ? "fixed bottom-0 left-0 right-0"
              : "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
            : viewType === "mobile"
              ? "absolute bottom-0 left-0 right-0"
              : "absolute top-[50vh] left-1/2 -translate-x-1/2 -translate-y-1/2"
        )}
      >
        {/* Cabecera fija */}
        <div className="flex-none p-4 border-b border-gray-100 dark:border-neutral-800">
          {/* Indicador de arrastre (solo móvil) */}
          {viewType === "mobile" && (
            <div className="flex justify-center -mt-2 mb-3">
              <div className={cn(
                "w-10 h-1 rounded-full",
                theme === 'dark' ? "bg-neutral-800" : "bg-gray-200"
              )} />
            </div>
          )}

          {/* Título y botón cerrar */}
          <div className="flex items-center justify-between mb-2">
            <h3 className={cn(
              viewType === "mobile" ? "text-sm" : "text-base",
              "font-medium",
              theme === 'dark' ? "text-white" : "text-gray-900"
            )}>
              Detalle de Artículos
            </h3>
            <button
              onClick={onClose}
              className={cn(
                "p-1 rounded-md transition-colors",
                theme === 'dark' 
                  ? "text-gray-400 hover:bg-neutral-800"
                  : "text-gray-600 hover:bg-gray-100"
              )}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Contenido scrolleable */}
        <div 
          className={cn(
            "flex-1 overflow-y-auto overscroll-contain",
            "touch-pan-y will-change-scroll"
          )}
        >
          <div className="p-4 space-y-2">
            {items.map((item) => (
              <div 
                key={item.id} 
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg",
                  theme === 'dark' ? "bg-neutral-800" : "bg-gray-50"
                )}
              >
                <div className="space-y-0.5">
                  <p className={cn(
                    viewType === "mobile" ? "text-sm" : "text-base",
                    theme === 'dark' ? "text-gray-200" : "text-gray-700"
                  )}>
                    {item.name}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-xs px-2 py-0.5 rounded-full",
                      theme === 'dark' 
                        ? "bg-neutral-700 text-gray-300"
                        : "bg-gray-200 text-gray-700"
                    )}>
                      {item.quantity} {item.quantity === 1 ? 'unidad' : 'unidades'}
                    </span>
                    <span className={cn(
                      "text-xs",
                      theme === 'dark' ? "text-gray-400" : "text-gray-500"
                    )}>
                      ${item.price.toFixed(2)} c/u
                    </span>
                  </div>
                </div>
                <div className={cn(
                  "text-sm font-medium",
                  theme === 'dark' ? "text-gray-200" : "text-gray-900"
                )}>
                  ${item.total.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </>
  );
} 