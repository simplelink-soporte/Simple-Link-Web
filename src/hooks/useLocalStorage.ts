"use client"

import { useState, useEffect } from 'react'

type SetValue<T> = T | ((val: T) => T)

/**
 * Hook personalizado para almacenar y recuperar valores del localStorage,
 * con soporte para valores iniciales, tipado fuerte y sincronización entre pestañas.
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: SetValue<T>) => void] {
  // Creamos un state para mantener el valor
  const [storedValue, setStoredValue] = useState<T>(initialValue)

  // Inicializar el valor desde localStorage si existe
  useEffect(() => {
    try {
      // Verificar si estamos en el cliente (no en SSR)
      if (typeof window !== 'undefined') {
        const item = window.localStorage.getItem(key)
        // Parsear el valor almacenado o usar el valor inicial
        setStoredValue(item ? JSON.parse(item) : initialValue)
      }
    } catch (error) {
      console.error(`Error loading localStorage key "${key}":`, error)
      // En caso de error, usar el valor inicial
      setStoredValue(initialValue)
    }
  }, [key, initialValue])

  // Función para actualizar el valor en localStorage y state
  const setValue = (value: SetValue<T>) => {
    try {
      // Permitir un valor o una función para actualizar el valor
      const valueToStore =
        value instanceof Function ? value(storedValue) : value
        
      // Guardar en el state
      setStoredValue(valueToStore)
      
      // Guardar en localStorage, pero solo si estamos en el cliente
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore))
      }
    } catch (error) {
      console.error(`Error saving localStorage key "${key}":`, error)
    }
  }

  return [storedValue, setValue]
}
