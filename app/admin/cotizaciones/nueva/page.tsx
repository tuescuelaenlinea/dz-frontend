// app/admin/cotizaciones/nueva/page.tsx
'use client';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import CotizacionForm from '@/components/admin/CotizacionForm';

export default function NuevaCotizacionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');
  
  const [loading, setLoading] = useState(!!editId);
  const [cotizacionData, setCotizacionData] = useState(null);

  useEffect(() => {
    if (editId) {
      cargarCotizacion(editId);
    }
  }, [editId]);

  const cargarCotizacion = async (id: string) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/cotizaciones/${id}/`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      const data = await res.json();
      setCotizacionData(data);
    } catch (err) {
      console.error('❌ Error cargando cotización:', err);
      alert('Error al cargar la cotización');
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
              {editId ? 'Modifica los datos de la cotización' : 'Selecciona los servicios, ajusta cantidades y personaliza la cotización'}
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