"use client"

import { useEffect, useRef, useState, useMemo } from 'react'
import { IconSearch, IconFilter, IconX, IconChevronRight } from '@tabler/icons-react'
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
import Image from 'next/image'

interface Filters {
  type: 'all' | 'single' | 'recurring'
  branchId: string | null
}

const CLASS_IMAGES = [
  '/images/Miroodles - Sticker 3.png',
  '/images/Miroodles - Sticker 2.png'
]

function getClassImage(index: number): string {
  return CLASS_IMAGES[index % CLASS_IMAGES.length]
}

export function ClassSelectionStep() {
  const router = useRouter()
  const { state, selectClass, organization, goToStep } = useClassRegistration()
  const { classes = [], isLoading, error } = useClasses(organization?.id || '')
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [selectedClassForMobile, setSelectedClassForMobile] = useState<PublicClass | null>(null)
  const [filters, setFilters] = useState<Filters>({
    type: 'all',
    branchId: null
  })
  const [companySlug, setCompanySlug] = useState<string | null>(null)
  const skipPackageRef = useRef(false)
  const linkService = new LinkService()
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<string>>(new Set())

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
    return classes.filter(classItem => {
      // Primero filtramos por visibilidad pública
      const isPublic = classItem.visibility === 'public'
      if (!isPublic) return false

      // Luego aplicamos los demás filtros
      const matchesSearch = searchQuery === '' || 
        classItem.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        classItem.description.toLowerCase().includes(searchQuery.toLowerCase())

      // Filtrar por tipo de clase
      const matchesType = filters.type === 'all' || 
        (filters.type === 'single' && !classItem.is_recurring) ||
        (filters.type === 'recurring' && classItem.is_recurring)

      // Filtrar por sede
      const matchesBranch = !filters.branchId || 
        classItem.branchInfo?.id === filters.branchId

      return matchesSearch && matchesType && matchesBranch
    })
  }, [classes, searchQuery, filters])

  // Efecto para redirigir si no hay paquete seleccionado
  useEffect(() => {
    // Solo redirigir si:
    // - No hay paquete seleccionado
    // - No es usuario invitado
    // - No ha decidido explícitamente saltar la selección de paquete
    if (!state.selectedPackage && !state.isGuest && !state.skipPackageSelection) {
      // La redirección ahora se maneja a través de la navegación principal
      return
    }
  }, [state.selectedPackage, state.isGuest, state.skipPackageSelection])

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

  const handleClassClick = async (classData: PublicClass) => {
    try {
      // En móvil, mostramos el drawer
      if (window.innerWidth < 640) {
        setSelectedClassForMobile(classData)
        return
      }
      
      // En desktop, solo seleccionamos la clase
      selectClass(classData)
    } catch (error) {
      console.error('Error al seleccionar la clase:', error)
    }
  }

  const handleConfirmMobileSelection = () => {
    if (selectedClassForMobile) {
      selectClass(selectedClassForMobile)
      setSelectedClassForMobile(null)
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
    <StepContainer stepId="class-selection" centered={false}>
      <div className="w-full max-w-3xl mx-auto px-5 sm:px-6 lg:px-0">
        <div className="space-y-6">
          {/* Encabezado */}
          <div className="text-left space-y-1.5">
            <h2 className="text-xl font-semibold text-gray-900">
              Elige tu clase
            </h2>
            <p className="text-sm text-gray-600">
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
                  "px-4 py-2.5 rounded-lg",
                  "border border-gray-200",
                  "text-sm font-medium",
                  "flex items-center gap-2",
                  "transition-colors duration-200",
                  showFilters 
                    ? "bg-gray-100 text-gray-900 border-gray-300"
                    : "bg-white text-gray-700 hover:border-gray-300"
                )}
              >
                <IconFilter className="w-4 h-4" />
                <span>Filtros</span>
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
              </div>
            )}
          </div>

          {/* Lista de clases filtradas */}
          <div className="space-y-4">
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
                        ? "border-gray-300 bg-gray-50/80 ring-1 ring-gray-200"
                        : "border-gray-100 hover:border-gray-200 bg-white",
                      "transition-all duration-200",
                      "relative overflow-hidden",
                      "sm:h-[250px]"
                    )}
                  >
                    <div className="flex flex-col sm:flex-row h-full">
                      {/* Imagen de la clase - contenedor del mismo tamaño, imagen más pequeña */}
                      <div className={cn(
                        "relative",
                        "sm:w-[200px] shrink-0",
                        "h-[160px] sm:h-full",
                        "flex items-center justify-center", // Centrar contenido
                        "bg-transparent" // Fondo sutil para el área sin imagen
                      )}>
                        <div className="relative w-24 h-24"> {/* Contenedor fijo para la imagen */}
                          <Image
                            src={getClassImage(index)}
                            alt={classItem.title}
                            fill
                            className="object-contain"
                            priority={index < 3}
                          />
                        </div>
                      </div>

                      {/* Contenido con padding consistente */}
                      <div className="flex-1 min-w-0 p-5 sm:p-6 flex flex-col justify-between">
                        <div className="space-y-3 sm:space-y-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="space-y-1 flex-1">
                              <h3 className="text-base font-medium text-gray-900 truncate">
                                {classItem.title}
                              </h3>
                              <p className="text-sm text-gray-600">
                                {classItem.is_recurring ? 'Clase recurrente' : 'Clase única'}
                              </p>
                            </div>

                            {/* Botón Seleccionar (solo desktop) */}
                            <button
                              onClick={() => handleClassClick(classItem)}
                              className={cn(
                                "hidden sm:block",
                                "text-sm font-medium",
                                "text-gray-900 hover:text-gray-700",
                                "transition-colors"
                              )}
                            >
                              Seleccionar
                            </button>
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
                          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-sm">
                            {classItem.instructor && (
                              <div className="flex items-center gap-1.5">
                                <span className="text-gray-500">Profesor:</span>
                                <span className="font-medium text-gray-700">{classItem.instructor}</span>
                              </div>
                            )}
                            {classItem.branchInfo && (
                              <>
                                <span className="text-gray-300">•</span>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-gray-500">Sede:</span>
                                  <span className="font-medium text-gray-700">{classItem.branchInfo.name}</span>
                                </div>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Días de clase */}
                        <div className="flex items-center gap-1.5 text-sm">
                          <span className="text-gray-500">Días:</span>
                          <span className="font-medium text-gray-700">
                            {classItem.schedule.daysOfWeek.join(', ')}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Área clickeable para móvil */}
                    <button
                      onClick={() => handleClassClick(classItem)}
                      className="sm:hidden w-full h-full absolute inset-0"
                      aria-label={`Seleccionar ${classItem.title}`}
                    />
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      <MobileDrawer
        isOpen={!!selectedClassForMobile}
        onClose={() => setSelectedClassForMobile(null)}
        imageUrl="/images/Miroodles - Sticker.png"
      >
        {selectedClassForMobile && (
          <div className="space-y-6">
            {/* Información de la clase */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {selectedClassForMobile.title}
                </h3>
                {selectedClassForMobile.description && (
                  <div className="mt-2">
                    <p className={cn(
                      "text-sm text-gray-600",
                      !expandedDescriptions.has(selectedClassForMobile.id) && "line-clamp-4"
                    )}>
                      {selectedClassForMobile.description}
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
              </div>

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

            {/* Botón de confirmación */}
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
          </div>
        )}
      </MobileDrawer>
    </StepContainer>
  )
} 