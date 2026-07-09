// app/auth/recuperar/completado/page.tsx
'use client';
import Link from 'next/link';

export default function CompletadoPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8">
        {/* Icono de éxito */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-green-100 rounded-full mb-4 animate-bounce">
            <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">¡Contraseña cambiada!</h1>
          <p className="text-gray-600">
            Tu contraseña ha sido actualizada exitosamente. Ya puedes iniciar sesión con tu nueva contraseña.
          </p>
        </div>

        {/* Info de seguridad */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            Información de seguridad
          </h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>✓ Hemos enviado un email de confirmación</li>
            <li>✓ Todos los enlaces de recuperación anteriores fueron invalidados</li>
            <li>✓ Si no fuiste tú, contáctanos inmediatamente</li>
          </ul>
        </div>

        {/* Botón principal */}
        <Link 
          href="/auth/login" 
          className="block w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-300 text-center"
        >
          Iniciar sesión con nueva contraseña
        </Link>

        {/* Link secundario */}
        <div className="mt-4 text-center">
          <Link href="/" className="text-gray-500 hover:text-gray-700 text-sm">
            Ir al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}