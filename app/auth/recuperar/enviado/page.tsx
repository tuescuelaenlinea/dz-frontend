'use client';
// app/auth/recuperar/enviado/page.tsx
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function EnviadoContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || 'tu email';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8">
        {/* Icono de éxito */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">¡Email enviado!</h1>
          <p className="text-gray-600">
            Si el email <strong className="text-blue-600">{email}</strong> está registrado, recibirás un enlace para recuperar tu contraseña.
          </p>
        </div>

        {/* Instrucciones */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            Próximos pasos:
          </h3>
          <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
            <li>Revisa tu bandeja de entrada</li>
            <li>Si no ves el email, revisa la carpeta de spam</li>
            <li>En el email encontrarás <strong>tu nombre de usuario</strong> y un enlace</li>
            <li>Haz clic en el enlace para crear una nueva contraseña</li>
            <li>El enlace expira en 1 hora</li>
          </ol>
        </div>

        {/* Links */}
        <div className="text-center space-y-3">
          <Link 
            href="/auth/login" 
            className="block w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-300"
          >
            Volver al login
          </Link>
          
          <Link 
            href="/auth/recuperar" 
            className="block text-blue-600 hover:text-blue-700 font-medium text-sm"
          >
            ¿No recibiste el email? Intentar nuevamente
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function EnviadoPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center">
      <div className="text-white text-xl">Cargando...</div>
    </div>}>
      <EnviadoContent />
    </Suspense>
  );
}