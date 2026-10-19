import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { Sparkles, Lock, Mail, User, ShieldCheck, ArrowRight, Info } from 'lucide-react';

export function AuthPage() {
  const {
    isSupabaseConfigured,
    signInWithPassword,
    signUpWithPassword,
    resetPassword,
    enterDemoMode,
  } = useAuth();

  const [tab, setTab] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);
    setIsLoading(true);

    try {
      if (tab === 'signin') {
        const res = await signInWithPassword(email, password);
        if (res.error) {
          setStatusMessage({ type: 'error', text: res.error });
        }
      } else if (tab === 'signup') {
        if (!displayName.trim()) {
          setStatusMessage({ type: 'error', text: 'Please enter your full name.' });
          setIsLoading(false);
          return;
        }
        const res = await signUpWithPassword(email, password, displayName);
        if (res.error) {
          setStatusMessage({ type: 'error', text: res.error });
        } else {
          setStatusMessage({
            type: 'success',
            text: 'Account created! Please check your email to verify your address or sign in.',
          });
        }
      } else if (tab === 'forgot') {
        const res = await resetPassword(email);
        if (res.error) {
          setStatusMessage({ type: 'error', text: res.error });
        } else {
          setStatusMessage({
            type: 'success',
            text: 'Password recovery email sent. Check your inbox.',
          });
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-background relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-primary/10 blur-[100px] pointer-events-none rounded-full" />

      <div className="w-full max-w-md space-y-5 relative z-10 animate-fade-in">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 mx-auto flex items-center justify-center text-white font-extrabold text-2xl shadow-glow">
            ₹
          </div>
          <h1 className="text-2xl font-black text-foreground tracking-tight">
            MyFinance
          </h1>
          <p className="text-xs text-muted-foreground">
            Production-ready personal finance, accounts & monthly budget tracker
          </p>
        </div>

        {/* Auth Card */}
        <Card className="p-6 shadow-2xl border-border">
          {/* Tabs */}
          <div className="grid grid-cols-3 p-1 rounded-xl bg-card-elevated border border-border mb-5">
            <button
              type="button"
              onClick={() => {
                setTab('signin');
                setStatusMessage(null);
              }}
              className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                tab === 'signin' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('signup');
                setStatusMessage(null);
              }}
              className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                tab === 'signup' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground'
              }`}
            >
              Sign Up
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('forgot');
                setStatusMessage(null);
              }}
              className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                tab === 'forgot' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground'
              }`}
            >
              Reset
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {tab === 'signup' && (
              <Input
                label="Full Name"
                placeholder="e.g. Priya Sharma"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                startAdornment={<User className="h-4 w-4" />}
                required
              />
            )}

            <Input
              label="Email Address"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              startAdornment={<Mail className="h-4 w-4" />}
              required
            />

            {tab !== 'forgot' && (
              <Input
                label="Password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                startAdornment={<Lock className="h-4 w-4" />}
                required
              />
            )}

            {statusMessage && (
              <div
                className={`p-3 rounded-xl border text-xs ${
                  statusMessage.type === 'error'
                    ? 'bg-destructive/10 border-destructive/20 text-destructive'
                    : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                }`}
              >
                {statusMessage.text}
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full mt-2"
              isLoading={isLoading}
            >
              {tab === 'signin' && 'Sign In to Cloud'}
              {tab === 'signup' && 'Create Supabase Account'}
              {tab === 'forgot' && 'Send Reset Email'}
            </Button>
          </form>

          {/* Supabase status disclaimer */}
          {!isSupabaseConfigured && (
            <div className="mt-4 p-3 rounded-xl bg-card-elevated border border-border text-[11px] text-muted-foreground flex items-start gap-2">
              <Info className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
              <span>
                Supabase credentials are not configured in <code className="font-mono text-primary">.env</code>. Use Demo Mode below to test all features with local IndexedDB storage.
              </span>
            </div>
          )}

          {/* Divider */}
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border/60" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-wider">
              <span className="bg-card px-2 text-muted-foreground">Or Instant Sandbox</span>
            </div>
          </div>

          {/* Quick Demo Mode Action */}
          <Button
            type="button"
            variant="outline"
            size="md"
            className="w-full gap-2 border-primary/40 text-foreground hover:bg-primary/10 hover:border-primary"
            onClick={enterDemoMode}
          >
            <Sparkles className="h-4 w-4 text-cyan-400" />
            <span className="font-bold">Explore in Demo Sandbox Mode</span>
            <ArrowRight className="h-4 w-4 ml-auto text-primary" />
          </Button>
        </Card>

        {/* Security badge */}
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          <span>Row Level Security (RLS) • Isolated User Ledgers</span>
        </div>
      </div>
    </div>
  );
}
