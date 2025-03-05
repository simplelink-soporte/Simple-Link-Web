import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileNavigationProps {
  theme: 'light' | 'dark';
  onPrev?: () => void;
  isPublicView?: boolean;
  className?: string;
}

export function MobileNavigation({ 
  theme,
  onPrev,
  isPublicView = false,
  className
}: MobileNavigationProps) {
  if (!isPublicView || !onPrev) return null;

  return (
    <div className={cn(
      "absolute top-6 left-6 z-50",
      className
    )}>
      <button
        onClick={onPrev}
        className={cn(
          "p-1.5 rounded-lg transition-colors",
          theme === 'dark'
            ? "text-white hover:bg-white/10"
            : "text-black hover:bg-black/10"
        )}
      >
        <ArrowLeft className="h-6 w-6" strokeWidth={2.5} />
      </button>
    </div>
  );
} 