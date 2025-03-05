"use client"

import { useClassRegistration } from './context/ClassRegistrationContext'
import { AuthStep } from './steps/AuthStep'

export function ClassRegistration() {
  const { state, organization } = useClassRegistration()

  return (
    <div className="relative min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {state.step === 'auth' && <AuthStep />}
        {/* Aquí irían los demás pasos */}
      </div>
    </div>
  )
} 
