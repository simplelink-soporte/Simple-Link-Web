import { supabase } from '@/lib/supabase'

export const organizationService = {
  isInitializing: false,
  initPromise: null as Promise<any> | null,

  async getCurrentOrganization() {
    // Si ya hay una inicialización en curso, esperar a que termine
    if (this.isInitializing) {
      console.log('🔄 Inicialización en curso, esperando...');
      return this.initPromise;
    }

    // Crear nueva promesa de inicialización
    this.isInitializing = true;
    this.initPromise = this._getCurrentOrganization();

    try {
      const result = await this.initPromise;
      return result;
    } finally {
      this.isInitializing = false;
      this.initPromise = null;
    }
  },

  async _getCurrentOrganization() {
    try {
      const userId = process.env.NEXT_PUBLIC_DEFAULT_USER_ID

      if (!userId) {
        throw new Error('ID de usuario no configurado')
      }

      console.log('📍 Buscando usuario en la tabla usuarios...');

      // 1. Obtener datos del usuario
      const { data: usuarios, error: userError } = await supabase
        .from('usuarios')
        .select()
        .eq('id', userId);

      if (userError) {
        console.error('Error al obtener usuario:', userError);
        // Error específico para problemas de RLS
        if (userError.code === 'PGRST301') {
          throw new Error('No hay permisos para acceder a la tabla usuarios. Se requiere configurar políticas RLS.');
        }
        throw new Error('Error al obtener información del usuario');
      }

      if (!usuarios || usuarios.length === 0) {
        throw new Error(`No se encontró el usuario con ID: ${userId}`);
      }

      const usuario = usuarios[0];
      console.log('✅ Usuario encontrado:', usuario.email);

      // 2. Verificar si ya existe una empresa para este usuario
      console.log('🔍 Verificando si existe empresa para el usuario...');
      
      const { data: empresas, error: companyError } = await supabase
        .from('empresas')
        .select()
        .eq('auth_user_id', userId);

      // Si ya existe, retornamos la empresa existente
      if (empresas && empresas.length > 0) {
        console.log('✅ Empresa existente encontrada');
        return { data: empresas[0], error: null };
      }

      console.log('📝 Creando nueva empresa para el usuario...');

      // 3. Crear nuevo registro en empresas usando los datos del usuario
      const { data: newCompany, error: createError } = await supabase
        .from('empresas')
        .insert({
          name: 'Nueva Empresa',
          business_name: 'Nueva Empresa S.A.',
          email: usuario.email,
          phone: usuario.telefono,
          address: usuario.direccion,
          city: usuario.ciudad,
          state: null,
          country: usuario.pais,
          is_active: true,
          auth_user_id: usuario.id,
          plan_type: 'Free'
        })
        .select()
        .single();

      if (createError) {
        throw createError;
      }

      console.log('✅ Empresa creada correctamente:', newCompany);
      return { data: newCompany, error: null };

    } catch (error: any) {
      console.error('❌ Error getting empresa:', {
        error,
        message: error.message,
        code: error.code,
        details: error.details
      })
      return { 
        data: null, 
        error: {
          message: error.message || 'Error al obtener la organización',
          code: error.code,
          details: error.details
        }
      }
    }
  },

  async updateOrganization(data: {
    name: string;
    email: string;
    phone: string;
    country: string;
  }) {
    try {
      const userId = process.env.NEXT_PUBLIC_DEFAULT_USER_ID;
      
      if (!userId) {
        throw new Error('ID de usuario no configurado en las variables de entorno');
      }

      console.log('🔍 Verificando existencia de empresa para el usuario:', userId);

      // Primero verificamos si la empresa existe
      const { data: existingCompany, error: checkError } = await supabase
        .from('empresas')
        .select('id, auth_user_id')
        .eq('auth_user_id', userId)
        .maybeSingle();

      if (checkError) {
        console.error('❌ Error al verificar empresa:', checkError);
        throw new Error('Error al verificar la existencia de la empresa');
      }

      if (!existingCompany) {
        console.error('❌ No se encontró la empresa para el usuario:', userId);
        throw new Error('No se encontró la empresa a actualizar');
      }

      // Validaciones básicas
      if (!data.name?.trim()) {
        throw new Error('El nombre de la empresa es requerido');
      }

      if (!data.email?.trim()) {
        throw new Error('El email de la empresa es requerido');
      }

      if (!data.phone?.trim()) {
        throw new Error('El teléfono de la empresa es requerido');
      }

      if (!data.country?.trim()) {
        throw new Error('El país de la empresa es requerido');
      }

      // Validar formato de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email)) {
        throw new Error('El formato del email no es válido');
      }

      console.log('📍 Actualizando empresa...', {
        userId,
        companyId: existingCompany.id,
        data
      });

      // Realizamos la actualización usando el ID de la empresa
      const { data: result, error: updateError } = await supabase
        .from('empresas')
        .update({
          business_name: data.name.trim(),
          email: data.email.trim(),
          phone: data.phone.trim(),
          country: data.country.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('auth_user_id', userId)
        .select()
        .single();

      if (updateError) {
        console.error('❌ Error al actualizar empresa:', updateError);
        throw new Error('Error al actualizar la información de la empresa');
      }

      console.log('✅ Empresa actualizada correctamente:', result);
      return result;

    } catch (error: any) {
      console.error('❌ Error en updateOrganization:', {
        error,
        message: error.message,
        code: error.code,
        details: error.details
      });
      throw error;
    }
  }
} 