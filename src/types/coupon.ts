export interface Coupon {

    id: string

    name: string

    code: string

    description?: string

    type: 'percentage' | 'fixed'

    value: number

    validUntil: Date

    isActive: boolean

    usageLimit?: number

    usageCount: number

    minPurchase?: number

    userType: 'all' | 'new' | 'recurring' | 'specific'

    timeRestrictions?: {

        [key: number]: {

            isSelected: boolean

            timeMode: 'all' | 'custom'

            startTime?: string

            endTime?: string

        }

    }

    startDate?: Date

    endDate?: Date

    isRecurring?: boolean

    locations?: string[]

    hasMinPurchase?: boolean

}
