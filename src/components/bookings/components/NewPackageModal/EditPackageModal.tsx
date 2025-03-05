"use client"

import { useState, useEffect } from "react"
import { Modal } from "@/components/ui/modal"
import { toast } from "sonner"
import { createSupabaseClient } from '@/lib/supabase'
import { ModalFooter } from "../NewBookingModal/components/ModalFooter"
import { ModalHeader } from "./components/ModalHeader"
import { PackageDetails } from "./components/PackageDetails"
import { PackagePaymentMethods } from "./components/PackagePaymentMethods"
import { PackageConfirmationStep } from "./components/PackageConfirmationStep"
import type { EditPackageModalProps, EditPackageStep, PackageDetails as IPackageDetails, PackagePaymentConfig } from "./types"
import { usePackages } from "@/hooks/usePackages"
import { useAuth } from '@/contexts/AuthContext'

const DEFAULT_USER_ID = process.env.NEXT_PUBLIC_DEFAULT_USER_ID

const supabase = createSupabaseClient()

export function EditPackageModal({ isOpen, onClose, packageData, onSuccess }: EditPackageModalProps) {
  const [mounted, setMounted] = useState(false)
  const [currentStep, setCurrentStep] = useState<EditPackageStep>('edit-details')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isValid, setIsValid] = useState(false)
  const [isUpdated, setIsUpdated] = useState(false)
  const [showHeader, setShowHeader] = useState(true)
  const [packageDetails, setPackageDetails] = useState<IPackageDetails>({
    name: packageData.name,
    classCount: packageData.class_count,
    price: packageData.price,
    expirationDays: packageData.expiration_days,
    branchIds: packageData.branch_ids || []
  })
  const [packagePayment, setPackagePayment] = useState<PackagePaymentConfig>({
    paymentMethods: packageData.available_payment_methods as ('stripe' | 'transfer')[]
  })

  const { data: packages, refetch: refetchPackages } = usePackages();
  const { user } = useAuth();

  // Manejar montaje/desmontaje
  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  // Reiniciar el estado cuando se cierra el modal
  useEffect(() => {
    if (!isOpen) {
      setCurrentStep('edit-details')
      setIsSubmitting(false)
      setIsUpdated(false)
      setShowHeader(true)
      setPackageDetails({
        name: packageData.name,
        classCount: packageData.class_count,
        price: packageData.price,
        expirationDays: packageData.expiration_days,
        branchIds: packageData.branch_ids || []
      })
      setPackagePayment({
        paymentMethods: packageData.available_payment_methods as ('stripe' | 'transfer')[]
      })
    }
  }, [isOpen, packageData])

  const handleUpdatePackage = async () => {
    try {
      setIsSubmitting(true)
      const supabase = createSupabaseClient()

      // Obtener el ID de usuario del contexto
      const userId = user?.id

      if (!userId) {
        throw new Error('No se encontró el ID del usuario autenticado')
      }

      // Obtener el empresa_id asociado al usuario autenticado
      const { data: empresaData, error: empresaError } = await supabase
        .from('empresas')
        .select('id')
        .eq('auth_user_id', userId)
        .single()

      if (empresaError || !empresaData) {
        throw new Error('No se encontró una empresa asociada al usuario')
      }

      // Verificar el ID del paquete
      console.log('Actualizando paquete con ID:', packageData.id)

      // Validar que todos los campos requeridos estén presentes
      if (!packageDetails.name) {
        throw new Error('El nombre del paquete es obligatorio.')
      }
      if (packageDetails.classCount <= 0) {
        throw new Error('El número de clases debe ser mayor que 0.')
      }
      if (packageDetails.price < 0) {
        throw new Error('El precio no puede ser negativo.')
      }
      if (packageDetails.expirationDays <= 0) {
        throw new Error('Los días de expiración deben ser mayores que 0.')
      }
      if (packageDetails.branchIds.length === 0) {
        throw new Error('Se debe seleccionar al menos una sucursal.')
      }
      if (packagePayment.paymentMethods.length === 0) {
        throw new Error('Se debe seleccionar al menos un método de pago.')
      }

      // Actualizar el paquete
      const { error: packageError } = await supabase
        .from('packages')
        .update({
          name: packageDetails.name,
          class_count: packageDetails.classCount,
          price: packageDetails.price,
          expiration_days: packageDetails.expirationDays,
          branch_ids: packageDetails.branchIds,
          available_payment_methods: packagePayment.paymentMethods,
          updated_at: new Date().toISOString()
        })
        .eq('id', packageData.id)
        .eq('empresa_id', empresaData.id)

      // Verificar si hubo un error en la actualización
      if (packageError) {
        console.error('Error detallado al actualizar paquete:', packageError)
        throw new Error('Error al actualizar el paquete: ' + packageError.message)
      }

      // Refrescar los paquetes después de la actualización
      await refetchPackages()

      setIsUpdated(true)
      toast.success('Paquete actualizado exitosamente')
      onSuccess?.()
    } catch (error) {
      console.error('Error al actualizar el paquete:', error)
      toast.error(error instanceof Error ? error.message : 'Error al actualizar el paquete')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleNext = () => {
    if (currentStep === 'edit-details') {
      setCurrentStep('edit-payment')
    } else if (currentStep === 'edit-payment') {
      setCurrentStep('edit-confirmation')
    } else {
      handleUpdatePackage()
    }
  }

  const handleBack = () => {
    if (currentStep === 'edit-confirmation') {
      setCurrentStep('edit-payment')
    } else if (currentStep === 'edit-payment') {
      setCurrentStep('edit-details')
    } else {
      onClose()
    }
  }

  const getFooterText = () => {
    if (currentStep === 'edit-confirmation') {
      return 'Guardar Cambios'
    }
    return 'Continuar'
  }

  const renderStep = () => {
    switch (currentStep) {
      case 'edit-details':
        return (
          <PackageDetails
            details={packageDetails}
            onChange={setPackageDetails}
            onValidationChange={setIsValid}
            mode="edit"
          />
        )
      case 'edit-payment':
        return (
          <PackagePaymentMethods
            config={packagePayment}
            onChange={setPackagePayment}
            onValidationChange={setIsValid}
            mode="edit"
          />
        )
      case 'edit-confirmation':
        return (
          <PackageConfirmationStep
            details={packageDetails}
            payment={packagePayment}
            isCreated={isUpdated}
            onSuccess={() => setShowHeader(false)}
            mode="edit"
          />
        )
    }
  }

  if (!mounted) return null

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose}
      className="flex flex-col"
    >
      {/* Header */}
      {showHeader && (
        <ModalHeader 
          currentStep={currentStep}
          mode="edit"
        />
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6">
          {currentStep === 'edit-confirmation' ? (
            <PackageConfirmationStep
              details={packageDetails}
              payment={packagePayment}
              isCreated={isUpdated}
              onSuccess={() => setShowHeader(false)}
              mode="edit"
            />
          ) : (
            renderStep()
          )}
        </div>
      </div>

      {/* Footer */}
      {!isUpdated && (
        <ModalFooter 
          currentStep={currentStep}
          onBack={handleBack}
          onContinue={handleNext}
          isValid={isValid}
          isSubmitting={isSubmitting}
          continueText={getFooterText()}
          mode="edit"
        />
      )}
    </Modal>
  )
} 