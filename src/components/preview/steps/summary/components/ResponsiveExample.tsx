import { WithResponsiveViewProps, withResponsiveView } from '../hoc/withResponsiveView';

interface ExampleComponentProps extends WithResponsiveViewProps {
  title: string;
  description: string;
}

function ExampleComponent({ title, description, viewType, theme }: ExampleComponentProps) {
  return (
    <div>
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  );
}

// Aplicar el HOC con opciones específicas
export const ResponsiveExample = withResponsiveView(ExampleComponent, {
  styleKey: 'container', // Usa los estilos predefinidos para container
  mobileClassName: 'text-sm', // Clases adicionales para móvil
  desktopClassName: 'text-base' // Clases adicionales para desktop
});

// Ejemplo de uso:
/*
  <ResponsiveExample
    viewType="mobile"
    theme="light"
    title="Ejemplo Responsive"
    description="Este es un ejemplo de componente con capacidades responsive"
  />
*/ 