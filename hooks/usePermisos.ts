'use client';
// /hooks/usePermisos.ts
import { useState, useEffect, useCallback } from 'react';

// ==========================================
// INTERFACES SIMPLIFICADAS
// ==========================================
export interface ProfesionalAcceso {
  profesional_id: number | null;
  profesional_nombre: string;
  profesional_especialidad: string;
  rol_codigo: string;
  rol_nombre: string;
  rol_color: string;
  modulos_permitidos: string[]; // ← ← ← SIMPLIFICADO: Solo lista de módulos
}

export interface PermisosUsuario {
  user_id: number;
  user_username: string;
  user_email: string;
  es_superadmin: boolean;
  profesionales: ProfesionalAcceso[];
  total_profesionales: number;
}

// ==========================================
// HOOK PRINCIPAL SIMPLIFICADO
// ==========================================
export function usePermisos() {
  const [permisos, setPermisos] = useState<PermisosUsuario | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargarPermisos = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
      if (!token) {
        setLoading(false);
        return;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dzsalon.com/api';
      const res = await fetch(`${apiUrl}/profesional-user/mis-permisos/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        cache: 'no-store'
      });

      if (!res.ok) {
        throw new Error(`Error ${res.status} al cargar permisos`);
      }

      const data = await res.json();
      setPermisos(data);
    } catch (err: any) {
      console.error('❌ Error cargando permisos:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarPermisos();
  }, [cargarPermisos]);

  // ==========================================
  // FUNCIONES SIMPLIFICADAS
  // ==========================================

  /**
   * Verifica si el usuario tiene acceso a un módulo específico.
   * @param moduloCodigo - Código del módulo (ej: 'citas', 'caja', 'profesionales')
   */
  const tieneAccesoAModulo = useCallback((
    moduloCodigo: string
  ): boolean => {
    if (!permisos) return false;

    // Superadmin tiene acceso a todo
    if (permisos.es_superadmin) return true;

    // Si no tiene accesos, no tiene permisos
    if (!permisos.profesionales || permisos.profesionales.length === 0) {
      return false;
    }

    // Verificar si algún acceso tiene el módulo permitido
    return permisos.profesionales.some(acceso => 
      acceso.modulos_permitidos.includes(moduloCodigo)
    );
  }, [permisos]);

  /**
   * Retorna todos los módulos a los que el usuario tiene acceso.
   * Útil para filtrar el menú lateral.
   */
  const modulosAccesibles = useCallback((): string[] => {
    if (!permisos) return [];
    
    // Superadmin tiene acceso a todos
    if (permisos.es_superadmin) {
      // Retornar lista completa de módulos del sistema
      return [
        'citas', 'caja', 'profesionales', 'productos', 'categorias',
        'servicios', 'galeria', 'tareas', 'aliados', 'referidos',
        'publicidad', 'configuracion', 'roles', 'accesos', 'horarios',
        'paquetes', 'clientes', 'valoraciones'
      ];
    }

    // Consolidar módulos de todos los accesos
    const modulosSet = new Set<string>();
    permisos.profesionales.forEach(acceso => {
      acceso.modulos_permitidos.forEach(modulo => {
        modulosSet.add(modulo);
      });
    });
    
    return Array.from(modulosSet);
  }, [permisos]);

  /**
   * Retorna el rol del usuario para un profesional específico.
   */
  const getRol = useCallback((profesionalId?: number | null): { codigo: string; nombre: string; color: string } | null => {
    if (!permisos) return null;
    
    if (permisos.es_superadmin) {
      return { codigo: 'superadmin', nombre: 'Super Administrador', color: '#EF4444' };
    }

    const acceso = profesionalId !== undefined
      ? permisos.profesionales.find(p => p.profesional_id === profesionalId)
      : permisos.profesionales[0];

    if (!acceso) return null;
    
    return {
      codigo: acceso.rol_codigo,
      nombre: acceso.rol_nombre,
      color: acceso.rol_color
    };
  }, [permisos]);

  return {
    permisos,
    loading,
    error,
    recargar: cargarPermisos,
    tieneAccesoAModulo,
    modulosAccesibles,
    getRol,
    esSuperadmin: permisos?.es_superadmin || false,
  };
}