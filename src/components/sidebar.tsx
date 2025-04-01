"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Menu,
  Settings,
  LogOut,
  ChevronUp,
  ChevronDown,
  CalendarDays,
  Users,
  FileText,
  Link as LinkIcon,
  ChevronLeft,
  Building,
  Network,
  UserCircle2,
  Lock
} from "lucide-react"
import { useState, useEffect, Suspense } from "react"
import { useBranches } from '@/hooks/useBranches'
import { Branch } from '@/types/branch'
import { IconLoader } from '@tabler/icons-react'
import { ConfirmBranchDialog } from "@/components/ui/confirm-branch-dialog"
import { useBranchContext } from '@/contexts/BranchContext'
import useOrganization from '@/hooks/useOrganization'
import { Zap } from "lucide-react"
import { UpgradeModal } from "@/components/modals/upgrade-modal"
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { BookingLimitStatus } from '@/components/booking/BookingLimitStatus'
import { PromoCard } from "@/components/sidebar/PromoCard"
import { FeedbackCard } from "@/components/sidebar/FeedbackCard"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  CustomTooltip,
  CustomTooltipContent,
  CustomTooltipProvider,
  CustomTooltipTrigger,
} from "@/components/ui/custom-tooltip"

// Función auxiliar para obtener las iniciales
function getInitials(name: string | null | undefined): string {
  if (!name?.trim()) return 'N/A'
  
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

// Función para truncar texto largo
function truncateText(text: string, maxLength: number = 20): string {
  if (!text) return '';
  return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
}

// Función para verificar si una ruta está activa
function isRouteActive(currentPath: string, menuPath: string): boolean {
  // Normalizar las rutas eliminando trailing slashes y convertir a minúsculas
  const normalizedCurrentPath = currentPath.toLowerCase().replace(/\/+$/, '')
  const normalizedMenuPath = menuPath.toLowerCase().replace(/\/+$/, '')
  
  // Casos especiales
  if (normalizedMenuPath === '/admin/dashboard') {
    return normalizedCurrentPath === normalizedMenuPath
  }
  
  // Comparación exacta
  if (normalizedCurrentPath === normalizedMenuPath) {
    return true
  }
  
  // Verificar si es una subruta
  if (normalizedCurrentPath.startsWith(normalizedMenuPath + '/')) {
    // Evitar falsos positivos con rutas similares
    // Ejemplo: /admin/dashboard/forms no debe activar /admin/dashboard/form-settings
    const nextChar = normalizedCurrentPath.charAt(normalizedMenuPath.length)
    return nextChar === '/' || nextChar === ''
  }
  
  return false
}

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {}

const menuItems = [
  {
    title: "Reservas",
    icon: CalendarDays,
    exact: true,
    hasSubMenu: true,
    href: "/admin/dashboard/bookings",
    subItems: [
      {
        title: "Reservaciones",
        href: "/admin/dashboard/bookings/reservations",
      },
      {
        title: "Clases",
        href: "/admin/dashboard/bookings/classes",
        beta: true
      }
    ]
  },
  {
    title: "Usuarios",
    href: "/admin/dashboard/users",
    icon: Users,
    exact: true
  },
  {
    title: "Gestión",
    href: "/admin/dashboard/pricing",
    icon: FileText,
    exact: true,
    hasSubMenu: true,
    subItems: [
      {
        title: "Artículos",
        href: "/admin/dashboard/pricing/articles",
      },
      {
        title: "Pistas",
        href: "/admin/dashboard/pricing/courts",
      },
      {
        title: "Facturación",
        href: "/admin/dashboard/pricing/billing",
      },
      {
        title: "Cupones",
        href: "/admin/dashboard/pricing/coupons",
        soon: true // Marcador para indicar que esta funcionalidad es "Proximamente"
      }
    ]
  },
  {
    title: "Socios",
    href: "/admin/dashboard/partners",
    icon: UserCircle2,
    exact: true,
    hasSubMenu: true,
    subItems: [
      {
        title: "Membresias",
        href: "/admin/dashboard/partners/memberships",
        soon: true // Marcador para indicar que esta funcionalidad es "Proximamente"
      }
    ]
  },
  {
    title: "Links",
    href: "/admin/dashboard/links",
    icon: LinkIcon,
    exact: false
  }
]

const settingsMenuItems = [
  {
    label: "Empresa",
    value: "company",
    icon: Building
  },
  {
    label: "Sucursales",
    value: "branches",
    icon: Network
  },
  {
    label: "Integraciones",
    value: "integrations",
    icon: LinkIcon
  },
  /* Comentado temporalmente - sección de Miembros oculta
  {
    label: "Miembros",
    value: "members",
    icon: UserCircle2
  },
  */
  {
    label: "Usuario",
    value: "user",
    icon: Users
  }
] as const

// Extraer la lógica de cierre de sesión a un hook personalizado
function useSignOut() {
  const { signOut } = useAuth()

  const handleSignOut = async () => {
    try {
      await signOut()
      // No necesitamos hacer nada más aquí, ya que signOut maneja todo
    } catch (error) {
      console.error('Error al cerrar sesión:', error)
      toast.error('Error al cerrar sesión')
    }
  }

  return handleSignOut
}

function SidebarHeader() {
  const { 
    branches, 
    isLoading, 
    isError,
    currentBranch,
    setCurrentBranch
  } = useBranches()
  const [branchToSwitch, setBranchToSwitch] = useState<Branch | null>(null)
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 })

  const handleBranchSelection = async (branch: Branch, event: React.MouseEvent) => {
    if (currentBranch?.id === branch.id) return
    
    const button = event.currentTarget as HTMLElement
    const rect = button.getBoundingClientRect()
    
    setPopupPosition({
      x: rect.right + 10,
      y: rect.top - 10
    })
    
    setBranchToSwitch(branch)
  }

  const handleConfirmBranchChange = async () => {
    if (branchToSwitch) {
      await setCurrentBranch(branchToSwitch)
      setBranchToSwitch(null)
    }
  }

  return (
    <>
      <Popover>
        <PopoverTrigger asChild>
          <div className="relative p-3 pl-4">
            <div className="inline-flex items-center cursor-pointer hover:bg-gray-200/50 rounded-lg transition-colors px-3 py-2 group">
              {/* Cuadrado con iniciales */}
              <div className="flex-shrink-0 w-6 h-6 bg-gray-50 rounded flex items-center justify-center mr-2 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.03)]">
                <span className="text-xs font-semibold text-gray-600">
                  {isLoading ? '--' : isError ? 'ER' : getInitials(currentBranch?.name || 'SN')}
                </span>
              </div>
              
              {/* Nombre de la sede */}
              <div className="min-w-0">
                <h3 className="text-[13px] font-medium truncate text-gray-700">
                  {isLoading ? 'Cargando...' : isError ? 'Error al cargar sucursales' : truncateText(currentBranch?.name || 'Sin sucursal', 18)}
                </h3>
              </div>
            </div>
            <div className="absolute bottom-0 left-7 w-20 h-px bg-gray-200/75" />
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-[240px] p-2" align="start" side="right">
          <div className="space-y-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <IconLoader className="h-5 w-5 animate-spin text-gray-500" />
              </div>
            ) : isError ? (
              <div className="text-sm text-red-500 text-center py-4">
                Error al cargar las sucursales
              </div>
            ) : branches.length === 0 ? (
              <div className="text-sm text-gray-500 text-center py-4">
                No hay sedes disponibles
              </div>
            ) : (
              branches.map((branch) => (
                <button
                  key={branch.id}
                  onClick={(e) => handleBranchSelection(branch, e)}
                  className={cn(
                    "w-full flex items-center gap-3 p-2 rounded-md hover:bg-accent text-sm",
                    currentBranch?.id === branch.id && "bg-accent"
                  )}
                >
                  {/* Cuadrado con iniciales para cada sede en el menú desplegable */}
                  <div className="flex-shrink-0 w-5 h-5 bg-gray-50 rounded flex items-center justify-center shadow-[inset_0_0_0_1px_rgba(0,0,0,0.03)]">
                    <span className="text-[10px] font-semibold text-gray-600">
                      {getInitials(branch.name)}
                    </span>
                  </div>
                  <span className="font-medium truncate">{branch.name}</span>
                </button>
              ))
            )}
            <div className="border-t my-2" />
            <Link
              href="/admin/dashboard/settings?tab=integrations"
              className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-accent text-sm text-muted-foreground"
            >
              <span>Administrar sucursales</span>
            </Link>
          </div>
        </PopoverContent>
      </Popover>

      <ConfirmBranchDialog
        isOpen={!!branchToSwitch}
        onClose={() => setBranchToSwitch(null)}
        onConfirm={handleConfirmBranchChange}
        currentBranch={currentBranch}
        newBranch={branchToSwitch}
        position={popupPosition}
      />
    </>
  )
}

function SidebarFooter() {
  const router = useRouter()
  const pathname = usePathname()
  const handleSignOut = useSignOut()
  const [showSettings, setShowSettings] = useState(false)

  const handleConfigClick = () => {
    setShowSettings(true)
    router.push('/admin/dashboard/settings?tab=company')
  }

  return (
    <div className="mt-auto border-t border-slate-200/25">
      {/* Opciones de configuración y salida */}
      <div className="p-3 space-y-1">
        <button 
          onClick={handleConfigClick}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl w-full",
            "text-gray-500 hover:text-gray-900",
            "hover:bg-white hover:shadow-[0_1px_2px_rgba(0,0,0,0.02)]",
            "transition-all duration-200",
            "group text-[14px] font-medium"
          )}
        >
          <Settings className="h-3.5 w-3.5 transition-transform duration-200 group-hover:scale-110" />
          Configuración
        </button>

        <button 
          onClick={handleSignOut}
          className={cn(
            "w-full flex items-center gap-2 px-4 py-2 rounded-xl",
            "text-gray-500 hover:text-red-600",
            "hover:bg-white hover:shadow-[0_1px_2px_rgba(0,0,0,0.02)]",
            "transition-all duration-200",
            "group text-[14px] font-medium"
          )}
        >
          <LogOut className="h-3.5 w-3.5 transition-transform duration-200 group-hover:scale-110" />
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}

function MobileNav() {
  const pathname = usePathname()
  const [expandedItem, setExpandedItem] = useState<string | null>(null)
  
  return (
    <div className="h-full flex flex-col">
      <div className="pt-3">
        <SidebarHeader />
      </div>
      <ScrollArea className="flex-1">
        <nav className="flex flex-col gap-1 px-3 mt-6">
          {menuItems.map((item) => (
            <MenuItem
              key={item.href}
              item={item}
              isActive={isRouteActive(pathname, item.href)}
              isExpanded={expandedItem === item.title}
              onToggle={() => {
                setExpandedItem(expandedItem === item.title ? null : item.title)
              }}
              pathname={pathname}
            />
          ))}
        </nav>
      </ScrollArea>
      <PromoCard />
      <SidebarFooter />
    </div>
  )
}

// Rutas donde no queremos mostrar el sidebar
const HIDDEN_SIDEBAR_ROUTES = [
  '/',
  '/page',
  '/admin/page',
  '/admin',
  '/admin/',
  '/admin/dashboard/forms-a/new'
] as const

// Función para verificar si el sidebar debe ocultarse
function shouldHideSidebar(pathname: string): boolean {
  return HIDDEN_SIDEBAR_ROUTES.includes(pathname as any) || 
         pathname.startsWith('/admin/page')
}

function SettingsView({ 
  onBack, 
  activeTab,
  onTabChange
}: { 
  onBack: () => void
  activeTab: string
  onTabChange: (tab: string) => void
}) {
  const router = useRouter()
  
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <SettingsContent onBack={onBack} activeTab={activeTab} onTabChange={onTabChange} />
    </Suspense>
  )
}

function SettingsContent({ 
  onBack, 
  activeTab,
  onTabChange
}: { 
  onBack: () => void
  activeTab: string
  onTabChange: (tab: string) => void
}) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleBack = () => {
    router.push('/admin/dashboard/bookings/reservations')
  }

  const handleTabChange = (value: string) => {
    onTabChange(value)
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', value)
    router.push(`/admin/dashboard/settings?${params.toString()}`)
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4">
        <button
          onClick={handleBack}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-lg",
            "text-gray-500 hover:text-gray-900",
            "bg-white/50 hover:bg-white",
            "border border-gray-200/60",
            "shadow-[0_1px_2px_rgba(0,0,0,0.02)]",
            "transition-all duration-200",
            "text-[13px] font-medium"
          )}
        >
          <ChevronLeft className="h-4 w-4" />
          Volver
        </button>
      </div>
      <ScrollArea className="flex-1">
        <nav className="flex flex-col gap-1 px-3 mt-2">
          {settingsMenuItems.map((item) => (
            <button 
              key={item.value}
              onClick={() => handleTabChange(item.value)}
              className={cn(
                "relative flex items-center gap-2.5 px-4 py-2 text-[14px] font-medium rounded-xl transition-all duration-200",
                "border border-transparent",
                "group text-left w-full",
                activeTab === item.value
                  ? "bg-white border-gray-100 text-gray-900 shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
                  : "text-gray-500 hover:bg-white hover:border-gray-100 hover:text-gray-900 hover:shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
              )}
            >
              <item.icon 
                className={cn(
                  "w-3.5 h-3.5 transition-transform duration-200 ease-out",
                  "group-hover:scale-110"
                )} 
              />
              {item.label}
              {activeTab === item.value && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full" />
              )}
            </button>
          ))}
        </nav>
      </ScrollArea>
    </div>
  )
}

function MenuItem({ 
  item, 
  isActive, 
  isExpanded, 
  onToggle,
  pathname 
}: { 
  item: typeof menuItems[0]
  isActive: boolean
  isExpanded: boolean
  onToggle: () => void
  pathname: string
}) {
  const hasActiveSubItem = item.subItems?.some(subItem => 
    isRouteActive(pathname, subItem.href)
  ) ?? false

  const isMainItemActive = isActive && !hasActiveSubItem

  const commonClasses = cn(
    "relative flex items-center gap-2.5 px-3 py-1.5",
    "text-sm font-medium rounded-lg",
    "border border-transparent",
    "group w-full transition-all duration-200",
    isMainItemActive
      ? "bg-white/60 text-gray-900 shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
      : "text-gray-500 hover:bg-white/40 hover:text-gray-900"
  )

  return (
    <div className="flex flex-col">
      {item.hasSubMenu ? (
        <button
          onClick={onToggle}
          className={commonClasses}
        >
          <item.icon 
            className={cn(
              "w-4 h-4 stroke-[1.5px] transition-transform duration-200",
              "group-hover:scale-105",
              item.title === "Links" && "-scale-x-100"
            )} 
          />
          <span className="flex-1 text-left text-sm">{item.title}</span>
          <ChevronDown
            className={cn(
              "w-3.5 h-3.5 stroke-[1.5px] transition-transform duration-200",
              isExpanded && "rotate-180"
            )}
          />
          {isMainItemActive && (
            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-gray-300 rounded-full" />
          )}
        </button>
      ) : (
        <Link
          href={item.href}
          className={commonClasses}
        >
          <item.icon 
            className={cn(
              "w-4 h-4 stroke-[1.5px] transition-transform duration-200",
              "group-hover:scale-105",
              item.title === "Links" && "-scale-x-100"
            )} 
          />
          <span className="flex-1 text-left text-sm">{item.title}</span>
          {isMainItemActive && (
            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-gray-300 rounded-full" />
          )}
        </Link>
      )}
      
      {item.hasSubMenu && (
        <div
          className={cn(
            "overflow-hidden transition-all duration-200 ease-in-out",
            isExpanded ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
          )}
        >
          <div className="pl-8 pr-3 py-1 space-y-1">
            {item.subItems?.map((subItem) => {
              if ('soon' in subItem && subItem.soon) {
                return (
                  <CustomTooltipProvider key={subItem.href}>
                    <CustomTooltip>
                      <CustomTooltipTrigger asChild>
                        <div
                          className={cn(
                            "flex items-center px-3 py-1.5 cursor-default",
                            "text-xs font-medium rounded-lg",
                            "text-gray-400 bg-white/20",
                            "border border-transparent",
                            "pointer-events-auto"
                          )}
                        >
                          <span className="flex-1 text-left">{subItem.title}</span>
                          <Lock className="h-3 w-3 text-gray-400 ml-1" />
                        </div>
                      </CustomTooltipTrigger>
                      <CustomTooltipContent 
                        side="right" 
                        align="start"
                        sideOffset={5}
                      >
                        <p>¡Proximamente!</p>
                      </CustomTooltipContent>
                    </CustomTooltip>
                  </CustomTooltipProvider>
                );
              }
              
              return (
                <Link
                  key={subItem.href}
                  href={subItem.href}
                  className={cn(
                    "flex items-center px-3 py-1.5",
                    "text-xs font-medium rounded-lg",
                    "text-gray-500 transition-all duration-200",
                    "hover:text-gray-900 hover:bg-white/40",
                    isRouteActive(pathname, subItem.href) && 
                    "bg-white/60 text-gray-900 shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
                  )}
                >
                  {subItem.title}
                  {'beta' in subItem && subItem.beta && (
                    <span className="ml-1.5 px-1.5 py-0.5 text-[9px] font-medium bg-gray-100 text-gray-700 rounded-sm">
                      BETA
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function SidebarContent() {
  const pathname = usePathname()
  const [expandedItem, setExpandedItem] = useState<string | null>(null)
  
  return (
    <>
      <div className="pt-3">
        <SidebarHeader />
      </div>
      <ScrollArea className="flex-1">
        <nav className="flex flex-col gap-1 px-3 mt-6">
          {menuItems.map((item) => (
            <MenuItem
              key={item.href}
              item={item}
              isActive={isRouteActive(pathname, item.href)}
              isExpanded={expandedItem === item.title}
              onToggle={() => {
                setExpandedItem(expandedItem === item.title ? null : item.title)
              }}
              pathname={pathname}
            />
          ))}
        </nav>
      </ScrollArea>
      <PromoCard />
      <FeedbackCard className="mt-1" />
      <SidebarFooter />
    </>
  )
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [isVisible, setIsVisible] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [activeSettingsTab, setActiveSettingsTab] = useState("company")
  const [previousPath, setPreviousPath] = useState<string | null>(null)
  const [expandedItem, setExpandedItem] = useState<string | null>(null)
  const handleSignOut = useSignOut()
  const { user } = useAuth()

  useEffect(() => {
    setIsVisible(!shouldHideSidebar(pathname))
  }, [pathname])

  useEffect(() => {
    // Detectar cuando estamos en la página de configuración
    if (pathname === '/admin/dashboard/settings') {
      setShowSettings(true)
    } else {
      setShowSettings(false)
    }
  }, [pathname])

  if (!isVisible) {
    return null
  }

  const toggleSettings = () => {
    if (!showSettings) {
      setPreviousPath(pathname)
      router.push('/admin/dashboard/settings?tab=company')
    } else {
      if (previousPath) {
        router.push(previousPath)
      }
    }
    setShowSettings(prev => !prev)
    setActiveSettingsTab("company")
  }

  const handleSettingsTabChange = (tab: string) => {
    setActiveSettingsTab(tab)
    router.push(`/admin/dashboard/settings?tab=${tab}`)
  }

  return (
    <CustomTooltipProvider>
      <Sheet>
        <SheetTrigger asChild className="lg:hidden">
          <Button variant="outline" size="icon" className="w-10 h-10">
            <Menu className="h-4 w-4" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[240px] p-0">
          <MobileNav />
        </SheetContent>
        <aside
          className={cn(
            "fixed hidden h-screen bg-[#F5F5F5] lg:block w-[240px] z-30 overflow-hidden",
            "transition-all duration-300 ease-in-out",
            isVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-full",
            className || ""
          )}
        >
          <div className="relative h-full">
            <div 
              className={cn(
                "absolute inset-0 flex flex-col transition-transform duration-300 ease-in-out",
                showSettings ? "-translate-x-full" : "translate-x-0"
              )}
            >
              <SidebarContent />
            </div>

            <div 
              className={cn(
                "absolute inset-0 transition-transform duration-300 ease-in-out",
                showSettings ? "translate-x-0" : "translate-x-full"
              )}
            >
              <SettingsView 
                onBack={toggleSettings}
                activeTab={activeSettingsTab}
                onTabChange={handleSettingsTabChange}
              />
            </div>
          </div>
        </aside>
      </Sheet>
    </CustomTooltipProvider>
  )
}
