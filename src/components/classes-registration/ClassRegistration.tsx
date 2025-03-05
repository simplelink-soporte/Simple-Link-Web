"use client"

import { useClassRegistration } from './context/ClassRegistrationContext'
import { AuthStep } from './steps/AuthStep'

export function ClassRegistration() {
  const { state, organization } = useClassRegistration()

  return (
    <div className="relative h-full bg-gray-50 overflow-hidden">
      <div className="h-full container mx-auto px-4">
        {state.step === 'auth' && <AuthStep />}
        {/* Aquí irían los demás pasos */}
      </div>
    </div>
  )
} 
