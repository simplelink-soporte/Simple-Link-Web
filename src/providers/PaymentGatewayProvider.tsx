'use client';

import React from 'react';
import { PaymentGatewayProvider as PGProvider } from '@/contexts/PaymentGatewayContext';

interface PaymentGatewayProviderProps {
  children: React.ReactNode;
  empresaId?: string | null;
}

/**
 * Provider para el contexto de pasarelas de pago.
 * Este componente debe colocarse alto en el árbol de componentes,
 * preferiblemente justo después del AuthProvider.
 */
export function PaymentGatewayProvider({ 
  children, 
  empresaId = null 
}: PaymentGatewayProviderProps) {
  return (
    <PGProvider initialEmpresaId={empresaId}>
      {children}
    </PGProvider>
  );
}
