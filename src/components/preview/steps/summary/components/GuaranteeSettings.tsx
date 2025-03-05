import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface GuaranteeSettingsProps {
  theme: 'light' | 'dark';
  percentage: number;
  onPercentageChange: (value: number) => void;
  disabled?: boolean;
}

export function GuaranteeSettings({
  theme,
  percentage,
  onPercentageChange,
  disabled = false
}: GuaranteeSettingsProps) {
  return (
    <div className="space-y-2">
      <Label 
        htmlFor="guarantee-percentage"
        className={cn(
          theme === 'dark' ? "text-gray-200" : "text-gray-700"
        )}
      >
        Porcentaje de Garantía
      </Label>
      <div className="flex gap-2 items-center">
        <Input
          id="guarantee-percentage"
          type="number"
          min={1}
          max={100}
          value={percentage}
          onChange={(e) => onPercentageChange(Number(e.target.value))}
          disabled={disabled}
          className={cn(
            "w-24",
            theme === 'dark' 
              ? "bg-neutral-800 border-neutral-700 text-white" 
              : "bg-white"
          )}
        />
        <span className={cn(
          theme === 'dark' ? "text-gray-300" : "text-gray-600"
        )}>
          %
        </span>
      </div>
      <p className={cn(
        "text-sm",
        theme === 'dark' ? "text-gray-400" : "text-gray-500"
      )}>
        Este porcentaje se retendrá como garantía
      </p>
    </div>
  );
} 