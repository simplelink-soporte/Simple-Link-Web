/**
 * Convierte un string en un slug válido para URLs
 * @param text - Texto a convertir en slug
 * @returns Slug generado
 */
export function slugify(text: string | null | undefined): string {
  if (!text) return '';
  
  return text
    .toString()
    .normalize('NFD') // Normalizar caracteres Unicode
    .replace(/[\u0300-\u036f]/g, '') // Remover diacríticos
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // Espacios a guiones
    .replace(/[^\w-]+/g, '') // Remover caracteres no válidos
    .replace(/--+/g, '-') // Remover guiones múltiples
    .replace(/^-+/, '') // Remover guiones al inicio
    .replace(/-+$/, ''); // Remover guiones al final
}

/**
 * Genera un ID aleatorio corto y seguro
 * @returns ID aleatorio
 */
export function generateShortId(): string {
  return Math.random().toString(36).substring(2, 9);
}

/**
 * Trunca un texto a una longitud máxima
 * @param text - Texto a truncar
 * @param maxLength - Longitud máxima
 * @returns Texto truncado
 */
export function truncate(text: string | null | undefined, maxLength: number): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

/**
 * Capitaliza la primera letra de cada palabra
 * @param text - Texto a capitalizar
 * @returns Texto capitalizado
 */
export function titleCase(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
} 