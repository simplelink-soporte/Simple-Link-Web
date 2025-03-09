import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, HelpCircle, Link, TrashIcon, Settings, PlusCircle, ExternalLink, CalendarPlus } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { CompanyLink } from "@/hooks/useCompanyLinks";
import { CustomSlugInputPopover } from "./CustomSlugInputPopover";
import Image from "next/image";
import { useRouter } from "next/navigation";

interface LinkSectionProps {
  title: string;
  description: string;
  linkData?: CompanyLink | null;
  baseUrl?: string;
  actionLabel: string;
  onAction: () => void;
  onDeactivate?: () => Promise<boolean>;
  onUpdateSlug?: (newSlug: string) => Promise<boolean>;
  onConfigureForm?: () => void;
  className?: string;
  isLoading?: boolean;
}

export const LinkSection = ({
  title,
  description,
  linkData,
  baseUrl = "https://tu-dominio.com/forms",
  actionLabel,
  onAction,
  onDeactivate,
  onUpdateSlug,
  onConfigureForm,
  className,
  isLoading = false
}: LinkSectionProps) => {
  const router = useRouter();
  
  // Construir la URL completa con el slug
  const fullUrl = linkData && linkData.slug ? `${baseUrl}/${linkData.slug}` : undefined;
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [isUpdatingSlug, setIsUpdatingSlug] = useState(false);
  
  // Determinar el tipo de enlace a partir del título o la propiedad linkData
  const linkType = linkData?.type || (title.toLowerCase().includes('clase') ? 'classes' : 'bookings');
  
  // Determinar qué imagen utilizar según el tipo de link
  const imageSrc = linkType === 'classes' 
    ? "/images/Miroodles - Sticker 5.png" 
    : "/images/Miroodles - Sticker 2.png";

  // Log para depuración
  useEffect(() => {
    if (linkData) {
      console.log(`LinkSection - ${title} - linkData:`, linkData);
      console.log(`LinkSection - ${title} - baseUrl:`, baseUrl);
      console.log(`LinkSection - ${title} - fullUrl:`, fullUrl);
      console.log(`LinkSection - ${title} - is_active:`, linkData.is_active, typeof linkData.is_active);
    } else {
      console.log(`LinkSection - ${title} - No linkData available`);
    }
  }, [linkData, baseUrl, fullUrl, title]);
  
  const copyToClipboard = () => {
    if (!fullUrl) return;
    
    navigator.clipboard.writeText(fullUrl);
    toast.success("Link copiado al portapapeles");
  };

  const handleDeactivateClick = async () => {
    if (!onDeactivate) return;
    
    try {
      setIsDeactivating(true);
      await onDeactivate();
      toast.success("Link eliminado correctamente");
    } catch (error) {
      toast.error("Error al eliminar el link", {
        description: error instanceof Error ? error.message : "Error desconocido"
      });
    } finally {
      setIsDeactivating(false);
    }
  };

  const handleUpdateSlug = async (newSlug: string) => {
    if (!onUpdateSlug) return;
    
    try {
      setIsUpdatingSlug(true);
      await onUpdateSlug(newSlug);
      toast.success("Link actualizado correctamente");
    } catch (error) {
      toast.error("Error al actualizar el link", {
        description: error instanceof Error ? error.message : "Error desconocido"
      });
    } finally {
      setIsUpdatingSlug(false);
    }
  };

  // Función para manejar el clic en el botón según el tipo de enlace
  const handleButtonClick = () => {
    if (linkType === 'classes') {
      // Redirigir a la página de gestión de clases
      router.push('/admin/dashboard/bookings/classes');
    } else if (onConfigureForm) {
      // Llamar a la función de configuración de formulario para reservas
      onConfigureForm();
    }
  };

  return (
    <motion.div 
      className={cn(
        "bg-gray-50 rounded-lg p-4 flex flex-col",
        className
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="space-y-1.5 mb-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-900">{title}</h3>
        </div>
        <p className="text-xs text-gray-500 leading-relaxed">{description}</p>
      </div>
      
      {isLoading || isDeactivating || isUpdatingSlug ? (
        <div className="flex items-center justify-center h-12 border border-dashed rounded-lg border-gray-200 mb-3">
          <p className="text-xs text-gray-400 animate-pulse">
            {isDeactivating ? "Eliminando..." : isUpdatingSlug ? "Actualizando..." : "Cargando..."}
          </p>
        </div>
      ) : linkData ? (
        <div className="mb-3">
          <div className="bg-gray-100 rounded-md p-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1 overflow-hidden">
                <Link className="h-3 w-3 flex-shrink-0 text-gray-400" />
                <p className="text-xs font-mono text-gray-700 truncate" title={fullUrl || `${baseUrl}/${linkData.slug}`}>
                  {fullUrl || `${baseUrl}/${linkData.slug}`}
                </p>
              </div>
              
              <div className="flex items-center ml-2 space-x-1">
                <Button 
                  onClick={copyToClipboard}
                  className="h-6 w-6 rounded-full bg-transparent hover:bg-gray-200 transition-colors p-0"
                  variant="ghost" 
                  size="icon"
                  title="Copiar al portapapeles"
                >
                  <Copy className="h-3 w-3 text-gray-500" />
                </Button>
                
                {linkData?.is_active && onUpdateSlug && (
                  <CustomSlugInputPopover
                    onUpdate={handleUpdateSlug}
                    isLoading={isLoading || isUpdatingSlug}
                    defaultSlug={linkData.slug}
                    linkType={linkData.type}
                  >
                    <Button 
                      className="h-6 w-6 rounded-full bg-transparent hover:bg-gray-200 transition-colors p-0"
                      variant="ghost" 
                      size="icon"
                      disabled={isLoading || isDeactivating || isUpdatingSlug}
                      title="Editar enlace"
                    >
                      <Settings className="h-3 w-3 text-gray-500" />
                    </Button>
                  </CustomSlugInputPopover>
                )}
                
                {linkData?.is_active && onDeactivate && (
                  <Button 
                    onClick={handleDeactivateClick}
                    className="h-6 w-6 rounded-full bg-transparent hover:bg-gray-200 transition-colors p-0"
                    variant="ghost" 
                    size="icon"
                    disabled={isLoading || isDeactivating || isUpdatingSlug}
                    title="Eliminar enlace"
                  >
                    <TrashIcon className="h-3 w-3 text-gray-500" />
                  </Button>
                )}
              </div>
            </div>
          </div>
          
          {/* Nueva sección con imagen, título, subtítulo y botón */}
          <div className="mt-3 bg-gray-100 rounded-md p-3">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-16 h-16 relative">
                <Image
                  src={imageSrc}
                  alt={linkType === 'classes' ? "Clases" : "Reservas"}
                  width={64}
                  height={64}
                  className="object-contain"
                />
              </div>
              <div className="flex-1">
                <h4 className="text-xs font-medium text-gray-900">
                  {linkType === 'classes' ? "Crea y administra tus clases" : "Configura tu formulario de reservas"}
                </h4>
                <p className="text-[10px] text-gray-500 mt-0.5 mb-2">
                  {linkType === 'classes' 
                    ? "Crea, edita y configura tus clases" 
                    : "Ajusta el formulario de reservas para que se ajuste a tus necesidades"}
                </p>
                <Button
                  onClick={handleButtonClick}
                  variant="ghost"
                  className="h-7 px-2 text-xs font-mono text-gray-700 hover:text-gray-900 hover:bg-gray-200"
                >
                  {linkType === 'classes' ? (
                    <>
                      <CalendarPlus className="h-3 w-3 mr-1" />
                      Crear clase
                    </>
                  ) : (
                    <>
                      <Settings className="h-3 w-3 mr-1" />
                      Configurar Formulario
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <Button
          onClick={onAction}
          className="flex flex-col items-center justify-center h-12 border border-dashed rounded-lg border-gray-300 bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors mb-3"
          variant="ghost"
          disabled={isLoading}
        >
          <div className="flex items-center gap-1.5">
            <PlusCircle className="h-4 w-4 text-gray-500" />
            <p className="text-xs text-gray-600 font-medium">
              Crear link
            </p>
          </div>
        </Button>
      )}
      
      <div className="mt-auto border-t border-gray-100 pt-2">
        <div className="flex items-center gap-1.5">
          <HelpCircle className="h-3 w-3 text-gray-400" />
          <p className="text-[10px] text-gray-400">
            ¿Necesitas ayuda? Contáctanos en <span className="underline">soporte@ejemplo.com</span>
          </p>
        </div>
      </div>
    </motion.div>
  );
}; 