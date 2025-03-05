import * as PublicFields from '@/components/public-form/fields';

import { FormStepField } from '@/types/form-steps';



// Por ahora solo mapeamos el componente TextInput

const componentMap: Record<string, any> = {

  'text': PublicFields.TextInput,

  // Los demás componentes se agregarán cuando estén implementados

  // 'email': PublicFields.EmailInput,

  // 'phone': PublicFields.PhoneInput,

  // 'location': PublicFields.LocationInput,

  // etc...

};



/**

 * Obtiene el componente correspondiente para un tipo de campo

 * @param field Campo del formulario

 * @returns Componente React o null si no existe

 */

export function getFieldComponent(field: FormStepField) {

  const debug = {

    log: (message: string, data?: any) => {

      if (process.env.NODE_ENV === 'development') {

        console.log(`[FieldMapper] ${message}`, data || '');

      }

    }

  };



  debug.log('Getting component for field:', field);

  const component = componentMap[field.type];

  

  if (!component) {

    debug.log(`No component found for field type: ${field.type}`);

  }



  return component;

} 
