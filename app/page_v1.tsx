// app/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface Servicio {
  id: number;
  nombre: string;
  descripcion: string;
  descripcion_corta: string;
  precio_min: string;
  precio_max: string | null;
  tipo_precio: string;
  duracion: string;
  categoria: number;
  categoria_nombre: string;
}

export default function Home() {
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getServicios()
      .then(data => {
        console.log('Servicios cargados:', data);
        setServicios(data.results || data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error cargando servicios:', err);
        setError('Error al cargar los servicios. Verifica la conexión.');
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando servicios...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center text-red-600">
          <p>{error}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-2 text-gray-800">
          DZ Spa - Dorian Zambrano
        </h1>
        <p className="text-center text-gray-600 mb-8">
          {servicios.length} servicios disponibles
        </p>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {servicios.map((servicio) => (
            <div 
              key={servicio.id} 
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
            >
              <div className="text-sm text-blue-600 font-semibold mb-2">
                {servicio.categoria_nombre}
              </div>
              <h2 className="text-xl font-bold mb-2 text-gray-800">
                {servicio.nombre}
              </h2>
              <p className="text-gray-600 text-sm mb-4">
                {servicio.descripcion || servicio.descripcion_corta}
              </p>
              
              <div className="border-t pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-green-600 font-bold text-lg">
                    {servicio.precio_max && servicio.precio_max !== servicio.precio_min
                      ? `$${parseInt(servicio.precio_min).toLocaleString()} - $${parseInt(servicio.precio_max).toLocaleString()}`
                      : `$${parseInt(servicio.precio_min).toLocaleString()}`
                    } COP
                  </span>
                </div>
                
                {servicio.duracion && (
                  <p className="text-gray-500 text-sm mt-2">
                    ⏱️ {servicio.duracion}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}