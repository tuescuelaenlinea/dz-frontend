'use client';
// admin/cotizaciones/nueva/page.tsx
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import CotizacionForm from '@/components/admin/CotizacionForm';

interface CotizacionData {
  id: number;
  codigo_cotizacion: string;
   nombre_completo: string;        // en lugar de cliente_nombre
  whatsapp: string;                // en lugar de cliente_telefono
  correo_electronico: string;      // en lugar de cliente_email
  servicios_interes: string;
  fecha_aproximada: string;
  presupuesto_aproximado: number;
  detalles_adicionales: string;
  estado: string;
  valor_total: number;
  // Agrega más campos según tu modelo
}

export default function NuevaCotizacionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');
  
  const [loading, setLoading] = useState(!!editId);
  const [cotizacionData, setCotizacionData] = useState<CotizacionData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editId) {
      cargarCotizacion(editId);
    } else {
      setLoading(false);
    }
  }, [editId]);

  const cargarCotizacion = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('admin_token');
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/cotizaciones/${id}/`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      
      if (!response.ok) {
        throw new Error('Error al cargar la cotización');
      }
      
      const data = await response.json();
      setCotizacionData(data);
    } catch (err) {
      console.error('❌ Error cargando cotización:', err);
      setError('No se pudo cargar la cotización');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => router.push('/admin/cotizaciones')}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg"
          >
            Volver al listado
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/admin/cotizaciones')}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {editId ? 'Editar Cotización' : 'Nueva Cotización'}
            </h1>
            <p className="text-gray-600 mt-1">
              {editId 
                ? `Cotización #${cotizacionData?.codigo_cotizacion || editId}`
                : 'Selecciona los servicios, ajusta cantidades y personaliza la cotización'
              }
            </p>
          </div>
        </div>
      </div>

      {/* Formulario */}
      <CotizacionForm 
        cotizacionInicial={cotizacionData}
        esEdicion={!!editId}
        onSuccess={() => {
          router.push('/admin/cotizaciones');
        }}
        onCancel={() => {
          router.push('/admin/cotizaciones');
        }}
      />
    </div>
  );
}