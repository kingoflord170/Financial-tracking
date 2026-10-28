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
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isDemoMode = false; // Offline and demo modes disabled: Supabase Account only

  useEffect(() => {
    async function initAuth() {
      setIsLoading(true);

      // Clean up legacy offline/demo state
      localStorage.removeItem('myfinance_mode');
      localStorage.removeItem('myfinance_real_user');

      if (!supabase || !isSupabaseConfigured) {
        setUser(null);
        setIsLoading(false);
        return;
      }

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
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      }

      // Listen to Supabase auth state changes
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

      setIsLoading(false);
      return () => subscription.unsubscribe();
    }

    initAuth();
  }, []);

  const signInWithPassword = async (email: string, pass: string) => {
    if (!supabase || !isSupabaseConfigured) {
      return { error: 'Supabase credentials are not configured in environment.' };
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) return { error: error.message };
    return { error: null };
  };

  const signUpWithPassword = async (email: string, pass: string, name: string) => {
    if (!supabase || !isSupabaseConfigured) {
      return { error: 'Supabase credentials are not configured in environment.' };
    }
    const { error } = await supabase.auth.signUp({
      email,
      password: pass,
      options: { data: { full_name: name } },
    });
    if (error) return { error: error.message };
    return { error: null };
  };

  const signOut = async () => {
    if (supabase && isSupabaseConfigured) {
      try {
        await supabase.auth.signOut();
      } catch {
        // ignore
      }
    }
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

  // Deprecated stubs
  const enterDemoMode = async () => {};
  const resetDemoData = async () => {};

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
