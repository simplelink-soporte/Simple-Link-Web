import { useState } from "react";
import { motion } from "framer-motion";
import { X, Ticket } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Coupon } from "../types";

interface CouponsModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: 'light' | 'dark';
  viewType: "mobile" | "desktop";
  onApply: (coupon: Coupon) => void;
  couponCode: string;
  setCouponCode: (code: string) => void;
  error: string;
  isPublicView?: boolean;
}

export function CouponsModal({
  isOpen,
  onClose,
  theme,
  viewType,
  onApply,
  couponCode,
  setCouponCode,
  error,
  isPublicView = false
}: CouponsModalProps) {
  const handleApplyCoupon = (code: string) => {
    const coupon: Coupon = {
      code,
      discount: 0,
      type: 'percentage',
      description: 'Cupón personalizado'
    };
    onApply(coupon);
    if (!error) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.5 }}
        exit={{ opacity: 0 }}
        className={cn(
          "bg-black z-[60]",
          isPublicView ? "fixed inset-0" : "absolute inset-0"
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
              : "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
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
              Cupones
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
          <div className="p-4">
            <div className="relative">
              <Input
                value={couponCode}
                onChange={(e) => {
                  setCouponCode(e.target.value.toUpperCase());
                }}
                placeholder="Ingresa un código de cupón"
                className={cn(
                  "pl-8 h-9 text-xs",
                  theme === 'dark'
                    ? "bg-neutral-800 border-neutral-700 focus:border-neutral-600"
                    : "bg-white border-gray-200 focus:border-gray-300"
                )}
              />
              <Ticket className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              <Button
                size="sm"
                onClick={() => handleApplyCoupon(couponCode)}
                className={cn(
                  "absolute right-1 top-1 h-7 text-xs",
                  theme === 'dark'
                    ? "bg-neutral-700 hover:bg-neutral-600 text-white"
                    : "bg-gray-900 hover:bg-gray-800 text-white"
                )}
              >
                Aplicar
              </Button>
            </div>
            {error && (
              <p className="text-xs text-red-500 mt-1">
                {error}
              </p>
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
} 