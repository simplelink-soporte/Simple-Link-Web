export interface FormResponse {

  id?: string;

  formId: string;

  responses: Record<string, any>;

  metadata?: {

    userAgent?: string;

    ipAddress?: string;

    completedAt?: Date;

  };

  createdAt?: Date;

}



export interface FormFieldResponse {

  fieldId: string;

  value: any;

  isValid: boolean;

  error?: string;

} 
