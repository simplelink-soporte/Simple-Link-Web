"use client"

import { motion } from "framer-motion"
import { Check, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useState } from "react"

interface PlanFeature {
  text: string
  included: boolean
}

interface PlanCardProps {
  name: string
  subtitle: string
  price: number
  features: PlanFeature[]
  isPopular?: boolean
  iconColor?: string
  onSelect: () => void
}

export function PlanCard({
  name,
  subtitle,
  price,
  features,
  isPopular,
  iconColor = "text-primary",
  onSelect
}: PlanCardProps) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div 
      className="relative p-8"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Background highlight effect */}
      <motion.div
        initial={false}
        animate={{
          opacity: isHovered ? 1 : 0,
          scale: isHovered ? 1 : 0.98
        }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 25
        }}
        className={cn(
          "absolute inset-0 -z-10",
          "rounded-3xl",
          isPopular ? "bg-[#1C1C1C]" : "bg-[#F5F5F5]"
        )}
      >
        {/* Highlight text */}
        <motion.div
          initial={false}
          animate={{
            opacity: isHovered ? 1 : 0,
            y: isHovered ? 0 : 10
          }}
          transition={{ delay: 0.1 }}
          className={cn(
            "absolute -top-12 left-1/2 -translate-x-1/2 whitespace-nowrap",
            "text-sm font-medium px-4 py-2 rounded-full",
            isPopular 
              ? "bg-zinc-900 text-zinc-100" 
              : "bg-zinc-200 text-zinc-700"
          )}
        >
          {isPopular ? "Ideal para empresas en crecimiento" : "Perfecto para equipos pequeños"}
        </motion.div>
      </motion.div>

      {/* Main card */}
      <div className={cn(
        "relative rounded-2xl border bg-white h-[580px] w-[380px]",
        "transition-all duration-200",
        isHovered && "border-transparent",
        isPopular 
          ? "shadow-lg shadow-zinc-200/50 border-zinc-200" 
          : "border-zinc-200"
      )}>
        {/* Header */}
        <div className="p-8 relative">
          <div className="flex items-center gap-2 mb-3">
            <div className={cn(
              "p-1.5 rounded-lg",
              isPopular ? "bg-zinc-900" : "bg-zinc-100",
              "transition-colors duration-200"
            )}>
              <Zap className={cn(
                "h-4 w-4",
                isPopular ? "text-zinc-100" : "text-zinc-600",
                "transition-colors duration-200"
              )} />
            </div>
            <h3 className="text-xl font-semibold text-zinc-900">
              {isPopular ? "Pro" : "Estándar"}
            </h3>
          </div>
          <p className="text-sm text-zinc-500 leading-relaxed">
            {subtitle}
          </p>
          {/* Custom divider */}
          <div className="absolute bottom-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-zinc-200 to-transparent" />
        </div>

        {/* Pricing */}
        <div className="p-8 relative">
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-bold text-zinc-900">
              ${price}
            </span>
            <span className="text-sm text-zinc-500">/usuario/mes</span>
          </div>
          <Button
            onClick={onSelect}
            variant={isPopular ? "default" : "outline"}
            className={cn(
              "w-full mt-4",
              "border-2 rounded-xl",
              "font-medium text-sm",
              "transition-all duration-200",
              isPopular 
                ? "bg-zinc-900 hover:bg-zinc-800 border-zinc-900 text-white" 
                : "hover:bg-zinc-50 border-zinc-200 text-zinc-700"
            )}
          >
            Hablar con un experto
          </Button>
          {/* Custom divider */}
          <div className="absolute bottom-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-zinc-200 to-transparent" />
        </div>

        {/* Features */}
        <div className="p-8">
          <h4 className="text-sm font-medium text-zinc-900 mb-6">
            {isPopular ? "Pro incluye:" : "Estándar incluye:"}
          </h4>
          <ul className="space-y-4">
            {features.map((feature, index) => (
              <li 
                key={index}
                className="flex items-start gap-3"
              >
                <div className={cn(
                  "p-1 rounded-full",
                  isPopular ? "bg-zinc-100" : "bg-zinc-100"
                )}>
                  <Check className={cn(
                    "h-3.5 w-3.5",
                    isPopular ? "text-zinc-900" : "text-zinc-600"
                  )} />
                </div>
                <span className="text-sm text-zinc-600">
                  {feature.text}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
} 