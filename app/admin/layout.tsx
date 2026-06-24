// app/admin/layout.tsx
'use client';
import { useEffect, useState } from 'react';
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
  moduloCodigo?: string; // ← Código del módulo para verificar permisos
}

const TODOS_LOS_MENU_ITEMS: MenuItem[] = [
  { href: '/admin', label: 'Dashboard', icon: '📊' },
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
  // ← ← ← NUEVOS MÓDULOS DE PERMISOS ← ← ←
  { href: '/admin/roles', label: 'Roles', icon: '🎭', moduloCodigo: 'roles' },
  { href: '/admin/profesionales-accesos', label: 'Accesos', icon: '🔐', moduloCodigo: 'accesos' },
 // { href: '/admin/audit-logs', label: 'Auditoría', icon: '📋', moduloCodigo: 'roles' }, // Solo admin/superadmin
];

// ==========================================
// COMPONENTE INTERNO DEL LAYOUT (usa contexto)
// ==========================================
function AdminLayoutContent({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [sidebarOpenMobile, setSidebarOpenMobile] = useState(false);

  const router = useRouter();
  const pathname = usePathname();
  const { modulosAccesibles, loading: loadingPermisos, esSuperadmin } = usePermisosContext();

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
  // FILTRAR MENÚ SEGÚN PERMISOS
  // ==========================================
  // ✅ CORREGIDO:
const menuItemsFiltrados = TODOS_LOS_MENU_ITEMS.filter(item => {
  // Si no tiene moduloCodigo, siempre mostrar (ej: Dashboard)
  if (!item.moduloCodigo) return true;

  // Superadmin ve todo
  if (esSuperadmin) return true;

  // Mientras cargan permisos, no mostrar nada
  if (loadingPermisos) return false;

  // ← ← ← CORRECCIÓN: modulosAccesibles() retorna array de strings
  const modulos = modulosAccesibles();
  return modulos.includes(item.moduloCodigo);  // ✅ CORRECTO
});

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
               // ← ← ← CAMBIO: Forzar recarga completa de la página
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

        {/* Footer */}
        
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