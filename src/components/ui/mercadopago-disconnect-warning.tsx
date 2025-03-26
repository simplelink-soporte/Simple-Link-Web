import React from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface MercadoPagoDisconnectWarningProps {
  show: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function MercadoPagoDisconnectWarning({
  show,
  onConfirm,
  onCancel,
}: MercadoPagoDisconnectWarningProps) {
  return (
    <AlertDialog open={show} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Desconectar cuenta de Mercado Pago</AlertDialogTitle>
          <AlertDialogDescription>
            Estás a punto de desconectar tu cuenta de Mercado Pago. Esta acción:
            <ul className="list-disc pl-5 mt-2 space-y-1 text-sm">
              <li>Eliminará la conexión entre Simple-Link y tu cuenta de Mercado Pago</li>
              <li>No afectará tu cuenta de Mercado Pago existente</li>
              <li>Te impedirá recibir pagos a través de Mercado Pago hasta que vuelvas a conectar</li>
            </ul>
            <p className="mt-2">
              ¿Estás seguro de que deseas continuar?
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Cancelar</AlertDialogCancel>
          <AlertDialogAction 
            className="bg-red-600 hover:bg-red-700"
            onClick={onConfirm}
          >
            Desconectar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
