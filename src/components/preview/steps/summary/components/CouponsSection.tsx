import { Ticket, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Coupon } from "../types";

interface CouponsSectionProps {
  theme: 'light' | 'dark';
  appliedCoupon: Coupon | null;
  onShowCoupons: () => void;
  onRemoveCoupon: () => void;
}

export function CouponsSection({
  theme,
  appliedCoupon,
  onShowCoupons,
  onRemoveCoupon
}: CouponsSectionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className={cn(
        "rounded-lg p-5",
        "transition-all duration-200 ease-in-out",
        theme === 'dark' 
          ? "bg-neutral-900"
          : "bg-gray-50 hover:bg-gray-100/80"
      )}
    >
      <div className="space-y-2">
        {!appliedCoupon ? (
          <div className="relative">
            <button
              onClick={onShowCoupons}
              className={cn(
                "w-full p-3 rounded-lg flex items-center justify-between",
                "border-2 border-dashed",
                theme === 'dark' 
                  ? "border-neutral-700 hover:border-neutral-600 bg-neutral-900/50" 
                  : "border-gray-200 hover:border-gray-300 bg-gray-50/50"
              )}
            >
              <span className={cn(
                "text-xs",
                theme === 'dark' ? "text-neutral-300" : "text-gray-600"
              )}>
                Reclamar cupón
              </span>
              <Ticket className={cn(
                "h-4 w-4",
                theme === 'dark' ? "text-neutral-400" : "text-gray-500"
              )} />
            </button>
          </div>
        ) : (
          <div className={cn(
            "p-2.5 rounded-lg flex items-center justify-between",
            "border-2 border-dashed",
            theme === 'dark' 
              ? "border-zinc-800 bg-zinc-900/50"
              : "border-gray-200 bg-gray-50"
          )}>
            <div className="flex items-center gap-2">
              <Ticket className={cn(
                "h-4 w-4",
                theme === 'dark' 
                  ? "text-gray-400"
                  : "text-gray-600"
              )} />
              <div className="flex flex-col">
                <span className={cn(
                  "text-xs font-medium",
                  theme === 'dark' 
                    ? "text-gray-200"
                    : "text-gray-900"
                )}>
                  {appliedCoupon.code}
                </span>
                <span className={cn(
                  "text-[10px]",
                  theme === 'dark' 
                    ? "text-gray-400"
                    : "text-gray-500"
                )}>
                  {appliedCoupon.discount}% de descuento aplicado
                </span>
              </div>
            </div>
            <button
              onClick={onRemoveCoupon}
              className={cn(
                "p-1 rounded-md",
                theme === 'dark' 
                  ? "text-gray-400 hover:bg-zinc-800"
                  : "text-gray-600 hover:bg-gray-100"
              )}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
} 