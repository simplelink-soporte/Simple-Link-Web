'use client';

import { ReactNode } from 'react';
import { FormProvider } from '@/contexts/FormContext';
import { OrganizationProvider } from '@/contexts/OrganizationContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { BranchProvider } from '@/contexts/BranchContext';
import { DateProvider } from '@/contexts/DateContext';

interface PublicFormLayoutProps {
  children: ReactNode;
}

export default function PublicFormLayout({ children }: PublicFormLayoutProps) {
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