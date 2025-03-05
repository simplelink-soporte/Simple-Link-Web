import { useState, useRef, useEffect } from 'react'

interface UseTableNavigationProps {
  totalCourts: number
}

const MAX_VISIBLE_COURTS = 4
const TIME_COLUMN_WIDTH = 60

export function useTableNavigation({ totalCourts }: UseTableNavigationProps) {
  const [visibleCourtsStart, setVisibleCourtsStart] = useState(0)
  const [tableWidth, setTableWidth] = useState(0)
  const tableContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!tableContainerRef.current) return

    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        setTableWidth(entry.contentRect.width)
      }
    })

    resizeObserver.observe(tableContainerRef.current)
    return () => resizeObserver.disconnect()
  }, [])

  const handleTableNavigation = (direction: 'left' | 'right') => {
    if (direction === 'left') {
      setVisibleCourtsStart(prev => Math.max(0, prev - 1))
    } else {
      const maxStart = Math.max(0, totalCourts - MAX_VISIBLE_COURTS)
      setVisibleCourtsStart(prev => Math.min(maxStart, prev + 1))
    }
  }

  const getCourtColumnWidth = () => {
    if (!tableContainerRef.current) return '0px'
    const containerWidth = tableContainerRef.current.clientWidth
    const availableWidth = containerWidth - TIME_COLUMN_WIDTH
    const columnWidth = Math.floor(availableWidth / Math.min(MAX_VISIBLE_COURTS, totalCourts))
    return `${Math.max(columnWidth, 150)}px` // Mínimo 150px por columna
  }

  return {
    visibleCourtsStart,
    tableContainerRef,
    handleTableNavigation,
    getCourtColumnWidth
  }
} 