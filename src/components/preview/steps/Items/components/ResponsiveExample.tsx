import { WithResponsiveViewProps, withResponsiveView } from '../hoc/withResponsiveView';

interface ExampleComponentProps extends WithResponsiveViewProps {
  title: string;
  description: string;
}

function ExampleComponent({ title, description, viewType, theme }: ExampleComponentProps) {
  return (
    <div className="space-y-2">
      <h2 className={`text-${viewType === 'mobile' ? 'lg' : 'xl'} font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
        {title}
      </h2>
      <p className={`text-${viewType === 'mobile' ? 'sm' : 'base'} ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
        {description}
      </p>
    </div>
  );
}

// Aplicar el HOC con opciones específicas
export const ResponsiveExample = withResponsiveView(ExampleComponent, {
  styleKey: 'container', // Usa los estilos predefinidos para container
  mobileClassName: 'p-4', // Clases adicionales para móvil
  desktopClassName: 'p-6' // Clases adicionales para desktop
});

// Ejemplo de uso:
/*
  <ResponsiveExample
    viewType="mobile"
    theme="light"
    title="Ejemplo de Items Responsive"
    description="Este es un ejemplo de componente con capacidades responsive para la sección de Items"
  />
*/ 