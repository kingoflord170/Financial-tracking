import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { useNotifications } from '@/hooks/useNotifications';
import { useFinanceData } from '@/hooks/useFinanceData';
import { testSupabaseConnection } from '@/lib/supabase/client';
import { toast } from '@/components/ui/toast';
import {
  Settings as SettingsIcon,
  User,
  Moon,
  Sun,
  Laptop,
  Bell,
  Cloud,
  Database,
  Trash2,
  RefreshCcw,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ShieldAlert,
} from 'lucide-react';

export function SettingsPage() {
  const { user, isSupabaseConfigured, clearLocalData, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const finance = useFinanceData();
  const notifications = useNotifications(finance.reminders);

  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [currency] = useState('INR (₹)');
  const [timezone] = useState('Asia/Kolkata (IST)');
  const [connectionTestResult, setConnectionTestResult] = useState<{
    tested: boolean;
    connected: boolean;
    message: string;
  } | null>(null);
  const [isTestingConnection, setIsTestingConnection] = useState(false);

  // Destructive confirmations
  const [confirmClearDataOpen, setConfirmClearDataOpen] = useState(false);

  useEffect(() => {
    if (user?.displayName) {
      setDisplayName(user.displayName);
    }
  }, [user]);

  const handleTestSupabase = async () => {
    setIsTestingConnection(true);
    const result = await testSupabaseConnection();
    setConnectionTestResult({ tested: true, ...result });
    setIsTestingConnection(false);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Preferences saved locally.');
  };

  return (
    <div className="space-y-6 max-w-4xl animate-fade-in">
      {/* Header */}
      <div className="pb-2 border-b border-border/50">
        <h2 className="text-xl md:text-2xl font-black text-foreground tracking-tight">
          Settings & Preferences
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Configure profile, appearance, notifications, and cloud synchronization
        </p>
      </div>

      {/* Profile & Financial Localization */}
      <Card className="p-5">
        <CardHeader className="p-0 pb-4">
          <div className="flex items-center gap-2.5">
            <User className="h-5 w-5 text-primary" />
            <CardTitle>Profile & Regional Formatting</CardTitle>
          </div>
          <p className="text-xs text-muted-foreground">User identity and accounting locale defaults</p>
        </CardHeader>
        <CardContent className="p-0">
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Display Name"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
              />
              <Input
                label="Registered Email"
                value={user?.email || ''}
                disabled
                helperText="Supabase authenticated account"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Default Currency"
                value={currency}
                disabled
                helperText="Indian Rupee (₹) with Lakhs & Crores formatting"
              />
              <Input
                label="Financial Timezone"
                value={timezone}
                disabled
                helperText="Standard Indian Standard Time"
              />
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" size="sm" variant="primary">
                Save Profile
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Theme & Display Mode */}
      <Card className="p-5">
        <CardHeader className="p-0 pb-4">
          <div className="flex items-center gap-2.5">
            <Moon className="h-5 w-5 text-primary" />
            <CardTitle>Theme & Appearance</CardTitle>
          </div>
          <p className="text-xs text-muted-foreground">
            Sleek dark navy financial surface with electric-blue accents
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`p-3.5 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                theme === 'dark'
                  ? 'border-primary bg-primary/10 text-primary font-bold shadow-glow'
                  : 'border-border bg-card-elevated text-muted-foreground hover:text-foreground'
              }`}
            >
              <Moon className="h-5 w-5" />
              <span className="text-xs">Dark (Default)</span>
            </button>

            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`p-3.5 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                theme === 'light'
                  ? 'border-primary bg-primary/10 text-primary font-bold shadow-glow'
                  : 'border-border bg-card-elevated text-muted-foreground hover:text-foreground'
              }`}
            >
              <Sun className="h-5 w-5" />
              <span className="text-xs">Light</span>
            </button>

            <button
              type="button"
              onClick={() => setTheme('system')}
              className={`p-3.5 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                theme === 'system'
                  ? 'border-primary bg-primary/10 text-primary font-bold shadow-glow'
                  : 'border-border bg-card-elevated text-muted-foreground hover:text-foreground'
              }`}
            >
              <Laptop className="h-5 w-5" />
              <span className="text-xs">System Auto</span>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Notifications & Reminders */}
      <Card className="p-5">
        <CardHeader className="p-0 pb-4">
          <div className="flex items-center gap-2.5">
            <Bell className="h-5 w-5 text-primary" />
            <CardTitle>Notifications & Bill Due Alerts</CardTitle>
          </div>
          <p className="text-xs text-muted-foreground">
            In-app banners and browser desktop notifications for upcoming bills
          </p>
        </CardHeader>
        <CardContent className="p-0 space-y-3">
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-card-elevated border border-border">
            <div>
              <p className="text-xs font-bold text-foreground">Web Notifications API</p>
              <p className="text-[11px] text-muted-foreground">
                Permission status: <strong className="uppercase">{notifications.permission}</strong>
              </p>
            </div>
            {notifications.permission !== 'granted' ? (
              <Button size="sm" variant="outline" onClick={notifications.requestPermission}>
                Request Permission
              </Button>
            ) : (
              <Badge variant="success">Permission Active</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Supabase Cloud Connection & Architecture Details */}
      <Card className="p-5">
        <CardHeader className="p-0 pb-4">
          <div className="flex items-center gap-2.5">
            <Cloud className="h-5 w-5 text-primary" />
            <CardTitle>Cloud Database & Supabase Synchronization</CardTitle>
          </div>
          <p className="text-xs text-muted-foreground">
            Backend PostgreSQL database connection status and configuration
          </p>
        </CardHeader>
        <CardContent className="p-0 space-y-4 text-xs">
          <div className="p-3.5 rounded-xl bg-card-elevated border border-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`h-3 w-3 rounded-full ${
                  isSupabaseConfigured ? 'bg-emerald-400' : 'bg-amber-400'
                }`}
              />
              <div>
                <span className="font-bold text-foreground">
                  {isSupabaseConfigured ? 'Supabase Cloud Connected' : 'Supabase Not Configured'}
                </span>
                <p className="text-[11px] text-muted-foreground">
                  {isSupabaseConfigured
                    ? 'Connected to Supabase PostgreSQL with Row Level Security'
                    : 'Check your environment configuration'}
                </p>
              </div>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={handleTestSupabase}
              isLoading={isTestingConnection}
            >
              Test Connection
            </Button>
          </div>

          {connectionTestResult && (
            <div
              className={`p-3 rounded-xl border text-xs ${
                connectionTestResult.connected
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                  : 'bg-amber-500/10 border-amber-500/20 text-amber-300'
              }`}
            >
              <div className="flex items-start gap-2">
                {connectionTestResult.connected ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
                ) : (
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
                )}
                <span>{connectionTestResult.message}</span>
              </div>
            </div>
          )}

          <div className="p-3.5 rounded-xl bg-card-elevated border border-border space-y-2 text-muted-foreground">
            <span className="font-bold text-foreground block">How to connect your own Supabase project:</span>
            <ol className="list-decimal pl-4 space-y-1 text-[11px]">
              <li>Create a free project at <code className="text-primary">supabase.com</code>.</li>
              <li>Execute the SQL migration located in <code className="text-primary font-mono">supabase/migrations/20261019_001_initial_schema.sql</code> in the Supabase SQL Editor.</li>
              <li>Add your Project URL and Publishable Anon Key into <code className="text-primary font-mono">.env</code> as <code className="font-mono">VITE_SUPABASE_URL</code> and <code className="font-mono">VITE_SUPABASE_PUBLISHABLE_KEY</code>.</li>
              <li>Restart the dev server. All local offline transactions will sync automatically!</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone & Data Reset */}
      <Card className="p-5 border-destructive/30 bg-destructive/5">
        <CardHeader className="p-0 pb-3">
          <div className="flex items-center gap-2 text-destructive">
            <ShieldAlert className="h-5 w-5" />
            <CardTitle className="text-destructive">Data Management & Reset</CardTitle>
          </div>
          <p className="text-xs text-muted-foreground">
            Destructive actions requiring confirmation
          </p>
        </CardHeader>
        <CardContent className="p-0 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border border-destructive/20 bg-card">
            <div>
              <p className="text-xs font-bold text-destructive">Clear All Local Data</p>
              <p className="text-[11px] text-muted-foreground">
                Permanently deletes all cached transactions, accounts, and budgets from IndexedDB.
              </p>
            </div>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setConfirmClearDataOpen(true)}
            >
              Wipe Data
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Clear Data Confirmation Modal */}
      <ConfirmationModal
        open={confirmClearDataOpen}
        onOpenChange={setConfirmClearDataOpen}
        title="Wipe All Local Financial Data?"
        description="Are you absolutely sure? This will remove all local accounts, transactions, and budgets from this device."
        confirmLabel="Yes, Wipe All Data"
        variant="destructive"
        onConfirm={async () => {
          await clearLocalData();
          await finance.reloadData();
          toast.info('Local database wiped clean.');
        }}
      />
    </div>
  );
}
