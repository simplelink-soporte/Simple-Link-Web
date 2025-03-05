"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { AnimatePresence, motion } from "framer-motion"
import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { BasicInfo } from "./steps/BasicInfo"
import { DiscountConfig } from "./steps/DiscountConfig"
import { Restrictions } from "./steps/Restrictions"
import { UsageLimits } from "./steps/UsageLimits"
import type { Coupon } from "@/types/coupon"
import { ModalHeader } from "./components/ModalHeader"
import { ModalFooter } from "./components/ModalFooter"

interface NewCouponModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (couponData: Omit<Coupon, 'id'>) => void
  editingCoupon?: Coupon
  mode?: 'create' | 'edit'
}

export function NewCouponModal({
  isOpen,
  onClose,
  onSave,
  editingCoupon,
  mode = 'create'
}: NewCouponModalProps) {
  const [mounted, setMounted] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState<Partial<Coupon>>({
    name: '',
    code: '',
    description: '',
    type: 'percentage',
    value: 0,
    validUntil: new Date(),
    isActive: true,
    usageCount: 0
  })

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  useEffect(() => {
    if (!isOpen) {
      setCurrentStep(0)
      setFormData({
        name: '',
        code: '',
        description: '',
        type: 'percentage',
        value: 0,
        validUntil: new Date(),
        isActive: true,
        usageCount: 0
      })
    }
  }, [isOpen])

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(prev => prev + 1)
    } else {
      handleSave()
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const handleSave = () => {
    onSave(formData as Omit<Coupon, 'id'>)
    onClose()
  }

  const totalSteps = 4
  const isLastStep = currentStep === totalSteps - 1

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <BasicInfo formData={formData} setFormData={setFormData} />
      case 1:
        return <DiscountConfig formData={formData} setFormData={setFormData} />
      case 2:
        return <Restrictions formData={formData} setFormData={setFormData} />
      case 3:
        return <UsageLimits formData={formData} setFormData={setFormData} />
      default:
        return null
    }
  }

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-40"
            transition={{ 
              duration: 0.3,
              ease: "easeInOut"
            }}
          />

          <motion.div
            initial={{ x: "100%", opacity: 0.5 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ 
              x: "100%", 
              opacity: 0,
              transition: {
                duration: 0.3,
                ease: [0.4, 0, 0.2, 1]
              }
            }}
            transition={{ 
              type: "spring",
              damping: 30,
              stiffness: 300,
              mass: 0.8,
            }}
            className="fixed inset-y-0 right-0 w-[500px] bg-white shadow-2xl border-l z-50"
          >
            <div className="h-full flex flex-col">
              <ModalHeader 
                currentStep={currentStep}
                mode={mode}
              />

              {/* Content */}
              <div className="flex-1 overflow-y-auto">
                <div className="p-6">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentStep}
                      initial={{ x: 20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      exit={{ x: -20, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-6"
                    >
                      {renderStep()}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>

              <ModalFooter 
                currentStep={currentStep}
                totalSteps={totalSteps}
                onBack={handleBack}
                onNext={handleNext}
                onClose={onClose}
                mode={mode}
              />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )

  if (!mounted) return null

  return createPortal(modalContent, document.body)
}