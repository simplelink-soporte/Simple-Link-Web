import { IconCreditCard, IconCash, IconBuildingBank } from "@tabler/icons-react"
import type { PaymentMethod } from "../types"

interface PaymentIconProps {
  method: PaymentMethod
  className?: string
  strokeWidth?: number
}

export function PaymentIcon({ method, className = "w-5 h-5", strokeWidth = 1.5 }: PaymentIconProps) {
  const icons = {
    card: IconCreditCard,
    cash: IconCash,
    transfer: IconBuildingBank
  }

  const Icon = icons[method]
  return <Icon className={className} strokeWidth={strokeWidth} />
} 