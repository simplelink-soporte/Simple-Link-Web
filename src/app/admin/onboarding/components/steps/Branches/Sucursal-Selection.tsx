'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { 
  Plus, 
  PenLine, 
  HelpCircle, 
  Trash2, 
  Check, 
  MapPin, 
  Phone, 
  User, 
  Info,
  ChevronRight 
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useOnboarding } from '@/app/admin/onboarding/context/OnboardingContext'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { branchService } from '@/services/branchService'
import { onboardingBranchService } from '@/services/onboardingBranchService'
import { toast } from "@/components/ui/use-toast"
import { supabase } from "@/lib/supabase"
import { useAuth } from '@/contexts/AuthContext'
import { Badge } from "@/components/ui/badge"

interface Branch {
  id: string
  name: string
  courts?: number
  schedule?: {
    open: string
    close: string
  }
  data?: {
    id?: string
    name: string
    address: string
    phone: string
    manager: string
    isActive: boolean
    opening_hours: Record<string, any>
    courts: any[]
  }
}

interface SucursalSelectionProps {
  onNext: () => void
  onConfigureBranch: () => void
}

// Variable para evitar múltiples cargas simultáneas
let isLoadingBranches = false;
// Timestamp de la última carga para evitar recargas frecuentes
let lastBranchesLoadTime = 0;
// Tiempo mínimo entre cargas (5 segundos)
const MIN_RELOAD_INTERVAL = 5000;

// Funciones de utilidad para verificación de tipos seguros
const hasBranchData = (branch: any): boolean => {
  // Una sede está configurada si tiene la propiedad data y dentro de data tiene dirección, teléfono o encargado
  return branch && 
         branch.data && 
         (branch.data.address || branch.data.phone || branch.data.manager);
};

export function SucursalSelection({ onNext, onConfigureBranch }: SucursalSelectionProps) {
  const { completeAndAdvance, branches, setBranches, setCurrentBranchId, formData } = useOnboarding()
  const { user } = useAuth()
  const [searchTerm, setSearchTerm] = useState('')
  const [isAddingBranch, setIsAddingBranch] = useState(false)
  const [branchToDelete, setBranchToDelete] = useState<Branch | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Memoizar la función loadBranches para evitar recreaciones
  const loadBranches = useCallback(async () => {
    // Evitar cargas múltiples simultáneas
    if (isLoadingBranches) {
      console.log('⏳ Ya hay una carga de sedes en progreso, omitiendo')
      return
    }

    // Verificar si ha pasado suficiente tiempo desde la última carga
    const now = Date.now()
    if (now - lastBranchesLoadTime < MIN_RELOAD_INTERVAL) {
      console.log('⏭️ Recarga muy frecuente, omitiendo consulta de sedes')
      return
    }

    try {
      isLoadingBranches = true
      console.log('🔄 Cargando sedes desde el servicio...')

      // Usar el ID de empresa del formData si está disponible para evitar consultas innecesarias
      const empresaId = formData.empresaId
      let result

      if (empresaId) {
        // Si tenemos el ID, hacemos la consulta directamente
        result = await onboardingBranchService.getBranchesByEmpresaId(empresaId)
      } else {
        // Fallback al método tradicional
        result = await onboardingBranchService.getBranchesByUserId()
      }

      if (result.error) {
        console.error('❌ Error al cargar sedes:', result.error)
        return
      }

      if (result.data) {
        // Evitar actualizar el estado si no hay cambios reales
        const currentBranchesJson = JSON.stringify(branches)
        const newBranchesJson = JSON.stringify(result.data)
        
        if (currentBranchesJson !== newBranchesJson) {
          console.log('✅ Sedes actualizadas:', result.data.length)
          setBranches(result.data)
        } else {
          console.log('⏭️ No hay cambios en las sedes, omitiendo actualización')
        }
      }
    } catch (error) {
      console.error('❌ Error inesperado al cargar sedes:', error)
    } finally {
      isLoadingBranches = false
      lastBranchesLoadTime = Date.now()
    }
  }, [branches, setBranches, formData.empresaId])

  // Cargar sedes una sola vez al montar el componente
  useEffect(() => {
    // Solo cargar si no tenemos sedes o si tienen más de 30 segundos
    if (!branches.length || Date.now() - lastBranchesLoadTime > 30000) {
      loadBranches()
    }
  }, [loadBranches, branches.length])

  // Filtrar sedes de manera memoizada para evitar recálculos innecesarios
  const filteredBranches = useMemo(() => {
    return branches.filter(branch => 
      branch.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [branches, searchTerm])

  // Mejorar la memoización de hasConfiguredBranch con verificación de tipos
  const hasConfiguredBranch = useMemo(() => {
    // Verificar que al menos una sede esté configurada
    const hasConfigured = branches.some(branch => hasBranchData(branch));
    
    console.log('🔍 Verificando sedes configuradas:', 
      branches.map(b => ({
        id: b.id, 
        name: b.name, 
        hasData: hasBranchData(b),
        dataExists: !!b.data,
        address: b.data?.address
      }))
    );
    console.log('✅ ¿Hay sedes configuradas?', hasConfigured);
    
    return hasConfigured;
  }, [branches]);

  const handleAddBranch = () => {
    // Ir directamente a configurar una nueva sede
    setCurrentBranchId(null)
    onConfigureBranch()
  }

  const handleDeleteBranch = (branch: Branch) => {
    setBranchToDelete(branch)
  }

  const confirmDelete = async () => {
    if (!branchToDelete) return

    try {
      setIsDeleting(true)
      console.log('📍 Iniciando eliminación de sede:', branchToDelete)

      // Si la sede tiene un ID en Supabase, la eliminamos de allí primero
      if (branchToDelete.id) {
        const userId = process.env.NEXT_PUBLIC_DEFAULT_USER_ID
        if (!userId) {
          throw new Error('ID de usuario no encontrado')
        }

        console.log('📍 Eliminando sede con ID:', branchToDelete.id)

        // 1. Eliminar primero las canchas asociadas
        const { error: deleteCourtError } = await supabase
          .from('courts')
          .delete()
          .eq('branch_id', branchToDelete.id)

        if (deleteCourtError) {
          console.error('❌ Error al eliminar las canchas:', deleteCourtError)
          throw new Error('Error al eliminar las canchas asociadas')
        }

        console.log('✅ Canchas eliminadas correctamente')

        // 2. Ahora eliminamos la sede
        const { error: deleteBranchError } = await supabase
          .from('sedes')
          .delete()
          .eq('id', branchToDelete.id)

        if (deleteBranchError) {
          console.error('❌ Error al eliminar la sede:', deleteBranchError)
          throw new Error('Error al eliminar la sede')
        }

        console.log('✅ Sede eliminada correctamente')
      }

      // Actualizamos el estado local
      setBranches(branches.filter(b => b.id !== branchToDelete.id))
      setBranchToDelete(null)

      // Solo mostrar el toast en pantallas medianas y grandes
      if (window.innerWidth >= 768) {
        toast({
          title: "Sede eliminada",
          description: "La sede y sus canchas se han eliminado correctamente",
        })
      }
    } catch (error: any) {
      console.error('❌ Error al eliminar sede:', error)
      // Los mensajes de error sí los mostramos en todas las pantallas
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar la sede. Por favor, inténtalo de nuevo.",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleConfigureBranch = async (branchId: string) => {
    try {
      // Configurar la sede seleccionada y navegar a la vista de configuración
      console.log('📍 Configurando sede:', branchId)
      
      // Cargar datos de la sede desde Supabase
      console.log('📍 Cargando datos de la sede:', branchId)
      const { data: branchData, error: branchError } = await onboardingBranchService.getBranchById(branchId)
      
      if (branchError) {
        console.error('❌ Error al cargar la sede:', branchError)
        throw new Error(branchError.message || 'Error al cargar la sede')
      }
      
      // Si tiene datos, actualizar la sede en el estado
      if (branchData) {
        console.log('✅ Datos de sede cargados:', branchData)
        
        // Actualizar la sede en el estado con los datos de Supabase
        setBranches(prev => 
          prev.map(branch => 
            branch.id === branchId 
              ? {
                  ...branch,
                  data: {
                    id: branchData.id,
                    name: branchData.name || '',
                    address: branchData.address || '',
                    phone: branchData.phone || '',
                    manager: branchData.manager_id || '',
                    isActive: branchData.is_active ?? true,
                    opening_hours: branchData.opening_hours || {},
                    courts: branchData.courts || []
                  }
                }
              : branch
          )
        )
      } else {
        console.log('ℹ️ La sede no tiene datos, configurando...')
      }
      
      // Navegar a la vista de configuración
      setCurrentBranchId(branchId)
      onConfigureBranch()
    } catch (error: any) {
      console.error('❌ Error al configurar la sede:', error)
      toast({
        title: "Error",
        description: error.message || "No se pudieron cargar los datos de la sede",
        variant: "destructive",
      })
    }
  }

  const handleContinue = async () => {
    // Si el componente detecta que hay sedes configuradas
    if (hasConfiguredBranch) {
      try {
        // Verificar una última vez antes de avanzar
        console.log('✅ Avanzando al siguiente paso con sedes configuradas')
        
        // Forzar una última validación por seguridad
        const result = await onboardingBranchService.getBranchesByUserId()
        
        // Verificación usando la función actualizada
        const hasSedes = result.data?.some(branch => branch.data && 
          (branch.data.address || branch.data.phone || branch.data.manager));
        
        if (!hasSedes) {
          console.warn('⚠️ Verificación final falló, intentando una última vez en 1 segundo...')
          // Esperar un segundo y volver a intentar
          setTimeout(async () => {
            // Última verificación
            const finalCheck = await onboardingBranchService.getBranchesByUserId()
            
            // Verificación usando la función actualizada
            const finalHasSedes = finalCheck.data?.some(branch => branch.data && 
              (branch.data.address || branch.data.phone || branch.data.manager));
            
            if (finalHasSedes) {
              // Ahora sí avanzar
              await completeAndAdvance(1)
            } else {
              toast({
                title: "Error",
                description: "No se encontraron sedes configuradas. Por favor configura al menos una sede.",
                variant: "destructive",
              })
            }
          }, 1000)
          return
        }
        
        // Si pasó la verificación, avanzar
        await completeAndAdvance(1)
      } catch (error) {
        console.error('❌ Error al avanzar al siguiente paso:', error)
        toast({
          title: "Error",
          description: "Error al avanzar al siguiente paso. Intenta nuevamente.",
          variant: "destructive",
        })
      }
    } else {
      toast({
        title: "Acción requerida",
        description: "Configura al menos una sede para continuar",
      })
    }
  }

  // Añadir un useEffect para forzar la recarga cuando volvemos de configurar una sede
  useEffect(() => {
    // Esta función se ejecutará cuando el componente se monte o actualice
    const refreshData = async () => {
      // Forzar una recarga de datos para asegurar que tenemos los más recientes
      console.log('🔄 Forzando recarga de datos al montar/actualizar el componente')
      // Limpiar la caché de tiempo para permitir la recarga inmediata
      lastBranchesLoadTime = 0
      await loadBranches()
    }
    
    refreshData()
    
    // Configurar un intervalo para recargar periódicamente (cada 5 segundos)
    const intervalId = setInterval(() => {
      if (branches.length > 0 && !branches.some(b => hasBranchData(b))) {
        console.log('🔄 Recargando datos periódicamente para verificar actualizaciones')
        lastBranchesLoadTime = 0
        loadBranches()
      } else {
        // Si ya tenemos datos completos, podemos detener el intervalo
        clearInterval(intervalId)
      }
    }, 5000)
    
    // Limpiar el intervalo cuando el componente se desmonte
    return () => clearInterval(intervalId)
  }, [loadBranches, branches]) // Añadir las dependencias correctas

  return (
    <div className="p-6 space-y-8">
      {/* Título y subtítulo */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-semibold tracking-tight">
            Configura tus Sucursales
          </h2>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  className="p-0 h-auto hover:bg-transparent"
                >
                  <HelpCircle className="h-4 w-4 text-gray-400 hover:text-gray-600 transition-colors" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-sm">
                  Aquí puedes agregar y configurar las diferentes sedes de tu club. Cada sede puede tener sus propias pistas y configuraciones.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <p className="text-sm text-muted-foreground">
          Agrega y gestiona las sucursales de tu empresa
        </p>
      </div>

      {/* Contenedor de sucursales */}
      <div className="space-y-4">
        <AnimatePresence>
          {filteredBranches.map((branch, index) => (
            <motion.div
              key={branch.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2, delay: index * 0.1 }}
            >
              <Card className="relative overflow-hidden hover:border-primary hover:shadow-md transition-all duration-200">
                <div className="p-6 flex justify-between items-center">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-medium">
                        {branch.name}
                      </h3>
                      {hasBranchData(branch) ? (
                        <Badge variant="outline" className="bg-green-500 text-white text-xs px-2 py-0.5">
                          Configurada
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs px-2 py-0.5">
                          Sin configurar
                        </Badge>
                      )}
                    </div>
                    <div className="space-y-1">
                      {hasBranchData(branch) ? (
                        <>
                          <p className="text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3 inline mr-1" />
                            {branch.data?.address || "Sin dirección"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            <Phone className="h-3 w-3 inline mr-1" />
                            {branch.data?.phone || "Sin teléfono"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            <User className="h-3 w-3 inline mr-1" />
                            {branch.data?.manager || "Sin encargado"}
                          </p>
                        </>
                      ) : (
                        <p className="text-xs text-amber-600">
                          <Info className="h-3 w-3 inline mr-1" />
                          Esta sede requiere configuración
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant={hasBranchData(branch) ? "outline" : "default"}
                      size="sm"
                      className="flex items-center gap-2"
                      onClick={() => handleConfigureBranch(branch.id)}
                    >
                      <PenLine className="h-4 w-4" />
                      {hasBranchData(branch) ? "Editar" : "Configurar"}
                    </Button>
                    {filteredBranches.length > 1 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDeleteBranch(branch)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Botón de agregar sede */}
        {filteredBranches.length < 5 && (
          <motion.div
            initial={false}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Button
              variant="ghost"
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 w-full justify-center py-6 border-2 border-dashed border-gray-200 hover:border-gray-300 transition-colors"
              onClick={handleAddBranch}
            >
              <Plus className="h-4 w-4" />
              Agregar nueva sede
            </Button>
          </motion.div>
        )}
      </div>

      {/* Botón de continuar y mensaje de validación */}
      <div className="pt-4">
        <div className="flex flex-col items-end gap-2">
          {!hasConfiguredBranch && (
            <p className="text-sm text-amber-600 italic flex items-center">
              <Info className="h-4 w-4 mr-1" />
              Configura al menos una sede para continuar
            </p>
          )}
          <Button 
            onClick={handleContinue} 
            className="px-8 flex items-center gap-2"
            disabled={!hasConfiguredBranch}
          >
            Continuar
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Diálogo de confirmación de eliminación */}
      <AlertDialog open={branchToDelete !== null} onOpenChange={() => setBranchToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará la sede "{branchToDelete?.name}" y no se puede deshacer.
              Todos los datos asociados a esta sede se perderán permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => setBranchToDelete(null)}
              disabled={isDeleting}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={isDeleting}
            >
              {isDeleting ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
