// lib/useIdleTimeout.ts
import { useEffect, useRef, useCallback } from 'react';

interface UseIdleTimeoutOptions {
  timeout?: number;
  warningTime?: number;
  onIdle: () => void;
  onWarning?: () => void;
  onActive?: () => void;
  events?: string[];
  enabled?: boolean;
}

export function useIdleTimeout({
  timeout = 15 * 60 * 1000,
  warningTime = 60 * 1000,
  onIdle,
  onWarning,
  onActive,
  events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click', 'wheel'],
  enabled = true,
}: UseIdleTimeoutOptions) {
  
  const onIdleRef = useRef(onIdle);
  const onWarningRef = useRef(onWarning);
  const onActiveRef = useRef(onActive);
  
  useEffect(() => {
    onIdleRef.current = onIdle;
    onWarningRef.current = onWarning;
    onActiveRef.current = onActive;
  }, [onIdle, onWarning, onActive]);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const isWarningShownRef = useRef<boolean>(false);
  const initializedRef = useRef<boolean>(false);

  const clearTimers = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
      warningTimeoutRef.current = null;
    }
  }, []);

  const handleActivity = useCallback(() => {
    if (!enabled) return;

    lastActivityRef.current = Date.now();

    if (isWarningShownRef.current) {
      isWarningShownRef.current = false;
      onActiveRef.current?.();
    }

    clearTimers();

    if (onWarningRef.current && warningTime < timeout) {
      warningTimeoutRef.current = setTimeout(() => {
        isWarningShownRef.current = true;
        onWarningRef.current?.();
      }, timeout - warningTime);
    }

    timeoutRef.current = setTimeout(() => {
      onIdleRef.current?.();
    }, timeout);
  }, [enabled, timeout, warningTime, clearTimers]);

  useEffect(() => {
    if (!enabled) return;

    if (initializedRef.current) {
      clearTimers();
      handleActivity();
      return;
    }

    handleActivity();
    initializedRef.current = true;

    events.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      clearTimers();
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [enabled]);

  const reset = useCallback(() => {
    handleActivity();
  }, [handleActivity]);

  return {
    reset,
    lastActivity: lastActivityRef.current,
  };
}