import { PublishedForm } from "@/types/forms/publish";
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { FormStepField } from "@/types/form-steps";
import { BOOKING_FORM_TEMPLATE } from "@/lib/templates/booking-form-template";

export class FormPublishService {
  private supabase = createClientComponentClient();

  private static debug = {
    log: (message: string, data?: any) => {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[FormPublishService] ${message}`, data || '');
      }
    },
    error: (message: string, error?: any) => {
      if (process.env.NODE_ENV === 'development') {
        console.error(`[FormPublishService Error] ${message}`, error || '');
      }
    }
  };

  async getBySlug(slug: string): Promise<PublishedForm> {
    try {
      FormPublishService.debug.log('🔍 Buscando formulario:', { slug });
      
      // Consulta optimizada usando el índice único del slug
      const { data: link, error: linkError } = await this.supabase
        .from('company_links')
        .select(`
          id,
          slug,
          settings,
          type,
          is_active,
          created_at,
          updated_at,
          empresa_id
        `)
        .eq('slug', slug)
        .eq('is_active', true)
        .single();

      if (linkError) {
        FormPublishService.debug.error('Error en consulta:', linkError);
        throw new Error('Error al obtener el formulario');
      }

      if (!link) {
        FormPublishService.debug.error('Link no encontrado:', { slug });
        throw new Error('Formulario no encontrado');
      }

      if (!link.empresa_id) {
        FormPublishService.debug.error('empresa_id no encontrado:', { slug, link });
        throw new Error('Formulario inválido: falta empresa_id');
      }

      FormPublishService.debug.log('✅ Link encontrado:', {
        id: link.id,
        type: link.type,
        empresa_id: link.empresa_id,
        created_at: link.created_at
      });

      // Usar plantilla por defecto si no hay campos definidos
      const fields = link.settings?.fields || BOOKING_FORM_TEMPLATE;
      FormPublishService.debug.log('📋 Campos del formulario:', { count: fields.length });

      // Validar estructura de campos
      this.validateFields(fields);

      // Mapear campos para que cumplan con la interfaz FormField
      const mappedFields = this.mapFieldsToFormFields(fields);

      // Construir respuesta con valores por defecto
      const publishedForm: PublishedForm = {
        id: link.id,
        empresa_id: link.empresa_id,
        slug: link.slug,
        fields: mappedFields,
        settings: {
          title: link.settings?.title || 'Formulario sin título',
          description: link.settings?.description || '',
          fields: mappedFields,
          theme: {
            mode: link.settings?.theme?.mode || 'light',
            primary_color: link.settings?.theme?.primary_color || '#000000',
            logo_url: link.settings?.theme?.logo_url
          },
          isCustomizable: link.settings?.isCustomizable ?? true,
          paymentMethods: {
            available: this.normalizePaymentMethods(link.settings?.paymentMethods?.available),
            percentages: link.settings?.paymentMethods?.percentages || {}
          },
          analytics: {
            views: link.settings?.analytics?.views || 0,
            submissions: link.settings?.analytics?.submissions || 0
          }
        },
        status: 'published',
        metadata: {
          createdBy: link.settings?.created_by,
          updatedBy: link.settings?.updated_by
        },
        createdAt: link.created_at ? new Date(link.created_at) : undefined,
        updatedAt: link.updated_at ? new Date(link.updated_at) : undefined
      };

      FormPublishService.debug.log('✅ Formulario procesado:', {
        id: publishedForm.id,
        slug: publishedForm.slug,
        fieldsCount: publishedForm.fields.length
      });

      return publishedForm;

    } catch (error) {
      FormPublishService.debug.error('❌ Error en getBySlug:', error);
      throw error;
    }
  }

  private validateFields(fields: any[]): asserts fields is FormStepField[] {
    if (!Array.isArray(fields)) {
      throw new Error('Los campos deben ser un array');
    }

    fields.forEach((field, index) => {
      if (!field || typeof field !== 'object') {
        throw new Error(`Campo ${index} debe ser un objeto válido`);
      }

      if (!field.type || typeof field.type !== 'string') {
        throw new Error(`Campo ${index} debe tener un tipo válido`);
      }

      // Asegurar propiedades mínimas
      field.id = field.id || `field_${index}`;
      field.label = field.label || field.type;
      field.required = field.required ?? true;
      field.order = field.order || index + 1;
    });

    // Ordenar campos por orden
    fields.sort((a, b) => (a.order || 0) - (b.order || 0));

    FormPublishService.debug.log('✅ Validación de campos exitosa:', { count: fields.length });
  }

  /**
   * Mapea los campos del formulario para que cumplan con la interfaz FormField
   * @param fields Campos originales
   * @returns Campos mapeados que cumplen con FormField
   */
  private mapFieldsToFormFields(fields: any[]): any[] {
    return fields.map((field, index) => {
      // Asegurarse de que cada campo tenga una propiedad order
      return {
        ...field,
        // Si no tiene order, usar el índice como order
        order: field.order !== undefined ? field.order : index,
        // Si no tiene required, establecer como falso
        required: field.required !== undefined ? field.required : false,
        // Asegurarse de que tenga un label
        label: field.label || field.title || `Campo ${index + 1}`
      };
    });
  }

  /**
   * Incrementa el contador de vistas para un formulario (actualmente desactivado)
   * @param slug Slug del formulario
   */
  async incrementViews(slug: string): Promise<void> {
    // Funcionalidad de contador de vistas desactivada
    // Si necesitas reactivarla en el futuro, descomenta el siguiente código:
    
    /*
    try {
      // Primero obtenemos el registro actual para preservar sus configuraciones
      const { data: link, error: fetchError } = await this.supabase
        .from('company_links')
        .select('settings')
        .eq('slug', slug)
        .single();

      if (fetchError) {
        FormPublishService.debug.error('Error al obtener el enlace para actualizar vistas:', fetchError);
        return;
      }

      // Preparamos el objeto de actualización preservando todas las propiedades existentes
      const currentSettings = link?.settings || {};
      const updatedSettings = {
        ...currentSettings,
        analytics: {
          ...currentSettings.analytics,
          views: (currentSettings.analytics?.views || 0) + 1,
          lastView: new Date().toISOString()
        }
      };

      // Actualizamos con el objeto completo preservando todo
      const { error } = await this.supabase
        .from('company_links')
        .update({
          settings: updatedSettings
        })
        .eq('slug', slug);

      if (error) {
        FormPublishService.debug.error('Error al incrementar vistas:', error);
      } else {
        FormPublishService.debug.log('📊 Vistas incrementadas para:', { slug });
      }
    } catch (error) {
      FormPublishService.debug.error('Error al incrementar vistas:', error);
    }
    */
  }

  async publish(form: any): Promise<string> {
    try {
      FormPublishService.debug.log('📝 Iniciando publicación:', form);

      if (!form.empresa_id) {
        throw new Error('Se requiere el ID de la empresa');
      }

      if (!Array.isArray(form.fields)) {
        throw new Error('Se requieren los campos del formulario');
      }

      this.validateFields(form.fields);

      // Extraer el nombre de la empresa del título
      const empresaNombre = form.title?.includes('Reservas ')
        ? form.title.replace('Reservas ', '').replace('Sin nombre', 'reservas')
        : (form.title || 'reservas');
      
      // Generar slug base a partir del nombre de la empresa
      let baseSlug = this.generateSlug(empresaNombre);
      let slug = baseSlug;
      let counter = 1;

      // Verificar si el slug existe y generar uno único
      while (true) {
        const { data, error } = await this.supabase
          .from('company_links')
          .select('slug')
          .eq('slug', slug)
          .single();

        if (error?.code === 'PGRST116') {
          // No se encontró el slug, podemos usarlo
          break;
        }

        if (error) {
          FormPublishService.debug.error('Error al verificar slug:', error);
          throw new Error('Error al verificar disponibilidad del slug');
        }

        if (data) {
          // El slug existe, intentar con un nuevo número
          slug = `${baseSlug}-${counter}`;
          counter++;
        }
      }

      const linkData = {
        empresa_id: form.empresa_id,
        type: 'bookings',
        slug,
        settings: {
          title: form.title || 'Formulario sin título',
          description: form.description || '',
          fields: form.fields,
          theme: form.theme || 'light',
          customization: form.customization || {}
        },
        is_active: true
      };

      FormPublishService.debug.log('📝 Datos a insertar:', linkData);

      const { data: link, error: linkError } = await this.supabase
        .from('company_links')
        .insert(linkData)
        .select('slug')
        .single();

      if (linkError) {
        FormPublishService.debug.error('Error al crear link:', linkError);
        throw new Error(`Error al publicar el formulario: ${linkError.message}`);
      }

      if (!link?.slug) {
        throw new Error('Error: No se pudo generar el slug del formulario');
      }

      // Usar ruta absoluta para el formulario público
      const url = `/reservas/${link.slug}`;
      FormPublishService.debug.log('✅ Formulario publicado:', { url, linkData });

      return url;
    } catch (error) {
      FormPublishService.debug.error('❌ Error en publish:', error);
      throw error;
    }
  }

  private generateSlug(text: string): string {
    if (!text || text.trim() === '' || text === 'Sin nombre') {
      // Si no hay texto o es "Sin nombre", usar timestamp para el slug
      const timestamp = Date.now().toString(36);
      return `reservas-${timestamp}`;
    }
    
    // Normalizar el texto para eliminar acentos y caracteres especiales
    const normalizedText = text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')  // Eliminar acentos
      .replace(/[^\w\s-]/g, '')  // Eliminar caracteres especiales
      .replace(/\s+/g, '-')      // Reemplazar espacios con guiones
      .replace(/--+/g, '-')      // Evitar guiones múltiples
      .replace(/^-+|-+$/g, '');  // Eliminar guiones al inicio y final
    
    // Si después de la normalización no queda texto, usar timestamp
    if (!normalizedText || normalizedText.trim() === '') {
      const timestamp = Date.now().toString(36);
      return `reservas-${timestamp}`;
    }
    
    return normalizedText;
  }

  /**
   * Normaliza los métodos de pago del JSONB a los valores esperados por el frontend
   * @param methods Array de métodos de pago desde el JSONB
   * @returns Array de métodos de pago normalizados según PaymentTypeEnum
   */
  private normalizePaymentMethods(methods: any[] | undefined): string[] {
    if (!methods || !Array.isArray(methods) || methods.length === 0) {
      return ['booking']; // Valor por defecto (pago en el local)
    }

    // Mapeo de nombres de métodos que podrían venir del JSONB a los IDs de PaymentTypeEnum
    const paymentMethodsMap: Record<string, string> = {
      'local': 'booking',    // Pago en el club
      'sena': 'deposit',     // Pago con seña
      'completo': 'full',    // Pago completo
      'garantia': 'guarantee', // Garantía

      // Ya soportamos los nombres oficiales también
      'booking': 'booking',
      'deposit': 'deposit',
      'full': 'full',
      'guarantee': 'guarantee'
    };

    // Filtrar y mapear los métodos de pago válidos
    return methods.map(method => {
      const normalizedMethod = typeof method === 'string' ? 
        paymentMethodsMap[method.toLowerCase()] || method : '';
      
      // Si no existe en el mapeo, usar el método original si es válido
      return normalizedMethod || 'booking';
    }).filter(Boolean);
  }
}

// Crear una instancia única del servicio
export const formPublishService = new FormPublishService(); 