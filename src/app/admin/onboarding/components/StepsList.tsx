'use client'

import { useOnboarding } from '../context/OnboardingContext'
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { Check } from "lucide-react"

export function StepsList() {
  const { currentStep, steps, setCurrentStep, completedSteps, canAccessStep } = useOnboarding()

  return (
    <div className="relative">
      {/* Lista de pasos */}
      <div className="space-y-3 md:space-y-6 relative">
        {steps.map((step, index) => {
          const isCompleted = completedSteps[index]
          const isAccessible = canAccessStep(index)
          const isCurrent = currentStep === index

          return (
            <motion.div
              key={step}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: index * 0.1 }}
              className={cn(
                "group flex items-center gap-3 py-0.5",
                !isAccessible && "opacity-40",
                isCompleted && "opacity-80"
              )}
              onClick={() => isAccessible && setCurrentStep(index)}
            >
              {/* Círculo numerado o check */}
              <div
                className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all duration-200",
                  isCompleted ? "bg-gray-800 border-gray-800" : "border-gray-300",
                  isCurrent ? "border-primary" : "",
                  isAccessible && !isCompleted ? "group-hover:border-primary/80" : "",
                  isCompleted && "cursor-not-allowed"
                )}
              >
                {isCompleted ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                  >
                    <Check className="h-3 w-3 text-white" />
                  </motion.div>
                ) : (
                  <span className={cn(
                    "text-xs font-medium",
                    isCurrent ? "text-white" : "text-gray-300"
                  )}>
                    {index + 1}
                  </span>
                )}
              </div>

              {/* Contenido del paso */}
              <div
                className={cn(
                  "flex-1 transition-all duration-200",
                  isAccessible ? "cursor-pointer hover:translate-x-1" : "cursor-not-allowed",
                  isCompleted && "cursor-not-allowed"
                )}
              >
                <p className={cn(
                  "text-sm font-medium transition-colors",
                  isCurrent ? "text-white" : "text-gray-300",
                  isCompleted && "text-white"
                )}>
                  {step}
                </p>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}