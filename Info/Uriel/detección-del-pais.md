Análisis para centralizar la detección de moneda según el país
He analizado los archivos y tu propuesta para centralizar la detección de moneda según el país. Esta propuesta tiene sentido y te explicaré cómo implementarla de manera eficiente.

Situación actual
Actualmente:

En SummaryStep.tsx hay una función getCurrencySymbol que mapea países a símbolos
El país se obtiene a través del hook usePaymentGatewayByCountry que realiza consultas a la base de datos
Esta detección se realiza múltiples veces y no está centralizada
Solución propuesta
Tu idea de obtener el país desde el link del formulario y almacenarlo en el contexto es excelente por varias razones:

Eficiencia: Evita múltiples consultas a la base de datos
Consistencia: Garantiza que el símbolo de moneda sea el mismo en toda la aplicación
Rendimiento: Reduce la carga del servidor al realizar la consulta una sola vez
Plan de implementación
1. Modificar publish-service.ts para obtener y retornar el país
typescript
CopyInsert
async getBySlug(slug: string): Promise<PublishedForm> {
  try {
    // Código existente para obtener el link...
    
    // Obtener el país de la empresa
    const { data: empresaData, error: empresaError } = await this.supabase
      .from('empresas')
      .select('country')
      .eq('id', link.empresa_id)
      .single();
      
    if (empresaError) {
      FormPublishService.debug.error('Error al consultar país de la empresa:', empresaError);
    }
    
    // Añadir el país a los metadatos del formulario
    const publishedForm: PublishedForm = {
      // Propiedades existentes...
      metadata: {
        createdBy: link.settings?.created_by,
        updatedBy: link.settings?.updated_by,
        country: empresaData?.country || null // Añadir país a los metadatos
      },
      // Otras propiedades...
    };
    
    return publishedForm;
  } catch (error) {
    // Manejo de errores...
  }
}
2. Actualizar la interfaz PublishedForm para incluir el país
En src/types/forms/publish.ts:

typescript
CopyInsert
export interface PublishedForm {
  // Propiedades existentes...
  metadata?: {
    createdBy?: string;
    updatedBy?: string;
    country?: string; // Añadir propiedad de país
  };
  // Otras propiedades...
}
3. Modificar ShiftFormContext.tsx para almacenar el país
Primero, actualiza la interfaz del estado:

typescript
CopyInsert
interface ShiftFormState {
  // Propiedades existentes...
  country: string | null; // Nueva propiedad para almacenar el país
  // Otras propiedades...
}

// Estado inicial
const initialState: ShiftFormState = {
  // Propiedades existentes...
  country: null,
  // Otras propiedades...
};
Luego, añade una nueva acción al reducer:

typescript
CopyInsert
type ShiftFormAction =
  // Acciones existentes...
  | { type: 'SET_COUNTRY'; payload: string | null }
  // Otras acciones...

// En el reducer
case 'SET_COUNTRY':
  return { ...state, country: action.payload };
4. Inicializar el país en el provider
En ClientSideShiftProvider:

typescript
CopyInsert
// En el useEffect inicial
useEffect(() => {
  // Código existente...
  
  // Inicializar país desde los metadatos del formulario
  if (formData?.metadata?.country) {
    dispatch({ type: 'SET_COUNTRY', payload: formData.metadata.country });
    console.log('📍 [ShiftFormContext] País detectado:', formData.metadata.country);
  }
  
  // Resto del código...
}, [formData]);
5. Crear un hook o utilidad para obtener el símbolo de moneda
En un nuevo archivo src/utils/currency.ts:

typescript
CopyInsert
// Función centralizada para determinar el símbolo de moneda según el país
export const getCurrencySymbol = (country: string | null): string => {
  if (!country) return '€'; // Valor por defecto
  
  const countryLower = country.toLowerCase();
  switch (countryLower) {
    case 'mexico':
    case 'méxico':
      return '$'; // Peso mexicano
    case 'argentina':
      return '$'; // Peso argentino
    case 'españa':
    case 'espana':
    case 'spain':
      return '€'; // Euro
    default:
      return '€'; // Valor por defecto para otros países
  }
};

// Función para obtener el código de moneda (si se necesita en el futuro)
export const getCurrencyCode = (country: string | null): string => {
  if (!country) return 'EUR'; // Valor por defecto
  
  const countryLower = country.toLowerCase();
  switch (countryLower) {
    case 'mexico':
    case 'méxico':
      return 'MXN';
    case 'argentina':
      return 'ARS';
    case 'españa':
    case 'espana':
    case 'spain':
      return 'EUR';
    default:
      return 'EUR';
  }
};
6. Modificar componentes para usar el país desde el contexto
En SummaryStep.tsx:

typescript
CopyInsert
import { useShiftForm } from '../../context/ShiftFormContext';
import { getCurrencySymbol } from '@/utils/currency';

export function SummaryStep() {
  const { state } = useShiftForm();
  
  // Usar el país desde el contexto
  const currencySymbol = useMemo(() => getCurrencySymbol(state.country), [state.country]);
  
  // Resto del componente...
}