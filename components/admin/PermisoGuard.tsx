'use client';
// /components/admin/PermisoGuard.tsx
import { usePermisosContext } from '@/contexts/PermisosContext';
import { ReactNode } from 'react';

// ==========================================
// COMPONENTE PRINCIPAL SIMPLIFICADO
// ==========================================
interface PermisoGuardProps {
  /** Código del módulo a verificar (ej: 'citas', 'caja') */
  modulo: string;
  /** Contenido a mostrar si tiene permiso */
  children: ReactNode;
  /** (Opcional) Contenido alternativo si NO tiene permiso */
  fallback?: ReactNode;
  /** Si es true, muestra un mensaje de "sin permisos" en lugar de ocultar */
  mostrarMensaje?: boolean;
}

export default function PermisoGuard({
  modulo,
  children,
  fallback = null,
  mostrarMensaje = false,
}: PermisoGuardProps) {
  const { tieneAccesoAModulo, loading } = usePermisosContext();

  // Mientras carga, no mostrar nada
  if (loading) {
    return mostrarMensaje ? (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
      </div>
    ) : null;
  }

  // Verificar acceso al módulo
  const tieneAcceso = tieneAccesoAModulo(modulo);

  // Si tiene acceso, mostrar children
  if (tieneAcceso) {
    return <>{children}</>;
  }

  // Si no tiene acceso, mostrar fallback o mensaje
  if (mostrarMensaje) {
    return (
      <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-4 text-center">
        <div className="text-3xl mb-2"></div>
        <p className="text-yellow-300 font-semibold">Acceso Restringido</p>
        <p className="text-xs text-gray-400 mt-1">
          No tienes permisos para acceder a esta sección.
        </p>
      </div>
    );
  }

  return <>{fallback}</>;
}