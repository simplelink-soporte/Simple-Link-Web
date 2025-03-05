import { useState, useEffect } from "react";
import { FormStepField } from "@/types/form-steps";
import { FormUrlConfig } from "@/types/forms";
import { Button } from "@/components/ui/button";
import { Smartphone, Monitor, RotateCcw, Share2, Link, Settings2, Moon, Sun, ChevronRight, Link2, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { UsersPreview } from "@/components/preview/steps/UsersPreview";
import { LocationPreview } from "@/components/preview/steps/LocationPreview";
import { PreviewContainer } from "@/components/preview/layout/PreviewContainer";
import { ShiftsPreview } from "@/components/preview/steps/Shifts/ShiftsPreview";
import { ItemsPreview } from "@/components/preview/steps/Items/ItemsPreview";
import { SummaryPreview } from "@/components/preview/steps/summary/SummaryPreview";
import { FarewellPreview } from "@/components/preview/steps/FarewellPreview";
import { GreetingPreview } from "@/components/preview/steps/GreetingPreview";
import { FormUrlPreview } from "./shared/FormUrlPreview";
import { useFormPublishing } from "@/hooks/forms/use-form-publishing";

interface FormPreviewProps {
  fields: FormStepField[];
  style?: string;
  theme?: 'light' | 'dark';
  onThemeChange?: (isDark: boolean) => void;
  onStepChange?: (stepId: string) => void;
  isBlurred?: boolean;
  formMetadata?: {
    title: string;
    description?: string;
  };
  isPublished: boolean;
  urlConfig: FormUrlConfig | null;
}

export function FormPreview({ 
  fields, 
  style = 'default', 
  theme = 'light',
  onThemeChange,
  onStepChange,
  isBlurred = false,
  formMetadata,
  isPublished,
  urlConfig
}: FormPreviewProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [viewType, setViewType] = useState<"mobile" | "desktop">("mobile");
  const [copied, setCopied] = useState(false);
  const [formUrl, setFormUrl] = useState("https://tu-dominio.com/forms/123");
  const { publishForm, isPublishing, publishedUrl } = useFormPublishing();
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<{
    date: string;
    startTime: string;
    endTime: string;
    duration: number;
  } | null>(null);

  const activeFields = fields.filter(field => field.settings.isActive);
  const currentField = activeFields[currentStep];

  useEffect(() => {
    if (currentField) {
      onStepChange?.(currentField.id);
    }
  }, [currentStep, currentField, onStepChange]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedBranchId = localStorage.getItem('selectedBranchId');
      setSelectedBranchId(storedBranchId);

      const storedSlot = localStorage.getItem('selectedSlot');
      if (storedSlot) {
        try {
          const parsedSlot = JSON.parse(storedSlot);
          if (!parsedSlot.date || !parsedSlot.startTime || !parsedSlot.endTime || !parsedSlot.duration) {
            console.error('FormPreview - Slot inválido:', parsedSlot);
            localStorage.removeItem('selectedSlot');
            return;
          }
          console.log('FormPreview - Slot recuperado:', parsedSlot);
          setSelectedSlot(parsedSlot);
        } catch (error) {
          console.error('Error al parsear selectedSlot:', error);
          localStorage.removeItem('selectedSlot');
        }
      }
    }
  }, []);

  const handleNext = () => {
    if (currentStep < activeFields.length - 1) {
      if (currentField?.type === 'shifts') {
        const slot = localStorage.getItem('selectedSlot');
        if (slot) {
          const parsedSlot = JSON.parse(slot);
          console.log('FormPreview - Guardando slot:', parsedSlot);
          setSelectedSlot(parsedSlot);
        }
      }
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const renderStep = () => {
    if (!currentField) return null;

    const commonProps = {
      field: currentField,
      theme,
      viewType,
      onNext: handleNext,
      onPrev: handlePrev,
      isFirstStep: currentStep === 0,
      isLastStep: currentStep === activeFields.length - 1,
      isBlurred
    };

    switch (currentField.type) {
      case 'users':
        return <UsersPreview {...commonProps} />;
      case 'location':
        return <LocationPreview {...commonProps} />;
      case 'shifts':
        return <ShiftsPreview {...commonProps} />;
      case 'items':
        return <ItemsPreview {...commonProps} />;
      case 'summary':
        return <SummaryPreview {...commonProps} />;
      case 'farewell':
        return <FarewellPreview {...commonProps} />;
      case 'greeting':
        return <GreetingPreview {...commonProps} />;
      default:
        return null;
    }
  };

  const handleRefresh = () => {
    setCurrentStep(0);
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(formUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Error al copiar:", err);
    }
  };

  const handleThemeToggle = () => {
    onThemeChange?.(theme === 'light');
  };

  const renderUrlPreview = () => {
    if (!urlConfig) return null;

    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button
            size="sm"
            variant="ghost"
            className={cn(
              "h-8 w-8 p-0",
              "text-gray-600 hover:text-gray-900",
              "hover:bg-gray-100/50",
              "transition-colors",
              "relative"
            )}
          >
            <Link2 className="h-4 w-4" />
            {isPublished && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          align="end" 
          className="w-80 p-4"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-900">
                Enlace del formulario
              </span>
              {isPublished && (
                <span className="inline-flex items-center px-2 py-1 rounded-full bg-green-50 text-green-700 text-[10px] font-medium">
                  <span className="w-1 h-1 rounded-full bg-green-500 mr-1" />
                  Publicado
                </span>
              )}
            </div>
            <FormUrlPreview
              urlConfig={urlConfig}
              isPublished={isPublished}
            />
          </div>
        </PopoverContent>
      </Popover>
    );
  };

  return (
    <div className={cn(
      "bg-gray-50 rounded-xl p-6 space-y-6 overflow-y-auto no-scrollbar",
      "transition-all duration-200",
      isBlurred && "opacity-50 pointer-events-none"
    )}>
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-medium">Vista Previa</h2>
            <p className="text-sm text-gray-500">
              Así es como verán el formulario los usuarios
            </p>
          </div>

          <div className="bg-white p-1 rounded-lg flex items-center gap-1">
            <button
              onClick={() => setViewType("mobile")}
              className={cn(
                "p-2 rounded-md transition-all",
                viewType === "mobile" ? "bg-white shadow-sm" : "hover:bg-white/50"
              )}
            >
              <Smartphone className="h-4 w-4 text-gray-600" />
            </button>
            <button
              onClick={() => setViewType("desktop")}
              className={cn(
                "p-2 rounded-md transition-all",
                viewType === "desktop" ? "bg-white shadow-sm" : "hover:bg-white/50"
              )}
            >
              <Monitor className="h-4 w-4 text-gray-600" />
            </button>
            <div className="w-px h-4 bg-gray-200 mx-1" />
            {renderUrlPreview()}
            <button
              onClick={handleThemeToggle}
              className={cn(
                "p-2 rounded-md transition-all hover:bg-white/50",
                "text-gray-600 hover:text-gray-900"
              )}
              title={theme === 'light' ? 'Activar modo oscuro' : 'Activar modo claro'}
            >
              {theme === 'light' ? (
                <Moon className="h-4 w-4" />
              ) : (
                <Sun className="h-4 w-4" />
              )}
            </button>
            <button
              onClick={handleRefresh}
              className={cn(
                "p-2 rounded-md transition-all hover:bg-white/50",
                "text-gray-600 hover:text-gray-900"
              )}
              title="Volver al inicio"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className={cn(
          "border rounded-xl overflow-hidden transition-all duration-300 mx-auto",
          theme === 'dark' ? "bg-gray-950 border-gray-800" : "bg-white border-gray-200",
          viewType === "mobile" ? "w-[320px]" : "w-full",
          "h-[680px] mt-6",
          "shadow-sm"
        )}>
          {activeFields.length > 0 ? (
            <div className="h-full pt-8 md:pt-12">
              <AnimatePresence mode="wait">
                {renderStep()}
              </AnimatePresence>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-6 text-center">
              <div className={cn(
                "w-16 h-16 mb-4 rounded-full flex items-center justify-center",
                theme === 'dark' ? "bg-neutral-900" : "bg-gray-100"
              )}>
                <ChevronRight className={cn(
                  "h-6 w-6",
                  theme === 'dark' ? "text-gray-600" : "text-gray-400"
                )} />
              </div>
              <h3 className={cn(
                "text-sm font-medium mb-1",
                theme === 'dark' ? "text-gray-200" : "text-gray-900"
              )}>
                No hay pasos configurados
              </h3>
              <p className={cn(
                "text-xs max-w-[200px]",
                theme === 'dark' ? "text-gray-400" : "text-gray-500"
              )}>
                Agrega pasos en el constructor para ver la vista previa
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
