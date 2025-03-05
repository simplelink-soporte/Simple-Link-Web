import { Button } from "@/components/ui/button"
import { HelpCircle } from "lucide-react"
import {
  TooltipProvider,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface SectionTitleProps { 
  title: string
  subtitle: string
  tooltip: string 
}

export function SectionTitle({ title, subtitle, tooltip }: SectionTitleProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-medium">{title}</h3>
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                className="p-0 h-auto hover:bg-transparent"
              >
                <HelpCircle className="h-4 w-4 text-gray-400 hover:text-gray-600 transition-colors" />
              </Button>
            </TooltipTrigger>
            <TooltipContent 
              side="right"
              className="max-w-xs"
            >
              <p className="text-sm">{tooltip}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <p className="text-xs text-gray-500">{subtitle}</p>
    </div>
  )
} 