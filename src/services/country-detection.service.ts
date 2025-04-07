import { createSupabaseClient } from '@/lib/supabase';

/**
 * Servicio para detectar y gestionar países de organizaciones
 * Proporciona funcionalidades para obtener y traducir países y monedas
 */
export class CountryDetectionService {
  private supabase = createSupabaseClient();
  private countryCache: Record<string, string> = {};
  
  // Instancia única (patrón singleton)
  private static instance: CountryDetectionService;
  
  // Constructor privado para singleton
  private constructor() {}
  
  /**
   * Método para obtener la instancia única
   */
  public static getInstance(): CountryDetectionService {
    if (!CountryDetectionService.instance) {
      CountryDetectionService.instance = new CountryDetectionService();
    }
    return CountryDetectionService.instance;
  }
  
  /**
   * Deduce el país a partir de una moneda
   * @param currencyCode Código de moneda (mxn, ars, eur)
   * @returns Código ISO del país (MX, AR, ES)
   */
  public getCountryByCurrency(currencyCode?: string | null): string | null {
    if (!currencyCode) return null;
    
    const currencyLower = currencyCode.toLowerCase();
    
    switch (currencyLower) {
      case 'mxn':
        console.log(`🔄 Deduciendo país MX a partir de moneda ${currencyCode}`);
        return 'MX';
      case 'ars':
        console.log(`🔄 Deduciendo país AR a partir de moneda ${currencyCode}`);
        return 'AR';
      case 'eur':
        console.log(`🔄 Deduciendo país ES a partir de moneda ${currencyCode}`);
        return 'ES';
      default:
        return null;
    }
  }
  
  /**
   * Convierte nombres de países a códigos ISO
   * @param countryName Nombre del país en texto
   * @returns Código ISO del país
   */
  private normalizeCountry(countryName?: string | null): string {
    if (!countryName) return '';
    
    const countryLower = countryName.toLowerCase().trim();
    
    // Normalizar valores posibles
    if (countryLower === 'españa' || countryLower === 'spain' || 
        countryLower === 'espana' || countryLower === 'es') {
      return 'ES';
    }
    
    if (countryLower === 'mexico' || countryLower === 'méxico' || 
        countryLower === 'mx') {
      return 'MX';
    }
    
    if (countryLower === 'argentina' || countryLower === 'ar') {
      return 'AR';
    }
    
    // Si no coincide con ninguno de los anteriores, devolver el texto original
    // o convertir a mayúsculas si parece un código de país (longitud 2)
    return countryLower.length === 2 ? countryLower.toUpperCase() : countryName;
  }
  
  /**
   * Obtiene el código de moneda según el país proporcionado
   * @param country Código ISO o nombre del país
   * @returns Código de moneda (mxn, ars, eur)
   */
  public getCurrencyCodeByCountry(country?: string | null): string {
    // Si no se proporciona país, asumimos Europa (EUR) como valor predeterminado
    // ya que es el caso más común para la aplicación
    if (!country) {
      console.log(`🌎 País no proporcionado, asumiendo Europa, usando moneda: eur`);
      return 'eur';
    }
    
    const countryLower = country.toLowerCase();
    
    // Casos para México
    if (countryLower === 'mx' || 
        countryLower === 'mexico' || 
        countryLower === 'méxico') {
      console.log(`🌎 País detectado como México, usando moneda: mxn`);
      return 'mxn';
    }
    
    // Casos para Argentina
    if (countryLower === 'ar' || 
        countryLower === 'argentina') {
      console.log(`🌎 País detectado como Argentina, usando moneda: ars`);
      return 'ars';
    }
    
    // Casos para España/Europa
    if (countryLower === 'es' || 
        countryLower === 'españa' ||
        countryLower === 'espana' ||
        countryLower === 'spain' ||
        countryLower === 'europe' ||
        countryLower === 'europa') {
      console.log(`🌎 País detectado como España/Europa, usando moneda: eur`);
      return 'eur';
    }
    
    // Para cualquier otro caso, usar EUR como valor predeterminado
    console.log(`⚠️ País ${country} no reconocido específicamente, usando moneda por defecto: eur`);
    return 'eur';
  }
  
  /**
   * Obtiene el símbolo de moneda según el país proporcionado
   * @param country Código ISO o nombre del país
   * @returns Símbolo de moneda ($, €, etc)
   */
  public getCurrencySymbolByCountry(country?: string | null): string {
    // Si no se proporciona país, usar el símbolo de euro por defecto
    if (!country) {
      console.log(`🌎 País no proporcionado para símbolo, asumiendo Europa, usando símbolo: €`);
      return '€';
    }
    
    const countryLower = country.toLowerCase();
    
    // Casos para México
    if (countryLower === 'mx' || 
        countryLower === 'mexico' || 
        countryLower === 'méxico') {
      return '$';
    }
    
    // Casos para Argentina
    if (countryLower === 'ar' || 
        countryLower === 'argentina') {
      return '$';
    }
    
    // Casos para España/Europa - usar la misma lógica que getCurrencyCodeByCountry
    if (countryLower === 'es' || 
        countryLower === 'españa' ||
        countryLower === 'espana' ||
        countryLower === 'spain' ||
        countryLower === 'europe' ||
        countryLower === 'europa') {
      return '€';
    }
    
    // Para cualquier otro caso, devolver el símbolo del euro como predeterminado
    console.log(`⚠️ País ${country} no reconocido para símbolo, usando símbolo por defecto: €`);
    return '€';
  }
  
  /**
   * Limpia la caché de países para forzar recargar los datos
   */
  public clearCache(): void {
    this.countryCache = {};
    console.log('🧹 Caché de países limpiada');
  }
  
  /**
   * Obtiene el país de una organización por su ID
   * Busca directamente en la tabla empresas, en la columna 'country'
   * 
   * @param organizationId ID de la organización
   * @param trackingId Identificador para seguimiento en logs (opcional)
   * @returns Código ISO del país detectado
   * @throws Error si no se encuentra el país o la organización no existe
   */
  public async getCountryByOrganizationId(
    organizationId: string, 
    trackingId?: string
  ): Promise<string> {
    const logPrefix = trackingId ? `[${trackingId}]` : '';
    
    if (!organizationId) {
      const error = new Error('No se proporcionó ID de organización.');
      console.error(`${logPrefix} ❌ ${error.message}`);
      throw error;
    }
    
    // Verificar si ya tenemos este país en caché (dentro de la misma sesión)
    if (this.countryCache[organizationId]) {
      console.log(`${logPrefix} 🌎 [Cache] Usando país en caché para organización ${organizationId}:`, this.countryCache[organizationId]);
      return this.countryCache[organizationId];
    }
    
    try {
      // Buscar directamente en la tabla empresas
      console.log(`${logPrefix} 🔎 Consultando país en tabla empresas para ${organizationId}...`);
      
      const { data: empresa } = await this.supabase
        .from('empresas')
        .select('country')
        .eq('id', organizationId)
        .single();
      
      if (empresa?.country) {
        // Normalizar el valor del país (convertir "España" a "ES", etc.)
        const normalizedCountry = this.normalizeCountry(empresa.country);
        this.countryCache[organizationId] = normalizedCountry;
        console.log(`${logPrefix} 🌎 País encontrado en empresas:`, empresa.country, '→', normalizedCountry);
        return normalizedCountry;
      }
      
      // Si no se encontró país, lanzar un error
      const error = new Error(`No se encontró país para la organización: ${organizationId}`);
      console.error(`${logPrefix} ❌ ${error.message}`);
      throw error;
    } catch (error) {
      console.error(`${logPrefix} ❌ Error al obtener el país de la organización:`, error);
      // Re-lanzar el error para que sea manejado por el código que llama a esta función
      throw error;
    }
  }
}

// Exportar una instancia única del servicio
export const countryDetectionService = CountryDetectionService.getInstance();
