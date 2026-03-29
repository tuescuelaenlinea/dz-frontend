// app/citas/page.tsx (NUEVO - mínimo)
'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';

// Cargar CitasContent solo en cliente (evita errores de prerendering)
const CitasContent = dynamic(
  () => import('./CitasContent').then(mod => mod.default),
  {
    ssr: false,  // ← Clave: nunca renderizar en servidor
    loading: () => (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
        <p className="ml-4 text-gray-600">Cargando reservas...</p>
      </div>
    ),
  }
);

export default function CitasPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
      </div>
    }>
      <CitasContent />
    </Suspense>
  );
}