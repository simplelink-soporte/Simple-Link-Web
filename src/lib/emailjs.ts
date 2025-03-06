import { init } from '@emailjs/browser';

/**
 * Inicializa EmailJS con la clave pública del entorno.
 * Esta función debe ser llamada una vez cuando la aplicación se inicia.
 */
export function initEmailJS() {
  if (typeof window !== 'undefined') {
    const publicKey = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY;
    
    if (!publicKey) {
      console.error('EmailJS: No se encontró la clave pública (NEXT_PUBLIC_EMAILJS_PUBLIC_KEY) en las variables de entorno');
      return;
    }
    
    try {
      // Inicializar con opciones básicas
      init(publicKey);
      console.log('EmailJS inicializado correctamente');
    } catch (error) {
      console.error('Error al inicializar EmailJS:', error);
    }
  }
}

/**
 * Verifica que todas las variables de entorno necesarias para EmailJS estén definidas.
 * Útil para depuración.
 */
export function checkEmailJSConfig() {
  const publicKey = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY;
  const serviceId = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID;
  const templateId = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID;
  const suggestionsTemplateId = process.env.NEXT_PUBLIC_EMAILJS_SUGGESTIONS_TEMPLATE_ID;
  
  const missing = [];
  
  if (!publicKey) missing.push('NEXT_PUBLIC_EMAILJS_PUBLIC_KEY');
  if (!serviceId) missing.push('NEXT_PUBLIC_EMAILJS_SERVICE_ID');
  if (!templateId) missing.push('NEXT_PUBLIC_EMAILJS_TEMPLATE_ID');
  if (!suggestionsTemplateId) missing.push('NEXT_PUBLIC_EMAILJS_SUGGESTIONS_TEMPLATE_ID');
  
  if (missing.length > 0) {
    console.warn(`EmailJS: Faltan las siguientes variables de entorno: ${missing.join(', ')}`);
    return false;
  }
  
  return true;
} 