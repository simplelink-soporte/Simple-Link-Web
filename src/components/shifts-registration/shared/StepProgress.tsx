'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { useShiftForm } from '../context/ShiftFormContext';
import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';

interface StepProgressProps {
  className?: string;
  showStepNames?: boolean;
  showStepNumbers?: boolean;
  showLabels?: boolean;
  variant?: 'linear' | 'circles';
}

export function StepProgress({
  className,
  showStepNames = true,
  showStepNumbers = true,
  showLabels = true,
  variant = 'linear'
}: StepProgressProps) {
  const { state } = useShiftForm();
  const currentStep = state.currentStep;
  
  // Los nombres de los pasos
  const stepLabels = [
    'Servicio',
    'Fecha',
    'Horario',
    'Confirmar'
  ];
  
  // Calcular el progreso para la barra lineal
  const progress = Math.round(((currentStep + 1) / stepLabels.length) * 100);
  
  // Renderizar variante de círculos
  if (variant === 'circles') {
    return (
      <div className={cn("w-full mb-6", className)}>
        <div className="flex justify-between items-center">
          {stepLabels.map((label, index) => {
            const isCompleted = index < currentStep;
            const isCurrent = index === currentStep;
            
            return (
              <div key={index} className="flex flex-col items-center">
                {/* Línea conectora */}
                {index > 0 && (
                  <div className={cn(
                    "hidden sm:block absolute h-[2px] top-[14px] -left-1/2 w-full",
                    index <= currentStep ? "bg-primary" : "bg-gray-200"
                  )} />
                )}
                
                {/* Círculo indicador */}
                <motion.div 
                  initial={{ scale: 0.8 }}
                  animate={{ scale: isCurrent ? 1.1 : 1 }}
                  className={cn(
                    "relative z-10 flex items-center justify-center",
                    "w-7 h-7 rounded-full",
                    isCompleted && "bg-primary text-white",
                    isCurrent && "bg-primary-light border-2 border-primary",
                    !isCompleted && !isCurrent && "bg-gray-100 border border-gray-300"
                  )}
                >
                  {isCompleted ? (
                    <CheckCircle2 size={16} />
                  ) : (
                    showStepNumbers && <span className="text-xs">{index + 1}</span>
                  )}
                </motion.div>
                
                {/* Etiqueta del paso */}
                {showLabels && (
                  <span className={cn(
                    "mt-2 text-xs font-medium",
                    "hidden sm:block",
                    (isCompleted || isCurrent) ? "text-primary" : "text-gray-500"
                  )}>
                    {label}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  
  // Renderizar variante lineal (por defecto)
  return (
    <div className={cn("w-full mb-6", className)}>
      {/* Barra de progreso */}
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
          className="bg-primary h-2.5 rounded-full"
        />
      </div>
      
      {/* Etiquetas de información */}
      {showLabels && (
        <div className="flex justify-between mt-2 text-sm">
          {showStepNames && (
            <span className="text-primary font-medium">{stepLabels[currentStep]}</span>
          )}
          <span className="text-gray-500 ml-auto">{`Paso ${currentStep + 1} de ${stepLabels.length}`}</span>
        </div>
      )}
    </div>
  );
}
