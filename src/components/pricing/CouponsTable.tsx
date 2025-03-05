"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { IconPlus, IconTrash, IconEdit, IconDots, IconFilter, IconChevronLeft, IconChevronRight } from "@tabler/icons-react"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select-3"
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog"
import { NewCouponModal } from "./NewCouponModal"
import type { Coupon } from "@/types/coupon"

// Datos de ejemplo
const initialCoupons: Coupon[] = [
  {
    id: '1',
    code: 'VERANO2024',
    type: 'percentage',
    value: 15,
    validUntil: new Date('2024-08-31'),
    isActive: true,
    usageLimit: 100,
    usageCount: 45,
    minPurchase: 50,
    name: 'Descuento de Verano'
  },
  {
    id: '2', 
    code: 'BIENVENIDA',
    type: 'fixed',
    value: 10,
    validUntil: new Date('2024-12-31'),
    isActive: true,
    usageCount: 23,
    usageLimit: 50,
    minPurchase: 0,
    name: 'Cupón de Bienvenida'
  }
]

export function CouponsTable() {
  const [coupons, setCoupons] = useState<Coupon[]>(initialCoupons)
  const [currentPage, setCurrentPage] = useState(1)
  const [filters, setFilters] = useState({
    search: "",
    type: "all",
  })
  const itemsPerPage = 10
  const [confirmDelete, setConfirmDelete] = useState<{
    isOpen: boolean
    couponId: string | null
    couponCode: string
    position: { x: number; y: number }
  }>({
    isOpen: false,
    couponId: null,
    couponCode: '',
    position: { x: 0, y: 0 }
  })
  const [isNewCouponModalOpen, setIsNewCouponModalOpen] = useState(false)
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null)

  const handleDeleteClick = (e: React.MouseEvent, coupon: Coupon) => {
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    setConfirmDelete({
      isOpen: true,
      couponId: coupon.id,
      couponCode: coupon.code,
      position: {
        x: rect.left - 320,
        y: rect.top
      }
    })
  }

  const handleConfirmDelete = () => {
    if (confirmDelete.couponId) {
      setCoupons(prev => prev.filter(coupon => coupon.id !== confirmDelete.couponId))
      setConfirmDelete({ isOpen: false, couponId: null, couponCode: '', position: { x: 0, y: 0 } })
    }
  }

  const formatValue = (coupon: Coupon) => {
    return coupon.type === 'percentage' 
      ? `${coupon.value}%`
      : `${coupon.value}€`
  }

  // Filtrar cupones
  const getFilteredCoupons = () => {
    return coupons.filter(coupon => {
      const matchesSearch = coupon.code.toLowerCase().includes(filters.search.toLowerCase())
      const matchesType = filters.type === "all" || coupon.type === filters.type
      return matchesSearch && matchesType
    })
  }

  // Obtener cupones de la página actual
  const getCurrentPageCoupons = () => {
    const filteredCoupons = getFilteredCoupons()
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return filteredCoupons.slice(startIndex, endIndex)
  }

  const totalPages = Math.ceil(getFilteredCoupons().length / itemsPerPage)

  const handleSaveCoupon = (couponData: Omit<Coupon, 'id'>) => {
    if (editingCoupon) {
      // Actualizar cupón existente
      setCoupons(prev => prev.map(coupon => 
        coupon.id === editingCoupon.id 
          ? { ...couponData, id: editingCoupon.id }
          : coupon
      ))
      setEditingCoupon(null)
    } else {
      // Crear nuevo cupón
      const newCoupon: Coupon = {
        ...couponData,
        id: `coupon-${Date.now()}`,
        usageCount: 0,
      }
      setCoupons(prev => [newCoupon, ...prev])
    }
    setIsNewCouponModalOpen(false)
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xl font-medium">Cupones de Descuento</h3>
        </div>

        <div className="flex items-center gap-2">
          {/* Filtros */}
          <Popover>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                size="icon"
                className="p-2 bg-white hover:bg-gray-50 rounded-md border border-gray-200 transition-colors"
              >
                <IconFilter className="h-4 w-4" stroke={1.5} />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2 text-sm">Buscar por código</h4>
                  <Input
                    placeholder="Escriba para buscar..."
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({
                      ...prev,
                      search: e.target.value
                    }))}
                  />
                </div>
                <div>
                  <h4 className="font-medium mb-2 text-sm">Tipo de descuento</h4>
                  <Select
                    value={filters.type}
                    onValueChange={(value) => setFilters(prev => ({
                      ...prev,
                      type: value
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos los tipos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los tipos</SelectItem>
                      <SelectItem value="percentage">Porcentaje</SelectItem>
                      <SelectItem value="fixed">Monto fijo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end pt-4 border-t">
                  <Button
                    variant="ghost"
                    onClick={() => setFilters({ search: "", type: "all" })}
                  >
                    Limpiar filtros
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <Button 
            onClick={() => setIsNewCouponModalOpen(true)}
            className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 flex items-center gap-2 text-sm shadow-sm transition-all duration-200"
          >
            <IconPlus className="h-5 w-5" />
            <span>Nuevo Cupón</span>
          </Button>
        </div>
      </div>

      {/* Tabla */}
      <div className="rounded-md border">
        <table className="min-w-full table-fixed bg-white">
          <thead>
            <tr>
              <th className="w-1/4 px-6 py-3 border-b border-gray-200 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Código
              </th>
              <th className="w-1/6 px-6 py-3 border-b border-gray-200 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Descuento
              </th>
              <th className="w-1/6 px-6 py-3 border-b border-gray-200 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Válido Hasta
              </th>
              <th className="w-1/6 px-6 py-3 border-b border-gray-200 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Usos
              </th>
              <th className="w-1/6 px-6 py-3 border-b border-gray-200 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Estado
              </th>
              <th className="w-20 px-4 py-3 border-b border-gray-200"></th>
            </tr>
          </thead>
          <tbody>
            {getCurrentPageCoupons().map((coupon) => (
              <tr 
                key={coupon.id}
                className="hover:bg-gray-50 cursor-pointer"
              >
                <td className="px-6 py-4 border-b border-gray-200">
                  <span className="text-sm font-medium">{coupon.code}</span>
                </td>
                <td className="px-6 py-4 border-b border-gray-200 text-center">
                  <span className="text-sm text-gray-500">{formatValue(coupon)}</span>
                </td>
                <td className="px-6 py-4 border-b border-gray-200 text-center">
                  <span className="text-sm text-gray-500">
                    {coupon.validUntil.toLocaleDateString()}
                  </span>
                </td>
                <td className="px-6 py-4 border-b border-gray-200 text-center">
                  <span className="text-sm text-gray-500">
                    {coupon.usageCount}{coupon.usageLimit ? `/${coupon.usageLimit}` : ''}
                  </span>
                </td>
                <td className="px-6 py-4 border-b border-gray-200 text-center">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    coupon.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {coupon.isActive ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-4 py-4 border-b border-gray-200 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <div className="p-2 hover:bg-gray-100 rounded-md transition-colors cursor-pointer">
                        <IconDots className="h-4 w-4 text-gray-500" />
                      </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[160px]">
                      <DropdownMenuItem>
                        <IconEdit className="h-4 w-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={(e) => handleDeleteClick(e, coupon)}
                        className="text-red-600 focus:text-red-600 focus:bg-red-50"
                      >
                        <IconTrash className="h-4 w-4 mr-2" />
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      <div className="flex items-center justify-between px-2 py-4">
        <div className="flex-1 text-sm text-gray-500">
          {getFilteredCoupons().length === 0 ? (
            "No se encontraron cupones"
          ) : (
            `${((currentPage - 1) * itemsPerPage) + 1} - ${Math.min(currentPage * itemsPerPage, getFilteredCoupons().length)} de ${getFilteredCoupons().length} cupones`
          )}
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            <IconChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
          >
            <IconChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ConfirmationDialog
        isOpen={confirmDelete.isOpen}
        onClose={() => setConfirmDelete(prev => ({ ...prev, isOpen: false }))}
        onConfirm={handleConfirmDelete}
        title="Eliminar cupón"
        description={`¿Estás seguro de que deseas eliminar el cupón "${confirmDelete.couponCode}"? Esta acción no se puede deshacer.`}
        position={confirmDelete.position}
      />

      <NewCouponModal
        isOpen={isNewCouponModalOpen}
        onClose={() => {
          setIsNewCouponModalOpen(false)
          setEditingCoupon(null)
        }}
        onSave={handleSaveCoupon}
        editingCoupon={editingCoupon || undefined}
        mode={editingCoupon ? 'edit' : 'create'}
      />
    </div>
  )
}
