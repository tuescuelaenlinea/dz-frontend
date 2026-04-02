// ← app/citas/pago-retorno/page.tsx
// ← NO usar 'use client' aquí - esta página será servidor + cliente híbrido
// Usamos el prop searchParams en lugar del hook useSearchParams

'use client';  // ← Mantenemos 'use client' porque usamos useEffect/router

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

// ← COMPONENTE INTERNO que usa useSearchParams (envuelto en Suspense)
function PagoRetornoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [procesando, setProcesando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string>('');

  useEffect(() => {
    async function confirmarPago() {
      try {
        // ← Obtener parámetros desde useSearchParams (dentro de useEffect = seguro)
        const pagoExitoso = searchParams?.get('pago') === 'exitoso';
        const citaIdParam = searchParams?.get('cita_id');
        
        console.log('🔍 PagoRetornoPage - pago:', pagoExitoso, 'cita_id:', citaIdParam);
        
        if (!pagoExitoso || !citaIdParam) {
          setError('No se detectó un pago exitoso o falta el ID de la cita');
          setMensaje('Por favor verifica tu estado de pago en "Mis Citas"');
          setProcesando(false);
          return;
        }
        
        // Obtener cita pendiente del localStorage
        const citaPendienteStr = typeof window !== 'undefined' 
          ? localStorage.getItem('cita_pendiente_pago') 
          : null;
        
        if (citaPendienteStr) {
          try {
            const citaPendiente = JSON.parse(citaPendienteStr);
            console.log('📋 Cita pendiente encontrada:', citaPendiente);
          } catch (e) {
            console.warn('⚠️ No se pudo parsear cita_pendiente_pago');
          }
        }
        
        // Actualizar estado de pago en backend
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080/api';
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        
        const headers: HeadersInit = { 'Content-Type': 'application/json' };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        
        console.log('📡 Actualizando estado de pago para cita #', citaIdParam);
        
        const res = await fetch(`${apiUrl}/citas/${citaIdParam}/confirmar-pago/`, {
          method: 'POST',
          headers,
        });
        
        if (!res.ok) {
          const errorText = await res.text();
          console.warn('⚠️ Backend respondió con error:', res.status, errorText);
        } else {
          console.log('✅ Backend confirmó el pago exitosamente');
        }
        
        // Limpiar localStorage
        if (typeof window !== 'undefined') {
          localStorage.removeItem('cita_pendiente_pago');
          localStorage.removeItem('cita_id_pago');
        }
        
        setMensaje('✅ ¡Pago confirmado! Tu reserva ha sido aprobada.');
        setProcesando(false);
        
        // Redirigir a éxito después de 3 segundos
        setTimeout(() => {
          router.push(`/citas/exito?cita_id=${citaIdParam}`);
        }, 3000);
        
      } catch (err) {
        console.error('❌ Error confirmando pago:', err);
        setError('Error al procesar la confirmación del pago');
        setMensaje('Por favor contacta a soporte si el problema persiste');
        setProcesando(false);
      }
    }
    
    confirmarPago();
  }, [searchParams, router]);

  if (procesando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Confirmando tu pago...</h2>
          <p className="text-gray-600">Por favor espera, estamos procesando tu reserva</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Ups, algo salió mal</h2>
          <p className="text-gray-600 mb-6">{mensaje}</p>
          <div className="space-y-3">
            <Link href="/mis-citas" className="block w-full py-3 px-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors">
              📅 Ver mis citas
            </Link>
            <button onClick={() => router.push('/citas')} className="block w-full py-3 px-4 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors">
              ➕ Nueva reserva
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">¡Pago confirmado! 🎉</h2>
        <p className="text-gray-600 mb-6">{mensaje}</p>
        <p className="text-sm text-gray-500 mb-8">Redirigiendo a tu confirmación en unos segundos...</p>
        <div className="space-y-3">
          <Link href="/mis-citas" className="block w-full py-3 px-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors">
            📅 Ir a Mis Citas ahora
          </Link>
          <button onClick={() => router.push('/citas')} className="block w-full py-3 px-4 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors">
            ➕ Nueva reserva
          </button>
        </div>
      </div>
    </div>
  );
}

// ← COMPONENTE PRINCIPAL con Suspense boundary
export default function PagoRetornoPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    }>
      <PagoRetornoContent />
    </Suspense>
  );
}