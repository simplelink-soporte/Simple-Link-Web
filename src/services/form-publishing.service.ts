import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { generateUniqueSlug } from '@/lib/utils/slug-generator';

export interface FormPublishConfig {
  title: string;
  description?: string;
  theme?: 'light' | 'dark';
  customization?: {
    primaryColor?: string;
    logo?: string;
  };
  settings?: {
    slug?: string;  // Slug personalizado
    [key: string]: any;
  };
}

export interface PublishedForm {
  id: string;
  slug: string;
  url: string;
  settings: FormPublishConfig;
}

/**
 * Publica un formulario creando un link público
 */
export async function publishForm(empresaId: string, config: FormPublishConfig): Promise<PublishedForm> {
  const supabase = createClientComponentClient();

  try {
    console.log('📝 Iniciando publicación del formulario:', config.title);

    // 1. Generar slug único (usar el personalizado si existe)
    const slug = config.settings?.slug || await generateUniqueSlug(config.title);
    console.log('✅ Slug generado:', slug);

    // 2. Crear registro en company_links
    const { data: link, error } = await supabase
      .from('company_links')
      .insert({
        empresa_id: empresaId,
        slug,
        type: 'reservations',
        is_active: true,
        settings: {
          title: config.title,
          description: config.description,
          theme: config.theme,
          customization: config.customization,
          ...config.settings
        }
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error al crear link:', error);
      throw new Error('Error al publicar el formulario');
    }

    console.log('✅ Link creado:', link.id);

    // 3. Retornar información del formulario publicado
    return {
      id: link.id,
      slug: link.slug,
      url: `/forms/${link.slug}`,
      settings: link.settings
    };

  } catch (error) {
    console.error('❌ Error en publishForm:', error);
    throw error;
  }
}

/**
 * Actualiza la configuración de un formulario publicado
 */
export async function updatePublishedForm(
  slug: string,
  updates: Partial<FormPublishConfig>
): Promise<PublishedForm> {
  const supabase = createClientComponentClient();

  try {
    console.log('📝 Actualizando formulario:', slug);

    // 1. Obtener link actual
    const { data: existingLink, error: fetchError } = await supabase
      .from('company_links')
      .select('*')
      .eq('slug', slug)
      .single();

    if (fetchError || !existingLink) {
      console.error('❌ Link no encontrado:', slug);
      throw new Error('Formulario no encontrado');
    }

    // 2. Actualizar settings
    const newSettings = {
      ...existingLink.settings,
      ...updates
    };

    // 3. Guardar cambios
    const { data: updatedLink, error: updateError } = await supabase
      .from('company_links')
      .update({ settings: newSettings })
      .eq('id', existingLink.id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Error al actualizar:', updateError);
      throw new Error('Error al actualizar el formulario');
    }

    console.log('✅ Formulario actualizado:', updatedLink.id);

    // 4. Retornar información actualizada
    return {
      id: updatedLink.id,
      slug: updatedLink.slug,
      url: `/forms/${updatedLink.slug}`,
      settings: updatedLink.settings
    };

  } catch (error) {
    console.error('❌ Error en updatePublishedForm:', error);
    throw error;
  }
}

/**
 * Obtiene la configuración de un formulario publicado
 */
export async function getPublishedForm(slug: string): Promise<PublishedForm> {
  const supabase = createClientComponentClient();

  try {
    console.log('🔍 Buscando formulario:', slug);

    const { data: link, error } = await supabase
      .from('company_links')
      .select('*')
      .eq('slug', slug)
      .eq('type', 'reservations')
      .eq('is_active', true)
      .single();

    if (error || !link) {
      console.error('❌ Formulario no encontrado:', slug);
      throw new Error('Formulario no encontrado');
    }

    console.log('✅ Formulario encontrado:', link.id);

    return {
      id: link.id,
      slug: link.slug,
      url: `/forms/${link.slug}`,
      settings: link.settings
    };

  } catch (error) {
    console.error('❌ Error en getPublishedForm:', error);
    throw error;
  }
} 