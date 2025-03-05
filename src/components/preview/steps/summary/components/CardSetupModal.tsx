'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CardSetupForm } from "./CardSetupForm";
import { GuaranteeSection } from "./GuaranteeSection";

interface CardSetupModalProps {
  open: boolean;
  onClose: () => void;
  stripeAccountId: string;
  guaranteeConfig: { percentage: number };
  onGuaranteeConfigChange: (config: { percentage: number }) => void;
  onSuccess: (paymentMethodId: string) => void;
  onError: (error: any) => void;
}

export function CardSetupModal({
  open,
  onClose,
  stripeAccountId,
  guaranteeConfig,
  onGuaranteeConfigChange,
  onSuccess,
  onError
}: CardSetupModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Configurar Garantía</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <GuaranteeSection
            config={guaranteeConfig}
            onChange={onGuaranteeConfigChange}
          />
          <CardSetupForm
            stripeAccountId={stripeAccountId}
            onSuccess={onSuccess}
            onError={onError}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
} 