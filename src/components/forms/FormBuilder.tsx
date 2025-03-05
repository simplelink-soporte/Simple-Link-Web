"use client"

import { useState, useEffect } from "react"
import { motion, Reorder, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Save, Globe, Loader2, AlertCircle } from "lucide-react"
import { FormStepField } from "@/types/form-steps"
import { cn } from "@/lib/utils"
import { FormStep } from "./FormStep"
import { validateStepOrder } from '@/lib/validations';
import { PublishFormDialog } from "./dialogs/PublishFormDialog";
import { FIELD_TYPES, DEFAULT_FIELD_ORDER } from "@/constants/form-fields"
import { createUserField } from '@/components/steps/users';
import { createLocationField } from '@/components/steps/location';
import { createShiftsField } from '@/components/steps/shifts';
import { createItemsField } from '@/components/steps/items';
import { createAnnouncementsField } from '@/components/steps/announcements';
import { createCouponsField } from '@/components/steps/coupons';
import { createSummaryField } from '@/components/steps/summary';
import { createFarewellField } from '@/components/steps/farewell';
import { createGreetingField } from '@/components/steps/greeting/createField';

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

interface FormBuilderProps {
  fields: FormStepField[];
  onFieldsChange: (fields: FormStepField[]) => void;
  onClearFields: () => void;
  onThemeChange: (isDark: boolean) => void;
  onPublish?: () => void;
  isPublishing?: boolean;
  activeStepId?: string;
}

export function FormBuilder({ 
  fields, 
  onFieldsChange, 
  onClearFields,
  onThemeChange,
  onPublish,
  isPublishing,
  activeStepId 
}: FormBuilderProps) {
  const [expandedStepId, setExpandedStepId] = useState<string | null>(null);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [showPublishDialog, setShowPublishDialog] = useState(false);

  // Efecto para crear los campos por defecto cuando se monta el componente
  useEffect(() => {
    if (fields.length === 0) {
      const defaultFields = createDefaultFields();
      onFieldsChange(defaultFields);
    }
  }, []);

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

  const handleDeleteField = (id: string) => {
    onFieldsChange(fields.filter(field => field.id !== id))
    if (expandedStepId === id) setExpandedStepId(null);
  }

  const handleEditField = (id: string) => {
    console.log("Editar campo:", id)
  }

  const handleReorder = (reorderedFields: FormStepField[]) => {
    const validation = validateStepOrder(reorderedFields);
    
    if (!validation.isValid) {
      setOrderError(validation.error || 'Error en el orden de los pasos');
      onFieldsChange(reorderedFields);
      return;
    }

    setOrderError(null);
    onFieldsChange(reorderedFields);
  };

  useEffect(() => {
    const validation = validateStepOrder(fields);
    if (validation.isValid) {
      setOrderError(null);
    }
  }, [fields]);

  const handleStepExpand = (stepId: string) => {
    setExpandedStepId(stepId === expandedStepId ? null : stepId);
  };

  const handleFieldUpdate = (fieldId: string, updatedField: FormStepField) => {
    const updatedFields = fields.map(field => 
      field.id === fieldId ? updatedField : field
    );
    onFieldsChange(updatedFields);
  };

  const handlePublishClick = () => {
    if (fields.length === 0) return;
    
    const validation = validateStepOrder(fields);
    if (!validation.isValid) {
      setOrderError(validation.error || 'Error en el orden de los pasos');
      return;
    }

    setShowPublishDialog(true);
  };

  const handlePublishConfirm = async () => {
    try {
      if (onPublish) {
        await onPublish();
      }
      setShowPublishDialog(false);
    } catch (error) {
      console.error('Error publishing form:', error);
    }
  };

  return (
    <div className="space-y-8 overflow-y-auto no-scrollbar">
      {/* Header */}
      <div className="space-y-2">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold tracking-tight">
            Configura tus pasos
          </h2>
          <p className="text-sm text-gray-500">
            Personaliza los pasos necesarios para tu formulario
          </p>
        </div>
      </div>

      {/* Mostrar error si existe */}
      <AnimatePresence>
        {orderError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={cn(
              "p-3 rounded-lg text-sm",
              "bg-red-50 border border-red-200 text-red-800"
            )}
          >
            <p className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {orderError}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lista de campos */}
      <div className="space-y-2">
        {fields.length > 0 ? (
          <Reorder.Group 
            axis="y" 
            values={fields} 
            onReorder={handleReorder}
            className="space-y-2"
          >
            {fields.map((field) => (
              <FormStep
                key={field.id}
                field={field}
                isExpanded={expandedStepId === field.id}
                onExpand={handleStepExpand}
                onFieldUpdate={handleFieldUpdate}
                isActive={field.id === activeStepId}
              />
            ))}
          </Reorder.Group>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-lg"
          >
            <p className="text-sm text-gray-500">
              Cargando pasos...
            </p>
          </motion.div>
        )}
      </div>

      {/* Diálogo de publicación */}
      <PublishFormDialog
        isOpen={showPublishDialog}
        isPublishing={isPublishing ?? false}
        onConfirm={handlePublishConfirm}
        onCancel={() => setShowPublishDialog(false)}
      />
    </div>
  )
}