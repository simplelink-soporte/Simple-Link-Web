"use client"

interface CreateCustomerParams {
  email: string
  nombre: string
  telefono?: string
  userId: string
}

export class StripeService {
  private generateIdempotencyKey(userId: string): string {
    return `customer_creation_${userId}_${Date.now()}`
  }

  async createCustomer(params: CreateCustomerParams) {
    try {
      console.log('💳 Iniciando creación de customer en Stripe:', {
        email: params.email,
        userId: params.userId
      })

      const idempotencyKey = this.generateIdempotencyKey(params.userId)

      const response = await fetch('/api/stripe/customer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey
        },
        body: JSON.stringify({
          email: params.email,
          nombre: params.nombre,
          telefono: params.telefono,
          userId: params.userId
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al crear el customer en Stripe')
      }

      const data = await response.json()
      console.log('✅ Customer creado exitosamente:', data)

      return data.customerId
    } catch (error) {
      console.error('❌ Error en createCustomer:', error)
      throw error
    }
  }
} 