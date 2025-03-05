"use client"

import { motion } from 'framer-motion'
import { IconCalendar, IconClock, IconCheck } from '@tabler/icons-react'
import { cn } from '@/lib/utils'
import type { ClassPackage } from '../types/models'

interface PackageCardProps {
  package: ClassPackage
  isSelected: boolean
  onClick: () => void
}

export function PackageCard({ package: pkg, isSelected, onClick }: PackageCardProps) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "relative w-full p-4 rounded-lg border text-left",
        "transition-all duration-200",
        isSelected
          ? "bg-gray-50 border-gray-900/10 shadow-sm"
          : "bg-white border-gray-200 hover:border-gray-300"
      )}
    >
      <div className="flex flex-col gap-2">
        {/* Encabezado con tag */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-gray-900">
                {pkg.title}
              </h3>
              {pkg.tag && (
                <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs font-medium">
                  {pkg.tag}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500">
              {pkg.description}
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold text-gray-900">
              ${pkg.price.toLocaleString('es-AR')}
            </p>
            <p className="text-xs text-gray-500">
              ${(pkg.price / pkg.numberOfClasses).toLocaleString('es-AR')} por clase
            </p>
          </div>
        </div>

        {/* Características */}
        <div className="flex flex-wrap gap-3">
          {pkg.features?.map((feature, index) => {
            const Icon = feature.icon === 'calendar' ? IconCalendar :
                        feature.icon === 'clock' ? IconClock : IconCheck

            return (
              <div key={index} className="flex items-center gap-1.5">
                <Icon className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600">{feature.text}</span>
              </div>
            )
          })}
        </div>
      </div>
    </motion.button>
  )
} 