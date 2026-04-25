// app\admin\profesionales\page.tsx
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Categoria {
  id: number;
  nombre: string;
  slug: string;
  icono?: string | null;
  activo?: boolean;
  orden?: number;
  imagen?: string | null;
  imagen_url?: string | null;
}

interface Servicio {
  id: number;
  nombre: string;
  slug: string;
  descripcion: string;
  descripcion_corta: string;
  categoria: number;
  categoria_nombre: string;
  tipo_precio: 'fijo' | 'rango' | 'desde';
  precio_min: string;
  precio_max: string | null;
  duracion: string;
  sesiones_incluidas: number;
  es_medico: boolean;
  requiere_valoracion: boolean;
  disponible_salon: boolean;
  disponible_domicilio: boolean;
  adicional_domicilio: string;
  destacado: boolean;
  disponible: boolean;
  imagen: string | null;
  imagen_url: string | null;
}

interface Profesional {
  id: number;
  nombre: string;
  especialidad: string;
  titulo: string;
  bio: string;
  es_medico: boolean;
  es_responsable: boolean;
  foto: string | null;
  foto_url: string | null;
  instagram: string;
  activo: boolean;
  orden: number;
  telefono_whatsapp: string;
  email_notificaciones: string;
  activo_reservas: boolean;
  porcentaje_global?: number | string;
  serviciosCount?: number;
  servicios?: Array<{id: number; nombre: string}>;
  horarios?: Array<{dia_semana: string; hora_inicio: string; hora_fin: string}>;
  citas_pendientes?: number;
}

const fixPaginationUrl = (nextUrl: string, apiUrl: string): string => {
  try {
    const next = new URL(nextUrl);
    const api = new URL(apiUrl);
    const pathAndQuery = next.pathname + next.search;
    return `${api.origin}${pathAndQuery}`;
  } catch (error) {
    console.warn('⚠️ Error parseando URL:', error);
    const pathMatch = nextUrl.match(/\/api\/.*$/);
    if (pathMatch) {
      return `${apiUrl}${pathMatch[0].replace('/api/', '/')}`;
    }
    return '';
  }
};

export default function AdminProfesionalesPage() {
  const router = useRouter();
  const [profesionales, setProfesionales] = useState<Profesional[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filtros
  const [filtroEspecialidad, setFiltroEspecialidad] = useState<string>('todas');
  const [filtroActivo, setFiltroActivo] = useState<string>('todos');
  const [busqueda, setBusqueda] = useState<string>('');
  
  // Modal
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [profesionalSeleccionado, setProfesionalSeleccionado] = useState<Profesional | null>(null);
  
  // Formulario
  const [formData, setFormData] = useState<Partial<Profesional>>({
    nombre: '',
    especialidad: '',
    titulo: '',
    bio: '',
    es_medico: false,
    es_responsable: false,
    instagram: '',
    activo: true,
    orden: 0,
    telefono_whatsapp: '',
    email_notificaciones: '',
    activo_reservas: true,
    porcentaje_global: 50.00,
    servicios: [],
  });
  
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  
  // Modal de asignación de servicios
  const [modalServiciosAbierto, setModalServiciosAbierto] = useState(false);
  const [serviciosSeleccionados, setServiciosSeleccionados] = useState<number[]>([]);
  const [filtroServicioCategoria, setFiltroServicioCategoria] = useState<string>('todas');
  const [porcentajesPorServicio, setPorcentajesPorServicio] = useState<Record<number, number | string>>({});

  // Paginación
  const [paginaActual, setPaginaActual] = useState(1);
  const [profesionalesPorPagina, setProfesionalesPorPagina] = useState(20);

  useEffect(() => {
    cargarProfesionales();
    cargarCategorias();
    cargarServicios();
  }, []);

  useEffect(() => {
    setPaginaActual(1);
  }, [filtroEspecialidad, filtroActivo, busqueda]);

  const cargarProfesionales = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('admin_token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dzsalon.com/api';
      
      const res: Response = await fetch(`${apiUrl}/profesionales/?ordering=orden,nombre`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        if (res.status === 401) {
          router.push('/admin/login');
          return;
        }
        throw new Error('Error al cargar profesionales');
      }

      const data = await res.json();
      let profesionalesList = Array.isArray(data) ? data : (data.results || []);
      
      const profesionalesConServicios = await Promise.all(
        profesionalesList.map(async (prof: Profesional) => {
          try {
            const serviciosRes = await fetch(
              `${apiUrl}/servicios-profesionales/?profesional=${prof.id}&activo=true`,
              { headers: { 'Authorization': `Bearer ${token}` } }
            );
            
            if (serviciosRes.ok) {
              const serviciosData = await serviciosRes.json();
              const serviciosCount = serviciosData.count || serviciosData.length || 0;
              return {
                ...prof,
                servicios: Array.from({ length: serviciosCount }, (_, i) => i),
                serviciosCount: serviciosCount,
              };
            }
          } catch (err) {
            console.error(`❌ Error cargando servicios para ${prof.nombre}:`, err);
          }
          return { ...prof, servicios: [], serviciosCount: 0 };
        })
      );
      
      setProfesionales(profesionalesConServicios);
      
    } catch (err: any) {
      console.error('❌ Error cargando profesionales:', err);
      setError(err.message || 'Error al cargar profesionales');
    } finally {
      setLoading(false);
    }
  };

  const cargarCategorias = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dzsalon.com/api';
      
      const res: Response = await fetch(`${apiUrl}/categorias/?activo=true`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setCategorias(Array.isArray(data) ? data : (data.results || []));
      }
    } catch (err) {
      console.error('Error cargando categorías:', err);
    }
  };

  const formatPrice = (price: string | number) => {
    const num = typeof price === 'string' ? parseFloat(price) : price;
    return `$${num.toLocaleString('es-CO', { minimumFractionDigits: 0 })}`;
  };

  const cargarServicios = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dzsalon.com/api';
      
      if (!token) {
        router.push('/admin/login');
        return;
      }
      
      let todosLosServicios: Servicio[] = [];
      let url: string = `${apiUrl}/servicios/?disponible=true&ordering=nombre&page_size=1000`;
      let pageCount = 0;
      const maxPages = 20;
      
      while (url && pageCount < maxPages) {
        pageCount++;
        try {
          const res: Response = await fetch(url, {
            headers: { 
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });

          if (!res.ok) {
            if (res.status === 401) {
              router.push('/admin/login');
              return;
            }
            break;
          }

          const data = await res.json();
          
          if (data.results && Array.isArray(data.results)) {
            todosLosServicios = [...todosLosServicios, ...data.results];
            if (data.next) {
              url = fixPaginationUrl(data.next, apiUrl);
            } else {
              url = '';
            }
          } else if (Array.isArray(data)) {
            todosLosServicios = data;
            url = '';
          } else {
            url = '';
          }
        } catch (fetchError: any) {
          console.error('❌ Error en fetch:', fetchError);
          break;
        }
      }
      
      setServicios(todosLosServicios);
    } catch (err) {
      console.error('❌ Error general cargando servicios:', err);
    }
  };

  const abrirModalCrear = () => {
    setModoEdicion(false);
    setProfesionalSeleccionado(null);
    setFormData({
      nombre: '',
      especialidad: '',
      titulo: '',
      bio: '',
      es_medico: false,
      es_responsable: false,
      instagram: '',
      activo: true,
      orden: 0,
      telefono_whatsapp: '',
      email_notificaciones: '',
      activo_reservas: true,
      porcentaje_global: 50.00,
      servicios: [],
    });
    setFotoFile(null);
    setFotoPreview(null);
    setModalAbierto(true);
  };

  const abrirModalEditar = (profesional: Profesional) => {
    setModoEdicion(true);
    setProfesionalSeleccionado(profesional);
    setFormData({
      nombre: profesional.nombre,
      especialidad: profesional.especialidad,
      titulo: profesional.titulo,
      bio: profesional.bio,
      es_medico: profesional.es_medico,
      es_responsable: profesional.es_responsable,
      instagram: profesional.instagram,
      activo: profesional.activo,
      orden: profesional.orden,
      telefono_whatsapp: profesional.telefono_whatsapp,
      email_notificaciones: profesional.email_notificaciones,
      activo_reservas: profesional.activo_reservas,
      porcentaje_global: profesional.porcentaje_global || 50.00,
      servicios: profesional.servicios || [],
    });
    
    const fotoUrl = getCorrectImageUrl(profesional.foto_url);
    setFotoPreview(fotoUrl);
    setFotoFile(null);
    setModalAbierto(true);
  };

  const abrirModalAsignarServicios = async (profesional: Profesional) => {
    setProfesionalSeleccionado(profesional);
    setFiltroServicioCategoria('todas');
    setPorcentajesPorServicio({});
    
    if (!profesional.id || profesional.id === 0) {
      setServiciosSeleccionados([]);
      setModalServiciosAbierto(true);
      return;
    }
    
    try {
      const token = localStorage.getItem('admin_token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dzsalon.com/api';
      
      let idsAsignados: number[] = [];
      let url = `${apiUrl}/servicios-profesionales/?profesional=${profesional.id}&activo=true&page_size=100`;
      
      while (url) {
        const res = await fetch(url, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        
        if (!res.ok) break;
        
        const data = await res.json();
        
        if (data.results && Array.isArray(data.results)) {
          data.results.forEach((sp: any) => {
            idsAsignados.push(sp.servicio);
            if (sp.precio_especial) {
              setPorcentajesPorServicio(prev => ({
                ...prev,
                [sp.servicio]: parseFloat(sp.precio_especial)
              }));
            }
          });
          url = data.next ? fixPaginationUrl(data.next, apiUrl) : '';
        } else {
          url = '';
        }
      }
      
      setServiciosSeleccionados([...new Set(idsAsignados)]);
      
    } catch (err) {
      console.error('❌ Error:', err);
      setServiciosSeleccionados([]);
    }
    
    setModalServiciosAbierto(true);
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const guardarProfesional = async () => {
    if (!formData.nombre?.trim()) {
      alert('❌ El nombre es obligatorio');
      return;
    }
    if (!formData.especialidad?.trim()) {
      alert('❌ La especialidad es obligatoria');
      return;
    }

    try {
      setGuardando(true);
      const token = localStorage.getItem('admin_token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dzsalon.com/api';
      
      const datosFormData = new FormData();
      
      Object.entries(formData).forEach(([key, value]) => {
        if (value != null) {
          if (key === 'servicios' && Array.isArray(value)) {
            value.forEach((servicio: any) => {
              if (servicio?.id != null) {
                datosFormData.append('servicios', String(servicio.id));
              }
            });
          } else if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
            datosFormData.append(key, String(value));
          }
        }
      });
      
      if (fotoFile) {
        datosFormData.append('foto', fotoFile);
      }

      let res: Response;
      if (modoEdicion && profesionalSeleccionado) {
        res = await fetch(`${apiUrl}/profesionales/${profesionalSeleccionado.id}/`, {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${token}` },
          body: datosFormData,
        });
      } else {
        res = await fetch(`${apiUrl}/profesionales/`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: datosFormData,
        });
      }

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || errorData.nombre?.[0] || 'Error al guardar');
      }

      alert(`✅ Profesional ${modoEdicion ? 'actualizado' : 'creado'} exitosamente`);
      setModalAbierto(false);
      cargarProfesionales();
    } catch (err: any) {
      console.error('Error guardando profesional:', err);
      alert(`❌ Error: ${err.message}`);
    } finally {
      setGuardando(false);
    }
  };

  const guardarServiciosAsignados = async () => {
    if (!profesionalSeleccionado) return;

    try {
      setGuardando(true);
      const token = localStorage.getItem('admin_token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dzsalon.com/api';
      
      let todosLosIdsActuales: number[] = [];
      let url: string = `${apiUrl}/servicios-profesionales/?profesional=${profesionalSeleccionado.id}&page_size=100`;
      
      while (url) {
        const resActual: Response = await fetch(url, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        
        if (!resActual.ok) break;
        
        const data = await resActual.json();
        
        if (data.results && Array.isArray(data.results)) {
          const idsPage = data.results.map((sp: any) => sp.id);
          todosLosIdsActuales = [...todosLosIdsActuales, ...idsPage];
          url = data.next ? fixPaginationUrl(data.next, apiUrl) : '';
        } else if (Array.isArray(data)) {
          todosLosIdsActuales = data.map((sp: any) => sp.id);
          url = '';
        } else {
          url = '';
        }
      }
      
      for (const spId of todosLosIdsActuales) {
        await fetch(`${apiUrl}/servicios-profesionales/${spId}/`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` },
        });
      }
      
      for (const servicioId of serviciosSeleccionados) {
        const porcentajeEspecifico = porcentajesPorServicio[servicioId];
        const precioEspecial = porcentajeEspecifico !== undefined && porcentajeEspecifico !== '' 
          ? parseFloat(String(porcentajeEspecifico)) 
          : null;
        
        await fetch(`${apiUrl}/servicios-profesionales/`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            profesional: profesionalSeleccionado.id,
            servicio: servicioId,
            activo: true,
            precio_especial: precioEspecial,
          }),
        });
      }
      
      alert(`✅ Servicios actualizados exitosamente\n\n📊 Servicios guardados: ${serviciosSeleccionados.length}`);
      setModalServiciosAbierto(false);
      cargarProfesionales();
      
    } catch (err: any) {
      console.error('❌ Error asignando servicios:', err);
      alert(`❌ Error: ${err.message}`);
    } finally {
      setGuardando(false);
    }
  };

  const eliminarProfesional = async (profesional: Profesional) => {
    if (!confirm(`¿Eliminar a "${profesional.nombre}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      const token = localStorage.getItem('admin_token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dzsalon.com/api';
      
      const res: Response = await fetch(`${apiUrl}/profesionales/${profesional.id}/`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error('Error al eliminar profesional');
      }

      alert('✅ Profesional eliminado exitosamente');
      cargarProfesionales();
    } catch (err: any) {
      console.error('Error eliminando profesional:', err);
      alert(`❌ Error: ${err.message}`);
    }
  };

  const toggleActivo = async (profesional: Profesional) => {
    try {
      const token = localStorage.getItem('admin_token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dzsalon.com/api';
      
      const res: Response = await fetch(`${apiUrl}/profesionales/${profesional.id}/`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ activo: !profesional.activo }),
      });

      if (res.ok) cargarProfesionales();
    } catch (err) {
      console.error('Error actualizando estado:', err);
    }
  };

  const profesionalesFiltrados = profesionales.filter((prof: Profesional) => {
    if (filtroEspecialidad !== 'todas' && prof.especialidad !== filtroEspecialidad) return false;
    if (filtroActivo !== 'todos') {
      const activo = filtroActivo === 'si';
      if (prof.activo !== activo) return false;
    }
    if (busqueda) {
      const busquedaLower = busqueda.toLowerCase();
      const coincideNombre = prof.nombre.toLowerCase().includes(busquedaLower);
      const coincideEspecialidad = prof.especialidad.toLowerCase().includes(busquedaLower);
      const coincideTitulo = prof.titulo?.toLowerCase().includes(busquedaLower);
      if (!coincideNombre && !coincideEspecialidad && !coincideTitulo) return false;
    }
    return true;
  });

  const indiceUltimo = paginaActual * profesionalesPorPagina;
  const indicePrimero = indiceUltimo - profesionalesPorPagina;
  const profesionalesPaginados = profesionalesFiltrados.slice(indicePrimero, indiceUltimo);
  const totalPaginas = Math.ceil(profesionalesFiltrados.length / profesionalesPorPagina);

  const irAPagina = (pagina: number) => {
    setPaginaActual(pagina);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getCorrectImageUrl = (url: string | null | undefined): string | null => {
    if (!url) return null;
    
    const PRODUCTION_DOMAIN = 'https://api.dzsalon.com';
    const LOCAL_DOMAIN = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:8080';
    
    if (url.startsWith(PRODUCTION_DOMAIN)) return url;
    
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url
        .replace('https://179.43.112.64', PRODUCTION_DOMAIN)
        .replace('http://179.43.112.64:8080', LOCAL_DOMAIN)
        .replace('http://127.0.0.1:8080', LOCAL_DOMAIN)
        .replace('http://localhost:8080', LOCAL_DOMAIN);
    }
    
    if (url.startsWith('/media/')) {
      const baseUrl = process.env.NODE_ENV === 'production' ? PRODUCTION_DOMAIN : LOCAL_DOMAIN;
      return `${baseUrl}${url}`;
    }
    
    return null;
  };

  const serviciosFiltradosPorCategoria = servicios.filter((s: Servicio) => {
  if (filtroServicioCategoria === 'todas') return true;
  // ← CORREGIR: Usar optional chaining y validar que categoria no sea null
  return s.categoria?.toString() === filtroServicioCategoria;
});

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">👥 Gestión de Profesionales</h1>
          <p className="text-gray-600 mt-2">Administra tu equipo de trabajo</p>
        </div>
        <a
          href="https://api.dzsalon.com/admin/salon_app/profesional/asignacion-masiva/"
          target="_blank"
          rel="noopener noreferrer"
          className="px-6 py-3 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Asignación Masiva
        </a>
        <button
          onClick={abrirModalCrear}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nuevo Profesional
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-lg p-4 lg:p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">🔍 Buscar</label>
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Nombre, especialidad o título..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Especialidad</label>
            <select
              value={filtroEspecialidad}
              onChange={(e) => setFiltroEspecialidad(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="todas">Todas</option>
              {[...new Set(profesionales.map((p: Profesional) => p.especialidad).filter(Boolean))].map((esp: string) => (
                <option key={esp} value={esp}>{esp}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
            <select
              value={filtroActivo}
              onChange={(e) => setFiltroActivo(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="todos">Todos</option>
              <option value="si">Activos</option>
              <option value="no">Inactivos</option>
            </select>
          </div>
        </div>
        <div className="mt-4 flex justify-between items-center">
          <p className="text-sm text-gray-600">
            Mostrando <strong>{profesionalesFiltrados.length}</strong> de <strong>{profesionales.length}</strong> profesionales
          </p>
          <button
            onClick={() => { setFiltroEspecialidad('todas'); setFiltroActivo('todos'); setBusqueda(''); }}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Limpiar filtros
          </button>
        </div>
      </div>

      {/* ← GRID DE CARDS - Nuevo diseño */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {profesionalesPaginados.length === 0 ? (
          <div className="col-span-full py-12 text-center text-gray-500 bg-white rounded-xl shadow-lg">
            📭 No hay profesionales
          </div>
        ) : (
          profesionalesPaginados.map((prof: Profesional) => (
            // ← Card con imagen de fondo + info sobre imagen + botones abajo
            <div key={prof.id} className="flex flex-col">
              {/* Card clickeable para editar */}
              <div
                onClick={() => abrirModalEditar(prof)}
                className={`relative h-56 rounded-xl overflow-hidden cursor-pointer transition-all hover:shadow-2xl hover:scale-[1.02] ${
                  !prof.activo ? 'opacity-75 ring-2 ring-red-400' : 'ring-1 ring-gray-200'
                }`}
              >
                {/* Imagen de fondo */}
                {prof.foto_url ? (
                  <img 
                    src={getCorrectImageUrl(prof.foto_url)!} 
                    alt={prof.nombre}
                    className="absolute inset-0 w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 24 24" fill="none" stroke="%239ca3af" stroke-width="2"%3E%3Ccircle cx="12" cy="8" r="4"%3E%3C/circle%3E%3Cpath d="M20 21a8 8 0 10-16 0"%3E%3C/path%3E%3C/svg%3E';
                    }}
                    loading="lazy"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
                    <svg className="w-20 h-20 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                )}
                
                {/* Overlay oscuro para contraste */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-transparent" />
                
                {/* Información sobre la imagen */}
                <div className="absolute inset-0 p-4 flex flex-col justify-between text-white">
                  {/* Badges superiores */}
                  <div className="flex flex-wrap gap-1">
                    {prof.es_medico && (
                      <span className="px-2 py-0.5 bg-purple-500 text-white text-[10px] font-bold rounded-full">🩺 Médico</span>
                    )}
                    {prof.es_responsable && (
                      <span className="px-2 py-0.5 bg-yellow-500 text-yellow-900 text-[10px] font-bold rounded-full">⭐ Responsable</span>
                    )}
                    {!prof.activo && (
                      <span className="px-2 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full">Inactivo</span>
                    )}
                  </div>
                  
                  {/* Info principal */}
                  <div className="space-y-1">
                    {prof.titulo && <p className="text-xs text-gray-300">{prof.titulo}</p>}
                    <h3 className="font-bold text-lg leading-tight">{prof.nombre}</h3>
                    <p className="text-sm text-gray-300">{prof.especialidad}</p>
                    
                    {/* Tags de contacto */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      {prof.instagram && (
                        <span className="px-2 py-0.5 bg-white/20 backdrop-blur-sm text-[10px] rounded">📷 Instagram</span>
                      )}
                      {prof.telefono_whatsapp && (
                        <span className="px-2 py-0.5 bg-white/20 backdrop-blur-sm text-[10px] rounded">💬 WhatsApp</span>
                      )}
                    </div>
                  </div>
                  
                  {/* Badge de servicios */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-300">
                      {prof.serviciosCount || prof.servicios?.length || 0} servicios
                    </span>
                    <span className={`px-2 py-1 rounded-full text-[10px] font-semibold ${
                      prof.activo ? 'bg-green-500/80' : 'bg-gray-500/80'
                    }`}>
                      {prof.activo ? '✅ Activo' : '⏸️ Inactivo'}
                    </span>
                  </div>
                </div>
                
                {/* Indicador visual de clickeable */}
                <div className="absolute top-3 right-3 w-7 h-7 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </div>
              </div>
              
              {/* ← Botones de acción FUERA de la card */}
              <div className="flex items-center justify-between gap-2 mt-2 px-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    abrirModalAsignarServicios(prof);
                  }}
                  className="flex-1 px-3 py-2 text-xs font-medium text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition-colors flex items-center justify-center gap-1"
                  title="Asignar servicios"
                >
                  🛠️ Servicios
                </button>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    eliminarProfesional(prof);
                  }}
                  className="flex-1 px-3 py-2 text-xs font-medium text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors flex items-center justify-center gap-1"
                  title="Eliminar profesional"
                >
                  🗑️ Eliminar
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Paginación */}
      {totalPaginas > 1 && (
        <div className="bg-white rounded-xl shadow-lg p-4 mt-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-600">
              Mostrando <strong>{indicePrimero + 1}</strong> a <strong>{Math.min(indiceUltimo, profesionalesFiltrados.length)}</strong> de <strong>{profesionalesFiltrados.length}</strong> profesionales
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Mostrar:</label>
              <select value={profesionalesPorPagina} onChange={(e) => { setProfesionalesPorPagina(Number(e.target.value)); setPaginaActual(1); }} className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => irAPagina(paginaActual - 1)} disabled={paginaActual === 1} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50">← Anterior</button>
              <button onClick={() => irAPagina(paginaActual + 1)} disabled={paginaActual === totalPaginas} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50">Siguiente →</button>
            </div>
          </div>
        </div>
      )}

      {/* ← MODAL TIPO CARNET - Horizontal */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-2">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[95vh] flex flex-col">
            {/* Header compacto */}
            <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-3 rounded-t-2xl flex items-center justify-between flex-shrink-0">
              <div>
                <h2 className="text-lg font-bold">{modoEdicion ? '✏️ Editar' : '➕ Nuevo'} Profesional</h2>
                <p className="text-xs opacity-90">{profesionalSeleccionado?.nombre || 'Información del profesional'}</p>
              </div>
              <button
                onClick={() => setModalAbierto(false)}
                className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Contenido horizontal tipo carnet */}
            <div className="p-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-3 gap-4">
                
                {/* ← Columna izquierda: Foto grande */}
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Foto de Perfil</label>
                  <div className="relative aspect-square bg-gray-100 rounded-xl overflow-hidden border-2 border-dashed border-gray-300 hover:border-indigo-400 transition-colors">
                    {fotoPreview ? (
                      <img 
                        src={getCorrectImageUrl(fotoPreview)!} 
                        alt="Vista previa" 
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                        <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-xs">Subir foto</span>
                      </div>
                    )}
                  </div>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleFotoChange} 
                    className="w-full mt-2 px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                  {modoEdicion && !fotoPreview && (
                    <p className="text-[10px] text-orange-600 mt-1">⚠️ Sin foto. Sube una nueva.</p>
                  )}
                </div>

                {/* ← Columna derecha: Información */}
                <div className="col-span-2 space-y-3">
                  {/* Fila 1: Nombre y Título */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-gray-700 mb-1">Nombre *</label>
                      <input
                        type="text"
                        value={formData.nombre}
                        onChange={(e) => handleInputChange('nombre', e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        placeholder="Ej: María López"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-gray-700 mb-1">Título</label>
                      <input
                        type="text"
                        value={formData.titulo}
                        onChange={(e) => handleInputChange('titulo', e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        placeholder="Ej: Dra., Lic."
                      />
                    </div>
                  </div>

                  {/* Fila 2: Especialidad y Orden */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-gray-700 mb-1">Especialidad *</label>
                      <input
                        type="text"
                        value={formData.especialidad}
                        onChange={(e) => handleInputChange('especialidad', e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        placeholder="Ej: Peluquería"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-gray-700 mb-1">Orden</label>
                      <input
                        type="number"
                        value={formData.orden}
                        onChange={(e) => handleInputChange('orden', Number(e.target.value))}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  {/* Fila 3: Contacto */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-gray-700 mb-1">WhatsApp</label>
                      <input
                        type="text"
                        value={formData.telefono_whatsapp}
                        onChange={(e) => handleInputChange('telefono_whatsapp', e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        placeholder="+57 300..."
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-gray-700 mb-1">Email</label>
                      <input
                        type="email"
                        value={formData.email_notificaciones}
                        onChange={(e) => handleInputChange('email_notificaciones', e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        placeholder="email@..."
                      />
                    </div>
                  </div>

                  {/* Fila 4: Instagram */}
                  <div>
                    <label className="block text-[11px] font-medium text-gray-700 mb-1">Instagram</label>
                    <input
                      type="text"
                      value={formData.instagram}
                      onChange={(e) => handleInputChange('instagram', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      placeholder="@usuario"
                    />
                  </div>

                  {/* Fila 5: Porcentaje Global */}
                  <div>
                    <label className="block text-[11px] font-medium text-gray-700 mb-1">💰 Porcentaje Global (%)</label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="number" 
                        min="0" 
                        max="100" 
                        step="0.01"
                        value={formData.porcentaje_global ?? 50}
                        onChange={(e) => handleInputChange('porcentaje_global', parseFloat(e.target.value) || 50)}
                        className="w-24 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      />
                      <span className="text-[10px] text-gray-500">Para todos los servicios</span>
                    </div>
                  </div>

                  {/* Fila 6: Biografía */}
                  <div>
                    <label className="block text-[11px] font-medium text-gray-700 mb-1">Biografía</label>
                    <textarea
                      value={formData.bio}
                      onChange={(e) => handleInputChange('bio', e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 resize-none"
                      placeholder="Descripción profesional..."
                    />
                  </div>
                </div>
              </div>

              {/* ← Checkboxes en la parte inferior */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <label className="block text-[11px] font-medium text-gray-700 mb-2">Estado y Permisos</label>
                <div className="grid grid-cols-4 gap-3">
                  <label className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={formData.es_medico}
                      onChange={(e) => handleInputChange('es_medico', e.target.checked)}
                      className="w-4 h-4 text-indigo-600 rounded"
                    />
                    <span className="text-[11px] text-gray-700">🩺 Médico</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={formData.es_responsable}
                      onChange={(e) => handleInputChange('es_responsable', e.target.checked)}
                      className="w-4 h-4 text-indigo-600 rounded"
                    />
                    <span className="text-[11px] text-gray-700">⭐ Responsable</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={formData.activo}
                      onChange={(e) => handleInputChange('activo', e.target.checked)}
                      className="w-4 h-4 text-indigo-600 rounded"
                    />
                    <span className="text-[11px] text-gray-700 font-semibold">✅ Activo</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={formData.activo_reservas}
                      onChange={(e) => handleInputChange('activo_reservas', e.target.checked)}
                      className="w-4 h-4 text-indigo-600 rounded"
                    />
                    <span className="text-[11px] text-gray-700">📅 Recibe reservas</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-gray-50 px-4 py-3 border-t border-gray-200 rounded-b-2xl flex gap-2 flex-shrink-0">
              <button
                onClick={() => setModalAbierto(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={guardarProfesional}
                disabled={guardando}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {guardando ? 'Guardando...' : (modoEdicion ? 'Actualizar' : 'Crear')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Asignar Servicios (sin cambios) */}
      {modalServiciosAbierto && profesionalSeleccionado && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full my-8">
            <div className="sticky top-0 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-6 py-4 rounded-t-2xl flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">🛠️ Asignar Servicios</h2>
                <p className="text-sm opacity-90">{profesionalSeleccionado.nombre}</p>
                <p className="text-xs opacity-75 mt-1">
                  💡 Porcentaje global: <strong>{formData.porcentaje_global || 50}%</strong>
                </p>
              </div>
              <button onClick={() => setModalServiciosAbierto(false)} className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="p-6 max-h-[70vh] overflow-y-auto">
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">📂 Filtrar por categoría</label>
                <select 
                  value={filtroServicioCategoria} 
                  onChange={(e) => setFiltroServicioCategoria(e.target.value)} 
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="todas">Todas las categorías</option>
                  {categorias.map((cat: Categoria) => (
                    <option key={cat.id} value={cat.id.toString()}>{cat.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="mb-4 flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                <span className="text-sm text-emerald-800">
                  ✅ <strong>{serviciosSeleccionados.length}</strong> servicios seleccionados
                </span>
                <button
                  onClick={() => setServiciosSeleccionados([])}
                  className="text-xs text-red-600 hover:text-red-800 font-medium"
                >
                  🗑️ Desleccionar todos
                </button>
              </div>

              <div className="space-y-4">
                {categorias
                  .filter((cat: Categoria) => 
                    filtroServicioCategoria === 'todas' || cat.id?.toString() === filtroServicioCategoria
                  )
                  .map((categoria: Categoria) => {
                    // ← También usa optional chaining dentro del map:
                    const serviciosDeCategoria = servicios.filter((s: Servicio) => s.categoria === categoria?.id);
                    if (!categoria || serviciosDeCategoria.length === 0) return null;
                    
                    return (
                      <div key={categoria?.id} className="border border-gray-200 rounded-lg overflow-hidden">
                        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                            {categoria?.icono && <span className="text-xl">{categoria.icono}</span>}
                            {categoria?.nombre || 'Sin nombre'}
                            <span className="text-xs text-gray-500">({serviciosDeCategoria.length})</span>
                          </h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4">
                          {serviciosDeCategoria.map((servicio: Servicio) => {
                            const estaSeleccionado = serviciosSeleccionados.includes(servicio.id);
                            const porcentajeEspecifico = porcentajesPorServicio[servicio.id];
                            
                            return (
                              <div 
                                key={servicio.id} 
                                className={`p-3 border rounded-lg transition-colors ${
                                  estaSeleccionado
                                    ? 'border-emerald-500 bg-emerald-50'
                                    : 'border-gray-200 hover:bg-gray-50'
                                }`}
                              >
                                <label className="flex items-center gap-3 cursor-pointer mb-2">
                                  <input
                                    type="checkbox"
                                    checked={estaSeleccionado}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setServiciosSeleccionados([...serviciosSeleccionados, servicio.id]);
                                      } else {
                                        setServiciosSeleccionados(serviciosSeleccionados.filter(id => id !== servicio.id));
                                        setPorcentajesPorServicio(prev => {
                                          const newPrev = { ...prev };
                                          delete newPrev[servicio.id];
                                          return newPrev;
                                        });
                                      }
                                    }}
                                    className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                                  />
                                  <div className="flex-1">
                                    <div className="font-medium text-gray-900 text-sm">{servicio.nombre}</div>
                                    <div className="text-xs text-gray-500">
                                      {servicio.tipo_precio === 'fijo' && formatPrice(servicio.precio_min)}
                                      {servicio.tipo_precio === 'rango' && `${formatPrice(servicio.precio_min)} - ${formatPrice(servicio.precio_max || '0')}`}
                                      {servicio.tipo_precio === 'desde' && `Desde ${formatPrice(servicio.precio_min)}`}
                                    </div>
                                  </div>
                                </label>
                                
                                {estaSeleccionado && (
                                  <div className="ml-7 pl-2 border-l-2 border-emerald-200">
                                    <label className="block text-xs font-medium text-gray-600 mb-1">
                                      Porcentaje para este servicio
                                    </label>
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="0.01"
                                        placeholder={`${formData.porcentaje_global || 50}% (global)`}
                                        value={porcentajeEspecifico ?? ''}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          setPorcentajesPorServicio(prev => ({
                                            ...prev,
                                            [servicio.id]: val === '' ? '' : parseFloat(val) || 0
                                          }));
                                        }}
                                        className="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-emerald-500"
                                      />
                                      <span className="text-xs text-gray-500">%</span>
                                      {porcentajeEspecifico !== undefined && porcentajeEspecifico !== '' && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setPorcentajesPorServicio(prev => {
                                              const newPrev = { ...prev };
                                              delete newPrev[servicio.id];
                                              return newPrev;
                                            });
                                          }}
                                          className="text-xs text-red-500 hover:text-red-700"
                                          title="Usar porcentaje global"
                                        >
                                          ✕
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
            
            <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t border-gray-200 rounded-b-2xl flex gap-3">
              <button onClick={() => setModalServiciosAbierto(false)} className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors">
                Cancelar
              </button>
              <button onClick={guardarServiciosAsignados} disabled={guardando} className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                {guardando ? 'Guardando...' : `Guardar (${serviciosSeleccionados.length})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}