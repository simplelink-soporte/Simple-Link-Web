"use client"

import { createContext, useContext, useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createSupabaseClient } from '@/lib/supabase'
import type { Database } from '@/types/supabase'

type PlanType = 'FREE' | 'PRO';

type Organization = {
  id: string;
  name: string;
  business_name: string | null;
  auth_user_id: string;
  email: string | null;
  phone: string | null;
  country: string | null;
  plan_type: PlanType;
}

// Definir el tipo para el estado de la cuenta Stripe
type StripeAccountStatus = 'pending' | 'active' | 'restricted' | 'disabled';

interface StripeConnectionInfo {
  stripe_account_id: string;
  charges_enabled: boolean;
  account_status: StripeAccountStatus;
}

// Definir el tipo para la tabla stripe_connections
interface StripeConnectionRow {
  id: string;
  empresa_id: string;
  stripe_account_id: string;
  stripe_account_email: string | null;
  account_status: StripeAccountStatus;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  requirements: any | null;
  created_at: string;
  updated_at: string;
  last_webhook_received_at: string | null;
}

interface OrganizationContextType {
  organization: Organization | null;
  stripeConnection: {
    stripe_account_id: string;
    charges_enabled: boolean;
    account_status: string;
  } | null;
  isLoading: boolean;
  error: Error | null;
  setOrganization: (org: Organization) => void;
  loadStripeConnection: () => Promise<{
    stripe_account_id: string;
    charges_enabled: boolean;
    account_status: string;
  } | null>;
}

interface UserMetadata {
  empresa_id?: string;
  [key: string]: any;
}

const EMPRESA_ID_STORAGE_KEY = 'current_empresa_id';

// Funciones de caché mejoradas
export function setEmpresaId(id: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(EMPRESA_ID_STORAGE_KEY, id);
    console.log('💾 Empresa ID guardado en caché:', id);
  }
}

function getEmpresaIdFromCache(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(EMPRESA_ID_STORAGE_KEY);
  }
  return null;
}

const ORGANIZATION_CHECK_INTERVAL = 1000 * 60 * 5 // 5 minutos
const ORGANIZATION_CHECK_KEY = 'last_organization_check'

function shouldCheckOrganization(): boolean {
  const lastCheck = localStorage.getItem(ORGANIZATION_CHECK_KEY)
  if (!lastCheck) return true
  
  const timeSinceLastCheck = Date.now() - parseInt(lastCheck)
  return timeSinceLastCheck > ORGANIZATION_CHECK_INTERVAL
}

function updateLastOrganizationCheck() {
  localStorage.setItem(ORGANIZATION_CHECK_KEY, Date.now().toString())
}

// Exportamos el contexto para que esté disponible si es necesario
export const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined)

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [stripeConnection, setStripeConnection] = useState<StripeConnectionInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const { user, isLoading: authLoading } = useAuth()
  const supabase = createSupabaseClient()

  // Cargar solo la organización inicialmente
  const loadOrganization = async () => {
    try {
      if (authLoading || !user) {
        setIsLoading(false);
        setError(new Error('No hay usuario autenticado'));
        return;
      }

      if (!shouldCheckOrganization()) {
        const cachedOrg = organization
        if (cachedOrg) {
          console.log('⏭️ Usando organización en caché')
          return
        }
      }

      const empresaId = getEmpresaIdFromCache();
      
      if (!empresaId) {
        setError(new Error('No se encontró la empresa'));
        setIsLoading(false);
        return;
      }

      const { data: org, error: orgError } = await supabase
        .from('empresas')
        .select('id, name, business_name, auth_user_id, email, phone, country, plan_type')
        .eq('id', empresaId)
        .single();

      if (orgError) throw orgError;
      if (!org) throw new Error('No se encontró la empresa');

      // Asegurarnos de que todos los campos requeridos estén presentes
      const organizationData: Organization = {
        id: org.id,
        name: org.name,
        business_name: org.business_name,
        auth_user_id: org.auth_user_id || '',
        email: org.email,
        phone: org.phone,
        country: org.country,
        plan_type: (org.plan_type || 'FREE') as PlanType
      };

      setOrganization(organizationData);
      setError(null);
      setIsLoading(false);
      updateLastOrganizationCheck();
    } catch (error) {
      console.error('❌ Error al cargar organización:', error);
      setError(error as Error);
      setOrganization(null);
      setStripeConnection(null);
      setIsLoading(false);
    }
  }

  // Función para cargar conexión Stripe bajo demanda
  const loadStripeConnection = async () => {
    if (!organization?.id) {
      console.log('❌ No hay organización activa');
      return null;
    }

    try {
      console.log('🔄 Cargando conexión Stripe para:', organization.id);
      
      // Actualizar el tipo de Database para incluir stripe_connections
      const supabaseTyped = supabase as any;
      
      const { data, error } = await supabaseTyped
        .from('stripe_connections')
        .select('stripe_account_id, charges_enabled, account_status')
        .eq('empresa_id', organization.id)
        .single();

      if (error) {
        console.error('❌ Error al cargar conexión Stripe:', error);
        return null;
      }

      if (!data) {
        console.log('⚠️ No se encontró conexión Stripe');
        return null;
      }

      const connection: StripeConnectionInfo = {
        stripe_account_id: data.stripe_account_id,
        charges_enabled: data.charges_enabled || false,
        account_status: data.account_status || 'pending'
      };

      console.log('✅ Conexión Stripe cargada:', connection);
      setStripeConnection(connection);
      return connection;

    } catch (error) {
      console.error('❌ Error al cargar conexión Stripe:', error);
      setStripeConnection(null);
      return null;
    }
  }

  useEffect(() => {
    void loadOrganization();
  }, [user, authLoading]);

  const value = {
    organization,
    stripeConnection,
    isLoading,
    error,
    setOrganization,
    loadStripeConnection
  };

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  )
}

export function useOrganization() {
  const context = useContext(OrganizationContext)
  if (context === undefined) {
    throw new Error('useOrganization debe ser usado dentro de un OrganizationProvider')
  }
  return context
} 