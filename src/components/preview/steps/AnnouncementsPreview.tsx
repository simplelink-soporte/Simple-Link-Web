import { FormStepField } from "@/types/form-steps";
import { PreviewContainer } from "../layout/PreviewContainer";
import { Button } from "@/components/ui/button";
import { Bell, Trophy, Calendar, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { NavigationButtons } from "../layout/NavigationButtons";

interface StepComponentProps {
  field: FormStepField;
  theme: 'light' | 'dark';
  viewType: "mobile" | "desktop";
  onNext: () => void;
  onPrev: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

interface Announcement {
  id: string;
  title: string;
  type: string;
  description: string;
  variant: 'event' | 'info' | 'warning';
  details?: {
    date?: string;
    organizers?: string[];
    contact?: string;
    price?: string;
  };
}

const announcements: Announcement[] = [
  { 
    id: '1', 
    title: 'Torneo de Verano',
    type: 'Evento • Competencia',
    description: 'Participa en nuestro torneo mensual con grandes premios',
    variant: 'event',
    details: {
      date: '15 de Febrero, 2024',
      organizers: ['Juan Pérez', 'María González'],
      contact: '+54 11 1234-5678',
      price: '$5000'
    }
  },
  { 
    id: '2', 
    title: 'Clases para Principiantes',
    type: 'Curso • Aprendizaje',
    description: 'Aprende los fundamentos del padel con profesores certificados',
    variant: 'event',
    details: {
      date: '1 de Marzo, 2024',
      organizers: ['Carlos Rodríguez', 'Ana Silva'],
      contact: '+54 11 9876-5432',
      price: '$3500'
    }
  }
];

export function AnnouncementsPreview({ 
  field, 
  theme, 
  viewType,
  onNext,
  onPrev,
  isFirstStep,
  isLastStep 
}: StepComponentProps) {
  const { title, description } = field;
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<string | null>(null);
  const [expandedAnnouncement, setExpandedAnnouncement] = useState<string | null>('1');

  const handleVerMas = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedAnnouncement(expandedAnnouncement === id ? null : id);
  };

  return (
    <PreviewContainer viewType={viewType} theme={theme}>
      <div className="min-h-full flex flex-col">
        <div className="flex-1 pb-24">
          {/* Header sin icono */}
          <div className="text-center space-y-1.5 mb-6">
            <h1 className={cn(
              "text-lg font-semibold transition-colors",
              theme === 'dark' ? "text-white" : "text-gray-900"
            )}>
              {title || "Anuncios Importantes"}
            </h1>
            <p className={cn(
              "text-xs transition-colors",
              theme === 'dark' ? "text-gray-400" : "text-gray-500"
            )}>
              {description || "Información relevante sobre nuestros servicios"}
            </p>
          </div>

          {/* Lista de Anuncios */}
          <div className="space-y-2.5">
            {announcements.map((announcement) => {
              const isSelected = selectedAnnouncement === announcement.id;
              const isExpanded = expandedAnnouncement === announcement.id;
              
              return (
                <motion.div
                  key={announcement.id}
                  className={cn(
                    "w-full rounded-lg transition-colors overflow-hidden",
                    theme === 'dark' 
                      ? "bg-neutral-900 text-gray-200"
                      : "bg-gray-50 hover:bg-gray-100/80 text-gray-800"
                  )}
                  animate={{ height: "auto" }}
                >
                  <div className="p-3">
                    {/* Contenido principal */}
                    <div className="flex items-start justify-between">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <h3 className={cn(
                            "font-medium text-sm truncate transition-colors",
                            theme === 'dark' ? "text-white" : "text-gray-900"
                          )}>
                            {announcement.title}
                          </h3>
                          <span className={cn(
                            "text-[9px] font-medium px-1.5 py-0.5 rounded-full",
                            announcement.variant === 'event' && (
                              announcement.type.includes('Curso')
                                ? "bg-emerald-50 text-emerald-600"
                                : "bg-blue-50 text-blue-600"
                            )
                          )}>
                            {announcement.type.includes('Curso') ? 'Curso' : 'Evento'}
                          </span>
                        </div>
                        <p className={cn(
                          "text-[10px] transition-colors",
                          theme === 'dark' ? "text-gray-500" : "text-gray-500"
                        )}>
                          {announcement.type}
                        </p>
                      </div>
                    </div>

                    {/* Footer con descripción y botón */}
                    <div className="mt-2 flex items-center justify-between">
                      <p className={cn(
                        "text-[10px] max-w-[70%] transition-colors",
                        theme === 'dark' ? "text-gray-500" : "text-gray-500"
                      )}>
                        {announcement.description}
                      </p>
                      <button
                        onClick={(e) => handleVerMas(announcement.id, e)}
                        className={cn(
                          "text-[10px] font-medium px-2 py-1 rounded-md transition-colors",
                          theme === 'dark' 
                            ? "bg-zinc-800 hover:bg-neutral-800 text-gray-300 hover:text-white"
                            : "bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900"
                        )}
                      >
                        {isExpanded ? "Ver menos" : "Ver más"}
                      </button>
                    </div>

                    {/* Contenido expandido */}
                    <AnimatePresence>
                      {isExpanded && announcement.details && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className={cn(
                            "mt-3 pt-3",
                            theme === 'dark' 
                              ? "border-t border-zinc-800"
                              : "border-t border-gray-200/50"
                          )}
                        >
                          <div className="space-y-2">
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <p className={cn(
                                  "text-[10px] font-medium",
                                  theme === 'dark' ? "text-gray-400" : "text-gray-600"
                                )}>
                                  Día del torneo
                                </p>
                                <p className="text-[11px]">{announcement.details.date}</p>
                              </div>
                              <div>
                                <p className={cn(
                                  "text-[10px] font-medium",
                                  theme === 'dark' ? "text-gray-400" : "text-gray-600"
                                )}>
                                  Precio de Inscripción
                                </p>
                                <p className="text-[11px]">{announcement.details.price}</p>
                              </div>
                            </div>

                            <div>
                              <p className={cn(
                                "text-[10px] font-medium mb-1",
                                theme === 'dark' ? "text-gray-400" : "text-gray-600"
                              )}>
                                Organizadores
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {announcement.details.organizers?.map((organizer) => (
                                  <span
                                    key={organizer}
                                    className={cn(
                                      "text-[9px] px-1.5 py-0.5 rounded-full",
                                      theme === 'dark'
                                        ? "bg-zinc-800 text-gray-400"
                                        : "bg-gray-100 text-gray-600"
                                    )}
                                  >
                                    {organizer}
                                  </span>
                                ))}
                              </div>
                            </div>

                            <div>
                              <p className={cn(
                                "text-[10px] font-medium mb-1",
                                theme === 'dark' ? "text-gray-400" : "text-gray-600"
                              )}>
                                Contacto
                              </p>
                              <p className="text-[11px]">{announcement.details.contact}</p>
                            </div>

                            <button
                              className={cn(
                                "w-full py-1.5 mt-2 rounded-md text-[11px] font-medium transition-colors",
                                theme === 'dark'
                                  ? "bg-zinc-800 hover:bg-neutral-800 text-white"
                                  : "bg-gray-200 hover:bg-gray-300 text-gray-900"
                              )}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedAnnouncement(announcement.id);
                              }}
                            >
                              Conocer más
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        <NavigationButtons
          onNext={onNext}
          onPrev={onPrev}
          isFirstStep={isFirstStep}
          isLastStep={isLastStep}
          theme={theme}
          viewType={viewType}
        />
      </div>
    </PreviewContainer>
  );
} 