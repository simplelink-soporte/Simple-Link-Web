"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { FormField } from "@/types/forms"
import { 
  Users, 
  MapPin, 
  CalendarDays, 
  Clock, 
  Package, 
  Bell, 
  Ticket, 
  Send,
  X,
  Check,
  HelpCircle,
  Layout,
  Sparkles,
  Star,
  ClipboardList,
  Wave
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog"
import { FIELD_TYPES, DEFAULT_FIELD_ORDER, TEMPLATE_ORDERS, TemplateType } from "@/constants/form-fields"
import { FormStepField } from "@/types/form-steps"
import { createUserField } from '@/components/steps/users';
import { createLocationField } from '@/components/steps/location';
import { createShiftsField } from '@/components/steps/shifts';
import { createItemsField } from '@/components/steps/items';
import { createAnnouncementsField } from '@/components/steps/announcements';
import { createCouponsField } from '@/components/steps/coupons';
import { createSummaryField } from '@/components/steps/summary';
import { createFarewellField } from '@/components/steps/farewell';
import { createGreetingField } from '@/components/steps/greeting/createField';
import { Label } from "@/components/ui/label"
import { DEFAULT_USER_SETTINGS } from '@/components/steps/users/defaults';
import { validateStepOrder } from '@/lib/validations';

interface NewFieldModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (fields: FormStepField[], isDefault: boolean) => void
  existingFields: FormStepField[]
  onClearFields: () => void
}

// Definir un tipo más específico para los campos
type FieldLabel = 
  | "users" 
  | "location" 
  | "courts" 
  | "shifts" 
  | "items" 
  | "summary" 
  | "farewell" 
  | "coupons" 
  | "announcements"
  | "greeting";

interface FormFieldType {
  id: string;
  type: FieldLabel;
  label: string;
  required: boolean;
}

const createFieldWithSettings = (fieldId: string, fieldType: typeof FIELD_TYPES[number]): FormStepField => {
  switch (fieldId) {
    case 'users':
      return createUserField();
    case 'location':
      return createLocationField();
    case 'shifts':
      return createShiftsField();
    case 'items':
      return createItemsField();
    case 'announcements':
      return createAnnouncementsField();
    case 'coupons':
      return createCouponsField();
    case 'summary':
      return createSummaryField();
    case 'farewell':
      return createFarewellField();
    case 'greeting':
      return createGreetingField();
    default:
      throw new Error(`Tipo de campo no soportado: ${fieldId}`);
  }
};

export function NewFieldModal({ isOpen, onClose, onSave, existingFields, onClearFields }: NewFieldModalProps) {
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set())
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType | null>(null)

  const handleToggleField = (fieldId: string) => {
    setSelectedFields(prev => {
      const newSet = new Set(prev)
      if (newSet.has(fieldId)) {
        newSet.delete(fieldId)
      } else {
        newSet.add(fieldId)
      }
      return newSet
    })
  }

  const createDefaultFields = (): FormStepField[] => {
    return DEFAULT_FIELD_ORDER
      .map(fieldId => {
        const fieldType = FIELD_TYPES.find(f => f.id === fieldId);
        if (fieldType) {
          return createFieldWithSettings(fieldId, fieldType);
        }
        return null;
      })
      .filter((field): field is FormStepField => field !== null);
  };

  const handleApplyDefaultClick = () => {
    if (existingFields.length > 0) {
      setShowConfirmDialog(true);
    } else {
      const defaultFields = createDefaultFields();
      onClearFields();
      onSave(defaultFields, true);
      onClose();
    }
  };

  const handleConfirmApplyDefault = () => {
    setShowConfirmDialog(false);
    const defaultFields = createDefaultFields();
    onClearFields();
    onSave(defaultFields, true);
    onClose();
  };

  const handleSubmit = () => {
    const selectedFieldsArray = Array.from(selectedFields);
    
    if (selectedTemplate) {
      setShowConfirmDialog(true);
    } else {
      const newFields = selectedFieldsArray.map(fieldId => 
        createFieldWithSettings(fieldId, FIELD_TYPES.find(f => f.id === fieldId)!)
      );
      onSave(newFields, false);
    }
  };

  // Lista de tipos de campos que pueden repetirse
  const REPEATABLE_FIELDS = ["coupons", "announcements", "items"]

  // Función modificada para verificar si un tipo de campo ya existe
  const isFieldTypeUsed = (fieldId: string) => {
    // Si el campo está en la lista de repetibles, siempre retornar false
    if (REPEATABLE_FIELDS.includes(fieldId)) {
      return false
    }
    // Para el resto de campos, verificar si ya existe
    return existingFields.some(field => field.type === fieldId)
  }

  const createFieldsFromTemplate = (templateId: TemplateType): FormStepField[] => {
    const order = TEMPLATE_ORDERS[templateId];
    return order
      .map(fieldId => {
        const fieldType = FIELD_TYPES.find(f => f.id === fieldId);
        if (fieldType) {
          return createFieldWithSettings(fieldId, fieldType);
        }
        return null;
      })
      .filter((field): field is FormStepField => field !== null);
  };

  const handleConfirmApplyTemplate = () => {
    const templateFields = TEMPLATE_ORDERS[selectedTemplate as TemplateType].map(fieldId =>
      createFieldWithSettings(fieldId, FIELD_TYPES.find(f => f.id === fieldId)!)
    );
    onSave(templateFields, true);
    setShowConfirmDialog(false);
  };

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/30 backdrop-blur-[2px]"
            style={{ 
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
              zIndex: 50,
              margin: 0,
              padding: 0
            }}
          />

          <motion.div
            initial={{ x: "100%", opacity: 0.5 }}
            animate={{ 
              x: 0, 
              opacity: 1,
              transition: {
                type: "spring",
                damping: 30,
                stiffness: 300,
                mass: 0.8
              }
            }}
            exit={{ 
              x: "100%", 
              opacity: 0,
              transition: {
                duration: 0.25,
                ease: [0.32, 0, 0.67, 0]
              }
            }}
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              width: '500px',
              zIndex: 51,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              margin: 0,
              padding: 0,
              borderRadius: 0
            }}
            className="bg-white shadow-2xl border-l"
          >
            <div className="h-full flex flex-col">
              <motion.div
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -10, opacity: 0 }}
                transition={{ 
                  duration: 0.2,
                  ease: "easeOut"
                }}
                className="p-6 border-b"
              >
                <motion.h2 
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.15, duration: 0.3 }}
                  className="text-xl font-semibold"
                >
                  Agregar Campos
                </motion.h2>
                <motion.p 
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.3 }}
                  className="text-sm text-gray-500 mt-1"
                >
                  Selecciona los campos que deseas agregar a tu formulario
                </motion.p>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ 
                  duration: 0.2,
                  ease: "easeInOut"
                }}
                className="flex-1 overflow-y-auto"
              >
                <div className="p-6">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ 
                      duration: 0.2,
                      ease: "easeInOut"
                    }}
                    className="mb-8"
                  >
                    <div className="space-y-1 mb-4">
                      <h3 className="text-sm font-medium">Elige una Plantilla</h3>
                      <p className="text-xs text-gray-500">
                        Selecciona el tipo de formulario que mejor se adapte a tus necesidades
                      </p>
                    </div>

                    <div className="flex flex-col gap-3">
                      {[
                        {
                          id: "classic",
                          label: "Estándar",
                          sublabel: "Recomendado",
                          description: "Formulario completo con todos los pasos necesarios para una experiencia equilibrada",
                          icon: Layout,
                          color: "#000000",
                          onClick: () => {
                            if (existingFields.length > 0) {
                              setShowConfirmDialog(true);
                              setSelectedTemplate("classic");
                            } else {
                              const classicFields = createFieldsFromTemplate("classic");
                              onClearFields();
                              onSave(classicFields, true);
                              onClose();
                            }
                          }
                        },
                        {
                          id: "minimal",
                          label: "Simplificado",
                          sublabel: "Básico",
                          description: "Versión reducida con los pasos esenciales para una reserva rápida y directa",
                          icon: Star,
                          color: "#2563EB",
                          onClick: () => {
                            if (existingFields.length > 0) {
                              setShowConfirmDialog(true);
                              setSelectedTemplate("minimal");
                            } else {
                              const minimalFields = createFieldsFromTemplate("minimal");
                              onClearFields();
                              onSave(minimalFields, true);
                              onClose();
                            }
                          }
                        },
                        {
                          id: "fancy",
                          label: "Completo",
                          sublabel: "Avanzado",
                          description: "Versión extendida con pasos adicionales para una experiencia más personalizada",
                          icon: Sparkles,
                          color: "#16A34A",
                          onClick: () => {
                            if (existingFields.length > 0) {
                              setShowConfirmDialog(true);
                              setSelectedTemplate("fancy");
                            } else {
                              const fancyFields = createFieldsFromTemplate("fancy");
                              onClearFields();
                              onSave(fancyFields, true);
                              onClose();
                            }
                          }
                        }
                      ].map((template) => {
                        const Icon = template.icon;
                        return (
                          <button
                            key={template.id}
                            type="button"
                            onClick={template.onClick}
                            className="relative flex w-full items-start gap-2 rounded-lg border border-input p-4 shadow-sm shadow-black/5 has-[[data-state=checked]]:border-ring transition-colors hover:bg-gray-50/50 text-left"
                          >
                            <div className="flex grow items-center gap-3">
                              <div className={cn(
                                "shrink-0 p-2 rounded-md transition-colors",
                                "bg-gray-100/80 text-gray-600"
                              )}>
                                <Icon className="h-5 w-5" strokeWidth={1.5} />
                              </div>
                              <div className="grid gap-1 text-left">
                                <Label htmlFor={template.id} className="text-sm">
                                  {template.label}{" "}
                                  <span className="text-xs font-normal leading-[inherit] text-muted-foreground">
                                    ({template.sublabel})
                                  </span>
                                </Label>
                                <p className="text-xs text-muted-foreground">
                                  {template.description}
                                </p>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>

                  <div className="relative mb-8">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-200"></div>
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white px-2 text-gray-500">o selecciona manualmente</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {FIELD_TYPES.map((field) => {
                      const Icon = field.icon
                      const isSelected = selectedFields.has(field.id)
                      const isDisabled = isFieldTypeUsed(field.id)
                      const isRepeatable = REPEATABLE_FIELDS.includes(field.id)
                      
                      return (
                        <TooltipProvider key={field.id}>
                          <Tooltip delayDuration={300}>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                onClick={() => !isDisabled && handleToggleField(field.id)}
                                className={cn(
                                  "p-3 border rounded-lg text-left transition-colors flex flex-col group",
                                  isSelected && "border-black bg-gray-50",
                                  isDisabled && "opacity-50 cursor-not-allowed border-gray-200 bg-gray-50",
                                  !isDisabled && !isSelected && "border-gray-200 hover:border-gray-300"
                                )}
                                disabled={isDisabled}
                              >
                                <div className="flex items-start gap-2">
                                  <div className={cn(
                                    "p-1.5 rounded-md transition-colors flex-shrink-0",
                                    isSelected ? "bg-black text-white" : 
                                    isDisabled ? "bg-gray-200 text-gray-400" :
                                    "bg-gray-100 text-gray-600 group-hover:bg-gray-200"
                                  )}>
                                    <Icon className="h-4 w-4" strokeWidth={1.5} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-0.5">
                                      <div className="flex items-center gap-1">
                                        <span className={cn(
                                          "font-medium text-xs truncate",
                                          isDisabled && "text-gray-400"
                                        )}>
                                          {field.label}
                                        </span>
                                        <HelpCircle className={cn(
                                          "h-3 w-3",
                                          isDisabled ? "text-gray-300" : "text-gray-400"
                                        )} />
                                      </div>
                                      {isSelected && (
                                        <Check className="h-3.5 w-3.5 text-black flex-shrink-0" />
                                      )}
                                    </div>
                                    <p className={cn(
                                      "text-[10px] line-clamp-2",
                                      isDisabled ? "text-gray-400" : "text-gray-500"
                                    )}>
                                      {field.description}
                                    </p>
                                  </div>
                                </div>
                              </button>
                            </TooltipTrigger>
                            <TooltipContent 
                              side="top" 
                              className="max-w-[250px] text-xs bg-white border shadow-lg p-2.5 rounded-lg"
                              sideOffset={5}
                            >
                              {isDisabled ? 
                                "Este paso ya ha sido agregado" : 
                                isRepeatable ?
                                  field.tooltip :
                                  field.tooltip
                              }
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )
                    })}
                  </div>
                </div>
              </motion.div>

              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 10, opacity: 0 }}
                transition={{ 
                  duration: 0.2,
                  ease: "easeInOut"
                }}
                className="p-6 border-t"
              >
                <div className="flex justify-end items-center gap-3">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={selectedFields.size === 0}
                    className={cn(
                      "px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200",
                      selectedFields.size > 0 
                        ? "bg-black text-white hover:bg-gray-800"
                        : "bg-gray-100 text-gray-400 cursor-not-allowed"
                    )}
                  >
                    Agregar Campos
                  </button>
                </div>
              </motion.div>
            </div>
          </motion.div>

          <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta acción reemplazará todos los pasos existentes con la configuración de la plantilla seleccionada. 
                  Los cambios no se pueden deshacer.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setShowConfirmDialog(false)}>
                  Cancelar
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleConfirmApplyTemplate}
                >
                  Continuar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </AnimatePresence>
  )
} 