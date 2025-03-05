"use client"

import { FormBuilder } from "@/components/forms/FormBuilder"
import { FormPreview } from "@/components/forms/FormPreview"
import { useFormState } from '@/hooks/forms/use-form-state'
import { useFormPublishing } from '@/hooks/forms/use-form-publishing'
import { FormStepField } from "@/types/form-steps"
import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowLeft, Save, Globe, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useRouter, usePathname } from "next/navigation"
import { FormData, type PublishedForm, type FormField } from "@/types/forms"
import { validateStepOrder } from '@/lib/validations'
import { toast } from "sonner"
import { AuthProvider } from "@/contexts/AuthContext"
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
import { PublishFormDialog } from "@/components/forms/dialogs/PublishFormDialog"
import { useInitialForm } from '@/hooks/forms/use-initial-form'

interface FormPublishConfig {
  title: string
  description: string
  fields: FormField[]
  theme: 'light' | 'dark' | undefined
  customization: {
    colors: {
      primary: string
    }
  }
}

function NewFormContent() {
  const router = useRouter()
  const pathname = usePathname()
  const {
    fields,
    setFields,
    prepareForPublish,
    isPublished,
    urlConfig,
    setPublished
  } = useFormState()

  const {
    publishForm,
    isPublishing
  } = useFormPublishing()

  // Estados para el formulario
  const [theme, setTheme] = useState<'light' | 'dark'>(() => 'light')
  const [activeStepId, setActiveStepId] = useState(() => "")
  const [isMounted, setIsMounted] = useState(false)
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [formTitle, setFormTitle] = useState("")
  const [formDescription, setFormDescription] = useState("")
  const [showTitleError, setShowTitleError] = useState(false)
  const [validation, setValidation] = useState<{ isValid: boolean; error?: string } | null>(null)
  const [showPublishDialog, setShowPublishDialog] = useState(false)
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null)
  const { initialForm } = useInitialForm()

  // Determinar si estamos en la página de nuevo formulario
  const isNewFormPage = pathname === '/admin/dashboard/forms-a/new'

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const handleFieldsChange = (newFields: FormStepField[]) => {
    setFields(newFields)
  }

  const handleClearFields = () => {
    setFields([])
  }

  const handleThemeChange = (isDark: boolean) => {
    setTheme(isDark ? 'dark' : 'light')
  }

  const handlePublish = () => {
    setShowPublishDialog(true)
  }

  const handleExitClick = () => {
    router.push('/admin/dashboard/forms-a')
  }

  const handlePublished = (url: string) => {
    console.log('Formulario publicado:', url)
    setPublishedUrl(url)
    // No navegamos automáticamente, dejamos que el usuario decida a través del toast
  }

  const handleSaveClick = () => {
    const validationResult = validateStepOrder(fields);
    setValidation(validationResult);

    if (!validationResult.isValid) {
      toast.error("No se puede guardar el formulario", {
        description: "Corrige el orden de los pasos antes de guardar y publicar."
      });
      return;
    }

    setFormTitle("");
    setFormDescription("");
    setShowTitleError(false);
    setShowSaveDialog(true);
  };

  const handleConfirmSave = () => {
    if (!formTitle.trim()) {
      setShowTitleError(true);
      return;
    }

    const validationResult = validateStepOrder(fields);
    setValidation(validationResult);

    if (!validationResult.isValid) {
      toast.error("No se puede guardar el formulario", {
        description: "Corrige el orden de los pasos antes de guardar y publicar."
      });
      setShowSaveDialog(false);
      return;
    }

    const newForm: FormData = {
      id: crypto.randomUUID(),
      title: formTitle.trim(),
      description: formDescription.trim() || "Sin descripción",
      fields: fields,
      createdAt: new Date(),
      updatedAt: new Date(),
      template: 'Clásico',
      url: `https://tu-dominio.com/forms/${crypto.randomUUID()}`,
      isActive: true,
      color: `#${Math.floor(Math.random()*16777215).toString(16)}`
    };

    // Aquí deberías guardar el formulario en tu estado global o base de datos
    router.push('/dashboard/forms-a');
    setShowSaveDialog(false);
  };

  if (!isMounted) {
    return null;
  }

  return (
    <div className="fixed inset-0 w-screen h-screen overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key="form-builder"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ 
            opacity: 1, 
            scale: 1,
            transition: {
              type: "spring",
              stiffness: 100,
              damping: 15,
              mass: 1
            }
          }}
          exit={{ 
            opacity: 0, 
            scale: 0.96,
            transition: {
              type: "spring",
              stiffness: 100,
              damping: 15,
              mass: 1
            }
          }}
          className="w-full h-full bg-[#F0F0F3] p-4"
        >
          <div className="h-full bg-white rounded-xl border shadow-sm flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleExitClick}
                className="h-8 px-0 text-gray-500 hover:text-gray-900 transition-colors duration-200"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                <span className="text-sm">Volver</span>
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  onClick={handleSaveClick}
                  variant="ghost"
                  className="h-8 gap-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50/50 transition-colors"
                >
                  <Save className="h-3.5 w-3.5" />
                  Guardar Formulario
                </Button>
                <Button
                  onClick={handlePublish}
                  variant="ghost"
                  disabled={isPublishing}
                  className="h-8 gap-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50/50 transition-colors"
                >
                  <Globe className="h-3.5 w-3.5" />
                  Publicar
                </Button>
              </div>
            </div>

            {/* Content with unified scroll */}
            <div className="flex-1 relative">
              <div className="absolute inset-0 overflow-y-auto no-scrollbar">
                <div className="p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="h-full">
                      <FormBuilder 
                        fields={fields}
                        onFieldsChange={handleFieldsChange}
                        onClearFields={handleClearFields}
                        onThemeChange={handleThemeChange}
                        onPublish={handlePublish}
                        isPublishing={isPublishing}
                        activeStepId={activeStepId}
                      />
                    </div>
                    <div className="h-full">
                      <FormPreview 
                        fields={fields} 
                        theme={theme}
                        onThemeChange={handleThemeChange}
                        onStepChange={setActiveStepId}
                        isBlurred={false}
                        isPublished={isPublished}
                        urlConfig={urlConfig}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Dialogs */}
          <AlertDialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
            <AlertDialogContent className="max-w-[400px]">
              <div className="flex flex-col items-center">
                <div className="p-2 rounded-lg bg-gray-100 mb-4">
                  <Save className="h-6 w-6 text-gray-600" strokeWidth={1.5} />
                </div>

                <AlertDialogHeader>
                  <AlertDialogTitle className="text-lg font-medium text-center">
                    Guardar Formulario
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-sm text-gray-500 text-center">
                    Agrega un título y descripción para identificar tu formulario.
                  </AlertDialogDescription>
                </AlertDialogHeader>

                <div className="w-full space-y-4 my-6">
                  <div className="space-y-2">
                    <div className="relative">
                      <input
                        id="formTitle"
                        type="text"
                        value={formTitle}
                        onChange={(e) => {
                          setFormTitle(e.target.value);
                          setShowTitleError(false);
                        }}
                        placeholder="Título del formulario"
                        className={cn(
                          "flex h-9 w-full rounded-lg px-9 py-2 text-sm",
                          "border-0",
                          "placeholder:text-xs",
                          "focus-visible:outline-none focus-visible:ring-1",
                          "transition-all duration-200",
                          "bg-gray-50 hover:bg-gray-100/50",
                          "placeholder:text-gray-400 focus-visible:ring-gray-200",
                          showTitleError && "ring-1 ring-red-500/50 focus-visible:ring-red-500/50"
                        )}
                      />
                      <Pencil 
                        className={cn(
                          "absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5",
                          showTitleError ? "text-red-500" : "text-gray-400"
                        )} 
                        strokeWidth={1.5}
                      />
                      {showTitleError && (
                        <motion.p
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-[10px] text-red-500 mt-1 ml-3"
                        >
                          El título es requerido
                        </motion.p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="relative">
                      <textarea
                        id="formDescription"
                        value={formDescription}
                        onChange={(e) => setFormDescription(e.target.value)}
                        placeholder="Descripción del formulario"
                        rows={3}
                        className={cn(
                          "flex w-full rounded-lg px-9 py-2 text-sm",
                          "border-0",
                          "placeholder:text-xs",
                          "focus-visible:outline-none focus-visible:ring-1",
                          "transition-all duration-200",
                          "bg-gray-50 hover:bg-gray-100/50",
                          "placeholder:text-gray-400 focus-visible:ring-gray-200",
                          "resize-none min-h-[80px]"
                        )}
                      />
                      <Pencil 
                        className="absolute left-3 top-3 h-3.5 w-3.5 text-gray-400" 
                        strokeWidth={1.5}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-8 w-full">
                  <AlertDialogCancel 
                    onClick={() => setShowSaveDialog(false)}
                    className={cn(
                      "text-sm transition-colors",
                      "text-gray-400 hover:text-gray-600",
                      "bg-transparent hover:bg-transparent",
                      "border-0",
                      "h-auto px-0"
                    )}
                  >
                    Cancelar
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleConfirmSave}
                    className={cn(
                      "text-sm font-medium transition-colors",
                      "bg-black hover:bg-gray-900 text-white",
                      "px-4 py-2 rounded-lg",
                      "border-0",
                      "flex items-center gap-2",
                      !validation?.isValid && "opacity-50 cursor-not-allowed"
                    )}
                    disabled={!validation?.isValid}
                  >
                    <Save className="h-3.5 w-3.5" />
                    Guardar
                  </AlertDialogAction>
                </div>
              </div>
            </AlertDialogContent>
          </AlertDialog>

          <PublishFormDialog
            open={showPublishDialog}
            onOpenChange={setShowPublishDialog}
            formTitle={formTitle}
            formDescription={formDescription}
            onPublished={handlePublished}
          />
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

// Componente principal que envuelve con el AuthProvider
export default function NewFormPage() {
  return (
    <div className="fixed inset-0 w-screen h-screen overflow-hidden">
      <AuthProvider>
        <NewFormContent />
      </AuthProvider>
    </div>
  )
} 
