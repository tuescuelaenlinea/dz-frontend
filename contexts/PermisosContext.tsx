'use client';
// /contexts/PermisosContext.tsx
import React, { createContext, useContext } from 'react';
import { usePermisos, PermisosUsuario } from '@/hooks/usePermisos';

// ==========================================
// INTERFACES DEL CONTEXTO
// ==========================================
interface PermisosContextType {
  permisos: PermisosUsuario | null;
  loading: boolean;
  error: string | null;
  recargar: () => Promise<void>;
  tieneAccesoAModulo: (moduloCodigo: string) => boolean;
  modulosAccesibles: () => string[];
  getRol: (profesionalId?: number | null) => { codigo: string; nombre: string; color: string } | null;
  esSuperadmin: boolean;
}

// ==========================================
// CREAR CONTEXTO
// ==========================================
const PermisosContext = createContext<PermisosContextType | undefined>(undefined);

// ==========================================
// PROVIDER
// ==========================================
export function PermisosProvider({ children }: { children: React.ReactNode }) {
  const permisosHook = usePermisos();

  return (
    <PermisosContext.Provider value={permisosHook}>
      {children}
    </PermisosContext.Provider>
  );
}

// ==========================================
// HOOK PARA USAR EL CONTEXTO
// ==========================================
export function usePermisosContext(): PermisosContextType {
  const context = useContext(PermisosContext);
  if (context === undefined) {
    throw new Error('usePermisosContext debe usarse dentro de un PermisosProvider');
  }
  return context;
}