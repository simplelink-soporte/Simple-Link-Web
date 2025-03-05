"use client"

import { useState } from "react"
import { Copy, Check, Globe } from "lucide-react"
import { cn } from "@/lib/utils"

export function FormShare() {
  const [copied, setCopied] = useState(false)
  const formUrl = "https://tu-dominio.com/forms/123"

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Error al copiar:", err)
    }
  }

  return (
    <div className="max-w-full mt-6">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">Link del formulario</h3>
          <p className="text-xs text-gray-500">
            Comparte este enlace para acceder al formulario
          </p>
        </div>

        <button
          type="button"
          onClick={() => {}}
          className={cn(
            "p-1.5 border rounded-lg transition-colors flex items-center gap-1.5 group",
            "border-gray-200 hover:border-gray-300",
            "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-black"
          )}
        >
          <Globe className="h-3.5 w-3.5 text-gray-500" strokeWidth={1.5} />
          <span className="text-xs text-gray-600 group-hover:text-gray-900">
            Dominio
          </span>
        </button>
      </div>

      <button
        onClick={handleCopy}
        className={cn(
          "w-full flex items-center justify-between",
          "px-3 py-2",
          "bg-gray-50/50 hover:bg-gray-50",
          "rounded-lg border border-gray-200",
          "text-sm transition-colors group"
        )}
      >
        <span className="text-xs text-gray-600 truncate">
          {formUrl}
        </span>
        <div className={cn(
          "flex items-center gap-1.5",
          "text-gray-400 group-hover:text-gray-600"
        )}>
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5" />
              <span className="text-[10px]">Copiado</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              <span className="text-[10px]">Copiar</span>
            </>
          )}
        </div>
      </button>
    </div>
  )
} 