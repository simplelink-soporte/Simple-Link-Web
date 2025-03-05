import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface UpgradeModalProps {
  isOpen: boolean
  onClose: () => void
}

export function UpgradeModal({ isOpen, onClose }: UpgradeModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Planes disponibles
          </DialogTitle>
          <DialogDescription className="text-gray-500">
            Elija el plan que mejor se adapte a sus necesidades
          </DialogDescription>
        </DialogHeader>
        <div className="mt-6 space-y-4">
          {/* Aquí irán los planes cuando los desarrollemos */}
          <div className="p-6 rounded-xl border border-gray-200 bg-gray-50/50">
            <p className="text-sm text-gray-500">Próximamente disponible...</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 