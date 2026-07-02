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
  
  // ← ← ← CLAVE: Usar refs para los callbacks para evitar re-renders ← ← ←
  const onIdleRef = useRef(onIdle);
  const onWarningRef = useRef(onWarning);
  const onActiveRef = useRef(onActive);
  
  // Actualizar refs cuando cambien los callbacks
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

  // ← ← ← CLAVE: handleActivity NO depende de los callbacks directamente ← ← ←
  const handleActivity = useCallback(() => {
    if (!enabled) {
      console.log('[IdleTimeout] Hook deshabilitado');
      return;
    }

    const now = Date.now();
    const timeSinceLastActivity = now - lastActivityRef.current;
    lastActivityRef.current = now;

    console.log(`[IdleTimeout] Actividad detectada. Tiempo: ${timeSinceLastActivity}ms`);

    // Si estaba en advertencia, cancelar
    if (isWarningShownRef.current) {
      console.log('[IdleTimeout] Usuario volvió a estar activo');
      isWarningShownRef.current = false;
      onActiveRef.current?.();
    }

    // Limpiar timers existentes
    clearTimers();

    // Configurar timer de advertencia
    if (onWarningRef.current && warningTime < timeout) {
      warningTimeoutRef.current = setTimeout(() => {
        console.log('[IdleTimeout] ⚠️ Mostrando advertencia');
        isWarningShownRef.current = true;
        onWarningRef.current?.();
      }, timeout - warningTime);
    }

    // Configurar timer de inactividad
    console.log(`[IdleTimeout] Timeout configurado: ${timeout}ms`);
    timeoutRef.current = setTimeout(() => {
      console.log('[IdleTimeout] ⏱️ TIEMPO ALCANZADO - Cerrando sesión');
      onIdleRef.current?.();
    }, timeout);
  }, [enabled, timeout, warningTime, clearTimers]);

  // ← ← ← CLAVE: useEffect SIN dependencias problemáticas ← ← ←
  useEffect(() => {
    if (!enabled) {
      console.log('[IdleTimeout] Hook deshabilitado');
      return;
    }

    // Solo inicializar una vez
    if (initializedRef.current) {
      console.log('[IdleTimeout] Ya inicializado, solo limpiando timers');
      clearTimers();
      handleActivity();
      return;
    }

    console.log(`[IdleTimeout] 🚀 Inicializando: timeout=${timeout}ms, warning=${warningTime}ms`);
    console.log(`[IdleTimeout] Eventos: ${events.length}`);

    handleActivity();
    initializedRef.current = true;

    // Agregar event listeners
    events.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    console.log('[IdleTimeout] ✅ Listeners registrados');

    // Cleanup
    return () => {
      console.log('[IdleTimeout] 🧹 Limpiando...');
      clearTimers();
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
    };
    // ← ← ← CLAVE: Solo 'enabled' como dependencia, NO handleActivity ← ← ←
  }, [enabled]);

  const reset = useCallback(() => {
    console.log('[IdleTimeout] Reset manual');
    handleActivity();
  }, [handleActivity]);

  return {
    reset,
    lastActivity: lastActivityRef.current,
  };
}