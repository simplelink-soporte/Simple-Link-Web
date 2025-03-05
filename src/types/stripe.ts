export interface StripeConnection {
  charges_enabled: boolean;
  stripe_account_id: string;
  stripe_customer_id: string;
  status: 'active' | 'inactive' | 'pending';
}

export interface StripeCustomerCache {
  stripeCustomerId: string;
  stripeAccountId: string;
  userId: string;
  lastUsed: string;
  status: 'active' | 'inactive' | 'pending';
}

export interface SetupIntentResponse {
  setupIntentId: string;
  clientSecret: string;
  customerId: string;
}

export interface StripeCustomerData {
  id: string;
  user_id: string;
  stripe_customer_id: string;
  stripe_account_id: string;
  status: 'active' | 'inactive' | 'pending';
  last_used?: string;
  payment_methods_count?: number;
  last_payment_error?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
} 