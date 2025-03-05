import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/supabase'

// Cliente por defecto para uso general (no autenticado)
export const supabase = createClientComponentClient<Database>({
  cookieOptions: {
    name: 'sb-default',
    path: '/',
    domain: process.env.NEXT_PUBLIC_COOKIE_DOMAIN,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production'
  }
}) 