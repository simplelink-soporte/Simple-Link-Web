import { Clock, Ticket } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { ReservationDetails } from "./ReservationDetails";
import { TotalPrice } from "./TotalPrice";
import { useEffect, useRef, useState } from "react";

interface PriceBreakdownProps {
  theme: 'light' | 'dark';
  calculations: {
    courtPrice: number;
    itemsTotal: number;
    discount: number;
    total: number;
    selectedItems: Array<{
      id: string;
      name: string;
      price: number;
      quantity: number;
      total: number;
    }>;
  };
  onShowItemsDetails: () => void;
  className?: string;
  viewType?: 'mobile' | 'desktop';
  hideDetails?: boolean;
}

export function PriceBreakdown({ 
  theme,
  calculations,
  onShowItemsDetails,
  className,
  viewType = 'desktop',
  hideDetails = false
}: PriceBreakdownProps) {
  const [scrollY, setScrollY] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (viewType === 'mobile') {
      const handleScroll = () => {
        if (containerRef.current) {
          setScrollY(window.scrollY);
        }
      };

      window.addEventListener('scroll', handleScroll, { passive: true });
      return () => window.removeEventListener('scroll', handleScroll);
    }
  }, [viewType]);

  // Calcular la opacidad basada en el scroll (solo para móvil)
  const opacity = Math.max(0, Math.min(1, 1 - (scrollY / 150)));
  const translateY = Math.min(0, -(scrollY * 0.3));

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className={cn(
        "w-full",
        className
      )}
    >
      {!hideDetails && (
        <ReservationDetails 
          theme={theme} 
          calculations={calculations}
          viewType={viewType}
        />
      )}

      {calculations.discount > 0 && (
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-2.5">
            <Ticket className="h-[18px] w-[18px] text-gray-400" />
            <p className={cn(
              "text-[15px] font-medium",
              theme === 'dark' ? "text-gray-300" : "text-gray-600"
            )}>
              Descuento
            </p>
          </div>
          <p className={cn(
            "text-[15px] font-medium text-green-500",
            theme === 'dark' ? "text-green-400" : "text-green-600"
          )}>
            -€{calculations.discount}
          </p>
        </div>
      )}
    </motion.div>
  );
} 