"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { FormBuilder } from "@/components/forms/FormBuilder"
import { FormHistory } from "@/components/forms/FormHistory"
import { FormPreview } from "@/components/forms/FormPreview"
import { FormStepField } from "@/types/form-steps"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowLeft, Search, Save, Pencil, FileText, Link2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FormCard } from "@/components/forms/FormCard"
import { cn } from "@/lib/utils"
import { PageLoadingState, PageErrorState, PageEmptyState } from "@/components/ui/page-loading-state"
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
import { FormData } from "@/types/forms"
import { FormUrlConfig } from "@/types/forms/publish"
import { useFormState } from '@/hooks/forms/use-form-state';
import { useFormPublishing } from '@/hooks/forms/use-form-publishing';
import { toast } from "sonner";
import { validateStepOrder } from '@/lib/validations';
import { useRouter } from 'next/navigation'
import { useAuth } from "@/contexts/AuthContext"
import { useBranchContext } from "@/contexts/BranchContext"
import { useQuery } from "@tanstack/react-query"
import { LinkSection } from "@/components/links/LinkSection"
import { useCompanyLinks } from "@/hooks/useCompanyLinks"

export default function FormsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { currentBranch } = useBranchContext()
  const {
    fields,
    metadata,
    setFields,
    setMetadata,
    prepareForPublish,
    isPublished,
    urlConfig,
    setPublished
  } = useFormState();
  
  const {
    handlePublish,
    isPublishing,
    error: publishError,
    isValid,
    validationErrors,
    hasWarnings,
    isConfigurationComplete
  } = useFormPublishing();

  // Obtener los links de la empresa
  const {
    bookingLink,
    classesLink,
    isLoading: isLoadingLinks,
    error: linksError,
    createBookingLink,
    createClassesLink,
    deactivateBookingLink,
    deactivateClassesLink,
    updateBookingLinkSlug,
    updateClassesLinkSlug,
    refreshLinks
  } = useCompanyLinks();

  const isLoading = isPublishing || isLoadingLinks;
  const error = publishError || linksError;

  const [isEditing, setIsEditing] = useState(false)
  const [savedForms, setSavedForms] = useState<FormData[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [activeStepId, setActiveStepId] = useState<string | undefined>(undefined)
  const [formTitle, setFormTitle] = useState("")
  const [formDescription, setFormDescription] = useState("")
  const [showTitleError, setShowTitleError] = useState(false)
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [validation, setValidation] = useState<{ isValid: boolean; error?: string } | null>(null);

  const handleFieldsChange = (newFields: FormStepField[]) => {
    setFields(newFields);
  }

  const handleClearFields = () => {
    setFields([]);
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

    setSavedForms(prev => [...prev, newForm]);
    setIsEditing(false);
    setFields([]);
    setShowSaveDialog(false);
  };

  const handleDeleteForm = (id: string) => {
    setSavedForms(prev => prev.filter(form => form.id !== id))
  }

  const handleToggleFormActive = (id: string) => {
    setSavedForms(prev => prev.map(form => 
      form.id === id ? { ...form, isActive: !form.isActive } : form
    ))
  }

  const handleColorChange = (id: string, color: string) => {
    setSavedForms(prev => prev.map(form => 
      form.id === id ? { ...form, color } : form
    ))
  }

  const filteredForms = savedForms.filter(form => 
    form.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleThemeChange = (isDark: boolean) => {
    setTheme(isDark ? 'dark' : 'light');
  };

  const handleCreateNew = () => {
    router.push('/admin/dashboard/forms-a/new')
  }

  const handleConfigureForm = () => {
    if (bookingLink) {
      router.push('/admin/dashboard/forms-a/new')
    }
  }

  const handleCreateBookingLink = async () => {
    try {
      // Si no hay un link activo de reservas, redirigir a la página de creación
      if (!bookingLink) {
        router.push('/admin/dashboard/forms-a/new')
      } else {
        // Si ya existe, refrescar los links
        await refreshLinks();
        toast.success("Link de reservas actualizado");
      }
    } catch (err) {
      toast.error("Error al manejar el link de reservas", {
        description: err instanceof Error ? err.message : "Error desconocido"
      });
    }
  }

  const handleCreateClassLink = async () => {
    try {
      await createClassesLink();
      toast.success("Link de clases creado exitosamente");
    } catch (err) {
      toast.error("Error al crear el link de clases", {
        description: err instanceof Error ? err.message : "Error desconocido"
      });
    }
  }

  const handleExitClick = () => {
    if (fields.length > 0 && !isPublished) {
      setShowExitDialog(true);
    } else {
      router.push('/admin/dashboard/forms-a');
    }
  };

  const handleConfirmExit = () => {
    setShowExitDialog(false);
    router.push('/admin/dashboard/forms-a');
    setFields([]); // Limpiar campos al salir
  };

  useEffect(() => {
    // Log para depuración de los links
    if (bookingLink) {
      console.log('Booking link in page:', bookingLink);
      console.log('Booking link is_active:', bookingLink.is_active, typeof bookingLink.is_active);
    }
    if (classesLink) {
      console.log('Classes link in page:', classesLink);
      console.log('Classes link is_active:', classesLink.is_active, typeof classesLink.is_active);
    }
  }, [bookingLink, classesLink]);

  return (
    <div className="fixed inset-0 overflow-hidden z-0">
      <main className="absolute inset-0 lg:left-[240px]">
        <div className="absolute inset-[8px]">
          <div className="bg-white rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.02)] w-full h-full overflow-auto scrollbar-none">
            <div className="px-6 py-4">
              {isLoading ? (
                <PageLoadingState message="Cargando información..." />
              ) : error ? (
                <PageErrorState message={error.message} />
              ) : !user ? (
                <PageEmptyState message="No hay sesión activa" />
              ) : !currentBranch ? (
                <PageEmptyState message="No hay una sede seleccionada" />
              ) : (
                <div className="h-full">
                  {isEditing ? (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="h-full"
                    >
                      {/* Header reorganizado */}
                      <div className="flex items-center justify-between mb-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleExitClick}
                          className="h-8 px-0 text-gray-500 hover:text-gray-900 transition-colors duration-200"
                        >
                          <ArrowLeft className="h-4 w-4 mr-2" />
                          <span className="text-sm">Volver</span>
                        </Button>
                      </div>

                      {/* Contenido de edición */}
                      <div className="h-[calc(100%-3rem)]">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
                          <div className="h-full overflow-auto scrollbar-none">
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
                          <div className="h-full overflow-auto scrollbar-none">
                            <FormPreview 
                              fields={fields} 
                              theme={theme}
                              onThemeChange={handleThemeChange}
                              onStepChange={setActiveStepId}
                              isBlurred={showSaveDialog}
                              isPublished={isPublished}
                              urlConfig={urlConfig}
                            />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <Tabs defaultValue="general" className="h-full">
                      <div className="flex-none mb-4">
                        <TabsList className="hidden">
                          <TabsTrigger 
                            value="general"
                            className="data-[state=inactive]:text-gray-500"
                          >
                            General
                          </TabsTrigger>
                        </TabsList>
                      </div>

                      <TabsContent value="general" className="flex-1 mt-0">
                        <div className="h-full overflow-auto scrollbar-none">
                          <AnimatePresence mode="wait">
                            <motion.div
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -20 }}
                              className="space-y-4"
                            >
                              {/* Título y subtítulo de la página */}
                              <div className="mb-5">
                                <h1 className="text-lg font-medium text-gray-900">Enlaces de Reservas y Clases</h1>
                                <p className="text-xs text-gray-500 mt-1">
                                  Gestiona y personaliza los enlaces para reservas y clases de tu negocio
                                </p>
                              </div>

                              {/* Secciones de Links - Una debajo de la otra */}
                              <div className="space-y-4 mb-8">
                                {/* Sección de Link de Reserva */}
                                <LinkSection 
                                  title="Link de Reserva"
                                  description="Genera y comparte este enlace para que tus clientes puedan realizar reservas de forma rápida y sencilla."
                                  linkData={bookingLink}
                                  baseUrl={`${window.location.origin}/f`}
                                  actionLabel="Crear link de reservas"
                                  onAction={handleCreateBookingLink}
                                  onDeactivate={deactivateBookingLink}
                                  onUpdateSlug={updateBookingLinkSlug}
                                  onConfigureForm={handleConfigureForm}
                                  isLoading={isLoadingLinks}
                                />

                                {/* Sección de Link de Clases */}
                                <LinkSection 
                                  title="Link de Clases"
                                  description="Permite a tus clientes inscribirse en clases a través de este enlace personalizado."
                                  linkData={classesLink}
                                  baseUrl={`${window.location.origin}/clases`}
                                  actionLabel="Crear link de clases"
                                  onAction={handleCreateClassLink}
                                  onDeactivate={deactivateClassesLink}
                                  onUpdateSlug={updateClassesLinkSlug}
                                  isLoading={isLoadingLinks}
                                />
                              </div>

                              {/* Header con buscador */}
                              <div className="flex items-center justify-end mt-8">
                                {savedForms.length > 0 && (
                                  <div className="relative">
                                    <input
                                      type="text"
                                      value={searchQuery}
                                      onChange={(e) => setSearchQuery(e.target.value)}
                                      placeholder="Buscar formulario..."
                                      className={cn(
                                        "h-8 pr-8 pl-3",
                                        "text-xs",
                                        "bg-transparent",
                                        "border-b border-gray-200",
                                        "focus:outline-none focus:border-gray-400",
                                        "placeholder:text-gray-400",
                                        "transition-colors"
                                      )}
                                    />
                                    <div className="absolute inset-y-0 right-0 flex items-center pr-2">
                                      <Search className="h-3.5 w-3.5 text-gray-400" />
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Lista de formularios guardados */}
                              {filteredForms.length > 0 ? (
                                <div className="space-y-3">
                                  {filteredForms.map((form) => (
                                    <FormCard
                                      key={form.id}
                                      form={form}
                                      onDelete={handleDeleteForm}
                                      onToggleActive={handleToggleFormActive}
                                      onColorChange={handleColorChange}
                                    />
                                  ))}
                                </div>
                              ) : savedForms.length > 0 ? (
                                <div className="flex items-center justify-center h-[120px] border-2 border-dashed rounded-lg">
                                  <p className="text-sm text-gray-500">
                                    No se encontraron formularios con "{searchQuery}"
                                  </p>
                                </div>
                              ) : null}
                            </motion.div>
                          </AnimatePresence>
                        </div>
                      </TabsContent>
                    </Tabs>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Mantener los diálogos fuera del contenedor principal */}
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
                Agrega un título y descripción para identificar tu formulario. Al guardar, el formulario se publicará automáticamente.
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
                Guardar y Publicar
              </AlertDialogAction>
            </div>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro que deseas salir?</AlertDialogTitle>
            <AlertDialogDescription>
              Los cambios que no hayas publicado se perderán. 
              {!isPublished && fields.length > 0 && (
                <span className="block mt-2 text-red-500 font-medium">
                  El formulario no ha sido publicado y los cambios se perderán.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowExitDialog(false)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmExit}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              Salir sin guardar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
} 