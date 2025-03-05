import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { createPortal } from "react-dom";
import { useEffect, useState } from "react";

interface MobileNextButtonProps {
  theme: 'light' | 'dark';
  onNext: () => void;
  isDisabled?: boolean;
  isPublicView?: boolean;
  className?: string;
  viewType?: "mobile" | "desktop";
  variant?: 'shifts' | 'default';
}

export function MobileNextButton({ 
  theme,
  onNext,
  isDisabled = false,
  isPublicView = false,
  viewType = "mobile",
  className,
  variant = 'default'
}: MobileNextButtonProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!isPublicView || viewType !== "mobile" || !mounted) return null;

  const buttonContent = (
    <div 
      className={cn(
        "fixed bottom-0 left-0 right-0 z-[9999]",
        variant === 'shifts' 
          ? "bg-gradient-to-t from-white to-transparent pb-6 pt-4"
          : "pb-6 pt-4",
        theme === 'dark' && variant !== 'shifts' && "from-black/20",
      )}
      style={{
        willChange: 'transform',
        transform: 'translate3d(0, 0, 0)'
      }}
    >
      <div className={cn(
        "px-6 mx-auto w-full max-w-[430px]",
        className
      )}>
        <div
          style={{
            willChange: 'opacity',
            backfaceVisibility: 'hidden',
            opacity: 1
          }}
        >
          <Button
            onClick={onNext}
            disabled={isDisabled}
            className={cn(
              "w-full rounded-lg py-6 text-base font-normal",
              "shadow-lg backdrop-blur-sm",
              theme === 'dark' 
                ? isDisabled
                  ? "!bg-neutral-900/90 !text-neutral-400 cursor-not-allowed hover:!bg-neutral-900/90"
                  : "!bg-white/90 !text-black hover:!bg-white/80"
                : isDisabled
                  ? "!bg-[#A7A4A7] !text-[#dcdcdc] cursor-not-allowed hover:!bg-[#A6A3A6]"
                  : "!bg-black/90 !text-white hover:!bg-black/80",
              "disabled:opacity-100"
            )}
            style={{
              transform: 'translate3d(0, 0, 0)',
              willChange: 'transform',
              opacity: 1
            }}
          >
            Continuar
          </Button>
        </div>
      </div>
    </div>
  );

  return createPortal(buttonContent, document.body);
} 