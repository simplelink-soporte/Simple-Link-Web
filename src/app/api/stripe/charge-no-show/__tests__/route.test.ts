import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../route';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { stripe } from '@/lib/stripe';

// Mock de las dependencias
vi.mock('@supabase/auth-helpers-nextjs', () => ({
  createRouteHandlerClient: vi.fn()
}));

vi.mock('@/lib/stripe', () => ({
  stripe: {
    paymentIntents: {
      create: vi.fn()
    }
  }
}));

describe('POST /api/stripe/charge-no-show', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debería rechazar peticiones no autenticadas', async () => {
    // Mock de sesión vacía
    (createRouteHandlerClient as any).mockReturnValue({
      auth: {
        getSession: () => Promise.resolve({ data: { session: null } })
      }
    });

    const response = await POST(new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({
        bookingId: '123',
        amount: 1000,
        stripeAccountId: 'acc_123'
      })
    }));

    const data = await response.json();
    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe('UNAUTHORIZED');
  });

  it('debería validar parámetros requeridos', async () => {
    // Mock de sesión válida
    (createRouteHandlerClient as any).mockReturnValue({
      auth: {
        getSession: () => Promise.resolve({ 
          data: { 
            session: { user: { id: 'user_123' } } 
          } 
        })
      }
    });

    const response = await POST(new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({
        // Omitiendo parámetros requeridos
      })
    }));

    const data = await response.json();
    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe('INVALID_PARAMETERS');
  });

  it('debería procesar un cargo exitoso', async () => {
    // Mock de sesión válida
    (createRouteHandlerClient as any).mockReturnValue({
      auth: {
        getSession: () => Promise.resolve({ 
          data: { 
            session: { user: { id: 'user_123' } } 
          } 
        })
      },
      from: () => ({
        select: () => ({
          eq: () => ({
            single: () => ({
              data: {
                id: 'booking_123',
                payment_type: 'guarantee',
                cancelled_at: null
              },
              error: null
            })
          })
        }),
        insert: () => ({ error: null }),
        update: () => ({ error: null })
      })
    });

    // Mock de Stripe
    (stripe.paymentIntents.create as any).mockResolvedValue({
      id: 'pi_123',
      status: 'succeeded'
    });

    const response = await POST(new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({
        bookingId: 'booking_123',
        amount: 1000,
        stripeAccountId: 'acc_123'
      })
    }));

    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.paymentIntentId).toBe('pi_123');
    expect(data.chargeStatus).toBe('succeeded');
  });

  it('debería manejar errores de Stripe', async () => {
    // Mock de sesión válida y datos de reserva
    (createRouteHandlerClient as any).mockReturnValue({
      auth: {
        getSession: () => Promise.resolve({ 
          data: { 
            session: { user: { id: 'user_123' } } 
          } 
        })
      },
      from: () => ({
        select: () => ({
          eq: () => ({
            single: () => ({
              data: {
                id: 'booking_123',
                payment_type: 'guarantee',
                cancelled_at: null
              },
              error: null
            })
          })
        }),
        insert: () => ({ error: null })
      })
    });

    // Mock de error de Stripe
    (stripe.paymentIntents.create as any).mockRejectedValue({
      type: 'StripeCardError',
      code: 'card_declined',
      message: 'Your card was declined'
    });

    const response = await POST(new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({
        bookingId: 'booking_123',
        amount: 1000,
        stripeAccountId: 'acc_123'
      })
    }));

    const data = await response.json();
    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe('STRIPE_ERROR');
    expect(data.error.details.code).toBe('card_declined');
  });
}); 