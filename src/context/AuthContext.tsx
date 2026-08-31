import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { authService } from '../services/authService';
import { isProduction, isDevelopment } from '../config/env';
import { supabase, isSupabaseConfigured } from '../supabaseClient';
import { Session } from '@supabase/supabase-js';

interface AuthContextType {
  currentUser: User | null;
  session: Session | null;
  loading: boolean;
  isSupabaseConfigured: boolean;
  isProduction: boolean;
  loginWithPhonePin: (phone: string, pin: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  // For backwards compatibility and direct profile switching in development
  login: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Initialize session on mount
  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      try {
        if (isProduction()) {
          const { data } = await supabase.auth.getSession();
          if (mounted) {
            setSession(data.session);
          }
        }

        const initialUser = await authService.getInitialUser();
        if (mounted && initialUser) {
          setCurrentUser(initialUser);
        }
      } catch (err) {
        console.error('Error initializing auth session:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    initAuth();

    // In production, listen to Supabase auth state changes
    if (isProduction()) {
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
        if (!mounted) return;
        setSession(newSession);

        if (newSession?.user) {
          const user = await authService.getInitialUser();
          if (mounted) setCurrentUser(user);
        } else {
          if (mounted) setCurrentUser(null);
        }
      });

      return () => {
        mounted = false;
        subscription.unsubscribe();
      };
    } else {
      setLoading(false);
    }
  }, []);

  /**
   * Log in with Phone Number and PIN
   */
  const loginWithPhonePin = async (
    phone: string,
    pin: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true);
      const res = await authService.loginWithPhonePin(phone, pin);
      if (res.success && res.user) {
        setCurrentUser(res.user);
        return { success: true };
      }
      return { success: false, error: res.error || 'Authentication failed' };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Log out
   */
  const logout = async () => {
    try {
      await authService.logout();
    } finally {
      setSession(null);
      setCurrentUser(null);
    }
  };

  /**
   * Direct login helper (for dev mode switching)
   */
  const login = (user: User) => {
    setCurrentUser(user);
    if (isDevelopment()) {
      try {
        localStorage.setItem('hostelops_dev_auth_user', JSON.stringify(user));
      } catch {
        // ignore
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        session,
        loading,
        isSupabaseConfigured,
        isProduction: isProduction(),
        loginWithPhonePin,
        logout,
        login,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
