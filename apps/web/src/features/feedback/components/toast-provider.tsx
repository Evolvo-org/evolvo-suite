'use client';

import { ApiClientError } from '@repo/api-client';
import React, { type JSX, type ReactNode } from 'react';
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

type ToastVariant = 'error' | 'info' | 'success';

type ToastRecord = {
  description: string;
  durationMs: number;
  id: number;
  title: string;
  variant: ToastVariant;
};

type ToastInput = {
  description: string;
  durationMs?: number;
  title: string;
  variant?: ToastVariant;
};

type ToastContextValue = {
  pushToast: (toast: ToastInput) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

let toastCounter = 0;

const createToastRecord = ({
  description,
  durationMs,
  title,
  variant,
}: ToastInput): ToastRecord => {
  toastCounter += 1;

  return {
    description,
    durationMs: durationMs ?? 6000,
    id: toastCounter,
    title,
    variant: variant ?? 'info',
  };
};

const toneClasses: Record<ToastVariant, string> = {
  error:
    'border-red-500/20 bg-red-50 text-red-800 dark:border-red-400/20 dark:bg-red-950/50 dark:text-red-200',
  info: 'border-zinc-800/10 bg-white text-zinc-900 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-50',
  success:
    'border-emerald-500/20 bg-emerald-50 text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-950/40 dark:text-emerald-200',
};

type ApiErrorDetails = {
  correlationId?: string;
  errors?: string[];
  message?: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

const parseApiErrorDetails = (value: unknown): ApiErrorDetails | null => {
  if (!isRecord(value)) {
    return null;
  }

  const errors = Array.isArray(value.errors)
    ? value.errors.filter((item): item is string => typeof item === 'string')
    : undefined;

  return {
    correlationId:
      typeof value.correlationId === 'string' ? value.correlationId : undefined,
    errors,
    message: typeof value.message === 'string' ? value.message : undefined,
  };
};

export const getErrorToastMessage = (
  error: unknown,
  fallback: string,
): string => {
  if (!(error instanceof Error)) {
    return fallback;
  }

  const details =
    error instanceof ApiClientError ? parseApiErrorDetails(error.details) : null;
  const baseMessage = details?.message?.trim() || error.message.trim() || fallback;
  const detailMessage = details?.errors
    ?.map((value) => value.trim())
    .filter((value) => value.length > 0 && value !== baseMessage)
    .slice(0, 2)
    .join(' ');
  const correlationSuffix = details?.correlationId
    ? ` Reference: ${details.correlationId}`
    : '';

  if (detailMessage && detailMessage.length > 0) {
    return `${baseMessage} ${detailMessage}${correlationSuffix}`.trim();
  }

  return `${baseMessage}${correlationSuffix}`.trim();
};

export const ToastProvider = ({
  children,
}: {
  children: ReactNode;
}): JSX.Element => {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const timeoutIdsRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(
    new Map(),
  );

  useEffect(() => {
    return () => {
      for (const timeoutId of timeoutIdsRef.current.values()) {
        clearTimeout(timeoutId);
      }

      timeoutIdsRef.current.clear();
    };
  }, []);

  const dismissToast = (toastId: number) => {
    const timeoutId = timeoutIdsRef.current.get(toastId);

    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutIdsRef.current.delete(toastId);
    }

    setToasts((currentToasts) =>
      currentToasts.filter((toast) => toast.id !== toastId),
    );
  };

  const pushToast = (toast: ToastInput) => {
    const nextToast = createToastRecord(toast);
    setToasts((currentToasts) => [...currentToasts, nextToast]);

    const timeoutId = setTimeout(() => {
      dismissToast(nextToast.id);
    }, nextToast.durationMs);

    timeoutIdsRef.current.set(nextToast.id, timeoutId);
  };

  return (
    <ToastContext.Provider value={{ pushToast }}>
      {children}
      <section
        aria-label="Notifications"
        className="pointer-events-none fixed right-4 bottom-4 z-50 flex w-full max-w-sm flex-col gap-3"
      >
        {toasts.map((toast) => (
          <section
            key={toast.id}
            className={`pointer-events-auto rounded-3xl border p-4 shadow-lg backdrop-blur ${toneClasses[toast.variant]}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm font-semibold">{toast.title}</p>
                <p className="text-sm opacity-90">{toast.description}</p>
              </div>
              <button
                aria-label={`Dismiss ${toast.title}`}
                className="rounded-full px-2 py-1 text-xs font-semibold opacity-70 transition hover:opacity-100"
                onClick={() => dismissToast(toast.id)}
                type="button"
              >
                Close
              </button>
            </div>
          </section>
        ))}
      </section>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextValue => {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast must be used within a ToastProvider.');
  }

  return context;
};
