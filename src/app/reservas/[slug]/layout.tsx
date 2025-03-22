'use client';

import { ReactNode } from 'react';
import { FormProvider } from '@/contexts/FormContext';
import { OrganizationProvider } from '@/contexts/OrganizationContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { BranchProvider } from '@/contexts/BranchContext';
import { DateProvider } from '@/contexts/DateContext';

interface ShiftFormLayoutProps {
  children: ReactNode;
}

/**
 * Layout para la versión refactorizada del formulario de turnos
 * Proporciona los mismos contextos que la versión original para asegurar compatibilidad
 */
export default function ShiftFormLayout({ children }: ShiftFormLayoutProps) {
  return (
    <AuthProvider>
      <DateProvider>
        <OrganizationProvider>
          <BranchProvider>
            <FormProvider initialForm={null}>
              {children}
            </FormProvider>
          </BranchProvider>
        </OrganizationProvider>
      </DateProvider>
    </AuthProvider>
  );
}
