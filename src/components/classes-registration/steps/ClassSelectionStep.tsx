"use client"

import { useEffect, useRef, useState, useMemo } from 'react'
import { IconSearch, IconFilter, IconX, IconChevronRight, IconBallTennis, IconSwimming } from '@tabler/icons-react'
import { useClasses } from '../hooks'
import { useClassRegistration } from '../context'
import { LoadingSpinner } from '../shared/LoadingSpinner'
import { ErrorMessage } from '../shared/ErrorMessage'
import { StepContainer } from '../shared/StepContainer'
import { StepHeader, StepSection } from '../shared/StepSection'
import { MobileDrawer } from '../shared/MobileDrawer'
import { cn } from '@/lib/utils'
import type { PublicClass } from '../types/models'
import { useRouter } from 'next/navigation'
import { LinkService } from '../services/linkService'
import { StepNavigation } from '../shared/StepNavigation'

interface Filters {
  type: 'all' | 'single' | 'recurring'
  branchId: string | null
  sport: 'all' | 'racket' | 'swimming'
}

export function ClassSelectionStep() {
  const router = useRouter()
  const { state, selectClass, organization, goToStep, dispatch } = useClassRegistration()
  const { classes = [], isLoading, error } = useClasses(organization?.id || '')
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [selectedClassForMobile, setSelectedClassForMobile] = useState<PublicClass | null>(null)
  const [filters, setFilters] = useState<Filters>({
    type: 'all',
    branchId: null,
    sport: 'all'
  })
  const [companySlug, setCompanySlug] = useState<string | null>(null)
  const skipPackageRef = useRef(false)
  const linkService = new LinkService()
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<string>>(new Set())
  const [isMobile, setIsMobile] = useState(false)

  // Refs para el contenedor y los degradados
  const classesContainerRef = useRef<HTMLDivElement>(null)
  const topGradientRef = useRef<HTMLDivElement>(null)
  const bottomGradientRef = useRef<HTMLDivElement>(null)

  // Actualizar estado de isMobile
  useEffect(() => {
    const checkIfMobile = () => setIsMobile(window.innerWidth < 640);
    
    // Verificar inicialmente
    checkIfMobile();
    
    // Escuchar cambios de tamaño
    window.addEventListener('resize', checkIfMobile);
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  // Efecto para posicionar los degradados 
  useEffect(() => {
    if (isMobile) {
      // En móvil usamos posición fija para los gradientes directamente con CSS
      return;
    }

    // Solo para desktop, calculamos posiciones dinámicas
    const updateGradientPositions = () => {
      if (!classesContainerRef.current || !topGradientRef.current || !bottomGradientRef.current) return;
      
      const containerRect = classesContainerRef.current.getBoundingClientRect();
      
      // Configurar degradado superior - solo para desktop
      const topGradient = topGradientRef.current;
      topGradient.style.position = 'fixed';
      topGradient.style.top = `${containerRect.top}px`;
      topGradient.style.left = `${containerRect.left}px`;
      topGradient.style.width = `${containerRect.width}px`;
      topGradient.style.zIndex = '10';
      
      // Configurar degradado inferior - solo para desktop
      const bottomGradient = bottomGradientRef.current;
      bottomGradient.style.position = 'fixed';
      bottomGradient.style.bottom = `${window.innerHeight - containerRect.bottom}px`;
      bottomGradient.style.left = `${containerRect.left}px`;
      bottomGradient.style.width = `${containerRect.width}px`;
      bottomGradient.style.zIndex = '10';
    };
    
    // Actualizar las posiciones inicialmente
    updateGradientPositions();
    
    // Configurar el observador para detectar cambios de tamaño
    const resizeObserver = new ResizeObserver(updateGradientPositions);
    if (classesContainerRef.current) {
      resizeObserver.observe(classesContainerRef.current);
    }
    
    // Escuchar el evento de scroll para actualizar posiciones
    const handleScroll = () => {
      requestAnimationFrame(updateGradientPositions);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', updateGradientPositions);
    
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', updateGradientPositions);
    };
  }, [isMobile]);

  // Efecto para obtener el slug de la empresa
  useEffect(() => {
    const fetchCompanySlug = async () => {
      if (organization?.id) {
        const link = await linkService.getCompanyLink(organization.id)
        if (link?.slug) {
          setCompanySlug(link.slug)
        }
      }
    }
    fetchCompanySlug()
  }, [organization?.id])

  // Obtener sedes únicas de las clases
  const uniqueBranches = useMemo(() => {
    const branches = new Map()
    classes.forEach(classItem => {
      if (classItem.branchInfo) {
        branches.set(classItem.branchInfo.id, classItem.branchInfo)
      }
    })
    return Array.from(branches.values())
  }, [classes])

  // Filtrar clases
  const filteredClasses = useMemo(() => {
    // Fecha actual para comparar con endDate
    const currentDate = new Date();
    
    return classes.filter(classItem => {
      // Primero filtramos por visibilidad pública
      const isPublic = classItem.visibility === 'public';
      if (!isPublic) return false;

      // Verificamos si la clase ha vencido (tiene endDate y ya pasó)
      const isExpired = classItem.schedule.endDate 
        ? new Date(classItem.schedule.endDate) < currentDate 
        : false;
      
      // No mostrar clases vencidas
      if (isExpired) return false;

      // Luego aplicamos los demás filtros
      const matchesSearch = searchQuery === '' || 
        classItem.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        classItem.description.toLowerCase().includes(searchQuery.toLowerCase());

      // Filtrar por tipo de clase
      const matchesType = filters.type === 'all' || 
        (filters.type === 'single' && !classItem.is_recurring) ||
        (filters.type === 'recurring' && classItem.is_recurring);

      // Filtrar por sede
      const matchesBranch = !filters.branchId || 
        classItem.branchInfo?.id === filters.branchId;

      // Filtrar por deporte
      const matchesSport = filters.sport === 'all' || 
        classItem.sport === filters.sport;

      return matchesSearch && matchesType && matchesBranch && matchesSport;
    });
  }, [classes, searchQuery, filters]);

  // Efecto para redirigir si no hay paquete seleccionado - ahora desactivado
  useEffect(() => {
    // Este efecto ya no redirecciona a la selección de paquetes
    // Establecemos skipPackageSelection en true para evitar cualquier otra redirección
    if (!state.skipPackageSelection) {
      dispatch({ type: 'SET_SKIP_PACKAGE', payload: true });
    }
  }, [state.skipPackageSelection, dispatch]);

  // Hook para capturar y redirigir todos los eventos de scroll
  useEffect(() => {
    // Referencia al contenedor de clases
    const getContainer = () => document.getElementById('classes-container');
    
    // Garantizamos que los manejadores se añaden cuando el DOM está listo
    setTimeout(() => {
      const container = getContainer();
      if (!container) return;
      
      // Aplicar estilos para ocultar scrollbar
      container.style.cssText += '; -webkit-scrollbar: none;';
      
      // Bloqueamos el scroll en body y html para forzar nuestro manejador
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      
      // Función de captura de eventos wheel - se ejecuta en la fase de captura
      const handleWheelCapture = (e: WheelEvent) => {
        // Siempre prevenimos el comportamiento predeterminado excepto en inputs
        const target = e.target as HTMLElement;
        const isInputField = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
        
        if (!isInputField) {
          e.preventDefault();
          e.stopPropagation();
          
          const container = getContainer();
          if (container) {
            // Aplicamos velocidad mejorada
            const scrollFactor = 1.5;
            container.scrollBy({
              top: e.deltaY * scrollFactor,
              behavior: 'smooth'
            });
          }
        }
      };
      
      // Usamos la fase de captura (true) para interceptar antes que otros manejadores
      window.addEventListener('wheel', handleWheelCapture, { 
        passive: false,
        capture: true 
      });
      
      // Anclamos la página al inicio para evitar scroll nativo
      window.scrollTo(0, 0);
      
      // Limpieza
      return () => {
        window.removeEventListener('wheel', handleWheelCapture, { capture: true });
        document.body.style.overflow = '';
        document.documentElement.style.overflow = '';
      };
    }, 100); // Pequeño retraso para asegurar que el DOM está listo
  }, []);

  const handleClassClick = async (classData: PublicClass) => {
    try {
      // En móvil, mostramos el drawer
      if (window.innerWidth < 640) {
        setSelectedClassForMobile(classData)
        return
      }
      
      // En desktop, seleccionamos la clase y navegamos a la URL con el slug/id
      selectClass(classData)
      
      // Redireccionar a la URL con el formato /clases/slug/classId
      if (companySlug) {
        const newUrl = `/clases/${companySlug}/${classData.id}`
        await router.push(newUrl)
      } else {
        // Si no tenemos el slug por alguna razón, usamos goToStep como fallback
        goToStep('session')
      }
    } catch (error) {
      console.error('Error al seleccionar la clase:', error)
    }
  }

  const handleConfirmMobileSelection = async () => {
    if (selectedClassForMobile) {
      selectClass(selectedClassForMobile)
      setSelectedClassForMobile(null)
      
      // Redireccionar a la URL con el formato /clases/slug/classId
      if (companySlug) {
        const newUrl = `/clases/${companySlug}/${selectedClassForMobile.id}`
        await router.push(newUrl)
      } else {
        // Si no tenemos el slug por alguna razón, usamos goToStep como fallback
        goToStep('session')
      }
    }
  }

  const handleNext = async () => {
    if (state.selectedClass && companySlug) {
      try {
        // Solo realizamos la navegación, el cambio de paso se manejará por la URL
        const newUrl = `/clases/${companySlug}/${state.selectedClass.id}`
        await router.push(newUrl)
      } catch (error) {
        console.error('Error durante la navegación:', error)
      }
    }
  }

  const toggleDescription = (classId: string) => {
    setExpandedDescriptions(prev => {
      const next = new Set(prev)
      if (next.has(classId)) {
        next.delete(classId)
      } else {
        next.add(classId)
      }
      return next
    })
  }

  // Estado de carga inicial
  if (isLoading && !classes.length) {
    return (
      <StepContainer stepId="class-loading">
        <StepSection>
          <div className="text-center space-y-4">
            <LoadingSpinner />
            <p className="text-sm text-gray-500">
              Cargando clases disponibles...
            </p>
          </div>
        </StepSection>
      </StepContainer>
    )
  }

  // Estado de error
  if (error) {
    return (
      <StepContainer stepId="class-error">
        <StepSection>
          <ErrorMessage error={{
            type: 'LOAD_ERROR',
            message: 'Error al cargar las clases disponibles'
          }} />
        </StepSection>
      </StepContainer>
    )
  }

  // Estado sin clases disponibles
  if (!classes || classes.length === 0) {
    return (
      <StepContainer stepId="no-classes">
        <StepSection>
          <div className="text-center space-y-4">
            <div className="bg-yellow-50 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-yellow-800 mb-2">
                No hay clases disponibles
              </h2>
              <p className="text-sm text-yellow-700">
                En este momento no hay clases disponibles. Por favor, intenta más tarde.
              </p>
            </div>
          </div>
        </StepSection>
      </StepContainer>
    )
  }

  return (
    <StepContainer stepId="class-selection" centered={false} className="px-4 sm:px-[var(--padding-container-tablet)] lg:px-[var(--padding-container-desktop)]">
      <div className="w-full max-w-3xl mx-auto h-full flex flex-col overflow-hidden">
        <div className="space-y-6 flex-none pt-20 sm:pt-8 px-2 sm:px-0">
          {/* Encabezado */}
          <div className="text-left space-y-1.5 px-2 sm:px-0">
            <h2 className="text-2xl font-semibold text-gray-900">
              Elige tu clase
            </h2>
            <p className="text-sm text-gray-500">
              Selecciona la clase a la que deseas asistir
            </p>
          </div>

          {/* Barra de búsqueda y filtros */}
          <div className="space-y-4">
            <div className="flex gap-3">
              {/* Barra de búsqueda */}
              <div className="flex-1 relative">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  <IconSearch className="w-5 h-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar clases..."
                  className={cn(
                    "w-full pl-10 pr-4 py-2.5",
                    "bg-white border border-gray-200",
                    "rounded-lg text-sm text-gray-900",
                    "placeholder:text-gray-500",
                    "focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500",
                    "transition-colors duration-200"
                  )}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute inset-y-0 right-3 flex items-center"
                  >
                    <IconX className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                  </button>
                )}
              </div>

              {/* Botón de filtros */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={cn(
                  "p-2.5 rounded-lg",
                  "border border-gray-200",
                  "flex items-center justify-center",
                  "transition-colors duration-200",
                  showFilters 
                    ? "bg-gray-100 text-gray-900 border-gray-300"
                    : "bg-white text-gray-700 hover:border-gray-300"
                )}
                aria-label="Mostrar filtros"
              >
                <IconFilter className="w-5 h-5" />
              </button>
            </div>

            {/* Panel de filtros */}
            {showFilters && (
              <div className="p-4 bg-white border border-gray-200 rounded-lg space-y-4">
                {/* Tipo de clase */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-900">
                    Tipo de clase
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setFilters(prev => ({ ...prev, type: 'all' }))}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-sm",
                        "transition-colors duration-200",
                        filters.type === 'all'
                          ? "bg-gray-900 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      )}
                    >
                      Todas
                    </button>
                    <button
                      onClick={() => setFilters(prev => ({ ...prev, type: 'single' }))}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-sm",
                        "transition-colors duration-200",
                        filters.type === 'single'
                          ? "bg-gray-900 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      )}
                    >
                      Clase única
                    </button>
                    <button
                      onClick={() => setFilters(prev => ({ ...prev, type: 'recurring' }))}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-sm",
                        "transition-colors duration-200",
                        filters.type === 'recurring'
                          ? "bg-gray-900 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      )}
                    >
                      Clase recurrente
                    </button>
                  </div>
                </div>

                {/* Filtro por sede */}
                {uniqueBranches.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-900">
                      Sede
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setFilters(prev => ({ ...prev, branchId: null }))}
                        className={cn(
                          "px-3 py-1.5 rounded-full text-sm",
                          "transition-colors duration-200",
                          !filters.branchId
                            ? "bg-gray-900 text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        )}
                      >
                        Todas las sedes
                      </button>
                      {uniqueBranches.map(branch => (
                        <button
                          key={branch.id}
                          onClick={() => setFilters(prev => ({ ...prev, branchId: branch.id }))}
                          className={cn(
                            "px-3 py-1.5 rounded-full text-sm",
                            "transition-colors duration-200",
                            filters.branchId === branch.id
                              ? "bg-gray-900 text-white"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          )}
                        >
                          {branch.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Filtro por deporte */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-900">
                    Deporte
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setFilters(prev => ({ ...prev, sport: 'all' }))}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-sm",
                        "transition-colors duration-200",
                        filters.sport === 'all'
                          ? "bg-gray-900 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      )}
                    >
                      Todos los deportes
                    </button>
                    <button
                      onClick={() => setFilters(prev => ({ ...prev, sport: 'racket' }))}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-sm",
                        "transition-colors duration-200",
                        filters.sport === 'racket'
                          ? "bg-gray-900 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      )}
                    >
                      Raqueta
                    </button>
                    <button
                      onClick={() => setFilters(prev => ({ ...prev, sport: 'swimming' }))}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-sm",
                        "transition-colors duration-200",
                        filters.sport === 'swimming'
                          ? "bg-gray-900 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      )}
                    >
                      Natación
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Lista de clases filtradas - Con scroll y margen inferior */}
          <div 
            className="space-y-4 overflow-y-auto pr-0 sm:pr-2 pb-12 relative flex-1" 
            id="classes-container"
            ref={classesContainerRef}
            style={{
              height: 'auto',
              maxHeight: 'calc(80vh - 80px)', // Reducimos 80px para dejar margen inferior
              minHeight: isMobile ? '450px' : '550px', // Altura menor en móvil
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              marginBottom: isMobile ? '120px' : '100px', // Más margen en móvil
              padding: isMobile ? '0 10px 30px 10px' : '0' // Más padding inferior en móvil
            }}
          >
            {/* Gradientes para escritorio controlados por JavaScript */}
            {!isMobile && (
              <>
                <div 
                  ref={topGradientRef}
                  className="h-8 bg-gradient-to-b from-white to-transparent pointer-events-none">
                </div>
                
                <div 
                  ref={bottomGradientRef}
                  className="h-8 bg-gradient-to-t from-white to-transparent pointer-events-none">
                </div>
              </>
            )}
            
            {/* Gradientes para móvil con CSS fijo */}
            {isMobile && (
              <>
                <div 
                  className="fixed top-[120px] left-0 right-0 h-16 bg-gradient-to-b from-white via-white to-transparent pointer-events-none z-30"
                  style={{ opacity: 0.98 }}
                ></div>
                
                <div 
                  className="fixed bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white via-white to-transparent pointer-events-none z-30"
                  style={{ opacity: 0.98 }}
                ></div>
              </>
            )}
            
            {filteredClasses.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-gray-500">
                  No se encontraron clases con los filtros seleccionados
                </p>
              </div>
            ) : (
              filteredClasses.map((classItem, index) => {
                const isSelected = state.selectedClass?.id === classItem.id
                const isDescriptionExpanded = expandedDescriptions.has(classItem.id)
                
                return (
                  <div
                    key={classItem.id}
                    className={cn(
                      "w-full rounded-xl",
                      "border",
                      isSelected 
                        ? "border-gray-400"
                        : "border-gray-200 hover:border-gray-300",
                      "transition-all duration-200",
                      "relative overflow-hidden",
                      "sm:h-[180px] md:h-[200px]", // Altura reducida para desktop
                      "cursor-pointer", // Añadir cursor pointer para indicar que es clickable
                      "bg-transparent" // Sin fondo
                    )}
                    onClick={() => handleClassClick(classItem)} // Hacer todo el componente clickable
                  >
                    <div className="flex flex-col sm:flex-row h-full">
                      {/* Contenido con padding consistente */}
                      <div className="flex-1 min-w-0 p-4 sm:p-4 md:p-5 flex flex-col justify-between">
                        <div className="space-y-3 sm:space-y-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="space-y-1 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-base font-medium text-gray-900 truncate">
                                  {classItem.title}
                                </h3>
                                
                                {/* Indicador del tipo de deporte */}
                                <span className={cn(
                                  "text-[10px] px-1.5 py-0.5 rounded-full flex items-center whitespace-nowrap",
                                  classItem.sport === 'racket'
                                    ? "bg-orange-50 text-orange-700 border border-orange-100" 
                                    : "bg-blue-50 text-blue-700 border border-blue-100"
                                )}>
                                  {classItem.sport === 'racket' 
                                    ? <><IconBallTennis className="h-2.5 w-2.5 mr-0.5" stroke={2} /> Raqueta</>
                                    : <><IconSwimming className="h-2.5 w-2.5 mr-0.5" stroke={2} /> Natación</>
                                  }
                                </span>
                              </div>
                              <p className="text-sm text-gray-600">
                                {classItem.is_recurring ? 'Clase recurrente' : 'Clase única'}
                              </p>
                            </div>

                            {/* El botón "Seleccionar" se ha eliminado ya que todo el componente es clickable */}
                          </div>

                          {/* Descripción con "ver más" en desktop */}
                          {classItem.description && (
                            <div className="hidden sm:block">
                              <p className={cn(
                                "text-sm text-gray-500",
                                !isDescriptionExpanded && "line-clamp-2"
                              )}>
                                {classItem.description}
                              </p>
                              {classItem.description.length > 150 && (
                                <button
                                  onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    toggleDescription(classItem.id)
                                  }}
                                  className="mt-1 text-xs font-light text-gray-900 hover:text-gray-700 transition-colors"
                                >
                                  {isDescriptionExpanded ? 'Ver menos' : 'Ver más'}
                                </button>
                              )}
                            </div>
                          )}

                          {/* Información principal */}
                          <div className="flex flex-wrap gap-2 sm:gap-3 text-sm">
                            {classItem.instructor && (
                              <div className="flex items-center gap-1.5">
                                <span className="text-gray-500">Profesor:</span>
                                <span className="text-gray-700">{classItem.instructor}</span>
                              </div>
                            )}
                            {classItem.branchInfo && (
                              <>
                                <span className="text-gray-300">•</span>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-gray-500">Sede:</span>
                                  <span className="text-gray-700">{classItem.branchInfo.name}</span>
                                </div>
                              </>
                            )}
                          </div>

                          {/* Días de clase */}
                          <div className="flex items-center gap-1.5 text-sm">
                            <span className="text-gray-500">Días:</span>
                            <span className="text-gray-700">
                              {classItem.schedule.daysOfWeek.join(', ')}
                            </span>
                          </div>
                        </div>

                        {/* Área clickeable para móvil */}
                        <button
                          onClick={() => handleClassClick(classItem)}
                          className="sm:hidden w-full h-full absolute inset-0"
                          aria-label={`Seleccionar ${classItem.title}`}
                        />
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Mobile Drawer */}
        <MobileDrawer
          isOpen={!!selectedClassForMobile}
          onClose={() => setSelectedClassForMobile(null)}
          title="Detalles de la clase"
          className="px-0 py-0"
          footer={
            selectedClassForMobile && (
              <button
                onClick={handleConfirmMobileSelection}
                className={cn(
                  "w-full px-4 py-3 rounded-xl",
                  "bg-gray-900 text-white",
                  "text-sm font-medium",
                  "transition-all duration-200",
                  "hover:bg-gray-800",
                  "flex items-center justify-center gap-2"
                )}
              >
                <span>Seleccionar esta clase</span>
                <IconChevronRight size={16} className="text-white/70" />
              </button>
            )
          }
        >
          {selectedClassForMobile && (
            <div className="space-y-6">
              {/* Información de la clase */}
              <div className="space-y-4">
                {/* Título */}
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-xl font-semibold text-gray-900">
                    {selectedClassForMobile.title}
                  </h3>
                  
                  {/* Indicador del tipo de deporte */}
                  <span className={cn(
                    "text-xs px-2 py-0.5 rounded-full flex items-center",
                    selectedClassForMobile.sport === 'racket'
                      ? "bg-orange-50 text-orange-700 border border-orange-100" 
                      : "bg-blue-50 text-blue-700 border border-blue-100"
                  )}>
                    {selectedClassForMobile.sport === 'racket' 
                      ? <><IconBallTennis className="h-3 w-3 mr-1" stroke={2} /> Raqueta</>
                      : <><IconSwimming className="h-3 w-3 mr-1" stroke={2} /> Natación</>
                    }
                  </span>
                </div>

                {/* Descripción */}
                {selectedClassForMobile.description && (
                  <div>
                    <p className="text-gray-600 text-sm">
                      {expandedDescriptions.has(selectedClassForMobile.id)
                        ? selectedClassForMobile.description
                        : selectedClassForMobile.description.length > 250
                          ? selectedClassForMobile.description.slice(0, 250) + '...'
                          : selectedClassForMobile.description
                      }
                    </p>
                    {selectedClassForMobile.description.length > 250 && (
                      <button
                        onClick={() => toggleDescription(selectedClassForMobile.id)}
                        className="mt-1 text-xs font-medium text-gray-900 hover:text-gray-700 transition-colors"
                      >
                        {expandedDescriptions.has(selectedClassForMobile.id) ? 'Ver menos' : 'Ver más'}
                      </button>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap gap-3 text-sm">
                  <span className="text-gray-600">
                    {selectedClassForMobile.is_recurring ? 'Clase recurrente' : 'Clase única'}
                  </span>
                  {selectedClassForMobile.branchInfo && (
                    <>
                      <span className="text-gray-300">•</span>
                      <span className="text-gray-600">
                        Sede: {selectedClassForMobile.branchInfo.name}
                      </span>
                    </>
                  )}
                </div>

                {/* Días de clase */}
                <div className="pt-4 border-t border-gray-100">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">
                    Días de clase
                  </h4>
                  <p className="text-sm text-gray-600">
                    {selectedClassForMobile.schedule.daysOfWeek.join(', ')}
                  </p>
                </div>

                {/* Instructor */}
                {selectedClassForMobile.instructor && (
                  <div className="pt-4 border-t border-gray-100">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">
                      Instructor
                    </h4>
                    <p className="text-sm text-gray-600">
                      {selectedClassForMobile.instructor}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </MobileDrawer>

        {/* Los botones de navegación se han eliminado para mejorar la experiencia de usuario */}
      </div>
    </StepContainer>
  )
}