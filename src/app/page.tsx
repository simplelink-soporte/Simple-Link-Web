"use client" // Marca el componente como un componente del cliente

import { useEffect } from 'react'
import { useRouter } from 'next/navigation' // Cambia a next/navigation

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    // Redirige al usuario a la ruta correcta del dashboard
    router.push('/admin/dashboard/bookings/reservations')
  }, [router])

  return null // No renderiza nada ya que redirige inmediatamente
}
