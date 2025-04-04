import { createClientComponentClient, SupabaseClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/types/supabase';
import { toast } from 'sonner';
import { FormStepField } from '@/types/form-steps';

export type CompanyLinkType = 'classes' | 'bookings';

export interface CompanyLinkSettings {
  title?: string;
  description?: string;
  theme?: {
    primary_color?: string;
    logo_url?: string | null;
  };
  features?: {
    allow_guest?: boolean;
    require_auth?: boolean;
    show_prices?: boolean;
  };
  restrictions?: {
    max_bookings_per_user?: number | null;
    advance_days?: number | null;
  };
  fields?: FormStepField[];
  metadata?: {
    country?: string | null;
    createdBy?: string;
    updatedBy?: string;
    [key: string]: any;
  };
}

export interface CreateCompanyLinkParams {
  empresaId: string;
  type: CompanyLinkType;
  settings?: CompanyLinkSettings;
  name: string;
}

interface CompanyLinkData {
  empresa_id: string;
  type: CompanyLinkType;
  slug: string;
  is_active: boolean;
  settings: CompanyLinkSettings;
}

export class CompanyLinkError extends Error {
  constructor(message: string, public code: string, public originalError?: any) {
    super(message);
    this.name = 'CompanyLinkError';
  }
}

export class CompanyLinksService {
  private supabase!: SupabaseClient<Database>;
  private debug = process.env.NODE_ENV === 'development';
  private isInitialized = false;

  constructor() {
    this.initializeSupabase();
  }

  private async initializeSupabase() {
    try {
      this.supabase = createClientComponentClient<Database>();
      this.isInitialized = true;
      this.log('🔄 Cliente Supabase inicializado');
    } catch (error) {
      this.logError('Error al inicializar Supabase:', error);
      throw new CompanyLinkError(
        'Error al inicializar el servicio',
        'INIT_ERROR',
        error
      );
    }
  }

  private async ensureAuthenticated() {
    try {
      if (!this.isInitialized) {
        await this.initializeSupabase();
      }

      this.log('🔍 Verificando sesión...');
      const {
        data: { session },
        error: sessionError
      } = await this.supabase.auth.getSession();

      if (sessionError) {
        this.logError('❌ Error al obtener sesión:', sessionError);
        throw new CompanyLinkError(
          'Error al verificar autenticación',
          'SESSION_ERROR',
          sessionError
        );
      }

      // En desarrollo, usamos el ID por defecto
      if (!session && this.debug && process.env.NEXT_PUBLIC_DEFAULT_USER_ID) {
        this.log('🔧 Usando ID de desarrollo');
        return {
          user: {
            id: process.env.NEXT_PUBLIC_DEFAULT_USER_ID,
            role: 'authenticated'
          }
        };
      }

      if (!session) {
        this.log('⚠️ No se encontró sesión activa');
        throw new CompanyLinkError(
          'Usuario no autenticado',
          'AUTH_ERROR'
        );
      }

      this.log('✅ Sesión verificada:', { userId: session.user.id });
      return session;
    } catch (error) {
      if (error instanceof CompanyLinkError) {
        throw error;
      }
      this.logError('❌ Error inesperado al verificar autenticación:', error);
      throw new CompanyLinkError(
        'Error al verificar autenticación',
        'AUTH_ERROR',
        error
      );
    }
  }

  private getDefaultSettings(type: CompanyLinkType): CompanyLinkSettings {
    const baseSettings: CompanyLinkSettings = {
      theme: {
        logo_url: null,
        primary_color: "#000000"
      },
      features: {
        allow_guest: true,
        show_prices: true,
        require_auth: false
      },
      restrictions: {
        advance_days: null,
        max_bookings_per_user: null
      }
    };

    switch (type) {
      case 'classes':
        return baseSettings;
      case 'bookings':
        return {
          ...baseSettings,
          features: {
            ...baseSettings.features,
            show_prices: false
          }
        };
      default:
        return baseSettings;
    }
  }

  private validateLinkData(data: Partial<CompanyLinkData>): void {
    if (!data.empresa_id) {
      throw new CompanyLinkError('ID de empresa requerido', 'VALIDATION_ERROR');
    }
    
    // Validación estricta del tipo
    if (!data.type) {
      throw new CompanyLinkError('Tipo de link requerido', 'VALIDATION_ERROR');
    }
    
    // Asegurar que el tipo coincida con la restricción CHECK de la base de datos
    const validTypes = ['classes', 'bookings'];
    if (!validTypes.includes(data.type)) {
      throw new CompanyLinkError(
        `Tipo de link inválido. Debe ser uno de: ${validTypes.join(', ')}`,
        'VALIDATION_ERROR'
      );
    }

    if (!data.slug) {
      throw new CompanyLinkError('Slug requerido', 'VALIDATION_ERROR');
    }
  }

  private log(message: string, data?: any) {
    if (this.debug) {
      console.log(`[CompanyLinksService] ${message}`, data || '');
    }
  }

  private logError(message: string, error?: any) {
    console.error(`[CompanyLinksService] ${message}`, error || '');
  }

  async generateUniqueSlug(baseSlug: string): Promise<string> {
    await this.ensureAuthenticated();
    this.log('Generando slug único para:', baseSlug);
    
    let slug = this.generateSlug(baseSlug);
    let counter = 1;
    let isUnique = false;

    while (!isUnique) {
      try {
        const { data } = await this.supabase
          .from('company_links')
          .select('slug')
          .eq('slug', slug)
          .single();

        if (!data) {
          isUnique = true;
          this.log('Slug generado:', slug);
        } else {
          slug = `${baseSlug}-${counter}`;
          counter++;
        }
      } catch (error) {
        this.logError('Error al verificar slug:', error);
        throw new CompanyLinkError(
          'Error al generar slug único',
          'SLUG_GENERATION_ERROR',
          error
        );
      }
    }

    return slug;
  }

  private generateSlug(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  async getCompanyLink(empresaId: string, type: CompanyLinkType) {
    await this.ensureAuthenticated();
    this.log('Buscando link:', { empresaId, type });

    try {
      const { data: links, error } = await this.supabase
        .from('company_links')
        .select('*')
        .eq('empresa_id', empresaId)
        .eq('type', type)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        throw new CompanyLinkError(
          'Error al obtener link',
          'GET_LINK_ERROR',
          error
        );
      }

      const link = links?.[0];
      this.log('Link encontrado:', link || 'No se encontró link activo');
      return link || null;
    } catch (error) {
      if (error instanceof CompanyLinkError) {
        throw error;
      }
      
      this.logError('Error al obtener link:', error);
      throw new CompanyLinkError(
        'Error al obtener link de la empresa',
        'GET_LINK_ERROR',
        error
      );
    }
  }

  async createOrUpdateLink({
    empresaId,
    type,
    settings,
    name
  }: CreateCompanyLinkParams) {
    await this.ensureAuthenticated();
    this.log('Iniciando creación/actualización de link:', { empresaId, type, name });

    try {
      // Validar el tipo antes de continuar
      const validTypes = ['classes', 'bookings'];
      if (!validTypes.includes(type)) {
        throw new CompanyLinkError(
          'Tipo de link inválido. Debe ser "classes" o "bookings"',
          'VALIDATION_ERROR'
        );
      }

      // 1. Obtener el país de la empresa
      const { data: empresaData, error: empresaError } = await this.supabase
        .from('empresas')
        .select('country')
        .eq('id', empresaId)
        .single();

      if (empresaError) {
        this.logError('Error al obtener país de la empresa:', empresaError);
        throw new CompanyLinkError(
          'Error al obtener datos de la empresa',
          'EMPRESA_DATA_ERROR',
          empresaError
        );
      }

      const countryFromEmpresa = empresaData?.country || null;
      this.log('País de la empresa obtenido:', countryFromEmpresa);

      // 2. Generar slug único primero
      const slug = await this.generateUniqueSlug(name);

      // 3. Verificar si ya existe un link activo
      const existingLink = await this.getCompanyLink(empresaId, type);

      // 4. Preparar los settings con el país incluido en metadata
      const settingsWithCountry = {
        ...settings,
        metadata: {
          ...(settings?.metadata || {}),
          country: countryFromEmpresa
        }
      };

      if (existingLink) {
        this.log('Actualizando link existente');
        
        const defaultSettings = this.getDefaultSettings(type);
        const updateData: Partial<CompanyLinkData> = {
          slug,
          settings: {
            ...defaultSettings,
            ...existingLink.settings,
            ...settingsWithCountry
          }
        };

        this.validateLinkData({ ...existingLink, ...updateData });

        const { data, error } = await this.supabase
          .from('company_links')
          .update(updateData)
          .eq('id', existingLink.id)
          .select()
          .single();

        if (error) {
          this.logError('Error al actualizar link:', error);
          throw new CompanyLinkError(
            'Error al actualizar link',
            'UPDATE_LINK_ERROR',
            error
          );
        }

        this.log('Link actualizado con país:', data);
        return data;
      } else {
        this.log('Creando nuevo link');
        
        const defaultSettings = this.getDefaultSettings(type);
        const newLinkData: CompanyLinkData = {
          empresa_id: empresaId,
          type: type as CompanyLinkType, // Asegurar el tipo correcto
          slug,
          is_active: true,
          settings: {
            ...defaultSettings,
            ...settingsWithCountry
          }
        };

        // Validar antes de insertar
        this.validateLinkData(newLinkData);

        this.log('Datos a insertar con país:', newLinkData);

        const { data, error } = await this.supabase
          .from('company_links')
          .insert(newLinkData)
          .select()
          .single();

        if (error) {
          this.logError('Error al crear link:', error);
          throw new CompanyLinkError(
            'Error al crear link',
            'CREATE_LINK_ERROR',
            error
          );
        }

        this.log('Link creado con país:', data);
        return data;
      }
    } catch (error) {
      if (error instanceof CompanyLinkError) {
        throw error;
      }
      
      this.logError('Error al crear/actualizar link:', error);
      throw new CompanyLinkError(
        'Error al procesar el link',
        'PROCESS_LINK_ERROR',
        error
      );
    }
  }

  async deactivateLink(empresaId: string, type: CompanyLinkType) {
    await this.ensureAuthenticated();
    this.log('Desactivando link:', { empresaId, type });

    try {
      const { error } = await this.supabase
        .from('company_links')
        .update({ is_active: false })
        .eq('empresa_id', empresaId)
        .eq('type', type);

      if (error) {
        throw new CompanyLinkError(
          'Error al desactivar link',
          'DEACTIVATE_LINK_ERROR',
          error
        );
      }

      this.log('Link desactivado exitosamente');
    } catch (error) {
      if (error instanceof CompanyLinkError) {
        throw error;
      }
      
      this.logError('Error al desactivar link:', error);
      throw new CompanyLinkError(
        'Error al desactivar el link',
        'DEACTIVATE_LINK_ERROR',
        error
      );
    }
  }
}

export const companyLinksService = new CompanyLinksService(); 