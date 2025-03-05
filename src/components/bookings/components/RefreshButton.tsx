import { Button } from "@/components/ui/button"
import { IconRefresh } from "@tabler/icons-react"
import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"

interface RefreshButtonProps {
  onRefreshClick: () => void
  isRefreshing?: boolean
}

export function RefreshButton({
  onRefreshClick,
  isRefreshing = false
}: RefreshButtonProps) {
  const [isSpinning, setIsSpinning] = useState(false);

  useEffect(() => {
    if (!isRefreshing && isSpinning) {
      const timer = setTimeout(() => {
        setIsSpinning(false);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [isRefreshing, isSpinning]);

  const handleClick = () => {
    if (!isSpinning) {
      setIsSpinning(true);
      onRefreshClick();
    }
  };

  return (
    <Button
      variant="outline"
      size="icon"
      className={cn(
        "p-2 bg-white hover:bg-gray-50 rounded-md border border-gray-200",
        "relative overflow-hidden",
        "transition-colors duration-200"
      )}
      onClick={handleClick}
      disabled={isSpinning}
    >
      <IconRefresh 
        className={cn(
          "h-5 w-5 text-gray-600",
          isSpinning && "animate-spin"
        )}
        stroke={1.5}
      />
    </Button>
  )
} 