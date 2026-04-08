'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface DashboardStats {
  citasHoy: number;
  citasPendientes: number;
  ingresosMes: number;
  profesionalesActivos: number;
}

interface AdminUser {
  id: number;
  username: string;
  email: string;
  is_staff: boolean;
  is_superuser: boolean;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar autenticación desde localStorage
    const storedUser = localStorage.getItem('admin_user');
    const token = localStorage.getItem('admin_token');
    
    if (!storedUser || !token) {
      router.push('/admin/login');
      return;
    }
    
    try {
      const userData = JSON.parse(storedUser);
      setUser(userData);
    } catch (err) {
      console.error('Error parsing user data:', err);
      localStorage.removeItem('admin_user');
      localStorage.removeItem('admin_token');
      router.push('/admin/login');
      return;
    }
    
    // Cargar estadísticas (simuladas por ahora)
    setStats({
      citasHoy: 8,
      citasPendientes: 12,
      ingresosMes: 2450000,
      profesionalesActivos: 5,
    });
    
    setLoading(false);
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
       {/* <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>*/}
        <p className="text-gray-600 mt-2">
          Bienvenido, {user?.username || 'Administrador'}
        </p>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Citas Hoy</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">{stats?.citasHoy}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pendientes</p>
              <p className="text-3xl font-bold text-yellow-600 mt-2">{stats?.citasPendientes}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Ingresos del Mes</p>
              <p className="text-3xl font-bold text-green-600 mt-2">${(stats?.ingresosMes || 0).toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Profesionales</p>
              <p className="text-3xl font-bold text-purple-600 mt-2">{stats?.profesionalesActivos}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Accesos Rápidos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link
          href="/admin/citas"
          className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Gestionar Citas</h3>
          <p className="text-gray-600 text-sm">Ver, editar y cancelar reservas</p>
        </Link>

        <Link
          href="/admin/pagos"
          className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Validar Pagos</h3>
          <p className="text-gray-600 text-sm">Revisar comprobantes de transferencia</p>
        </Link>

        <Link
          href="/admin/horarios"
          className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Configurar Horarios</h3>
          <p className="text-gray-600 text-sm">Disponibilidad de profesionales</p>
        </Link>

        <Link
          href="/admin/profesionales"
          className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Profesionales</h3>
          <p className="text-gray-600 text-sm">Gestionar equipo de trabajo</p>
        </Link>

        <Link
          href="/admin/galeria"
          className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Galería</h3>
          <p className="text-gray-600 text-sm">Administrar fotos de trabajos</p>
        </Link>

        <Link
          href="/admin/configuracion"
          className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Configuración</h3>
          <p className="text-gray-600 text-sm">Datos del salón y redes</p>
        </Link>
      </div>
    </div>
  );
}