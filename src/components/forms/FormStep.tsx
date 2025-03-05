"use client"

import { FormStepField } from "@/types/form-steps"
import { motion, Reorder, AnimatePresence, useDragControls } from "framer-motion"
import { cn } from "@/lib/utils"
import { Trash2, ChevronRight, GripVertical } from "lucide-react"
import { UsersStep } from "@/components/steps/users/UsersStep"
import { LocationStep } from "@/components/steps/location/LocationStep"
import { ShiftsStep } from "@/components/steps/shifts/ShiftsStep"
import { ItemsStep } from "@/components/steps/items/ItemsStep"
import { SummaryStep } from "@/components/steps/summary/SummaryStep"
import { FarewellStep } from "@/components/steps/farewell/FarewellStep"
import { GreetingStep } from "@/components/steps/greeting/GreetingStep"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

import { GreetingStepField } from "@/components/steps/greeting/types"
import { FarewellStepField } from "@/components/steps/farewell/types"
import { UserStepField } from "@/components/steps/users/types"
import { LocationStepField } from "@/components/steps/location/types"
import { ShiftsStepField } from "@/components/steps/shifts/types"
import { ItemsStepField } from "@/components/steps/items/types"
import { SummaryStepField } from "@/components/steps/summary/types"

interface FormStepProps {
  field: FormStepField;
  onEdit?: (id: string) => void;
  isExpanded: boolean;
  onExpand: (id: string) => void;
  onFieldUpdate?: (id: string, field: FormStepField) => void;
  isActive?: boolean;
}

export function FormStep({ 
  field, 
  onEdit, 
  isExpanded,
  onExpand,
  onFieldUpdate,
  isActive = false
}: FormStepProps) {
  const dragControls = useDragControls();

  const renderStepContent = () => {
    switch (field.type) {
      case 'users':
        return (
          <UsersStep 
            field={field as UserStepField} 
            onSettingsChange={(newSettings) => {
              if (onFieldUpdate) {
                onFieldUpdate(field.id, {
                  ...field,
                  settings: newSettings
                });
              }
            }} 
          />
        );
      case 'location':
        return <LocationStep field={field as LocationStepField} />;
      case 'shifts':
        return <ShiftsStep field={field as ShiftsStepField} />;
      case 'items':
        return <ItemsStep field={field as ItemsStepField} />;
      case 'summary':
        return (
          <SummaryStep 
            field={field as SummaryStepField} 
            onSettingsChange={(newSettings) => {
              if (onFieldUpdate) {
                onFieldUpdate(field.id, {
                  ...field,
                  settings: newSettings
                });
              }
            }}
          />
        );
      case 'farewell':
        return <FarewellStep field={field as FarewellStepField} />;
      case 'greeting':
        return <GreetingStep field={field as GreetingStepField} />;
      default:
        return null;
    }
  };

  return (
    <Reorder.Item
      value={field}
      dragListener={false}
      dragControls={dragControls}
      className={cn(
        "group relative rounded-lg border bg-white",
        "transition-colors duration-200"
      )}
      initial={false}
      whileDrag={{
        backgroundColor: "rgb(250, 250, 250)",
        transition: { duration: 0 }
      }}
    >
      {/* Header del paso */}
      <div className="flex items-center">
        <div 
          onPointerDown={(e) => dragControls.start(e)}
          className={cn(
            "px-2 py-3 cursor-grab active:cursor-grabbing",
            "touch-none select-none",
            "text-gray-400 hover:text-gray-600",
            "transition-colors duration-200",
            "flex items-center justify-center",
            "border-r border-transparent group-hover:border-gray-100"
          )}
        >
          <GripVertical className="h-4 w-4" />
        </div>

        <div 
          className={cn(
            "flex flex-1 items-center justify-between px-2 py-3",
            "cursor-pointer select-none",
            isExpanded && "border-b border-gray-100"
          )}
          onClick={() => onExpand(field.id)}
        >
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ rotate: isExpanded ? 90 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronRight className="h-4 w-4 text-gray-400" />
            </motion.div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">
                {field.label}
              </span>
              {isActive && (
                <TooltipProvider>
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ 
                          scale: 1, 
                          opacity: 1,
                          transition: {
                            type: "spring",
                            stiffness: 500,
                            damping: 30
                          }
                        }}
                        exit={{ scale: 0, opacity: 0 }}
                        className={cn(
                          "h-2 w-2 rounded-full",
                          "bg-black",
                          "ring-4 ring-black/10",
                          "transition-all duration-300",
                          "cursor-help"
                        )}
                      />
                    </TooltipTrigger>
                    <TooltipContent 
                      side="top"
                      className="text-xs bg-black text-white border-none shadow-lg"
                    >
                      Mostrándose en Vista Previa
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Contenido expandible */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 py-3">
              {renderStepContent()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Reorder.Item>
  )
} 