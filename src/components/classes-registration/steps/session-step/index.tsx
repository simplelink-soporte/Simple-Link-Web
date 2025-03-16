"use client"

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useClassRegistration } from '../../context/ClassRegistrationContext';
import { useUserPackages } from '../../hooks/useUserPackages';
import { StepContainer } from '../../shared/StepContainer';
import { toast } from '@/components/ui/use-toast';

// Importar custom hooks
import { useDeviceDetection } from './hooks/useDeviceDetection';
import { usePackageValidation } from './hooks/usePackageValidation';
import { useSessionAvailability } from './hooks/useSessionAvailability';
import { useSessionPagination } from './hooks/useSessionPagination';

// Importar componentes
import { SessionHeader } from './components/SessionHeader';
import { SessionList } from './components/SessionList';
import { SessionMobileDrawer } from './components/SessionMobileDrawer';
import { SessionLoadingState } from './components/SessionLoadingState';

/**
 * SessionStep - Componente para seleccionar sesiones de una clase
 * 
 * Este componente implementa la estrategia de optimización de carga de sesiones donde
 * primero se muestran las sesiones y luego se verifica su disponibilidad
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
  const [isInitializing, setIsInitializing] = useState(true);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [selectedSessionForMobile, setSelectedSessionForMobile] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Referencias
  const sessionsMountedInUI = useRef(false);
  const mountTimeoutRef = useRef(null);
  const isInitialMount = useRef(true);
  
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
      // Cuando se cargan nuevas sesiones, verificamos su disponibilidad
      if (updateAvailabilityInfo) {
        updateAvailabilityInfo({ forceUpdate: false });
      }
    }
  });
  
  const {
    isLoadingAvailability,
    updateAvailabilityInfo,
    isInitialMount: isInitialAvailabilityMount,
    checkAvailabilityForNewlyLoadedSessions
  } = useSessionAvailability({
    selectedClass: state.selectedClass,
    currentPage,
    pageSize: 10,
    dispatch
  });

  // === Inicialización ===
  useEffect(() => {
    const initializeStep = async () => {
      if (state.isGuest || isLoadingPackage) {
        setIsInitializing(false);
        return;
      }

      // Solo verificar disponibilidad durante la inicialización inicial
      if (isInitializing && state.selectedClass) {
        // Forzar actualización durante la inicialización, pero solo para sesiones visibles
        await updateAvailabilityInfo({ forceUpdate: true, visibleSessionsOnly: true });
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
      fetchInitialSessions();
    }
  }, [state.selectedClass, isInitializing, sessionsLoaded, fetchInitialSessions]);

  // === Verificación de disponibilidad ===
  useEffect(() => {
    // Verificar que state.selectedClass no sea null y que ya tengamos sesiones
    if (!state.selectedClass || !state.selectedClass.sessions.length) return;
    
    // Solo actualizamos disponibilidad si las sesiones ya fueron cargadas
    if (!sessionsLoaded) return;

    // Limpiar cualquier timeout anterior si existe
    if (mountTimeoutRef.current) {
      clearTimeout(mountTimeoutRef.current);
    }
    
    // Damos un pequeño tiempo para que las sesiones se monten en la UI
    // antes de verificar la disponibilidad
    mountTimeoutRef.current = setTimeout(() => {
      // Marcar que ahora estamos verificando la disponibilidad
      sessionsMountedInUI.current = true;
      
      const fetchAvailability = async () => {
        try {
          // Comprobación de seguridad adicional
          if (!state.selectedClass) return;
          
          // Usar la función del servicio para actualizar la disponibilidad
          const forceUpdate = isInitialMount.current ? true : false;
          
          // Aquí usamos updateAvailabilityInfo en vez de acceder directamente al servicio
          await updateAvailabilityInfo({ forceUpdate, visibleSessionsOnly: true });
          
        } catch (error) {
          console.error('Error al cargar disponibilidad de sesiones:', error);
          toast({
            title: 'Error',
            description: 'No se pudo cargar la disponibilidad de las sesiones',
            variant: 'destructive'
          });
        } finally {
          if (isInitialMount.current) {
            isInitialMount.current = false;
          }
        }
      };
      
      // Iniciamos verificación de disponibilidad solo para las sesiones visibles actuales
      console.log('🚀 Verificando disponibilidad para el primer lote de sesiones');
      fetchAvailability();
    }, 100); // 100ms es suficiente para que el DOM se actualice
    
    // Limpiar el timeout al desmontar
    return () => {
      if (mountTimeoutRef.current) {
        clearTimeout(mountTimeoutRef.current);
      }
    };
  }, [state.selectedClass, updateAvailabilityInfo, sessionsLoaded]);

  // Verificación para nuevas sesiones cargadas
  useEffect(() => {
    // Verificar disponibilidad para nuevas sesiones cargadas
    checkAvailabilityForNewlyLoadedSessions();
  }, [currentPage, checkAvailabilityForNewlyLoadedSessions]);

  // === Manejadores de eventos ===
  const handleSessionClick = useCallback((session) => {
    if (isMobile) {
      // En móvil, abrimos el drawer
      setSelectedSessionForMobile(session);
      setIsMobileMenuOpen(true);
    } else {
      // En desktop, manejamos la selección/deselección
      if (state.selectedSessions.includes(session.id)) {
        deselectSession(session.id);
      } else {
        // Verificar disponibilidad primero
        if (session.spotsLeft <= 0) {
          toast({
            title: "Sesión no disponible",
            description: `Esta sesión está completa (0 plazas disponibles)`,
            variant: "destructive"
          });
          return;
        }
        
        // Deseleccionar sesiones previas
        const currentlySelected = [...state.selectedSessions];
        currentlySelected.forEach(id => {
          if (id !== session.id) {
            deselectSession(id);
          }
        });
        
        // Seleccionar la nueva sesión
        selectSession(session.id);
        
        // Mostrar mensaje informativo
        toast({
          title: "Sesión seleccionada",
          description: `Plazas disponibles: ${session.spotsLeft}/${session.totalSpots}`,
        });
        
        // Avanzar al siguiente paso después de un breve retraso
        setTimeout(() => {
          goToStep('summary');
        }, 300);
      }
    }
  }, [isMobile, state.selectedSessions, deselectSession, selectSession, toast, goToStep]);

  // Manejar toggle de descripción
  const handleToggleDescription = useCallback(() => {
    setShowFullDescription(prev => !prev);
  }, []);

  // Manejar el botón de volver
  const handleBack = useCallback(() => {
    goToStep('package');
  }, [goToStep]);

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

  // Validación de paquetes
  if (packagesAreValid === false) {
    return (
      <StepContainer stepId="invalid-package" centered>
        <div className="pt-8 text-center space-y-4">
          <div className="bg-red-50 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-red-800 mb-2">
              Paquete no válido
            </h2>
            <p className="text-sm text-red-700">
              Tu paquete no es válido para esta sede. Por favor, selecciona otra clase
              o contacta a soporte.
            </p>
          </div>
        </div>
      </StepContainer>
    );
  }

  // === Variables calculadas para la UI ===
  const isLongDescription = (state.selectedClass?.description?.length ?? 0) > 150;
  const displayDescription = showFullDescription 
    ? state.selectedClass?.description 
    : state.selectedClass?.description?.slice(0, 150) + '...';

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
          onBackClick={handleBack}
        />
        
        {/* Lista de sesiones con scroll infinito */}
        {isLoading ? (
          <SessionLoadingState />
        ) : (
          <SessionList 
            ref={sessionsContainerRef}
            sessions={state.selectedClass.sessions || []}
            selectedSessions={state.selectedSessions}
            onSessionSelect={handleSessionClick}
            isLoadingMoreSessions={isLoadingMoreSessions}
            isMobile={isMobile}
          />
        )}
        
        {/* Drawer para móvil cuando se selecciona una sesión */}
        {isMobile && (
          <SessionMobileDrawer 
            isOpen={isMobileMenuOpen}
            onClose={() => setIsMobileMenuOpen(false)}
            session={selectedSessionForMobile}
            isSelected={selectedSessionForMobile ? state.selectedSessions.includes(selectedSessionForMobile.id) : false}
            onSelect={handleSessionClick}
          />
        )}
      </div>
    </StepContainer>
  );
}
