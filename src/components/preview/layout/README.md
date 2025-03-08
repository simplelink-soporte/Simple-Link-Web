# Componentes de Navegación

Esta carpeta contiene los componentes de navegación para formularios y pasos tanto en vista móvil como desktop.

## Componente principal

### NavigationControls

Componente unificado que proporciona controles de navegación consistentes para cualquier tipo de vista.

```tsx
<NavigationControls 
  theme="light" 
  viewType="desktop"
  onNext={handleNext}
  onPrev={handlePrev}
  isNextDisabled={false}
  isPublicView={true}
  nextLabel="Siguiente"
  prevLabel="Anterior"
  showNextButton={true}
  gap={8}
/>
```

**Propiedades:**
- `theme`: 'light' | 'dark' - El tema de color.
- `viewType`: 'mobile' | 'desktop' - El tipo de vista.
- `onNext`: () => void - Función para avanzar al siguiente paso.
- `onPrev`: () => void - Función para volver al paso anterior.
- `isNextDisabled`: boolean - Si el botón de siguiente debe estar deshabilitado.
- `isPublicView`: boolean - Si está en modo de vista pública.
- `className`: string - Clases CSS adicionales.
- `nextLabel`: string - Texto del botón de siguiente.
- `prevLabel`: string - Texto del botón de anterior.
- `showNextButton`: boolean - Si se debe mostrar el botón de siguiente.
- `variant`: 'shifts' | 'default' - Variante de estilo para móvil.
- `gap`: number - Separación entre botones en píxeles.

## Características de diseño

- **Simplificado**: Un solo componente maneja todas las necesidades de navegación
- **Botones centrados**: Los botones siempre aparecen centrados en la pantalla
- **Botones alargados**: Para desktop, los botones son más anchos (min-width 180px y 220px)
- **Separación configurable**: Se puede personalizar la separación entre botones
- **Botón único en primer paso**: En el primer paso solo se muestra el botón "Siguiente"
- **Adaptabilidad responsiva**: El diseño se ajusta automáticamente según el tipo de vista
- **Sin iconos**: Diseño limpio sin flechas ni iconos

## Componentes para móvil

Para la vista móvil se siguen usando dos componentes específicos para compatibilidad con código existente:

- `MobileNavigation` - Botón de navegación "atrás" para móvil
- `MobileNextButton` - Botón de navegación "siguiente" para móvil

Sin embargo, estos componentes no son necesarios al usar `NavigationControls`, que maneja automáticamente la visualización correcta según el tipo de vista.

## Uso con contenedores

El componente se integra perfectamente con los contenedores principales:

### Con PreviewContainer

```tsx
<PreviewContainer
  theme={theme}
  viewType={viewType}
  onNext={handleNext}
  onPrev={handlePrev}
  isFirstStep={isFirstStep}
  isNextDisabled={!isValid}
  isPublicView={true}
>
  {/* Contenido del paso */}
</PreviewContainer>
```

### Con FormContainer

```tsx
<FormContainer
  theme={theme}
  viewType={viewType}
  onNext={handleNext}
  onPrev={handlePrev}
  isFirstStep={currentStep === 0}
  isLastStep={currentStep === totalSteps - 1}
  hideNavigation={false}
  isNextDisabled={!isValid}
  nextLabel="Continuar"
  currentStep={currentStep}
  showNextButton={true}
>
  {/* Contenido del formulario */}
</FormContainer>
``` 