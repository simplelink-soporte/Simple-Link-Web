'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Plus, PenLine, HelpCircle, Trash2, Check } from 'lucide-react'
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

export function SucursalSelection({ onNext, onConfigureBranch }: SucursalSelectionProps) {
  const { completeAndAdvance, branches, setBranches, setCurrentBranchId } = useOnboarding()
  const { user } = useAuth()
  const [branchToDelete, setBranchToDelete] = useState<Branch | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Cargar sedes al montar el componente
  useEffect(() => {
    const loadBranches = async () => {
      try {
        if (!user) {
          throw new Error('No hay usuario autenticado')
        }

        // 1. Obtener el ID de la empresa
        const empresaId = await onboardingBranchService.getEmpresaIdByUserId(user.id)
        
        // 2. Cargar las sedes
        const { data: branchesData, error } = await onboardingBranchService.getBranchesByEmpresaId(empresaId)
        
        if (error) {
          throw error
        }

        // 3. Actualizar el estado
        setBranches(branchesData)
      } catch (error: any) {
        console.error('Error al cargar sedes:', error)
        toast({
          title: "Error",
          description: error.message || "No se pudieron cargar las sedes",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadBranches()
  }, [user, setBranches])

  // Solo mostrar sedes que han sido configuradas
  const configuredBranches = branches.filter(branch => branch.data !== undefined)
  const hasConfiguredBranch = configuredBranches.length > 0

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
      const branch = branches.find(b => b.id === branchId)
      if (!branch) {
        throw new Error('No se encontró la sucursal')
      }

      // Cargar datos de la sede desde Supabase
      console.log('📍 Cargando datos de la sede:', branchId)
      const { data: branchData, error: branchError } = await onboardingBranchService.getBranchById(branchId)
      
      if (branchError) {
        console.error('❌ Error al cargar la sede:', branchError)
        throw new Error(branchError.message || 'Error al cargar los datos de la sede')
      }

      if (!branchData) {
        throw new Error('No se encontraron los datos de la sede')
      }

      // Cargar las canchas de la sede
      console.log('📍 Cargando canchas de la sede:', branchId)
      const { data: courtsData, error: courtsError } = await supabase
        .from('courts')
        .select('*')
        .eq('branch_id', branchId)

      if (courtsError) {
        console.error('❌ Error al cargar las canchas:', courtsError)
        throw new Error(courtsError.message || 'Error al cargar las canchas')
      }

      // Transformar los datos de las canchas al formato del formulario
      const formattedCourts = (courtsData || []).map(court => {
        // Convertir el deporte a array
        const sports = [court.sport]

        // Mapear el tipo de pista al formato del formulario
        const typeMap: Record<string, string> = {
          'indoor': 'interior',
          'outdoor': 'exterior',
          'covered': 'cubierta'
        }

        // Mapear las características basadas en surface y features
        const characteristics = []
        const surfaceMap: Record<string, string> = {
          'crystal': 'cristal-estandar',
          'panoramic': 'cristal-panoramico',
          'concrete': 'muro-hormigon',
          'synthetic': 'cesped-sintetico',
          'clay': 'tierra-batida',
          'rubber': 'goma-profesional'
        }
        if (surfaceMap[court.surface]) {
          characteristics.push(surfaceMap[court.surface])
        }
        if (Array.isArray(court.features)) {
          const featureMap: Record<string, string> = {
            'wall-glass': 'cristal-estandar',
            'wall-panoramic': 'cristal-panoramico',
            'wall-concrete': 'muro-hormigon',
            'floor-synthetic': 'cesped-sintetico',
            'floor-clay': 'tierra-batida',
            'floor-concrete': 'hormigon-pulido',
            'floor-rubber': 'goma-profesional'
          }
          court.features.forEach(feature => {
            if (featureMap[feature] && !characteristics.includes(featureMap[feature])) {
              characteristics.push(featureMap[feature])
            }
          })
        }

        // Preparar los precios y rangos de tiempo
        const prices = court.available_durations.map(duration => {
          const price = {
            duration: duration.toString(),
            price: (court.duration_pricing?.[duration] || 0).toString(),
            timeRanges: []
          }

          // Agregar rangos de tiempo si existen
          Object.entries(court.custom_pricing || {}).forEach(([day, data]) => {
            if (data.isSelected && Array.isArray(data.timeRanges)) {
              data.timeRanges.forEach(range => {
                price.timeRanges.push({
                  day,
                  start: range.startTime,
                  end: range.endTime,
                  percentage: range.percentage.toString()
                })
              })
            }
          })

          return price
        })

        return {
          id: court.id,
          name: court.name,
          sports,
          type: typeMap[court.court_type] || 'interior',
          characteristics,
          durations: court.available_durations.map(d => d.toString()),
          prices
        }
      })

      console.log('✅ Datos de la sede y canchas cargados:', { sede: branchData, canchas: formattedCourts })
      setCurrentBranchId(branchId)
      
      // Transformar los datos al formato esperado por el formulario
      const formattedData = {
        id: branchData.id,
        name: branchData.name || '',
        address: branchData.address || '',
        phone: branchData.phone || '',
        manager: branchData.manager_id || '',
        isActive: branchData.is_active ?? true,
        opening_hours: branchData.opening_hours || {},
        courts: formattedCourts
      }
        
        // Actualizar los datos en el contexto
      console.log('📍 Actualizando datos en el contexto:', formattedData)
      
      setBranches(prev => {
        const updatedBranches = prev.map(b => 
          b.id === branchId 
            ? { 
                ...b, 
                data: {
                  ...formattedData,
                  courts: formattedCourts
                }
              }
            : b
        )
        console.log('📍 Estado actualizado de las sedes:', updatedBranches)
        return updatedBranches
      })
      
      // También actualizamos el currentBranchId
      setCurrentBranchId(branchId)
      
      // Llamar a onConfigureBranch después de actualizar el estado
      setTimeout(() => {
      onConfigureBranch()
      }, 0)
    } catch (error: any) {
      console.error('❌ Error al configurar la sede:', error)
      toast({
        title: "Error",
        description: error.message || "No se pudieron cargar los datos de la sede",
        variant: "destructive",
      })
    }
  }

  const handleContinue = () => {
    if (hasConfiguredBranch) {
      completeAndAdvance(1)
    }
  }

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
          {configuredBranches.map((branch, index) => (
            <motion.div
              key={branch.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2, delay: index * 0.1 }}
            >
              <Card className="relative overflow-hidden hover:border-black hover:border transition-all duration-200">
                <div className="p-6 flex justify-between items-center">
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">
                      {branch.data?.name || branch.name}
                    </h3>
                    <div className="space-y-1">
                      {branch.data && (
                        <>
                          <p className="text-xs text-muted-foreground">
                            {branch.data.courts.length} {branch.data.courts.length === 1 ? 'pista' : 'pistas'} configuradas
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {branch.data.address}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {branch.data.phone}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                      onClick={() => handleConfigureBranch(branch.id)}
                    >
                      <PenLine className="h-4 w-4" />
                      Editar
                    </Button>
                    {configuredBranches.length > 1 && (
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
        {configuredBranches.length < 5 && (
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
        <div className="flex justify-end">
          <Button 
            onClick={handleContinue} 
            className="px-8"
            disabled={!hasConfiguredBranch}
          >
            Continuar
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
