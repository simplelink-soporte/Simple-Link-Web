"use client"

import { useRouter } from "next/navigation"
import { MessageSquare, Upload, Send, X, Image as ImageIcon, AlertCircle, Info } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"
import emailjs from '@emailjs/browser'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

interface FeedbackCardProps {
  className?: string
}

// Límite máximo para imágenes en EmailJS (45KB para estar seguros)
const MAX_IMAGE_SIZE = 45 * 1024;

// Función para comprimir la imagen si es necesario
async function compressImage(file: File, maxSizeInBytes: number): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onload = function(event) {
      const img = new Image();
      img.src = event.target?.result as string;
      
      img.onload = function() {
        const canvas = document.createElement('canvas');
        
        // Intentamos mantener la mejor calidad posible
        let width = img.width;
        let height = img.height;
        
        // Si las dimensiones son muy grandes, reducirlas proporcionalmente
        // para mejorar el rendimiento y reducir el tamaño del archivo
        const maxDimension = 1200; // Un tamaño razonable que mantiene buena calidad
        
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height *= maxDimension / width;
            width = maxDimension;
          } else {
            width *= maxDimension / height;
            height = maxDimension;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        // Empezar con calidad alta
        let quality = 0.9;
        let result = canvas.toDataURL('image/jpeg', quality);
        
        // Si el tamaño todavía es muy grande, reducir progresivamente
        let attempts = 0;
        const maxAttempts = 10;
        
        // Función para reducir aún más la imagen si es necesario
        const reduceMore = () => {
          if (attempts >= maxAttempts) {
            console.warn('No se pudo reducir la imagen por debajo del límite requerido');
            resolve(null);
            return;
          }
          
          attempts++;
          
          // Reducir calidad
          if (quality > 0.1) {
            quality = Math.max(0.1, quality - 0.1);
            result = canvas.toDataURL('image/jpeg', quality);
            
            if (result.length <= maxSizeInBytes) {
              resolve(result);
              return;
            }
          }
          
          // Si reducir calidad no es suficiente, reducir también las dimensiones
          width *= 0.8;
          height *= 0.8;
          
          // Si las dimensiones son demasiado pequeñas, detenerse
          if (width < 200 || height < 200) {
            console.warn('La imagen no puede reducirse más mientras mantiene una calidad aceptable');
            resolve(null);
            return;
          }
          
          // Actualizar canvas con nuevas dimensiones
          canvas.width = width;
          canvas.height = height;
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Intentar de nuevo con calidad media
          quality = 0.7;
          result = canvas.toDataURL('image/jpeg', quality);
          
          if (result.length <= maxSizeInBytes) {
            resolve(result);
          } else {
            reduceMore();
          }
        };
        
        // Verificar el tamaño inicial
        if (result.length <= maxSizeInBytes) {
          resolve(result);
        } else {
          reduceMore();
        }
      };
      
      img.onerror = function() {
        reject(new Error('Error al cargar la imagen'));
      };
    };
    
    reader.onerror = function() {
      reject(new Error('Error al leer el archivo'));
    };
  });
}

export function FeedbackCard({ className }: FeedbackCardProps) {
  const router = useRouter()
  const { user } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [feedback, setFeedback] = useState("")
  const [image, setImage] = useState<File | null>(null)
  const [imageBase64, setImageBase64] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [imageProcessing, setImageProcessing] = useState(false)
  const [imageTooLarge, setImageTooLarge] = useState(false)

  // Convertir la imagen a base64 cuando se selecciona
  useEffect(() => {
    const processImage = async () => {
      if (image) {
        setImageProcessing(true);
        setImageTooLarge(false);
        
        try {
          // Comprimir la imagen antes de convertirla a base64
          const optimizedImage = await compressImage(image, MAX_IMAGE_SIZE);
          
          if (optimizedImage) {
            setImageBase64(optimizedImage);
          } else {
            // Si no se pudo comprimir lo suficiente
            setImageTooLarge(true);
            setImageBase64(null);
            setError('La imagen es demasiado grande para enviar por email, incluso después de comprimir. Por favor, usa una imagen más pequeña o describe lo que querías mostrar en el texto.');
          }
        } catch (err) {
          console.error('Error al procesar la imagen:', err);
          setError('Error al procesar la imagen. Por favor, intenta con otra imagen.');
          setImage(null);
        } finally {
          setImageProcessing(false);
        }
      } else {
        setImageBase64(null);
        setImageTooLarge(false);
      }
    };
    
    processImage();
  }, [image]);

  const handleSubmit = async () => {
    if (!feedback && !image) return;
    if (imageProcessing) {
      setError('Por favor, espera a que se procese la imagen');
      return;
    }
    
    // Si la imagen es demasiado grande pero hay texto, enviar solo el texto
    if (imageTooLarge && !feedback) {
      setError('Por favor, escribe algún feedback o elige una imagen más pequeña');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Verificar que todas las variables necesarias existen
      if (!process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID) {
        throw new Error('Falta la configuración del servicio de EmailJS');
      }
      
      if (!process.env.NEXT_PUBLIC_EMAILJS_SUGGESTIONS_TEMPLATE_ID) {
        throw new Error('Falta la configuración del template de EmailJS');
      }
      
      if (!process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY) {
        throw new Error('Falta la clave pública de EmailJS');
      }
      
      // Obtener información del usuario
      const userName = user?.metadata?.name || 
                       user?.email || 
                       'Usuario anónimo';
                       
      const userEmail = user?.email || 'anonimo@example.com';
      const userId = user?.id || 'No identificado';
      const empresaId = user?.metadata?.empresa_id || 'No identificado';
      
      // Preparar los datos del feedback con los nombres correctos según el template
      const templateParams = {
        from_name: userName,
        from_email: userEmail,
        type: 'Feedback de Usuario',
        suggestion: feedback + (imageTooLarge ? '\n\n[El usuario intentó enviar una imagen, pero era demasiado grande para el correo]' : ''),
        // Incluir imagen solo si existe y no es demasiado grande
        image: (!imageTooLarge && imageBase64) ? imageBase64 : '',
        has_image: (!imageTooLarge && imageBase64) ? 'true' : 'false',
        user_id: userId,
        empresa_id: empresaId,
        fecha: new Date().toLocaleString()
      };

      // Log para depuración (sin mostrar la imagen completa)
      console.log('Enviando feedback con los siguientes parámetros:',
        {
          serviceId: process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID,
          templateId: process.env.NEXT_PUBLIC_EMAILJS_SUGGESTIONS_TEMPLATE_ID,
          params: { 
            ...templateParams, 
            image: templateParams.has_image === 'true' ? '[Imagen base64 adjunta]' : '[No hay imagen]'
          }
        }
      );

      try {
        // Enviar el feedback usando EmailJs
        const response = await emailjs.send(
          process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID,
          process.env.NEXT_PUBLIC_EMAILJS_SUGGESTIONS_TEMPLATE_ID,
          templateParams,
          process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY
        );
        
        console.log('EmailJS response:', response);
        
        // Mostrar mensaje de éxito
        setShowSuccess(true);
        
        // Reset después de un tiempo
        setTimeout(() => {
          setIsOpen(false);
          setFeedback("");
          setImage(null);
          setImageBase64(null);
          setShowSuccess(false);
          setImageTooLarge(false);
        }, 1500);
      } catch (emailError: any) {
        console.error('Error específico de EmailJS:', emailError);
        
        // Manejar específicamente errores de tamaño
        if (emailError?.text?.includes('size limit') || emailError?.text?.includes('50Kb')) {
          setError('La imagen es demasiado grande para enviar. EmailJS tiene un límite de 50KB por variable. Por favor, usa una imagen más pequeña o envía solo texto.');
          setImageTooLarge(true);
        } else {
          throw new Error(emailError?.text || 'Error al enviar el feedback');
        }
      }
    } catch (err: any) {
      // Manejar errores
      console.error('Error al enviar feedback:', err);
      
      // Proporcionar un mensaje de error más descriptivo
      if (err instanceof Error) {
        setError(err.message);
      } else if (typeof err === 'string') {
        setError(err);
      } else {
        setError('No se pudo enviar el feedback. Inténtalo más tarde.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Verificar que es una imagen
      if (!file.type.startsWith('image/')) {
        setError('El archivo seleccionado no es una imagen válida.');
        return;
      }
      
      // Advertencia si la imagen es grande
      if (file.size > 2 * 1024 * 1024) {
        setError(`La imagen es grande (${(file.size / (1024 * 1024)).toFixed(1)}MB) y podría ser difícil de enviar. Se intentará comprimir automáticamente.`);
      } else {
        setError(null);
      }
      
      setImage(file);
      setImageTooLarge(false);
    }
  }

  const handleClose = () => {
    setIsOpen(false);
    setFeedback("");
    setImage(null);
    setImageBase64(null);
    setShowSuccess(false);
    setError(null);
    setImageTooLarge(false);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.2 }}
      className={cn("px-3", className)}
    >
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <motion.div 
            className={cn(
              "py-2 px-3 rounded-lg",
              "bg-zinc-50/80",
              "border border-zinc-200/50",
              "cursor-pointer hover:bg-zinc-100/80",
              "transition-all duration-200",
              "group flex items-center justify-between"
            )}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <div className="flex items-start">
              <div className="p-1 rounded-md bg-zinc-100 group-hover:bg-zinc-200/80 transition-colors">
                <MessageSquare className="h-3.5 w-3.5 text-zinc-600" />
              </div>
              <div className="ml-2">
                <span className="text-xs font-medium text-zinc-900 block">Feedback</span>
                <span className="text-[10px] text-zinc-500 block mt-0.5">Ayúdanos a mejorar</span>
              </div>
            </div>
          </motion.div>
        </PopoverTrigger>
        <PopoverContent 
          side="right" 
          align="start"
          alignOffset={-80}
          sideOffset={10}
          className="w-72 p-3 shadow-lg border border-gray-100/50 rounded-lg"
        >
          <AnimatePresence mode="wait">
            {showSuccess ? (
              <motion.div
                key="success"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-2"
              >
                <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center mb-2">
                  <MessageSquare className="h-4 w-4 text-green-500" />
                </div>
                <h3 className="text-sm font-medium text-gray-900">¡Gracias!</h3>
                <p className="text-xs text-gray-500 text-center mt-1">
                  Tu opinión es importante para nosotros.
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="text-xs font-medium text-gray-900">Enviar feedback</h3>
                    <p className="text-[10px] text-gray-500 mt-0.5">Tu opinión nos ayuda a mejorar</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 rounded-md"
                    onClick={handleClose}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                
                <div className="relative mb-2">
                  <Textarea
                    placeholder="¿Cómo podemos mejorar?"
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    className="w-full min-h-[70px] pr-8 text-sm resize-none text-gray-700 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-gray-300"
                    autoFocus
                  />
                  
                  <div className="absolute bottom-2 right-2 flex space-x-1">
                    {image ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          "h-6 w-6 rounded-md",
                          imageTooLarge ? "bg-red-50 hover:bg-red-100" : "bg-gray-50 hover:bg-gray-100"
                        )}
                        onClick={() => setImage(null)}
                        title="Eliminar imagen"
                        disabled={imageProcessing}
                      >
                        <X className={cn("h-3 w-3", imageTooLarge && "text-red-500")} />
                      </Button>
                    ) : (
                      <label
                        htmlFor="image-upload"
                        className={cn(
                          "flex items-center justify-center h-6 w-6 rounded-md", 
                          "bg-gray-50 hover:bg-gray-100 transition-colors",
                          imageProcessing ? "cursor-wait opacity-50" : "cursor-pointer"
                        )}
                        title="Adjuntar imagen (máx. 2MB)"
                      >
                        <ImageIcon className="h-3 w-3 text-gray-500" />
                        <input
                          type="file"
                          id="image-upload"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                          disabled={imageProcessing}
                        />
                      </label>
                    )}
                  </div>
                </div>
                
                {image && (
                  <div className="mb-2 text-xs text-gray-500 flex items-center">
                    {imageProcessing ? (
                      <>
                        <div className="mr-1.5 h-3 w-3 rounded-full border-2 border-t-transparent border-gray-300 animate-spin"></div>
                        <span>Procesando imagen...</span>
                      </>
                    ) : (
                      <>
                        <ImageIcon className={cn("h-3 w-3 mr-1.5", imageTooLarge && "text-red-500")} />
                        <span className={cn("truncate max-w-[200px]", imageTooLarge && "text-red-500")}>{image.name}</span>
                        {imageTooLarge && (
                          <span className="ml-auto text-red-500 flex items-center">
                            <Info className="h-3 w-3 mr-1" />
                            <span>muy grande</span>
                          </span>
                        )}
                      </>
                    )}
                  </div>
                )}
                
                {error && (
                  <div className="mb-2 p-1.5 bg-red-50 rounded-md flex items-center text-xs text-red-600">
                    <AlertCircle className="h-3 w-3 mr-1.5 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {!error && imageTooLarge && (
                  <div className="mb-2 p-1.5 bg-amber-50 rounded-md flex items-center text-xs text-amber-600">
                    <Info className="h-3 w-3 mr-1.5 flex-shrink-0" />
                    <span>Si continúas, se enviará solo el texto sin la imagen</span>
                  </div>
                )}
                
                <div className="flex justify-end">
                  <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting || imageProcessing || (!feedback && (!image || imageTooLarge))}
                    className="flex items-center gap-1 text-xs h-7"
                    size="sm"
                  >
                    {isSubmitting ? "Enviando..." : "Enviar"}
                    {isSubmitting ? (
                      <div className="h-3 w-3 rounded-full border-2 border-t-transparent border-current animate-spin"></div>
                    ) : (
                      <Send className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </PopoverContent>
      </Popover>
    </motion.div>
  )
} 