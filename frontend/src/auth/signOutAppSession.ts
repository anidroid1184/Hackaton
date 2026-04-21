import { supabase } from '../lib/supabaseClient'
import { isAuthMockMode } from './authEnv'
import { clearMockOperationsSession } from './mockOperationsAuth'

export async function signOutAppSession() {
  clearMockOperationsSession()
  if (!isAuthMockMode()) {
    await supabase.auth.signOut()
  }
}
