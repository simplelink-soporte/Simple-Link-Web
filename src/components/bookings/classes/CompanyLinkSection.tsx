"use client"

import { IconCopy, IconExternalLink } from "@tabler/icons-react"
import { useCompanyLink } from "../hooks/useCompanyLink"
import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface CompanyLinkSectionProps {
  branchId?: string
}

export function CompanyLinkSection({ branchId }: CompanyLinkSectionProps) {
  const { 
    companyLink, 
    isLoading, 
    error, 
    copyToClipboard, 
    hasExistingLink
  } = useCompanyLink({ branchId })

  if (!branchId) {
    return null
  }

  if (isLoading) {
    return (
      <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="animate-pulse space-y-3">
          <div className="h-6 w-40 bg-gray-100 rounded" />
          <div className="h-4 w-60 bg-gray-100 rounded mt-2" />
          <div className="h-10 bg-gray-100 rounded" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100">
        <p className="text-sm text-red-500">Error al cargar el link de la empresa</p>
      </div>
    )
  }

  // Si no hay un link existente, no mostrar nada
  if (!hasExistingLink) {
    return null;
  }

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <div className="flex items-center">
          <span className="text-xs text-gray-600 mr-2">Tu link de clases:</span>
          <div className={cn(
            "flex-1",
            "text-xs text-gray-600 font-mono"
          )}>
            <span className="truncate">{companyLink}</span>
          </div>

          <div className="flex items-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={copyToClipboard}
                  className={cn(
                    "p-1",
                    "text-gray-600 hover:text-gray-900",
                    "transition-all duration-200"
                  )}
                >
                  <IconCopy className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Copiar al portapapeles</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <a
                  href={companyLink || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "p-1",
                    "text-gray-600 hover:text-gray-900",
                    "transition-all duration-200"
                  )}
                >
                  <IconExternalLink className="w-4 h-4" />
                </a>
              </TooltipTrigger>
              <TooltipContent>
                <p>Abrir en nueva pestaña</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
} 