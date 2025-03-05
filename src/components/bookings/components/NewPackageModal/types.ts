import type { Database } from "@/types/supabase"

export type PackageStep = 
  | 'package-details'
  | 'package-payment'
  | 'package-confirmation'

export type EditPackageStep =
  | 'edit-details'
  | 'edit-payment'
  | 'edit-confirmation'

export interface PackageDetails {
  name: string
  classCount: number
  price: number
  expirationDays: number
  advanceBookingDays?: number
  branchIds: string[]
  includePrivateClasses?: boolean
  tag?: string | null
}

export interface PackagePaymentConfig {
  paymentMethods: string[]
}

export interface PackageFormData {
  name: string
  class_count: number
  price: number
  expiration_days: number
  advance_booking_days: number
  branch_ids: string[]
  include_private_classes: boolean
  tag: string | null
  available_payment_methods: string[]
  status: 'active' | 'inactive' | 'archived'
}

export interface PackageState {
  currentStep: PackageStep
  details: PackageDetails
  payment: PackagePaymentConfig
}

export interface EditPackageState {
  currentStep: EditPackageStep
  details: PackageDetails
  payment: PackagePaymentConfig
  originalPackage: Database['public']['Tables']['packages']['Row']
}

export interface BaseModalProps {
  isOpen: boolean
  onClose: () => void
}

export interface EditPackageModalProps extends BaseModalProps {
  packageData: Database['public']['Tables']['packages']['Row']
  onSuccess?: () => void
} 