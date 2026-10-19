import { useState, useEffect } from 'react';
import { Reminder } from '@/types';
import { toast } from '@/components/ui/toast';

export function useNotifications(reminders: Reminder[]) {
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      toast.error('Browser notifications are not supported on this browser/device.');
      return false;
    }
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === 'granted') {
        toast.success('Browser notifications enabled successfully!');
        return true;
      } else {
        toast.info('Browser notifications were blocked or dismissed.');
        return false;
      }
    } catch {
      return false;
    }
  };

  const sendBrowserNotification = (title: string, options?: NotificationOptions) => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          icon: '/favicon.svg',
          badge: '/favicon.svg',
          ...options,
        });
      } catch (e) {
        console.warn('Failed to dispatch notification:', e);
      }
    }
  };

  // Derive due reminders
  const now = new Date();
  const activeReminders = reminders.filter(r => r.status === 'pending');

  const overdueReminders = activeReminders.filter(r => {
    const due = new Date(r.due_at);
    return due < now;
  });

  const dueSoonReminders = activeReminders.filter(r => {
    const due = new Date(r.due_at);
    const diffDays = (due.getTime() - now.getTime()) / (1000 * 3600 * 24);
    return diffDays >= 0 && diffDays <= 7;
  });

  return {
    permission,
    requestPermission,
    sendBrowserNotification,
    overdueReminders,
    dueSoonReminders,
    totalNotificationCount: overdueReminders.length + dueSoonReminders.length,
  };
}
