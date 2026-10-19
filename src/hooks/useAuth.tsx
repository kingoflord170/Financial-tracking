import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { seedCleanUser, seedDemoData } from '@/lib/db/seed';
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

const DEMO_USER_ID = 'demo-user-myfinance-in';
const DEMO_USER: UserSession = {
  id: DEMO_USER_ID,
  email: 'demo@myfinance.local',
  displayName: 'Priya Sharma (Demo)',
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);

  useEffect(() => {
    async function initAuth() {
      setIsLoading(true);

      // Check if user previously chose Demo Mode or if Supabase is not configured
      const savedMode = localStorage.getItem('myfinance_mode');

      if (!isSupabaseConfigured || savedMode === 'demo') {
        // Initialize Demo Mode
        setIsDemoMode(true);
        setUser(DEMO_USER);
        // Ensure initial demo data exists in IndexedDB
        const accCount = await db.accounts.where('user_id').equals(DEMO_USER_ID).count();
        if (accCount === 0) {
          await seedDemoData(DEMO_USER_ID);
        }
        setIsLoading(false);
        return;
      }

      // Supabase is configured
      if (supabase) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
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
        } catch {
          setUser(null);
        }

        // Listen to auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
          if (session?.user) {
            setUser({
              id: session.user.id,
              email: session.user.email || '',
              displayName: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
            });
            setIsDemoMode(false);
            localStorage.setItem('myfinance_mode', 'cloud');
            await seedCleanUser(session.user.id);
          } else {
            setUser(null);
          }
          setIsLoading(false);
        });

        setIsLoading(false);
        return () => subscription.unsubscribe();
      }

      setIsLoading(false);
    }

    initAuth();
  }, []);

  const signInWithPassword = async (email: string, pass: string) => {
    if (!supabase || !isSupabaseConfigured) {
      return { error: 'Supabase is not configured. Please use Demo Mode or configure credentials in .env' };
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) return { error: error.message };
    setIsDemoMode(false);
    localStorage.setItem('myfinance_mode', 'cloud');
    return { error: null };
  };

  const signUpWithPassword = async (email: string, pass: string, name: string) => {
    if (!supabase || !isSupabaseConfigured) {
      return { error: 'Supabase is not configured. Please use Demo Mode or configure credentials in .env' };
    }
    const { error } = await supabase.auth.signUp({
      email,
      password: pass,
      options: { data: { full_name: name } },
    });
    if (error) return { error: error.message };
    setIsDemoMode(false);
    localStorage.setItem('myfinance_mode', 'cloud');
    return { error: null };
  };

  const signOut = async () => {
    if (supabase && isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    localStorage.removeItem('myfinance_mode');
    setUser(null);
    setIsDemoMode(false);
  };

  const resetPassword = async (email: string) => {
    if (!supabase || !isSupabaseConfigured) {
      return { error: 'Supabase is not configured. Cannot send password reset email.' };
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) return { error: error.message };
    return { error: null };
  };

  const enterDemoMode = async () => {
    setIsDemoMode(true);
    localStorage.setItem('myfinance_mode', 'demo');
    setUser(DEMO_USER);
    // Seed sample data if empty
    const count = await db.accounts.where('user_id').equals(DEMO_USER_ID).count();
    if (count === 0) {
      await seedDemoData(DEMO_USER_ID);
    }
  };

  const resetDemoData = async () => {
    if (isDemoMode) {
      await seedDemoData(DEMO_USER_ID);
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
