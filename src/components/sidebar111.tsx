"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Menu, Settings, LogOut, ChevronUp, ChevronDown, Zap } from "lucide-react"
import { useState, useEffect } from "react"
import { useBranches } from '@/hooks/useBranches'
import { Branch } from '@/types/branch'
import { IconLoader } from '@tabler/icons-react'
import { ConfirmBranchDialog } from "@/components/ui/confirm-branch-dialog"
import { useBranchContext } from '@/contexts/BranchContext'
import { UpgradeModal } from "@/components/modals/upgrade-modal"

// Función auxiliar para obtener las iniciales
function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {}

const menuItems = [
  {
    title: "Reservas",
    href: "/dashboard/bookings",
  },
  {
    title: "Usuarios",
    href: "/dashboard/users",
  },
  {
    title: "Artículos",
    href: "/dashboard/pricing",
  },
  {
    title: "Formularios",
    href: "/dashboard/forms-a",
  }
]

function SidebarHeader() {
  const { 
    branches, 
    isLoading, 
    isError,
    error,
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
          <div className="flex items-center gap-2 p-4 cursor-pointer hover:bg-accent rounded-lg transition-colors">
            <div className="h-9 w-9 rounded-lg bg-black flex items-center justify-center">
              <span className="text-white text-sm font-bold">
                {isLoading ? (
                  <IconLoader className="h-3.5 w-3.5 animate-spin" />
                ) : isError ? (
                  'ERR'
                ) : currentBranch ? (
                  getInitials(currentBranch.name)
                ) : (
                  'N/A'
                )}
              </span>
            </div>
            <div className="flex-1 pl-4">
              <h3 className="text-[15px] font-medium">
                {isLoading ? 'Cargando...' : isError ? 'Error al cargar sucursales' : currentBranch?.name || 'Sin sucursal'}
              </h3>
              <p className="text-sm text-gray-500">Plan gratuito</p>
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
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
                {error?.message || 'Error al cargar las sucursales'}
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
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-xs font-medium">{getInitials(branch.name)}</span>
                  </div>
                  <span className="font-medium">{branch.name}</span>
                </button>
              ))
            )}
            <div className="border-t my-2" />
            <Link
              href="/dashboard/settings"
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
  return (
    <div className="mt-auto border-t border-slate-200/25">
      <div className="flex items-center gap-2 p-4">
        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
          <span className="text-sm font-medium">AA</span>
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-medium">Admin Account</h3>
          <p className="text-xs text-muted-foreground">admin@padel.com</p>
        </div>
        <Link href="/dashboard/settings">
          <Button variant="ghost" size="icon">
            <Settings className="h-4 w-4" />
          </Button>
        </Link>
        <Button 
          variant="ghost" 
          size="icon"
          className="hover:text-red-600/90 transition-colors"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

function PromoCard() {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <>
      <div className="px-3 mb-4">
        <div 
          onClick={() => setIsModalOpen(true)}
          className="p-3.5 rounded-xl bg-gradient-to-br from-gray-50/80 to-gray-100/30 border border-gray-200/40 cursor-pointer hover:bg-gray-50/40 transition-colors"
        >
          <div className="flex items-start">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Zap className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="flex-1 ml-2.5">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-medium text-gray-900">Upgrade</h4>
              </div>
              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                Obtenga acceso Pro | Simple Link
              </p>
            </div>
          </div>
        </div>
      </div>
      <UpgradeModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  )
}

function MobileNav() {
  const pathname = usePathname()

  return (
    <div className="flex h-full flex-col bg-gray-50/10">
      <div className="pt-3">
        <SidebarHeader />
      </div>
      <ScrollArea className="flex-1">
        <nav className="flex flex-col gap-1 px-3 mt-6">
          {menuItems.map((item) => (
            <Link 
              key={item.href} 
              href={item.href}
              className={cn(
                "relative px-4 py-2 text-[15px] font-medium rounded-xl transition-all duration-200",
                "border border-transparent",
                pathname === item.href
                  ? "bg-gray-100/60 border-gray-200/50 text-gray-900"
                  : "text-gray-600 hover:bg-gray-100/40 hover:border-gray-200/40 hover:text-gray-900"
              )}
            >
              {item.title}
            </Link>
          ))}
        </nav>
      </ScrollArea>
      <PromoCard />
      <SidebarFooter />
    </div>
  )
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname()
  const { currentBranch, setCurrentBranch } = useBranchContext()
  const { branches } = useBranches()

  const handleBranchSelect = (branch: Branch) => {
    console.log('🔄 Seleccionando sede:', branch)
    setCurrentBranch(branch)
  }

  return (
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
          "fixed hidden h-screen border-r border-slate-200/55 bg-gray-50/10 lg:block w-[240px]",
          className || ""
        )}
      >
        <div className="flex h-full flex-col">
          <div className="pt-3">
            <SidebarHeader />
          </div>
          <ScrollArea className="flex-1">
            <nav className="flex flex-col gap-1 px-3 mt-6">
              {menuItems.map((item) => (
                <Link 
                  key={item.href} 
                  href={item.href}
                  className={cn(
                    "relative px-4 py-2 text-[15px] font-medium rounded-xl transition-all duration-200",
                    "border border-transparent",
                    pathname === item.href
                      ? "bg-gray-100/60 border-gray-200/50 text-gray-900"
                      : "text-gray-600 hover:bg-gray-100/40 hover:border-gray-200/40 hover:text-gray-900"
                  )}
                >
                  {item.title}
                </Link>
              ))}
            </nav>
          </ScrollArea>
          <PromoCard />
          <SidebarFooter />
        </div>
      </aside>
    </Sheet>
  )
}
