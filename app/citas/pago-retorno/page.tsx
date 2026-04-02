// app/citas/pago-retorno/page.tsx
'use client';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';

export default function PagoRetornoPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [procesando, setProcesando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function confirmarPago() {
      try {
        // Obtener cita pendiente
        const citaPendiente = localStorage.getItem('cita_pendiente_pago');
        if (!citaPendiente) {
          setError('No se encontró la reserva');
          setProcesando(false);
          return;
        }
        
        const cita = JSON.parse(citaPendiente);
        
        // Verificar si el pago fue exitoso (Bold debería enviar parámetros)
        const pagoExitoso = searchParams.get('pago') === 'exitoso';
        const citaId = searchParams.get('cita_id');
        
        if (pagoExitoso && citaId) {
          // Actualizar estado de pago en backend
          await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/citas/${citaId}/confirmar-pago/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          });
          
          // Limpiar localStorage
          localStorage.removeItem('cita_pendiente_pago');
          
          // Redirigir a éxito
          router.push(`/citas/exito?cita_id=${citaId}`);
        } else {
          setError('El pago no fue confirmado');
          setProcesando(false);
        }
        
      } catch (err) {
        console.error('Error confirmando pago:', err);
        setError('Error al confirmar el pago');
        setProcesando(false);
      }
    }
    
    confirmarPago();
  }, [searchParams, router]);

  if (procesando) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Confirmando tu pago...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <p className="text-red-600 text-lg mb-4">{error}</p>
        <button
          onClick={() => router.push('/citas')}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Volver a reservas
        </button>
      </div>
    </div>
  );
}