import { customAlphabet } from 'nanoid';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { mercadopago } from '@/lib/mercadopago';

// Generador de IDs para clientes
const nanoid = customAlphabet('1234567890abcdef', 10);

/**
 * Interfaz para los datos de caché del cliente de MercadoPago
 */
interface MercadoPagoCustomerCache {
  mercadoPagoCustomerId: string;
  userId: string;
  empresaId: string;
  lastUsed: string;
  status: 'active' | 'inactive';
}

/**
 * Servicio para gestionar clientes de MercadoPago
 */
class MercadoPagoCustomerService {
  /**
   * Obtiene un cliente existente o crea uno nuevo si no existe
   * @param userId ID del usuario en nuestra aplicación
   * @param empresaId ID de la empresa en nuestra aplicación
   * @param userData Datos del usuario (email, metadata) enviados desde el frontend
   * @returns Datos del cliente obtenido/creado
   */
  async getOrCreateCustomer(
    userId: string, 
    empresaId: string,
    userData?: { email: string; metadata: any }
  ): Promise<MercadoPagoCustomerCache> {
    console.log('[MercadoPagoCustomerService] 🔍 Buscando cliente:', {
      userId,
      empresaId,
      hasUserData: !!userData
    });

    try {
      // 1. Primero buscamos en nuestra BD si ya tenemos un cliente activo
      const { data: activeCustomer, error } = await supabaseAdmin
        .from('mercadopago_customers')
        .select('*')
        .match({
          user_id: userId,
          empresa_id: empresaId,
          status: 'active'
        })
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('[MercadoPagoCustomerService] ❌ Error al buscar cliente:', error);
        throw error;
      }

      // Si encontramos un cliente activo, verificamos que exista en MercadoPago
      if (activeCustomer) {
        try {
          console.log('[MercadoPagoCustomerService] 🔍 Cliente encontrado, verificando en MercadoPago:', 
            activeCustomer.mercadopago_customer_id);
          
          // 2. Verificar que el cliente existe en MercadoPago usando la nueva API
          const mpCustomer = await mercadopago.customers.get({
            customerId: activeCustomer.mercadopago_customer_id
          });

          if (mpCustomer && mpCustomer.id) {
            console.log('[MercadoPagoCustomerService] ✅ Cliente validado en MercadoPago');
            
            // 3. Si no está activo en nuestra BD, reactivarlo
            if (activeCustomer.status !== 'active') {
              await supabaseAdmin
                .from('mercadopago_customers')
                .update({
                  status: 'active',
                  last_used: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                })
                .match({ id: activeCustomer.id });
              
              console.log('[MercadoPagoCustomerService] 🔄 Cliente reactivado');
            } else {
              // Solo actualizar last_used si ya está activo
              await this.updateCustomerLastUsed(activeCustomer.id);
            }

            // 4. Devolver datos del cliente
            return {
              mercadoPagoCustomerId: activeCustomer.mercadopago_customer_id,
              empresaId,
              userId,
              lastUsed: new Date().toISOString(),
              status: 'active' as const
            };
          }
        } catch (mpError: any) {
          console.error('[MercadoPagoCustomerService] ❌ Error al verificar cliente en MercadoPago:', mpError);
          console.log('[MercadoPagoCustomerService] 🔄 El cliente no existe en MercadoPago, marcando como inactivo');
          
          // Si el cliente no existe en MercadoPago, marcarlo como inactivo
          await supabaseAdmin
            .from('mercadopago_customers')
            .update({
              status: 'inactive',
              last_payment_error: mpError.message || 'Cliente no encontrado en MercadoPago',
              updated_at: new Date().toISOString()
            })
            .match({ id: activeCustomer.id });
        }
      }

      // Si no encontramos un cliente o no es válido, creamos uno nuevo
      return await this.createNewCustomer(userId, empresaId, userData);
    } catch (error) {
      console.error('[MercadoPagoCustomerService] ❌ Error inesperado:', error);
      throw error;
    }
  }

  /**
   * Actualiza la fecha de último uso de un cliente
   * @param customerId ID del cliente en nuestra BD
   */
  private async updateCustomerLastUsed(customerId: string): Promise<void> {
    try {
      await supabaseAdmin
        .from('mercadopago_customers')
        .update({
          last_used: new Date().toISOString()
        })
        .match({ id: customerId });
    } catch (error) {
      console.error('[MercadoPagoCustomerService] ❌ Error al actualizar last_used:', error);
      // No lanzamos el error, no es crítico
    }
  }

  /**
   * Busca un cliente en MercadoPago por email
   * @param email Email del cliente
   * @returns Datos del cliente o null si no existe
   */
  private async findCustomerByEmail(email: string): Promise<any | null> {
    try {
      console.log('[MercadoPagoCustomerService] 🔍 Buscando cliente por email:', email);
      
      // Usando la API moderna de MercadoPago para buscar clientes
      const searchResponse = await mercadopago.customers.search({
        filters: {
          email: email
        }
      });
      
      console.log('[MercadoPagoCustomerService] 📥 Resultado de búsqueda:', 
        searchResponse ? `Total: ${searchResponse.paging?.total || 0}` : 'No hay respuesta');

      // Verificar si hay resultados
      if (searchResponse && 
          searchResponse.results && 
          searchResponse.results.length > 0) {
        
        console.log('[MercadoPagoCustomerService] ✅ Cliente encontrado por email, ID:', 
          searchResponse.results[0].id);
        
        return searchResponse.results[0];
      }
      
      console.log('[MercadoPagoCustomerService] ℹ️ No se encontró cliente con ese email');
      return null;
    } catch (error) {
      console.error('[MercadoPagoCustomerService] ❌ Error al buscar cliente por email:', error);
      return null;
    }
  }

  /**
   * Crea un nuevo cliente en MercadoPago y lo registra en nuestra BD
   * @param userId ID del usuario en nuestra aplicación
   * @param empresaId ID de la empresa en nuestra aplicación
   * @param userData Datos del usuario (email, metadata) enviados desde el frontend
   * @returns Datos del cliente creado
   */
  private async createNewCustomer(
    userId: string, 
    empresaId: string,
    userData?: { email: string; metadata: any }
  ): Promise<MercadoPagoCustomerCache> {
    console.log('[MercadoPagoCustomerService] 🆕 Iniciando creación de cliente:', {
      userId,
      empresaId,
      hasUserData: !!userData
    });

    // 1. Obtener datos del usuario desde nuestra BD o usar los datos recibidos del frontend
    let user: { email: string; first_name?: string; last_name?: string } = {
      email: userData?.email || '',
      first_name: userData?.metadata?.first_name || userData?.metadata?.name || '',
      last_name: userData?.metadata?.last_name || ''
    };

    // Solo intentar consultar la BD si no tenemos el email en userData
    if (!user.email && userId) {
      try {
        const { data: userFromDb, error: userError } = await supabaseAdmin
          .from('users')
          .select('email, first_name, last_name')
          .eq('id', userId)
          .single();

        if (userError) {
          console.error('[MercadoPagoCustomerService] ❌ Error al obtener datos del usuario:', userError);
          throw userError;
        }

        if (userFromDb && userFromDb.email) {
          user = userFromDb;
        }
      } catch (error) {
        console.error('[MercadoPagoCustomerService] ⚠️ No se pudieron obtener datos del usuario de la BD:', error);
        // Continuamos con los datos que tenemos
      }
    }

    console.log('[MercadoPagoCustomerService] ✅ Datos de usuario obtenidos:', {
      email: user.email,
      hasName: !!user.first_name
    });

    // 2. Verificar si ya existe un cliente con ese email en MercadoPago
    let existingMpCustomer = await this.findCustomerByEmail(user.email);
    let mpCustomerId;

    if (existingMpCustomer) {
      console.log('[MercadoPagoCustomerService] 🔍 Cliente ya existe en MercadoPago, reutilizando ID:', existingMpCustomer.id);
      mpCustomerId = existingMpCustomer.id;
    } else {
      // 3. Si no existe, crear nuevo cliente en MercadoPago usando la API moderna
      try {
        console.log('[MercadoPagoCustomerService] 🆕 Creando nuevo cliente en MercadoPago');
        
        // Preparar el objeto de datos del cliente según la documentación oficial
        const customerData = {
          email: userData?.email || user.email,
          first_name: user.first_name || 'Usuario',
          last_name: user.last_name || 'Simple Link',
          description: `Usuario de Simple Link - ID: ${userId}`,
          default_address: "Home",
          phone: {
            area_code: "",
            number: ""
          },
          metadata: {
            user_id: userId,
            empresa_id: empresaId,
            source: 'simple_link_web',
            created_at: new Date().toISOString(),
            ...userData?.metadata
          }
        };
        
        console.log('[MercadoPagoCustomerService] 📤 Datos para crear cliente:', JSON.stringify({
          email: customerData.email,
          first_name: customerData.first_name,
          metadata: customerData.metadata
        }));
        
        // Realizar la creación del cliente con la API moderna
        const newCustomer = await mercadopago.customers.create(customerData);

        console.log('[MercadoPagoCustomerService] 📥 Cliente creado:', 
          newCustomer ? `ID: ${newCustomer.id || 'N/A'}` : 'No hay respuesta');
        
        if (!newCustomer || !newCustomer.id) {
          console.error('[MercadoPagoCustomerService] ❌ Respuesta inválida al crear cliente');
          throw new Error('Respuesta inválida al crear cliente en MercadoPago');
        }

        console.log('[MercadoPagoCustomerService] ✅ Cliente creado en MercadoPago:', {
          id: newCustomer.id,
          email: newCustomer.email
        });
        
        mpCustomerId = newCustomer.id;
      } catch (mpError) {
        console.error('[MercadoPagoCustomerService] ❌ Error al crear cliente en MercadoPago:', mpError);
        throw new Error(`Error al crear cliente en MercadoPago: ${mpError instanceof Error ? mpError.message : 'Error desconocido'}`);
      }
    }

    // 4. Registrar cliente en nuestra BD
    try {
      console.log('[MercadoPagoCustomerService] 💾 Guardando cliente en BD:', {
        user_id: userId,
        empresa_id: empresaId,
        mercadopago_customer_id: mpCustomerId
      });
      
      // Primero verificamos si ya existe un registro para este cliente
      const { data: existingRecord } = await supabaseAdmin
        .from('mercadopago_customers')
        .select('id, status')
        .match({
          user_id: userId,
          empresa_id: empresaId,
          mercadopago_customer_id: mpCustomerId
        })
        .single();
      
      if (existingRecord) {
        console.log('[MercadoPagoCustomerService] ℹ️ Cliente ya registrado en BD, actualizando:', existingRecord.id);
        
        // Si ya existe, solo actualizamos
        const { error: updateError } = await supabaseAdmin
          .from('mercadopago_customers')
          .update({
            status: 'active',
            last_used: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .match({ id: existingRecord.id });
        
        if (updateError) {
          console.error('[MercadoPagoCustomerService] ❌ Error al actualizar cliente en BD:', updateError);
          throw updateError;
        }
        
        console.log('[MercadoPagoCustomerService] ✅ Cliente actualizado en BD');
      } else {
        // Si no existe, lo creamos
        console.log('[MercadoPagoCustomerService] 🆕 Creando nuevo registro en BD');
        
        const { data: newCustomer, error } = await supabaseAdmin
          .from('mercadopago_customers')
          .insert({
            user_id: userId,
            empresa_id: empresaId,
            mercadopago_customer_id: mpCustomerId,
            last_used: new Date().toISOString(),
            metadata: {
              mp_created_at: new Date().toISOString(),
              initial_creation: true,
              user_email: userData?.email || user.email
            }
          })
          .select()
          .single();

        if (error) {
          console.error('[MercadoPagoCustomerService] ❌ Error al guardar cliente en BD:', error);
          throw error;
        }

        console.log('[MercadoPagoCustomerService] ✅ Cliente registrado en BD:', newCustomer.id);
      }

      return {
        mercadoPagoCustomerId: mpCustomerId,
        empresaId,
        userId,
        lastUsed: new Date().toISOString(),
        status: 'active'
      };
    } catch (dbError) {
      console.error('[MercadoPagoCustomerService] ❌ Error al registrar cliente en BD:', dbError);
      throw new Error(`Error al registrar cliente en base de datos: ${dbError instanceof Error ? dbError.message : 'Error desconocido'}`);
    }
  }

  /**
   * Lista las tarjetas de un cliente
   * @param customerId ID del cliente en MercadoPago
   * @returns Lista de tarjetas
   */
  async listCards(customerId: string): Promise<any[]> {
    try {
      console.log('[MercadoPagoCustomerService] 🔍 Obteniendo tarjetas del cliente:', customerId);
      
      // Usar el cliente de tarjetas para obtener la lista
      // En una versión futura se implementará
      // Por ahora devolvemos un array vacío
      return [];
    } catch (error) {
      console.error('[MercadoPagoCustomerService] ❌ Error al obtener tarjetas:', error);
      return [];
    }
  }
}

// Instancia global del servicio
export const mercadoPagoCustomerService = new MercadoPagoCustomerService();
