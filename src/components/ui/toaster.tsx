"use client"

import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { useToast } from "@/components/ui/use-toast"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props} className="bg-white border border-zinc-100 shadow-lg">
            <div className="grid gap-1">
              {title && <ToastTitle className="text-sm font-medium text-zinc-900 font-mono">{title}</ToastTitle>}
              {description && (
                <ToastDescription className="text-xs text-zinc-600 font-mono">{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose className="text-zinc-500 hover:text-zinc-900 transition-colors" />
          </Toast>
        )
      })}
      <ToastViewport className="fixed bottom-0 right-0 z-[40] flex flex-col p-4 gap-2 w-full max-w-[420px] mb-4 mr-4" />
    </ToastProvider>
  )
} 