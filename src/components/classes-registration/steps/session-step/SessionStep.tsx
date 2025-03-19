"use client"

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useClassRegistration } from '../../context/ClassRegistrationContext';
import { useUserPackages } from '../../hooks/useUserPackages';
import { StepContainer } from '../../shared/StepContainer';
import { toast } from '@/components/ui/use-toast';

// Importar componentes de diálogo
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

// Importar custom hooks
import { useDeviceDetection } from './hooks/useDeviceDetection';
import { usePackageValidation } from './hooks/usePackageValidation';
import { useSessionAvailability } from './hooks/useSessionAvailability';
import { useSessionPagination } from './hooks/useSessionPagination';
import { useSessionFiltering } from './hooks/useSessionFiltering';

// Importar componentes
import { SessionHeader } from './components/SessionHeader';
import { SessionList } from './components/SessionList';
import { SessionMobileDrawer } from './components/SessionMobileDrawer';
import { SessionLoadingState } from './components/SessionLoadingState';
import { EmptySessionState } from './components/EmptySessionState';

// Importar tipos
import { ClassSession } from '../../types/models';

/**
 * Componente principal para la selección de sesiones de clase
 * Versión refactorizada con mejor separación de responsabilidades
 */
export function SessionStep() {
  /**
   * ESTRATEGIA DE OPTIMIZACIÓN DE CARGA DE SESIONES
   * ------------------------------------------------------
   * Para maximizar el rendimiento y la experiencia de usuario, implementamos:
   * 
   * 1. Generación paginada de sesiones:
   *    - Inicialmente generamos solo las primeras 10 sesiones
   *    - Al hacer scroll, se generan las siguientes 10 sesiones bajo demanda
   * 
   * 2. Verificación de disponibilidad optimizada:
   *    - Verificamos disponibilidad solo cuando es necesario
   *    - Primero mostramos las sesiones y luego verificamos su disponibilidad
 */

  // Estado general
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [showFullDescription, setShowFullDescription] = useState<boolean>(false);
  const [selectedSessionForMobile, setSelectedSessionForMobile] = useState<ClassSession | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  
  // Referencias
  const sessionsMountedInUI = useRef<boolean>(false);
  const mountTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialMount = useRef<boolean>(true);
  
  // Contexto y servicios
  const { state, selectSession, deselectSession, goToStep, dispatch } = useClassRegistration();
  const { activePackage, isLoading: isLoadingPackage } = useUserPackages();
  
  // Custom hooks integrados
  const isMobile = useDeviceDetection();
  
  const { packagesAreValid, isValidating } = usePackageValidation({ 
    activePackage, 
    selectedClassBranchId: state.selectedClass?.branchInfo?.id 
  });
  
  const { 
    currentPage,
    hasMoreSessions,
    isLoadingMoreSessions,
    isLoading,
    sessionsLoaded,
    loadMoreSessions,
    fetchInitialSessions,
    sessionsContainerRef,
    setSessionsLoaded
  } = useSessionPagination({ 
    selectedClass: state.selectedClass,
    pageSize: 10,
    dispatch,
    onNewSessionsLoaded: () => {
      // Las sesiones recién cargadas se verificarán cuando cambie currentPage
      // No necesitamos llamar a updateAvailabilityInfo aquí para evitar ciclos
      console.log('Nuevas sesiones cargadas, se verificarán cuando cambie la página');
    }
  });
  
  const {
    isLoadingAvailability,
    setIsLoadingAvailability,
    sessionAvailability,
    updateAvailabilityInfo,
    isInitialMount: isInitialAvailabilityMount,
    checkAvailabilityForNewlyLoadedSessions,
    checkSingleSessionAvailability
  } = useSessionAvailability({
    selectedClass: state.selectedClass,
    currentPage,
    pageSize: 10,
    dispatch,
    isMobile: isMobile // Pasar el flag isMobile para controlar la validación de disponibilidad
  });

  // Integración del hook de filtrado de sesiones
  const {
    filteredSessions,
  } = useSessionFiltering({
    sessions: state.selectedClass?.sessions || []
  });

  // Estado para el diálogo de no disponibilidad
  const [noAvailabilityDialogOpen, setNoAvailabilityDialogOpen] = useState<boolean>(false);
  const [selectedSessionWithNoAvailability, setSelectedSessionWithNoAvailability] = useState<ClassSession | null>(null);

  // === Inicialización ===
  useEffect(() => {
    const initializeStep = async () => {
      if (state.isGuest || isLoadingPackage) {
        setIsInitializing(false);
        return;
      }

      // Solo verificar disponibilidad durante la inicialización inicial
      if (isInitializing && state.selectedClass) {
        try {
          // Forzar actualización durante la inicialización, pero solo para sesiones visibles
          await updateAvailabilityInfo(true);
        } catch (error) {
          console.error('Error al inicializar la disponibilidad:', error);
          // No mostramos toast aquí para evitar sobrecargar al usuario
        }
      }

      setIsInitializing(false);
    };
    
    initializeStep();
  }, [
    state.isGuest, 
    isLoadingPackage, 
    state.selectedClass, 
    isInitializing,
    updateAvailabilityInfo
  ]);

  // === Carga de sesiones al entrar ===
  useEffect(() => {
    // Si no hay clase seleccionada o aún estamos inicializando, no hacer nada
    if (!state.selectedClass || isInitializing) return;

    // Solo cargar sesiones si no se han cargado ya
    if (!sessionsLoaded) {
      fetchInitialSessions().catch(error => {
        console.error('Error al cargar sesiones iniciales:', error);
        toast({
          title: "Error al cargar sesiones",
          description: "No pudimos cargar las sesiones disponibles. Intenta de nuevo.",
          variant: "destructive",
        });
      });
    }
  }, [state.selectedClass, isInitializing, sessionsLoaded, fetchInitialSessions, toast]);

  // === Verificación de disponibilidad ===
  useEffect(() => {
    // Ya no necesitamos esta lógica condicional, ya que la verificación ahora
    // se hará solo cuando el usuario seleccione una sesión específica
    // independientemente de si es móvil o desktop
    if (!state.selectedClass || !state.selectedClass.sessions?.length) return;
    
    // Eliminamos la verificación en lote para Desktop
    console.log('✅ Optimización aplicada: La disponibilidad se verificará individualmente al seleccionar cada sesión');
  }, [state.selectedClass?.sessions]);

  // === Manejadores de eventos ===
  const handleSessionSelect = useCallback(async (session: ClassSession) => {
    if (!session) return;
    
    // Verificar disponibilidad de esta sesión específica
    setIsLoadingAvailability(true);
    try {
      const hasAvailability = await checkSingleSessionAvailability(session);
      
      if (hasAvailability) {
        // Solo seleccionamos la sesión si tiene disponibilidad
        selectSession(session.id);
        
        // En móvil, abrimos el drawer
        if (isMobile) {
          setSelectedSessionForMobile(session);
          setIsMobileMenuOpen(true);
        } else {
          // En desktop, avanzamos al siguiente paso
          goToStep('summary');
        }
      } else {
        // No hay disponibilidad
        if (isMobile) {
          // En móvil, mostramos un toast
          toast({
            title: "Sesión no disponible",
            description: "Esta sesión ya no tiene plazas disponibles",
            variant: "destructive",
          });
        } else {
          // En desktop, mostramos un dialog
          setNoAvailabilityDialogOpen(true);
          setSelectedSessionWithNoAvailability(session);
        }
      }
    } catch (error) {
      console.error('Error al verificar disponibilidad:', error);
      toast({
        title: "Error",
        description: "No pudimos verificar la disponibilidad de esta sesión",
        variant: "destructive",
      });
    } finally {
      setIsLoadingAvailability(false);
    }
  }, [checkSingleSessionAvailability, selectSession, isMobile, goToStep, toast]);

  // Manejar toggle de descripción
  const handleToggleDescription = useCallback(() => {
    setShowFullDescription(prev => !prev);
  }, []);

  // === Renderizado condicional ===
  if (isInitializing || isLoadingPackage) {
    return (
      <StepContainer stepId="session-loading" centered>
        <SessionLoadingState 
          message="Cargando información de la sesión..." 
          className="py-8"
        />
      </StepContainer>
    );
  }

  if (!state.selectedClass) {
    return (
      <StepContainer stepId="no-class-selected" centered>
        <div className="pt-8 text-center space-y-4">
          <div className="bg-yellow-50 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-yellow-800 mb-2">
              No hay clase seleccionada
            </h2>
            <p className="text-sm text-yellow-700">
              Por favor, selecciona una clase antes de continuar.
            </p>
          </div>
        </div>
      </StepContainer>
    );
  }

  // Verificación de sesiones disponibles
  const hasSessions = state.selectedClass.sessions && state.selectedClass.sessions.length > 0;
  
  // === Variables calculadas para la UI ===
  const isLongDescription = (state.selectedClass?.description?.length ?? 0) > 150;
  const displayDescription = showFullDescription 
    ? state.selectedClass?.description 
    : state.selectedClass?.description?.slice(0, 150) + (isLongDescription ? '...' : '');

  // Sesiones que se mostrarán (todas)
  const sessionsToDisplay = state.selectedClass?.sessions || [];

  // === Render principal ===
  return (
    <StepContainer stepId="session-selection" centered={false} className="px-4 sm:px-[var(--padding-container-tablet)] lg:px-[var(--padding-container-desktop)]">
      <div className="w-full max-w-3xl mx-auto h-full flex flex-col overflow-hidden">
        {/* Encabezado con información de la clase */}
        <SessionHeader 
          title={state.selectedClass.title}
          description={displayDescription}
          branchName={state.selectedClass.branchInfo?.name}
          isLongDescription={isLongDescription}
          showFullDescription={showFullDescription}
          onToggleDescription={handleToggleDescription}
          isLoadingAvailability={isLoadingAvailability}
          sessionsMountedInUI={sessionsMountedInUI.current}
        />
        
        {/* Lista de sesiones con scroll infinito */}
        {isLoading ? (
          <SessionLoadingState />
        ) : hasSessions ? (
          <SessionList 
            sessions={sessionsToDisplay}
            selectedSessions={state.selectedSessions}
            onSessionSelect={handleSessionSelect}
            isLoadingMoreSessions={isLoadingMoreSessions}
            hasMoreSessions={hasMoreSessions}
            ref={sessionsContainerRef}
            isMobile={isMobile}
          />
        ) : (
          <EmptySessionState />
        )}
        
        {/* Drawer para móvil cuando se selecciona una sesión */}
        {isMobile && selectedSessionForMobile && (
          <SessionMobileDrawer 
            isOpen={isMobileMenuOpen}
            onClose={() => setIsMobileMenuOpen(false)}
            session={selectedSessionForMobile}
            isSelected={selectedSessionForMobile ? state.selectedSessions.includes(selectedSessionForMobile.id) : false}
            onSelect={handleSessionSelect}
          />
        )}
        
        {/* Diálogo para sesión sin disponibilidad (solo en Desktop) */}
        <Dialog open={noAvailabilityDialogOpen} onOpenChange={setNoAvailabilityDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Sesión no disponible</DialogTitle>
              <DialogDescription>
                {selectedSessionWithNoAvailability && (
                  <div className="mt-4">
                    <p className="text-gray-700 mb-4">
                      Lo sentimos, la sesión seleccionada ya no tiene cupos disponibles. 
                      Por favor, selecciona otra sesión para continuar.
                    </p>
                    <div className="p-3 bg-gray-50 rounded-md">
                      <p className="text-sm font-medium">Detalles de la sesión:</p>
                      <p className="text-sm mt-1">
                        <span className="font-medium">Fecha:</span> {selectedSessionWithNoAvailability.date}
                      </p>
                      <p className="text-sm">
                        <span className="font-medium">Horario:</span> {selectedSessionWithNoAvailability.startTime} - {selectedSessionWithNoAvailability.endTime}
                      </p>
                      {selectedSessionWithNoAvailability.instructor && (
                        <p className="text-sm">
                          <span className="font-medium">Instructor:</span> {selectedSessionWithNoAvailability.instructor}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button onClick={() => setNoAvailabilityDialogOpen(false)}>
                Entendido
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </StepContainer>
  );
}
