import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  isReady: boolean;
}

let authState: AuthState = { user: null, isReady: false };
const listeners = new Set<(state: AuthState) => void>();
let initialized = false;

function setAuthState(next: AuthState) {
  authState = next;
  listeners.forEach((l) => l(authState));
}

function initialize() {
  if (initialized) return;
  initialized = true;

  // Set up listener first
  supabase.auth.onAuthStateChange((_event, session) => {
    setAuthState({ user: session?.user ?? null, isReady: true });
  });

  // Restore session from storage (fast, no network)
  supabase.auth.getSession().then(({ data: { session } }) => {
    setAuthState({ user: session?.user ?? null, isReady: true });
  }).catch(() => {
    setAuthState({ user: null, isReady: true });
  });
}

export function useAuth(): AuthState {
  initialize();
  const [state, setState] = useState<AuthState>(authState);

  useEffect(() => {
    // Sync in case state changed between render and effect
    setState(authState);
    const listener = (newState: AuthState) => setState(newState);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return state;
}
