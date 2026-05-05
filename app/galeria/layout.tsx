// app/galeria/layout.tsx
import { Suspense } from 'react';

export default function GaleriaLayout({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white"></div>
        <p className="text-white ml-4">Cargando galería...</p>
      </div>
    }>
      {children}
    </Suspense>
  );
}