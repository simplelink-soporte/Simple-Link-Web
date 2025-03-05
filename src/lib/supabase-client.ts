'use client';

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/types/supabase';

let supabaseClient: ReturnType<typeof createClientComponentClient<Database>> | null = null;

export function getSupabaseClient() {
  if (!supabaseClient) {
    supabaseClient = createClientComponentClient<Database>({
      options: {
        db: {
          schema: 'public'
        },
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      }
    });
  }
  return supabaseClient;
}

export async function getAuthenticatedClient() {
  const client = getSupabaseClient();
  const { data: { session }, error: sessionError } = await client.auth.getSession();
  
  if (sessionError) {
    throw sessionError;
  }

  if (!session) {
    throw new Error('No hay sesión activa');
  }

  return {
    client,
    session,
    userId: session.user.id
  };
} 