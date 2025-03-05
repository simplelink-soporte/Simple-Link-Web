import { FormResponse } from '@/types/forms/responses';

class FormResponsesService {
  private static STORAGE_KEY = 'form_responses';

  static async saveResponse(formId: string, response: FormResponse): Promise<void> {
    const responses = await this.getResponses(formId);
    const newResponse = {
      ...response,
      id: crypto.randomUUID(),
      metadata: {
        ...response.metadata,
        userAgent: navigator.userAgent,
        completedAt: new Date()
      },
      createdAt: new Date()
    };

    responses.push(newResponse);
    localStorage.setItem(
      `${this.STORAGE_KEY}_${formId}`, 
      JSON.stringify(responses)
    );

    // Actualizar analytics
    await this.updateFormAnalytics(formId);
  }

  static async getResponses(formId: string): Promise<FormResponse[]> {
    const stored = localStorage.getItem(`${this.STORAGE_KEY}_${formId}`);
    return stored ? JSON.parse(stored) : [];
  }

  private static async updateFormAnalytics(formId: string): Promise<void> {
    // Aquí actualizaríamos las estadísticas del formulario
    // Por ahora solo incrementamos el contador de submissions
    const forms = JSON.parse(localStorage.getItem('published_forms') || '[]');
    const formIndex = forms.findIndex((f: any) => f.id === formId);
    
    if (formIndex >= 0) {
      forms[formIndex].analytics.submissions += 1;
      forms[formIndex].analytics.lastSubmission = new Date();
      localStorage.setItem('published_forms', JSON.stringify(forms));
    }
  }
}

export default FormResponsesService; 