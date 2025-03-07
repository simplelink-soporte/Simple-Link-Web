# Componente de Resumen de Reserva

Este directorio contiene la implementación del componente de resumen de reserva, que se utiliza para mostrar y gestionar el último paso del proceso de reserva de pistas de pádel.

## Estructura de Componentes

### Componentes Principales

- `SummaryPreview.tsx`: Componente principal que coordina la visualización del resumen.
- `components/SummaryDesktopView.tsx`: Implementación específica para la vista de escritorio que muestra un diseño de dos columnas.
- `components/MobilePaymentContainer.tsx`: Implementación específica para dispositivos móviles.

### Características

- **Vista Responsiva**: Adaptación automática entre vistas móvil y escritorio.
- **Diseño de dos columnas en escritorio**:
  - Columna izquierda: Opciones de método y tipo de pago, cupones.
  - Columna derecha: Resumen de la reserva, detalles y precios.
- **Gestión de pagos**: Integración con diferentes métodos de pago.
- **Aplicación de cupones**: Funcionalidad para aplicar descuentos.

## Hooks Principales

- `useSummaryState`: Gestiona el estado interno del componente.
- `useResponsiveStyles`: Proporciona estilos adaptados al tipo de dispositivo.

## Implementación de Vistas Responsivas

El componente utiliza un enfoque condicional para renderizar diferentes layouts según el tipo de dispositivo:

```jsx
{viewType === 'mobile' ? (
  <MobilePaymentContainer ... />
) : (
  <SummaryDesktopView ... />
)}
```

## Cómo Usar

El componente se puede integrar en cualquier flujo de reserva de la siguiente manera:

```jsx
<SummaryPreview
  field={summaryField}
  theme="light"
  viewType="desktop" // o "mobile"
  onNext={handleNextStep}
  onPrev={handlePrevStep}
  isFirstStep={false}
  isLastStep={true}
  isPublicView={true}
  slug="mi-empresa"
/>
```

## Consideraciones Técnicas

- El componente utiliza contextos para acceder a datos globales como la información de la reserva y la configuración de pagos.
- Se implementan modales para interacciones específicas como selección de métodos de pago y tipos de pago.
- La validación asegura que todos los datos necesarios estén presentes antes de completar la reserva. 