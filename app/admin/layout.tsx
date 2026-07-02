// app/admin/layout.tsx
'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { PermisosProvider, usePermisosContext } from '@/contexts/PermisosContext';

// ==========================================
// DEFINICIÓN DE MENÚ COMPLETO
// ==========================================
interface MenuItem {
  href: string;
  label: string;
  icon: string;
  moduloCodigo?: string;
}

const TODOS_LOS_MENU_ITEMS: MenuItem[] = [
  { href: '/admin', label: 'Dashboard', icon: '📊', moduloCodigo: 'dashboard' },
  { href: '/admin/profesional', label: 'Mi Panel', icon: '👨‍💼', moduloCodigo: 'dashboard_profesional' },
  { href: '/admin/publicidad', label: 'Publicidades', icon: '📢', moduloCodigo: 'publicidad' },
  { href: '/admin/citas', label: 'Citas', icon: '📅', moduloCodigo: 'citas' },
  { href: '/admin/aliados', label: 'Aliados', icon: '🤝', moduloCodigo: 'aliados' },
  { href: '/admin/clientes', label: 'Clientes', icon: '👥', moduloCodigo: 'clientes' },
  { href: '/admin/categorias', label: 'Categorías', icon: '📁', moduloCodigo: 'categorias' },
  { href: '/admin/servicios', label: 'Servicios', icon: '🛠️', moduloCodigo: 'servicios' },
  { href: '/admin/productos', label: 'Productos', icon: '📦', moduloCodigo: 'productos' },
  { href: '/admin/horarios', label: 'Horarios', icon: '🕐', moduloCodigo: 'horarios' },
  { href: '/admin/profesionales', label: 'Profesionales', icon: '👨‍⚕️', moduloCodigo: 'profesionales' },
  { href: '/admin/galeria', label: 'Galería', icon: '📸', moduloCodigo: 'galeria' },
  { href: '/admin/tareas', label: 'Tareas', icon: '✅', moduloCodigo: 'tareas' },
  { href: '/admin/configuracion', label: 'Configuración', icon: '⚙️', moduloCodigo: 'configuracion' },
  { href: '/admin/roles', label: 'Roles', icon: '🎭', moduloCodigo: 'roles' },
  { href: '/admin/profesionales-accesos', label: 'Accesos', icon: '🔐', moduloCodigo: 'accesos' },
];

// ==========================================
// COMPONENTE INTERNO DEL LAYOUT (usa contexto)
// ==========================================
function AdminLayoutContent({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [sidebarOpenMobile, setSidebarOpenMobile] = useState(false);

  // ← ← ← CLAVE: Usar useRef para trackear redirecciones y evitar bucles ← ← ←
  const redireccionEnCurso = useRef(false);
  const ultimaRedireccion = useRef<string | null>(null);

  const router = useRouter();
  const pathname = usePathname();
  const { modulosAccesibles, loading: loadingPermisos, esSuperadmin } = usePermisosContext();
  const modulos = loadingPermisos ? [] : modulosAccesibles();

  // ==========================================
  // VERIFICAR AUTENTICACIÓN
  // ==========================================
  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    const user = localStorage.getItem('admin_user');

    if (pathname === '/admin/login') {
      setLoading(false);
      return;
    }

    if (token && user) {
      setIsAuthenticated(true);
    } else {
      router.push('/admin/login');
    }
    setLoading(false);
  }, [pathname, router]);

  // ==========================================
  // ← ← ← REDIRECCIÓN INTELIGENTE (SIN BUCLES) ← ← ←
  // ==========================================
  useEffect(() => {
    // No hacer nada si aún cargan datos o si ya hay una redirección en curso
    if (loadingPermisos || loading || !isAuthenticated) return;
    if (pathname === '/admin/login') return;

    // ← ← ← NUEVO: No redirigir si el rol está expirado ← ← ←
    const modulos = modulosAccesibles();
    if (!esSuperadmin && modulos.length === 0) {
      console.log('⚠️ [Layout] Rol expirado, mostrando pantalla informativa');
      return;
    }

    // Si ya redirigimos a esta ruta, no volver a hacerlo
    if (ultimaRedireccion.current === pathname) {
      console.log('⏭️ [Layout] Ya estamos en la ruta correcta:', pathname);
      ultimaRedireccion.current = null; // Resetear para futuras redirecciones
      return;
    }

    
    const tieneDashboardAdmin = modulos.includes('dashboard');
    const tieneDashboardProfesional = modulos.includes('dashboard_profesional');

    // ← ← ← CASO 1: Usuario en /admin pero NO tiene acceso al dashboard admin ← ← ←
    if (pathname === '/admin' && !esSuperadmin && !tieneDashboardAdmin) {
      console.log('🔄 [Layout] Usuario sin acceso a dashboard admin, redirigiendo...');

      if (tieneDashboardProfesional) {
        console.log('🔄 [Layout] → Redirigiendo a /admin/profesional');
        redireccionEnCurso.current = true;
        ultimaRedireccion.current = '/admin/profesional';
        router.replace('/admin/profesional');
        // ← ← ← CLAVE: Resetear flag después de la navegación ← ← ←
        setTimeout(() => {
          redireccionEnCurso.current = false;
        }, 500);
      } else {
        // Buscar primer módulo accesible
        const primerModulo = TODOS_LOS_MENU_ITEMS.find(
          item => item.moduloCodigo && modulos.includes(item.moduloCodigo) && item.href !== '/admin'
        );
        if (primerModulo) {
          console.log(`🔄 [Layout] → Redirigiendo a ${primerModulo.href}`);
          redireccionEnCurso.current = true;
          ultimaRedireccion.current = primerModulo.href;
          router.replace(primerModulo.href);
          setTimeout(() => {
            redireccionEnCurso.current = false;
          }, 500);
        } else {
          console.warn('⚠️ [Layout] Usuario sin acceso a ningún módulo');
        }
      }
      return;
    }

    // ← ← ← CASO 2: Usuario en /admin/profesional pero NO tiene acceso ← ← ←
    if (pathname === '/admin/profesional' && !tieneDashboardProfesional && !esSuperadmin) {
      console.log('🔄 [Layout] Usuario sin acceso a dashboard profesional, redirigiendo...');

      if (tieneDashboardAdmin) {
        console.log('🔄 [Layout] → Redirigiendo a /admin');
        redireccionEnCurso.current = true;
        ultimaRedireccion.current = '/admin';
        router.replace('/admin');
        setTimeout(() => {
          redireccionEnCurso.current = false;
        }, 500);
      } else {
        const primerModulo = TODOS_LOS_MENU_ITEMS.find(
          item => item.moduloCodigo && modulos.includes(item.moduloCodigo)
        );
        if (primerModulo) {
          console.log(`🔄 [Layout] → Redirigiendo a ${primerModulo.href}`);
          redireccionEnCurso.current = true;
          ultimaRedireccion.current = primerModulo.href;
          router.replace(primerModulo.href);
          setTimeout(() => {
            redireccionEnCurso.current = false;
          }, 500);
        }
      }
      return;
    }

    // ← ← ← CASO 3: Usuario en cualquier otra ruta sin acceso ← ← ←
    if (pathname !== '/admin' && pathname !== '/admin/profesional') {
      const rutaActual = TODOS_LOS_MENU_ITEMS.find(item => item.href === pathname);
      if (rutaActual?.moduloCodigo && !modulos.includes(rutaActual.moduloCodigo) && !esSuperadmin) {
        console.log(`🔄 [Layout] Usuario sin acceso a ${pathname}, redirigiendo...`);

        if (tieneDashboardAdmin) {
          redireccionEnCurso.current = true;
          ultimaRedireccion.current = '/admin';
          router.replace('/admin');
          setTimeout(() => {
            redireccionEnCurso.current = false;
          }, 500);
        } else if (tieneDashboardProfesional) {
          redireccionEnCurso.current = true;
          ultimaRedireccion.current = '/admin/profesional';
          router.replace('/admin/profesional');
          setTimeout(() => {
            redireccionEnCurso.current = false;
          }, 500);
        }
      }
    }
  }, [pathname, modulosAccesibles, esSuperadmin, loadingPermisos, loading, isAuthenticated, router]);

    // ==========================================
  // FILTRAR MENÚ SEGÚN PERMISOS
  // ==========================================
  const menuItemsFiltrados = TODOS_LOS_MENU_ITEMS.filter(item => {
    if (!item.moduloCodigo) return true;
    if (esSuperadmin) return true;
    if (loadingPermisos) return false;
    // ← ← ← CORREGIDO: Usar la variable 'modulos' ya definida arriba ← ← ←
    return modulos.includes(item.moduloCodigo);
  });

  // ← ← ← NUEVO: Detectar si el rol ha expirado (sin módulos accesibles) ← ← ←
  const rolExpirado = !esSuperadmin && !loadingPermisos && menuItemsFiltrados.length === 0;

  // ==========================================
  // ESTADOS DE CARGA
  // ==========================================
  if (loading || loadingPermisos) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="text-gray-400 mt-4">Cargando permisos...</p>
        </div>
      </div>
    );
  }

  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

    if (!isAuthenticated) {
    return null;
  }

  // ← ← ← NUEVO: Mostrar pantalla de rol expirado ← ← ←
  if (rolExpirado) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-900 via-gray-900 to-gray-800 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full border-2 border-red-500/50 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-red-600 to-red-800 p-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Acceso Restringido</h1>
                <p className="text-red-100 text-sm mt-1">Tu rol ha expirado o no tienes permisos activos</p>
              </div>
            </div>
          </div>

          {/* Contenido */}
          <div className="p-8 space-y-6">
            {/* Mensaje principal */}
            <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-white mb-2">No tienes acceso al sistema</h2>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    Tu cuenta de usuario está activa, pero tu rol profesional ha expirado o no tienes módulos asignados. 
                    Por favor, contacta al administrador para renovar tu acceso.
                  </p>
                </div>
              </div>
            </div>

            {/* Información adicional */}
            <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-700">
              <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                ¿Qué puedes hacer?
              </h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-0.5">•</span>
                  <span>Contactar al administrador del sistema para renovar tu acceso</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-0.5">•</span>
                  <span>Verificar que tu cuenta tenga los permisos correctos asignados</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-0.5">•</span>
                  <span>Cerrar sesión e intentar nuevamente si crees que es un error temporal</span>
                </li>
              </ul>
            </div>

            {/* Información del usuario */}
            {(() => {
              try {
                const userStr = localStorage.getItem('admin_user');
                const user = userStr ? JSON.parse(userStr) : null;
                return user ? (
                  <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">Usuario actual:</p>
                        <p className="text-white font-medium">{user.username || user.email}</p>
                      </div>
                    </div>
                  </div>
                ) : null;
              } catch {
                return null;
              }
            })()}

            {/* Botones de acción */}
            <div className="flex gap-3 pt-4">
              <button
                onClick={() => {
                  window.location.reload();
                }}
                className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Reintentar
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem('admin_token');
                  localStorage.removeItem('admin_user');
                  window.location.href = '/admin/login';
                }}
                className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER
  // ==========================================
  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Overlay móvil */}
      {sidebarOpenMobile && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpenMobile(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 group
        bg-gray-900 text-white flex flex-col
        w-64 lg:w-20
        transition-all duration-300 ease-in-out
        -translate-x-full lg:translate-x-0
        ${sidebarOpenMobile ? 'translate-x-0' : ''}
        lg:hover:w-64
        ${!sidebarCollapsed ? 'lg:w-64' : ''}
      `}>
        {/* Header */}
        <div className="h-16 bg-gray-800 flex items-start justify-between px-3 border-b border-gray-700 flex-shrink-0">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden lg:flex items-start justify-start w-8 h-8 rounded hover:bg-gray-700 transition-colors flex-shrink-0"
            title={sidebarCollapsed ? 'Expandir menú' : 'Colapsar menú'}
          >
            <svg className={`w-5 h-5 transition-transform ${sidebarCollapsed ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={() => setSidebarOpenMobile(false)}
            className="lg:hidden w-8 h-8 flex items-start justify-start rounded hover:bg-gray-700 transition-colors flex-shrink-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <span className={`
          font-bold text-lg whitespace-nowrap
          ${sidebarOpenMobile ? 'block' : 'hidden'}
          lg:block lg:transition-opacity lg:duration-300
          ${sidebarCollapsed ? 'lg:opacity-0 group-hover:lg:opacity-100' : 'lg:opacity-100'}
        `}>
          DZ Admin
        </span>

        {/* Menú */}
        <nav className="flex-1 overflow-y-auto py-4 space-y-1 px-0 lg:px-2">
          {menuItemsFiltrados.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-start gap-3 text-gray-300 hover:bg-gray-800 rounded-lg transition-colors
                ${pathname === item.href ? 'bg-gray-800 text-white font-medium' : ''}
                ${sidebarCollapsed ? 'lg:px-0 lg:justify-start' : 'lg:px-4 lg:justify-start'}
                px-4 py-3
              `}
              onClick={() => setSidebarOpenMobile(false)}
              title={sidebarCollapsed ? item.label : undefined}
            >
              <span className={`
                text-lg flex-shrink-0
                ${sidebarCollapsed ? 'lg:w-8 lg:flex lg:justify-center' : ''}
              `}>
                {item.icon}
              </span>
              <span className={`
                whitespace-nowrap font-medium
                ${sidebarOpenMobile ? 'block' : 'hidden'}
                lg:block lg:transition-opacity lg:duration-300
                ${sidebarCollapsed ? 'lg:opacity-0 group-hover:lg:opacity-100' : 'lg:opacity-100'}
              `}>
                {item.label}
              </span>
            </Link>
          ))}
          <div className="p-3 border-t border-gray-800 flex-shrink-0">
            <button
              onClick={() => {
                localStorage.removeItem('admin_token');
                localStorage.removeItem('admin_user');
                window.location.href = '/admin/login';
              }}
              className={`
                w-full flex items-center gap-3 text-red-400 hover:bg-gray-800 rounded-lg transition-colors
                ${sidebarCollapsed ? 'lg:px-0 lg:justify-center' : 'lg:px-4 lg:justify-start'}
                px-4 py-3
              `}
              title={sidebarCollapsed ? 'Cerrar Sesión' : undefined}
            >
              <span className={`
                text-lg flex-shrink-0
                ${sidebarCollapsed ? 'lg:w-8 lg:flex lg:justify-center' : ''}
              `}>
                🚪
              </span>
              <span className={`
                whitespace-nowrap font-medium
                ${sidebarOpenMobile ? 'block' : 'hidden'}
                lg:block lg:transition-opacity lg:duration-300
                ${sidebarCollapsed ? 'lg:opacity-0 group-hover:lg:opacity-100' : 'lg:opacity-100'}
              `}>
                Cerrar Sesión
              </span>
            </button>
          </div>
        </nav>
      </aside>

      {/* Contenido principal */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header móvil */}
        <header className="bg-white shadow-sm sticky top-0 z-30 flex-shrink-0 lg:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <button
              onClick={() => setSidebarOpenMobile(true)}
              className="text-gray-600 hover:text-gray-900 focus:outline-none p-2 -ml-2"
              aria-label="Abrir menú"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-lg font-semibold text-gray-800">Panel Administrativo</h1>
            <div className="w-10"></div>
          </div>
        </header>

        {/* Área de contenido */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

// ==========================================
// LAYOUT PRINCIPAL (envuelve con Provider)
// ==========================================
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <PermisosProvider>
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </PermisosProvider>
  );
}