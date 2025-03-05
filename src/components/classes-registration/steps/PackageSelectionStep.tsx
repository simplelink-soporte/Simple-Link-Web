"use client"

import { useState, useMemo } from 'react'
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react'
import { usePackages } from '../hooks'
import { useClassRegistration } from '../context'
import { LoadingSpinner } from '../shared/LoadingSpinner'
import { ErrorMessage } from '../shared/ErrorMessage'
import { StepContainer } from '../shared/StepContainer'
import { StepHeader, StepSection, StepGrid, StepActions } from '../shared/StepSection'
import { cn } from '@/lib/utils'
import type { Organization, ClassPackage } from '../types/models'
import Image from 'next/image'
import { useClientOrganizationContext } from '@/contexts/ClientOrganizationContext'

interface PackageSelectionStepProps {
  organization: Organization
}

// Aumentamos el número de paquetes por página para mostrar 4 en una vista
const PACKAGES_PER_PAGE = 4

export function PackageSelectionStep({ organization }: PackageSelectionStepProps) {
  const { state, dispatch, goToStep } = useClassRegistration()
  const { packages = [], isLoading, error, createUserPackage } = usePackages(organization.id)
  const [currentPage, setCurrentPage] = useState(1)
  const [isProcessing, setIsProcessing] = useState(false)
  const { organization: clientOrg } = useClientOrganizationContext()

  // Calcular el número total de páginas
  const totalPages = Math.ceil(packages.length / PACKAGES_PER_PAGE)

  // Obtener los paquetes de la página actual
  const currentPackages = useMemo(() => {
    const startIndex = (currentPage - 1) * PACKAGES_PER_PAGE
    const endIndex = startIndex + PACKAGES_PER_PAGE
    return packages.slice(startIndex, endIndex)
  }, [packages, currentPage])

  const handlePackageClick = async (packageId: string) => {
    try {
      setIsProcessing(true)
      
      // Crear el paquete de usuario
      const userPackage = await createUserPackage(packageId, clientOrg?.id)
      
      if (userPackage) {
        // Actualizar el estado con el paquete seleccionado
        const selectedPackage = packages.find(p => p.id === packageId)
        if (selectedPackage) {
          dispatch({ type: 'SET_SELECTED_PACKAGE', payload: selectedPackage })
        }
      }
    } catch (error) {
      console.error('Error al procesar el paquete:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  // Funciones de navegación
  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1)
    }
  }

  const goToPrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1)
    }
  }

  if (isLoading) {
    return (
      <StepContainer stepId="package-loading">
        <div className="text-center space-y-4">
          <LoadingSpinner />
          <p className="text-sm text-gray-500">
            Cargando paquetes disponibles...
          </p>
        </div>
      </StepContainer>
    )
  }

  if (error) {
    return (
      <StepContainer stepId="package-error">
        <ErrorMessage error={{
          type: 'LOAD_ERROR',
          message: 'Error al cargar los paquetes disponibles'
        }} />
      </StepContainer>
    )
  }

  if (!packages || packages.length === 0) {
    return (
      <StepContainer stepId="no-packages">
        <div className="text-center space-y-4">
          <div className="bg-yellow-50 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-yellow-800 mb-2">
              No hay paquetes disponibles
            </h2>
            <p className="text-sm text-yellow-700">
              En este momento no hay paquetes disponibles. Por favor, intenta más tarde.
            </p>
          </div>
        </div>
      </StepContainer>
    )
  }

  return (
    <StepContainer stepId="package-selection" centered={false}>
      <div className="w-full max-w-3xl mx-auto px-5 sm:px-6 lg:px-0">
        <div className="space-y-8">
          {/* Imagen decorativa */}
          <div className="flex justify-start">
            <div className="relative w-24 h-24">
              <Image
                src="/images/Miroodles - package.png"
                alt="Decorative package sticker"
                fill
                className="object-contain"
                priority
              />
            </div>
          </div>

          {/* Encabezado */}
          <div className="text-left space-y-1.5">
            <h2 className="text-xl font-semibold text-gray-900">
              ¿No tienes un paquete?
            </h2>
            <p className="text-sm text-gray-600">
              Si deseas obtener varias clases con un descuento y grandes beneficios.
            </p>
          </div>

          {/* Grid de paquetes */}
          <div className={cn(
            "grid gap-6",
            "grid-cols-1",
            packages.length === 1 ? "sm:grid-cols-1" :
            packages.length === 2 ? "sm:grid-cols-2" :
            packages.length === 3 ? "sm:grid-cols-3" :
            "sm:grid-cols-2 lg:grid-cols-2",
            "justify-center mx-auto"
          )}>
            {currentPackages.map((packageItem: ClassPackage) => {
              const isSelected = state.selectedPackage?.id === packageItem.id
              
              return (
                <div
                  key={packageItem.id}
                  className={cn(
                    "relative w-full rounded-xl",
                    "border",
                    isSelected
                      ? "border-gray-300 bg-gray-50/80 ring-1 ring-gray-200"
                      : "border-gray-100 hover:border-gray-200 bg-white",
                    "transition-all duration-200",
                    "flex flex-col"
                  )}
                >
                  {/* Contenido del paquete */}
                  <div className="p-6 space-y-5 flex-grow">
                    {/* Header: Título y Precio */}
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <h3 className="text-base font-medium text-gray-900">
                          {packageItem.title}
                        </h3>
                        <p className="text-sm text-gray-500 line-clamp-2">
                          {packageItem.description}
                        </p>
                      </div>
                      <div className="text-left">
                        <p className="text-2xl font-semibold text-gray-900">
                          ${packageItem.price.toLocaleString('es-AR')}
                        </p>
                        <p className="text-sm text-gray-500">
                          {packageItem.numberOfClasses} {packageItem.numberOfClasses === 1 ? 'clase' : 'clases'}
                        </p>
                      </div>
                    </div>

                    {/* Detalles */}
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-1.5">
                        <span className="text-gray-500">Duración:</span>
                        <span className="font-medium text-gray-700">{packageItem.expiration_days} días</span>
                      </div>
                      {packageItem.branches && packageItem.branches.length > 0 && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-gray-500">Sedes:</span>
                          <span className="font-medium text-gray-700">
                            {packageItem.branches.length}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Características */}
                    {packageItem.features && packageItem.features.length > 0 && (
                      <div className="pt-4 border-t border-gray-100">
                        <ul className="space-y-2">
                          {packageItem.features.map((feature, index) => (
                            <li key={index} className="text-sm text-gray-600 flex items-start gap-2">
                              <span className="text-blue-500">•</span>
                              <span>{feature.text}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Botón de compra */}
                  <div className="p-6 pt-0">
                    <button
                      onClick={() => handlePackageClick(packageItem.id)}
                      disabled={isProcessing}
                      className={cn(
                        "w-full px-0 py-2.5",
                        "text-gray-900",
                        "text-sm font-medium",
                        "transition-colors duration-200",
                        "hover:text-gray-600",
                        "flex items-center justify-start gap-2",
                        isProcessing && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      Comprar
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Sistema de paginación */}
          {totalPages > 1 && (
            <div className="flex justify-center mt-8">
              <div className="flex items-center gap-2">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={cn(
                      "w-8 h-8 rounded-lg",
                      "text-sm font-medium",
                      "transition-colors duration-200",
                      currentPage === page
                        ? "bg-gray-100 text-gray-700"
                        : "text-gray-500 hover:bg-gray-50 hover:text-gray-600"
                    )}
                  >
                    {page}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </StepContainer>
  )
}