// app/auth/recuperar/nueva-contrasena/page.tsx
'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import PasswordInput from '@/components/PasswordInput';

function NuevaContrasenaContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [error, setError] = useState('');
  const [tokenValid, setTokenValid] = useState(false);
  const [expiresIn, setExpiresIn] = useState(0);
  const [userName, setUserName] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');

  // Validar token al cargar la página
  useEffect(() => {
    if (!token) {
      setError('Token no proporcionado');
      setValidating(false);
      return;
    }

    const validateToken = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dzsalon.com/api';
        
        const res = await fetch(`${apiUrl}/password-reset/validate/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        const data = await res.json();

        if (res.ok && data.valid) {
          setTokenValid(true);
          setExpiresIn(data.expires_in);
          setUserName(data.user_name);
          setMaskedEmail(data.email);
        } else {
          setError(data.message || 'Token inválido o expirado');
        }
      } catch (err: any) {
        console.error('❌ Error validando token:', err);
        setError('Error al validar el token. Intenta solicitar uno nuevo.');
      } finally {
        setValidating(false);
      }
    };

    validateToken();
  }, [token]);

  // Countdown timer
  useEffect(() => {
    if (expiresIn <= 0) return;

    const interval = setInterval(() => {
      setExpiresIn((prev) => {
        if (prev <= 1) {
          setError('El enlace ha expirado. Solicita uno nuevo.');
          setTokenValid(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresIn]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dzsalon.com/api';
      
      const res = await fetch(`${apiUrl}/password-reset/confirm/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          new_password: newPassword,
          confirm_password: confirmPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || data.detail || 'Error al cambiar la contraseña');
      }

      // Redirigir a página de éxito
      router.push('/auth/recuperar/completado');
      
    } catch (err: any) {
      console.error('❌ Error cambiando contraseña:', err);
      setError(err.message || 'Error al cambiar la contraseña');
    } finally {
      setLoading(false);
    }
  };

  // Estado de carga inicial
  if (validating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center py-12 px-4">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent mx-auto mb-4"></div>
          <p className="text-xl">Validando enlace...</p>
        </div>
      </div>
    );
  }

  // Token inválido
  if (!tokenValid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full mb-4">
              <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Enlace inválido</h1>
            <p className="text-gray-600 mb-6">{error || 'El enlace de recuperación no es válido o ha expirado.'}</p>
            
            <Link 
              href="/auth/recuperar" 
              className="block w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-300"
            >
              Solicitar nuevo enlace
            </Link>
            
            <Link 
              href="/auth/login" 
              className="block mt-3 text-blue-600 hover:text-blue-700 font-medium"
            >
              Volver al login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Formulario de nueva contraseña
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Nueva contraseña</h1>
          <p className="text-gray-600 mt-2">
            Hola <strong>{userName}</strong>, crea tu nueva contraseña
          </p>
        </div>

        {/* Timer de expiración */}
        <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between text-sm">
            <span className="text-blue-900 font-medium">⏰ Tiempo restante:</span>
            <span className={`font-mono font-bold ${expiresIn < 300 ? 'text-red-600' : 'text-blue-600'}`}>
              {formatTime(expiresIn)}
            </span>
          </div>
          <p className="text-xs text-blue-700 mt-1">
            Cuenta: {maskedEmail}
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-start gap-2">
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <PasswordInput
            label="Nueva contraseña"
            name="new_password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Mínimo 8 caracteres"
            required
            disabled={loading}
            hint="Debe tener al menos 8 caracteres"
            autoComplete="new-password"
          />

          <PasswordInput
            label="Confirmar contraseña"
            name="confirm_password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repite tu contraseña"
            required
            disabled={loading}
            autoComplete="new-password"
            error={
              confirmPassword && newPassword !== confirmPassword
                ? 'Las contraseñas no coinciden'
                : undefined
            }
          />

          <button
            type="submit"
            disabled={loading || !newPassword || !confirmPassword}
            className="w-full py-3 px-4 bg-gradient-to-r from-green-600 to-green-700 text-white font-semibold rounded-lg hover:from-green-700 hover:to-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></span>
                Cambiando contraseña...
              </span>
            ) : (
              'Cambiar contraseña'
            )}
          </button>
        </form>

        {/* Link */}
        <div className="mt-6 text-center">
          <Link href="/auth/login" className="text-blue-600 hover:text-blue-700 font-medium text-sm">
            ← Cancelar y volver al login
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function NuevaContrasenaPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center">
      <div className="text-white text-xl">Cargando...</div>
    </div>}>
      <NuevaContrasenaContent />
    </Suspense>
  );
}