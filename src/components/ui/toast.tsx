import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
}

type ToastListener = (toasts: ToastMessage[]) => void;

class ToastService {
  private toasts: ToastMessage[] = [];
  private listeners: Set<ToastListener> = new Set();

  public subscribe(listener: ToastListener): () => void {
    this.listeners.add(listener);
    listener(this.toasts);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(fn => fn([...this.toasts]));
  }

  public show(message: string, type: ToastType = 'info', durationMs = 4000) {
    const id = crypto.randomUUID();
    const item: ToastMessage = { id, type, message };
    this.toasts.push(item);
    this.notify();

    setTimeout(() => {
      this.dismiss(id);
    }, durationMs);
  }

  public success(message: string) {
    this.show(message, 'success');
  }

  public error(message: string) {
    this.show(message, 'error', 5000);
  }

  public info(message: string) {
    this.show(message, 'info');
  }

  public dismiss(id: string) {
    this.toasts = this.toasts.filter(t => t.id !== id);
    this.notify();
  }
}

export const toast = new ToastService();

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    return toast.subscribe(setToasts);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none p-2 sm:p-0">
      {toasts.map(t => {
        const icons = {
          success: <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />,
          error: <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />,
          info: <Info className="h-4 w-4 text-cyan-400 shrink-0" />,
        };

        const borders = {
          success: 'border-emerald-500/30 bg-card/95',
          error: 'border-rose-500/30 bg-card/95',
          info: 'border-cyan-500/30 bg-card/95',
        };

        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border shadow-xl backdrop-blur-md transition-all duration-200 animate-fade-in ${borders[t.type]}`}
          >
            <div className="mt-0.5">{icons[t.type]}</div>
            <p className="text-xs font-medium text-foreground flex-1 leading-snug">{t.message}</p>
            <button
              onClick={() => toast.dismiss(t.id)}
              className="text-muted-foreground hover:text-foreground p-0.5 rounded transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
