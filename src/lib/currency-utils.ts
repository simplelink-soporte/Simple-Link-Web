/**
 * Utilidades para el manejo de monedas según el país
 */

/**
 * Obtiene el código de moneda según el país
 * @param country Código de país (ES, MX, AR)
 * @returns Código de moneda (EUR, MXN, ARS)
 */
export const getCurrencyByCountry = (country?: string | null): string => {
  if (!country) {
    console.log('⚠️ getCurrencyByCountry: No se proporcionó país, usando EUR por defecto');
    return 'EUR'; // Default a EUR si no hay país
  }

  // Normalizar el código de país quitando espacios en blanco
  const trimmedCountry = country.trim();
  
  // Para pruebas, guardamos tanto el valor original como el normalizado
  console.log(`🔍 getCurrencyByCountry: Analizando país "${country}" (después de trim: "${trimmedCountry}")`);

  // Convertimos a minúsculas para comparaciones no sensibles a mayúsculas/minúsculas
  const lowerCountry = trimmedCountry.toLowerCase();
  
  // Método más robusto usando comparaciones case-insensitive
  // México / Mexico
  if (lowerCountry === 'mx' || 
      lowerCountry === 'Mexico' || 
      lowerCountry === 'México' ||
      lowerCountry.includes('mex')) {
    console.log(`✅ getCurrencyByCountry: Detectado México (${country}), usando MXN`);
    return 'MXN';
  }
  
  // Argentina
  if (lowerCountry === 'ar' || 
      lowerCountry === 'argentina' ||
      lowerCountry.includes('arg')) {
    console.log(`✅ getCurrencyByCountry: Detectado Argentina (${country}), usando ARS`);
    return 'ARS';
  }
  
  // España / Spain / Europa
  if (lowerCountry === 'es' || 
      lowerCountry === 'spain' || 
      lowerCountry === 'Epaña' ||
      lowerCountry === 'Espana' ||
      lowerCountry.includes('esp') ||
      lowerCountry === 'europe' ||
      lowerCountry === 'europa' ||
      lowerCountry.includes('eur')) {
    console.log(`✅ getCurrencyByCountry: Detectado España/Europa (${country}), usando EUR`);
    return 'EUR';
  }
  
  console.log(`⚠️ getCurrencyByCountry: País no reconocido: "${country}", usando EUR por defecto`);
  return 'EUR'; // Por defecto para otros países
};

/**
 * Obtiene el símbolo de moneda según el país
 * @param country Código de país (ES, MX, AR)
 * @returns Símbolo de la moneda (€, $, $)
 */
export const getCurrencySymbol = (country?: string | null): string => {
  if (!country) {
    console.log('⚠️ getCurrencySymbol: No se proporcionó país, usando € por defecto');
    return '€'; // Default a EUR si no hay país
  }

  // Normalizar el código de país a mayúsculas y quitar espacios
  const normalizedCountry = country.trim().toUpperCase();
  
  console.log(`🔍 getCurrencySymbol: Analizando país "${country}" (normalizado: "${normalizedCountry}")`);

  // Usar exactamente la misma lógica que getCurrencyByCountry para consistencia
  if (normalizedCountry === 'MX' || 
      normalizedCountry === 'MEXICO' || 
      normalizedCountry === 'MÉXICO' ||
      normalizedCountry.includes('MEX')) {
    console.log(`✅ getCurrencySymbol: Detectado México, usando $`);
    return '$';
  }
  
  if (normalizedCountry === 'AR' || 
      normalizedCountry === 'ARGENTINA' ||
      normalizedCountry.includes('ARG')) {
    console.log(`✅ getCurrencySymbol: Detectado Argentina, usando $`);
    return '$';
  }
  
  if (normalizedCountry === 'ES' || 
      normalizedCountry === 'SPAIN' || 
      normalizedCountry === 'ESPAÑA' ||
      normalizedCountry === 'ESPANA' ||
      normalizedCountry.includes('ESP') ||
      normalizedCountry === 'EUROPE' ||
      normalizedCountry === 'EUROPA' ||
      normalizedCountry.includes('EUR')) {
    console.log(`✅ getCurrencySymbol: Detectado España/Europa, usando €`);
    return '€';
  }
  
  console.log(`⚠️ getCurrencySymbol: País no reconocido: "${country}", usando € por defecto`);
  return '€'; // Por defecto para otros países
};

/**
 * Combina el código de moneda con su símbolo correspondiente
 * @param country Código de país (ES, MX, AR)
 * @returns Moneda con símbolo (EUR €, MXN $, ARS $)
 */
export const getCurrencyWithSymbol = (country?: string | null): string => {
  const currencyCode = getCurrencyByCountry(country);
  const currencySymbol = getCurrencySymbol(country);
  
  // Formar el string combinado según el formato requerido
  if (currencyCode === 'MXN') {
    return `MXN $`;
  } else if (currencyCode === 'EUR') {
    return `EUR €`;
  } else if (currencyCode === 'ARS') {
    return `ARS $`;
  }
  
  // Para cualquier otra moneda, usar el formato genérico: CÓDIGO SÍMBOLO
  return `${currencyCode} ${currencySymbol}`;
};

/**
 * Formatea un número como moneda basado en el país
 * @param amount Cantidad a formatear
 * @param country Código de país (ES, MX, AR)
 * @returns Cadena formateada con la moneda correcta
 */
export const formatCurrencyByCountry = (amount: number | undefined | null, country?: string | null): string => {
  if (amount === undefined || amount === null) return '0.00';
  
  const currency = getCurrencyByCountry(country);
  const currencySymbol = getCurrencySymbol(country);
  
  console.log(`💲 formatCurrencyByCountry - Monto: ${amount}, País: "${country}", Moneda: ${currency}, Símbolo: ${currencySymbol}`);
  
  // Para simplificar la depuración, usaremos un enfoque directo
  if (currency === 'MXN') {
    const formatted = `${amount.toFixed(2)}`;
    console.log(`💲 Formato MXN: ${formatted}`);
    return formatted;
  }
  
  if (currency === 'ARS') {
    const formatted = `${amount.toFixed(2)}`;
    console.log(`💲 Formato ARS: ${formatted}`);
    return formatted;
  }
  
  // Para EUR y otros
  const formatted = `${amount.toFixed(2)}`;
  console.log(`💲 Formato EUR/Otro: ${formatted}`);
  return formatted;
};

/**
 * Formatea el símbolo de moneda para mostrar después de la cantidad
 * (Por ejemplo: "100 MXN" para México, "100 €" para España)
 * Útil para etiquetas y resúmenes donde se quiere mostrar explícitamente la moneda
 * 
 * @param country Código de país (ES, MX, AR)
 * @returns Símbolo o código de moneda formateado
 */
export const formatCurrencyLabel = (country?: string | null): string => {
  if (!country) return '€'; // Default a EUR si no hay país
  
  // Normalizar el código de país a mayúsculas
  const normalizedCountry = country.toUpperCase();
  
  switch (normalizedCountry) {
    case 'MX':
      return 'MXN'; // Para etiquetas en México, usar "MXN" explícitamente
    case 'AR':
      return 'ARS'; // Para etiquetas en Argentina, usar "ARS" explícitamente
    case 'ES':
    default:
      return '€';
  }
};

/**
 * Formatea una cantidad para mostrar en contextos donde solo necesitamos el número formateado
 * sin el símbolo de moneda (por ejemplo, inputs numéricos)
 * 
 * @param amount Cantidad a formatear
 * @returns Número formateado con 2 decimales
 */
export const formatAmountWithoutCurrency = (amount: number | undefined | null): string => {
  if (amount === undefined || amount === null) return '0.00';
  return amount.toFixed(2);
};

/**
 * Obtiene el locale según el país
 * @param country Código de país (ES, MX, AR)
 * @returns Locale para Intl.NumberFormat
 */
const getLocaleByCountry = (country?: string | null): string => {
  if (!country) return 'es-ES'; // Default a español de España
  
  const normalizedCountry = country.toUpperCase();
  
  switch (normalizedCountry) {
    case 'MX':
      return 'es-MX';
    case 'AR':
      return 'es-AR';
    case 'ES':
    default:
      return 'es-ES';
  }
};
