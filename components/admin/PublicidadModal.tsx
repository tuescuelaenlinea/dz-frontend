'use client';
// /var/www/dz_api/frontend/components/admin/PublicidadModal.tsx
import { useState, useEffect, useRef, useCallback } from 'react';

interface PublicidadData {
  id: number;
  titulo: string;
  descripcion: string;
  imagen_url: string;
  url_destino?: string;
  texto_boton: string;
  frecuencia: string;
}

interface PublicidadModalProps {
  apiUrl?: string;
  token?: string | null;
}

export default function PublicidadModal({ 
  apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dzsalon.com/api',
  token: tokenProp
}: PublicidadModalProps) {
  const [publicidadActual, setPublicidadActual] = useState<PublicidadData | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // ← ← ← CLAVE: useRef para estado sincrónico (no se re-renderiza) ← ← ←
  const publicidadesMostradasRef = useRef<Set<number>>(new Set());
  const cargandoRef = useRef(false);
  const procesandoCierreRef = useRef(false);
  const inicializadoRef = useRef(false);

  useEffect(() => {
    // ← ← ← CLAVE: Evitar doble ejecución en Strict Mode ← ← ←
    if (inicializadoRef.current) {
      console.log('⏭️ [Publicidad] Ya inicializado, saltando segunda ejecución');
      return;
    }
    inicializadoRef.current = true;
    
    console.log('🚀 [Publicidad] Inicializando modal de publicidad...');
    cargarSiguientePublicidad();
  }, []);

  const cargarSiguientePublicidad = useCallback(async () => {
    // ← ← ← CLAVE: Bloquear llamadas concurrentes ← ← ←
    if (cargandoRef.current) {
      console.log('⏭️ [Publicidad] Ya hay una carga en progreso, saltando...');
      return;
    }
    
    cargandoRef.current = true;
    
    try {
      setIsLoading(true);
      
      // Leer user_id desde localStorage
      let userId: string | null = null;
      if (typeof window !== 'undefined') {
        try {
          const userStr = localStorage.getItem('user');
          if (userStr) {
            const userData = JSON.parse(userStr);
            userId = userData.id ? userData.id.toString() : null;
          }
        } catch (err) {
          console.warn('⚠️ [Publicidad] Error parseando user:', err);
        }
      }
      
      // Token
      const token = tokenProp || (typeof window !== 'undefined' ? (
        localStorage.getItem('token') || 
        localStorage.getItem('user_token') || 
        localStorage.getItem('admin_token') || 
        null
      ) : null);
      
      // ← ← ← CLAVE: Usar el Set del ref (sincrónico) ← ← ←
      const mostradasArray = Array.from(publicidadesMostradasRef.current);
      
      // Construir URL con excluir_ids
      const excluirIdsParam = mostradasArray.length > 0 
        ? `&excluir_ids=${mostradasArray.join(',')}`
        : '';
      
      const url = userId 
        ? `${apiUrl}/publicidad/activa/?user_id=${userId}${excluirIdsParam}`
        : `${apiUrl}/publicidad/activa/?${excluirIdsParam}`;
      
      console.log('🔍 [Publicidad] URL:', url);
      console.log('🔍 [Publicidad] Mostradas:', mostradasArray);
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const res = await fetch(url, { headers });
      
      console.log('📡 [Publicidad] Response status:', res.status);
      
      if (res.ok) {
        const data = await res.json();
        console.log('📢 [Publicidad] Siguiente publicidad:', data.titulo);
        setPublicidadActual(data);
        setIsVisible(true);
      } else {
        console.log('ℹ️ [Publicidad] No hay más publicidades activas');
        setPublicidadActual(null);
        setIsVisible(false);
      }
    } catch (err) {
      console.error('❌ [Publicidad] Error cargando publicidad:', err);
    } finally {
      setIsLoading(false);
      cargandoRef.current = false;
    }
  }, [apiUrl, tokenProp]);

  const handleCerrar = useCallback(async () => {
    // ← ← ← CLAVE: Evitar doble ejecución ← ← ←
    if (procesandoCierreRef.current) {
      console.log('⏭️ [Publicidad] Ya procesando cierre, saltando...');
      return;
    }
    
    if (!publicidadActual) return;
    
    procesandoCierreRef.current = true;
    
    try {
      const token = tokenProp || localStorage.getItem('token') || localStorage.getItem('user_token');
      
      // Registrar vista
      await fetch(`${apiUrl}/publicidad/${publicidadActual.id}/registrar-vista/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          session_id: 'web-' + Date.now()
        })
      });
      console.log('✅ [Publicidad] Vista registrada');
    } catch (err) {
      console.error('❌ [Publicidad] Error registrando vista:', err);
    }

    // ← ← ← CLAVE: Agregar al Set del ref (sincrónico) ← ← ←
    publicidadesMostradasRef.current.add(publicidadActual.id);
    console.log('✅ [Publicidad] Agregada a mostradas:', publicidadActual.id);
    
    setIsVisible(false);
    
    // ← ← ← CLAVE: Esperar un poco antes de cargar la siguiente ← ← ←
    setTimeout(() => {
      procesandoCierreRef.current = false;
      cargarSiguientePublicidad();
    }, 500);
  }, [publicidadActual, apiUrl, tokenProp, cargarSiguientePublicidad]);

  const handleClic = useCallback(async () => {
    // ← ← ← CLAVE: Evitar doble ejecución ← ← ←
    if (procesandoCierreRef.current) {
      console.log('⏭️ [Publicidad] Ya procesando clic, saltando...');
      return;
    }
    
    if (!publicidadActual) return;
    
    procesandoCierreRef.current = true;
    
    try {
      const token = tokenProp || localStorage.getItem('token') || localStorage.getItem('user_token');
      
      await fetch(`${apiUrl}/publicidad/${publicidadActual.id}/registrar-vista/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          session_id: 'web-clic-' + Date.now()
        })
      });
      console.log('✅ [Publicidad] Clic registrado como vista');
    } catch (err) {
      console.error('❌ [Publicidad] Error registrando clic:', err);
    }

    if (publicidadActual.url_destino) {
      window.open(publicidadActual.url_destino, '_blank');
    }

    // ← ← ← CLAVE: Agregar al Set del ref (sincrónico) ← ← ←
    publicidadesMostradasRef.current.add(publicidadActual.id);
    console.log('✅ [Publicidad] Agregada a mostradas:', publicidadActual.id);
    
    setIsVisible(false);
    
    setTimeout(() => {
      procesandoCierreRef.current = false;
      cargarSiguientePublicidad();
    }, 500);
  }, [publicidadActual, apiUrl, tokenProp, cargarSiguientePublicidad]);

  if (isLoading || !isVisible || !publicidadActual) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4 animate-fadeIn">
      <div className="relative bg-transparent rounded-lg shadow-2xl w-fit max-w-full">
        <button
          onClick={handleCerrar}
          className="absolute top-3 right-3 z-20 w-8 h-8 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center text-white transition-colors backdrop-blur-sm"
          title="Cerrar"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div 
          onClick={handleClic}
          className="cursor-pointer relative group"
        >
          <img
            src={publicidadActual.imagen_url}
            alt={publicidadActual.titulo}
            className="w-auto h-auto max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
          />
          
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-300 rounded-lg pointer-events-none" />
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}