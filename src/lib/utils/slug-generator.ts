'use client';

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { slugify } from './string-utils';

/**
 * Genera un slug único para company_links
 * @param baseTitle - El título base para generar el slug
 * @returns Slug único garantizado
 */
export async function generateUniqueSlug(baseTitle: string): Promise<string> {
  const supabase = createClientComponentClient();
  
  // 1. Generar slug base
  let slug = slugify(baseTitle);
  
  // 2. Verificar si existe
  const { data: existingLink } = await supabase
    .from('company_links')
    .select('slug')
    .eq('slug', slug)
    .single();

  // 3. Si no existe, retornar el slug base
  if (!existingLink) return slug;

  // 4. Si existe, agregar sufijo numérico hasta encontrar uno disponible
  let counter = 1;
  let newSlug = slug;
  
  while (true) {
    newSlug = `${slug}-${counter}`;
    
    const { data: existingWithCounter } = await supabase
      .from('company_links')
      .select('slug')
      .eq('slug', newSlug)
      .single();
    
    if (!existingWithCounter) return newSlug;
    
    counter++;
  }
} 