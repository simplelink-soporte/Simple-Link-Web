'use client';

import { cn } from "@/lib/utils";
import { CreditCard, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";

interface SavedCardProps {
  id: string;
  last4: string;
  brand: string;
  expMonth: number;
  expYear: number;
  theme: 'light' | 'dark';
  onSelect: (cardId: string) => void;
  onDelete: (cardId: string) => Promise<void>;
}

export function SavedCard({
  id,
  last4,
  brand,
  expMonth,
  expYear,
  theme,
  onSelect,
  onDelete
}: SavedCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDeleting) return;

    try {
      setIsDeleting(true);
      await onDelete(id);
      toast.success('Tarjeta eliminada exitosamente');
    } catch (error) {
      toast.error('Error al eliminar la tarjeta');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <button
      onClick={() => onSelect(id)}
      className={cn(
        "w-full p-4 rounded-lg text-left transition-all",
        "border-2 relative group",
        theme === 'dark'
          ? "bg-neutral-900 border-neutral-800 hover:border-neutral-700"
          : "bg-white border-gray-200 hover:border-gray-300"
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={cn(
            "p-2 rounded-md",
            theme === 'dark' ? "bg-neutral-800" : "bg-gray-100"
          )}>
            <CreditCard className={cn(
              "w-6 h-6",
              theme === 'dark' ? "text-gray-400" : "text-gray-600"
            )} />
          </div>
          <div>
            <p className={cn(
              "font-medium",
              theme === 'dark' ? "text-white" : "text-gray-900"
            )}>
              {brand} •••• {last4}
            </p>
            <p className={cn(
              "text-sm",
              theme === 'dark' ? "text-gray-400" : "text-gray-500"
            )}>
              Expira: {expMonth.toString().padStart(2, '0')}/{expYear}
            </p>
          </div>
        </div>

        <Button
          size="icon"
          variant="ghost"
          onClick={handleDelete}
          disabled={isDeleting}
          className={cn(
            "opacity-0 group-hover:opacity-100 transition-opacity",
            theme === 'dark' 
              ? "hover:bg-neutral-800 text-gray-400"
              : "hover:bg-gray-100 text-gray-500"
          )}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </button>
  );
} 