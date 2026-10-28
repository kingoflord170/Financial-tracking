import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { seedCleanUser } from '@/lib/db/seed';
import { db } from '@/lib/db';

export interface UserSession {
  id: string;
  email: string;
  displayName: string;
}

interface AuthContextType {
  user: UserSession | null;
  isLoading: boolean;
  isDemoMode: boolean;
  isSupabaseConfigured: boolean;
  signInWithPassword: (email: string, pass: string) => Promise<{ error: string | null }>;
  signUpWithPassword: (email: string, pass: string, name: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  enterDemoMode: () => Promise<void>;
  resetDemoData: () => Promise<void>;
  clearLocalData: () => Promise<void>;
  startLocalRealSession: (name?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const LOCAL_USER_ID = 'local-real-user';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isDemoMode = false; // Demo mode permanently disabled for real-time use

  useEffect(() => {
    async function initAuth() {
      setIsLoading(true);

      // Clean up legacy demo flags
      localStorage.removeItem('myfinance_mode');

      // Check if user has an active Supabase cloud session
      if (supabase && isSupabaseConfigured) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            const userSession: UserSession = {
              id: session.user.id,
              email: session.user.email || '',
              displayName: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
            };
            setUser(userSession);
            await seedCleanUser(session.user.id);
            setIsLoading(false);
            return;
          }
        } catch {
          // Continue to check local real session
        }

        // Listen to auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
          if (session?.user) {
            setUser({
              id: session.user.id,
              email: session.user.email || '',
              displayName: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
            });
            await seedCleanUser(session.user.id);
          } else {
            setUser(null);
          }
          setIsLoading(false);
        });

        // Check if there is an active local real session
        const savedLocalUser = localStorage.getItem('myfinance_real_user');
        if (savedLocalUser) {
          try {
            const parsed = JSON.parse(savedLocalUser);
            setUser(parsed);
            await seedCleanUser(parsed.id);
          } catch {
            setUser(null);
          }
        } else {
          setUser(null);
        }

        setIsLoading(false);
        return () => subscription.unsubscribe();
      }

      // If Supabase is not configured, check for saved local real-time session
      const savedLocal = localStorage.getItem('myfinance_real_user');
      if (savedLocal) {
        try {
          const parsed = JSON.parse(savedLocal);
          setUser(parsed);
          await seedCleanUser(parsed.id);
        } catch {
          setUser(null);
        }
      } else {
        setUser(null);
      }

      setIsLoading(false);
    }

    initAuth();
  }, []);

  const signInWithPassword = async (email: string, pass: string) => {
    if (!supabase || !isSupabaseConfigured) {
      return { error: 'Supabase cloud is currently unavailable or paused. You can use Local Real-Time Mode.' };
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) return { error: error.message };
    return { error: null };
  };

  const signUpWithPassword = async (email: string, pass: string, name: string) => {
    if (!supabase || !isSupabaseConfigured) {
      return { error: 'Supabase cloud is currently unavailable or paused. You can use Local Real-Time Mode.' };
    }
    const { error } = await supabase.auth.signUp({
      email,
      password: pass,
      options: { data: { full_name: name } },
    });
    if (error) return { error: error.message };
    return { error: null };
  };

  const startLocalRealSession = async (name: string = 'Personal Ledger') => {
    const localUser: UserSession = {
      id: LOCAL_USER_ID,
      email: 'local@myfinance.app',
      displayName: name,
    };
    localStorage.setItem('myfinance_real_user', JSON.stringify(localUser));
    setUser(localUser);
    await seedCleanUser(LOCAL_USER_ID);
  };

  const signOut = async () => {
    if (supabase && isSupabaseConfigured) {
      try {
        await supabase.auth.signOut();
      } catch {
        // ignore
      }
    }
    localStorage.removeItem('myfinance_real_user');
    localStorage.removeItem('myfinance_mode');
    setUser(null);
  };

  const resetPassword = async (email: string) => {
    if (!supabase || !isSupabaseConfigured) {
      return { error: 'Supabase cloud is not reachable.' };
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) return { error: error.message };
    return { error: null };
  };

  const enterDemoMode = async () => {
    await startLocalRealSession();
  };

  const resetDemoData = async () => {
    if (user?.id) {
      await seedCleanUser(user.id);
    }
  };

  const clearLocalData = async () => {
    if (user?.id) {
      await db.accounts.where('user_id').equals(user.id).delete();
      await db.transactions.where('user_id').equals(user.id).delete();
      await db.transfers.where('user_id').equals(user.id).delete();
      await db.budgets.where('user_id').equals(user.id).delete();
      await db.loans.where('user_id').equals(user.id).delete();
      await db.loan_payments.where('user_id').equals(user.id).delete();
      await db.reminders.where('user_id').equals(user.id).delete();
      await db.savings_goals.where('user_id').equals(user.id).delete();
      await db.savings_goal_contributions.where('user_id').equals(user.id).delete();
      await seedCleanUser(user.id);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isDemoMode,
        isSupabaseConfigured,
        signInWithPassword,
        signUpWithPassword,
        signOut,
        resetPassword,
        enterDemoMode,
        resetDemoData,
        clearLocalData,
        startLocalRealSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
