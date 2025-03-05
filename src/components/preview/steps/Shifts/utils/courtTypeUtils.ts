export function getCourtTypeLabel(type: string): string {
  const courtTypes: Record<string, string> = {
    'indoor': 'Interior',
    'outdoor': 'Exterior',
    'covered': 'Cubierta',
    'all': 'Todas'
  };

  return courtTypes[type] || type;
} 