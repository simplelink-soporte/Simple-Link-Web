"use client"

import React from 'react'
import { useClassRegistration } from '../context/ClassRegistrationContext'
import { StepContainer } from '../shared/StepContainer'
import { StepNavigation } from '../shared/StepNavigation'
import { motion } from 'framer-motion'

export function ClassDetailStep() {
  const { state, goToStep } = useClassRegistration()

  // Si no hay clase seleccionada, redirigir al paso de selección de clase
  if (!state.selectedClass) {
    return (
      <StepContainer stepId="class-detail-redirect">
        <div className="flex h-full items-center justify-center">
          <p className="text-sm text-yellow-700">
            No hay clase seleccionada. Redirigiendo...
          </p>
        </div>
      </StepContainer>
    )
  }

  const classData = state.selectedClass
  
  // Función para manejar la continuación al paso de sesiones
  const handleContinue = () => {
    goToStep('session')
  }

  // Animación para el texto
  const textVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        duration: 1.2,
        ease: "easeOut"
      }
    }
  };

  return (
    <StepContainer stepId="class-detail">
      <div className="flex flex-col h-full px-4 md:px-8 py-6 pt-10">
        {/* Título de la clase y sede alineados a la izquierda */}
        <motion.div 
          className="w-full max-w-2xl mx-auto mb-4"
          initial="hidden"
          animate="visible"
          variants={textVariants}
        >
          <div className="text-left">
            <h2 className="text-2xl md:text-3xl font-medium text-black">
              {classData.title}
              <span className="ml-2 text-lg md:text-xl font-normal text-gray-600">
                • {classData.branchInfo?.name || 'Ubicación por definir'}
              </span>
            </h2>
          </div>
        </motion.div>
        
        {/* Descripción de la clase alineada a la izquierda */}
        <motion.div 
          className="w-full max-w-2xl mx-auto text-left"
          initial="hidden"
          animate="visible"
          variants={textVariants}
        >
          <p className="text-lg md:text-xl text-black leading-relaxed font-normal">
            {classData.description || 'No hay descripción disponible para esta clase.'}
          </p>
        </motion.div>
      </div>

      <StepNavigation 
        onNext={handleContinue}
        nextLabel="Continuar a sesiones"
      />
    </StepContainer>
  )
}
