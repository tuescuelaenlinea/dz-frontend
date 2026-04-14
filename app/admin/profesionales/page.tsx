// admin\profesionales\page.tsx
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Categoria {
  id: number;
  nombre: string;
  slug: string;
  icono?: string | null;  // ← AGREGADO: propiedad opcional
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
  tipo_precio: 'fijo' | 'rango' | 'desde';  // ← AGREGADO
  precio_min: string;                        // ← AGREGADO
  precio_max: string | null;                 // ← AGREGADO
  duracion: string;                          // ← AGREGADO
  sesiones_incluidas: number;                // ← AGREGADO
  es_medico: boolean;                        // ← AGREGADO
  requiere_valoracion: boolean;              // ← AGREGADO
  disponible_salon: boolean;                 // ← AGREGADO
  disponible_domicilio: boolean;             // ← AGREGADO
  adicional_domicilio: string;               // ← AGREGADO
  destacado: boolean;                        // ← AGREGADO
  disponible: boolean;                       // ← AGREGADO
  imagen: string | null;                     // ← AGREGADO
  imagen_url: string | null;                 // ← AGREGADO
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
  serviciosCount?: number;
  servicios?: Array<{id: number; nombre: string}>;  // ← Si el backend devuelve la lista
  horarios?: Array<{dia_semana: string; hora_inicio: string; hora_fin: string}>;
  citas_pendientes?: number;
}
// ← AGREGAR ESTA FUNCIÓN (fuera del componente AdminProfesionalesPage):

/**
 * Corrige URLs de paginación del backend usando URL API
 * Ej: 'https://127.0.0.1/api/servicios/?page=2' + 'https://api.dzsalon.com/api'
 * → 'https://api.dzsalon.com/api/servicios/?page=2'
 */
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
    servicios: [],
  });
  
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  
  // Modal de asignación de servicios
  const [modalServiciosAbierto, setModalServiciosAbierto] = useState(false);
  const [serviciosSeleccionados, setServiciosSeleccionados] = useState<number[]>([]);
  const [filtroServicioCategoria, setFiltroServicioCategoria] = useState<string>('todas');

  // Paginación
  const [paginaActual, setPaginaActual] = useState(1);
  const [profesionalesPorPagina, setProfesionalesPorPagina] = useState(20);

  useEffect(() => {
    cargarProfesionales();
    cargarCategorias();
    cargarServicios();
  }, []);

  // Resetear paginación al filtrar
  useEffect(() => {
    setPaginaActual(1);
  }, [filtroEspecialidad, filtroActivo, busqueda]);

  const cargarProfesionales = async () => {
  try {
    setLoading(true);
    const token = localStorage.getItem('admin_token');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dzsalon.com/api';
    
    console.log('🔄 Cargando profesionales...');
    
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
    
    console.log(`📦 Profesionales cargados: ${profesionalesList.length}`);
    
    // ← AGREGAR: Cargar conteo de servicios para cada profesional
    console.log('📊 Cargando conteo de servicios para cada profesional...');
    
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
            
            // ← AGREGAR el conteo al objeto profesional
            return {
              ...prof,
              servicios: Array.from({ length: serviciosCount }, (_, i) => i), // Array dummy para el count
              serviciosCount: serviciosCount, // ← Campo adicional para el conteo real
            };
          }
        } catch (err) {
          console.error(`❌ Error cargando servicios para ${prof.nombre}:`, err);
        }
        
        return { ...prof, servicios: [], serviciosCount: 0 };
      })
    );
    
    console.log('✅ Profesionales con conteo de servicios:', profesionalesConServicios.length);
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
      
      // ← AGREGAR TIPO EXPLÍCITO: Response
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
      console.error('❌ No hay token');
      router.push('/admin/login');
      return;
    }
    
    console.log('🔄 Cargando servicios para asignación...');
    console.log('🔗 API URL:', apiUrl);
    
    let todosLosServicios: Servicio[] = [];
    let url: string = `${apiUrl}/servicios/?disponible=true&ordering=nombre&page_size=1000`;
    let pageCount = 0;
    const maxPages = 20;
    
    while (url && pageCount < maxPages) {
      pageCount++;
      console.log(`\n📡 === Página ${pageCount} ===`);
      console.log('🔗 URL:', url);
      
      try {
        const res: Response = await fetch(url, {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        console.log('📥 Status:', res.status, res.ok ? '✅' : '❌');

        if (!res.ok) {
          console.error(`❌ Error HTTP ${res.status}:`, res.statusText);
          if (res.status === 401) {
            router.push('/admin/login');
            return;
          }
          break;
        }

        const data = await res.json();
        console.log('📦 Data received:', {
          count: data.count,
          results_length: data.results?.length,
          has_next: !!data.next,
          next_url: data.next
        });
        
        // Si es respuesta paginada
        if (data.results && Array.isArray(data.results)) {
          console.log(`✅ Agregando ${data.results.length} servicios`);
          todosLosServicios = [...todosLosServicios, ...data.results];
          console.log(`📊 Total acumulado: ${todosLosServicios.length}`);
          
          // Si hay siguiente página, corregir URL si es necesario
         // ← DESPUÉS (usar fixPaginationUrl):
          if (data.next) {
            url = fixPaginationUrl(data.next, apiUrl);
            console.log('🔗 Next URL corregida:', url);
          } else {
            console.log('✅ No hay más páginas (next es null)');
            url = '';
          }
        } 
        // Si es array directo
        else if (Array.isArray(data)) {
          console.log(`✅ Array directo con ${data.length} servicios`);
          todosLosServicios = data;
          url = '';
        }
        // Formato inesperado
        else {
          console.warn('⚠️ Formato inesperado:', data);
          url = '';
        }
        
      } catch (fetchError: any) {
        console.error('❌ Error en fetch:', fetchError);
        break;
      }
    }
    
    console.log(`\n🎉 === Carga Completa ===`);
    console.log(`✅ Total de servicios cargados: ${todosLosServicios.length}`);
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
      servicios: profesional.servicios || [],
    });
    
    const fotoUrl = getCorrectImageUrl(profesional.foto_url);
    setFotoPreview(fotoUrl);
    setFotoFile(null);
    setModalAbierto(true);
  };

const abrirModalAsignarServicios = async (profesional: Profesional) => {
  console.log('\n=== 🎯 ABRIR MODAL ASIGNACIÓN ===');
  console.log('Profesional:', profesional.nombre, '| ID:', profesional.id);
  
  setProfesionalSeleccionado(profesional);
  setFiltroServicioCategoria('todas');
  
  // ← PROFESIONAL NUEVO: Sin servicios asignados
  if (!profesional.id || profesional.id === 0) {
    console.log('✅ Profesional nuevo → 0 servicios seleccionados');
    setServiciosSeleccionados([]);
    setModalServiciosAbierto(true);
    return;
  }
  
  try {
    const token = localStorage.getItem('admin_token');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dzsalon.com/api';
    
    console.log(`\n🔄 Cargando servicios ASIGNADOS al profesional ${profesional.id}...`);
    
    // ← IMPORTANTE: Solo cargar los servicios YA ASIGNADOS
    let idsAsignados: number[] = [];
    let url = `${apiUrl}/servicios-profesionales/?profesional=${profesional.id}&activo=true&page_size=100`;
    
    while (url) {
      /*const correctedUrl = url
        .replace('https://179.43.112.64', apiUrl.replace('/api', ''))
        .replace('http://179.43.112.64:8080', apiUrl.replace('/api', ''))
        .replace('https://127.0.0.1', apiUrl.replace('/api', ''))      // ← AGREGAR
        .replace('http://127.0.0.1:8080', apiUrl.replace('/api', ''))  // ← AGREGAR
        .replace('https://api.dzsalon.com', apiUrl.replace('/api', ''));*/
      
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (!res.ok) {
        console.error('❌ Error:', res.status);
        break;
      }
      
      const data = await res.json();
      
      if (data.results && Array.isArray(data.results)) {
        // ← EXTRAER SOLO los IDs de servicios asignados (NO todos los servicios)
        const idsPage = data.results.map((sp: any) => sp.servicio);
        console.log(`📄 Página: ${idsPage.length} IDs asignados`, idsPage.slice(0, 10));
        
        idsAsignados = [...idsAsignados, ...idsPage];
        
        url = data.next ? fixPaginationUrl(data.next, apiUrl) : '';
      } else {
        url = '';
      }
    }
    
    // ← ELIMINAR duplicados y establecer SOLO los asignados
    const unicos = [...new Set(idsAsignados)];
    console.log(`✅ Servicios ASIGNADOS al profesional: ${unicos.length}`);
    console.log('📋 IDs:', unicos);
    
    // ← ESTABLECER solo los asignados (NO todos los servicios disponibles)
    setServiciosSeleccionados(unicos);
    
  } catch (err) {
    console.error('❌ Error:', err);
    setServiciosSeleccionados([]);  // ← En error, vacío (NO todos)
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
        if (value !== null && value !== undefined) {
          if (key === 'servicios' && Array.isArray(value)) {
            value.forEach((servicio: any) => datosFormData.append('servicios', servicio.id.toString())); 
          } else {
            datosFormData.append(key, value.toString());
          }
        }
      });
      
      if (fotoFile) {
        datosFormData.append('foto', fotoFile);
      }

      let res: Response;  // ← AGREGAR TIPO EXPLÍCITO
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
    
    console.log('💾 Guardando servicios...');
    console.log('  Prof ID:', profesionalSeleccionado.id);
    console.log('  Servicios seleccionados:', serviciosSeleccionados.length);
    
    // ← 1. OBTENER TODOS los servicios actualmente asignados (con paginación)
    console.log('🔄 Obteniendo servicios actuales...');
    let todosLosIdsActuales: number[] = [];
    let url: string = `${apiUrl}/servicios-profesionales/?profesional=${profesionalSeleccionado.id}&page_size=100`;
    
    while (url) {
      // Corregir URL si es necesario
      /*const correctedUrl = url
        .replace('https://179.43.112.64', apiUrl.replace('/api', ''))
        .replace('http://179.43.112.64:8080', apiUrl.replace('/api', ''))
        .replace('https://127.0.0.1', apiUrl.replace('/api', ''))      // ← AGREGAR
        .replace('http://127.0.0.1:8080', apiUrl.replace('/api', ''))  // ← AGREGAR
        .replace('https://api.dzsalon.com', apiUrl.replace('/api', ''));*/
      
      const resActual: Response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (!resActual.ok) {
        console.error('❌ Error obteniendo servicios actuales:', resActual.status);
        break;
      }
      
      const data = await resActual.json();
      
      if (data.results && Array.isArray(data.results)) {
        const idsPage = data.results.map((sp: any) => sp.id);
        todosLosIdsActuales = [...todosLosIdsActuales, ...idsPage];
        console.log(`  Página cargada: ${idsPage.length} IDs. Total: ${todosLosIdsActuales.length}`);
        
       if (data.next) {
          url = fixPaginationUrl(data.next, apiUrl);
        } else {
          url = '';
        }
      } else if (Array.isArray(data)) {
        todosLosIdsActuales = data.map((sp: any) => sp.id);
        url = '';
      } else {
        url = '';
      }
    }
    
    console.log('  Total de servicios actuales a eliminar:', todosLosIdsActuales.length);
    
    // ← 2. ELIMINAR TODOS los servicios actuales
    console.log('🗑️ Eliminando servicios antiguos...');
    let deleteSuccess = 0;
    let deleteError = 0;
    
    for (const spId of todosLosIdsActuales) {
      const deleteRes = await fetch(`${apiUrl}/servicios-profesionales/${spId}/`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (deleteRes.ok || deleteRes.status === 404) {
        deleteSuccess++;
      } else {
        deleteError++;
        console.error(`❌ Error eliminando ${spId}:`, deleteRes.status);
      }
    }
    
    console.log(`  Eliminados: ${deleteSuccess}, Errores: ${deleteError}`);
    
    // ← 3. CREAR nuevos servicios seleccionados
    console.log('✨ Creando nuevos servicios...');
    let successCount = 0;
    let errorCount = 0;
    const erroresDetallados: string[] = [];
    
    for (const servicioId of serviciosSeleccionados) {
      const postRes = await fetch(`${apiUrl}/servicios-profesionales/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          profesional: profesionalSeleccionado.id,
          servicio: servicioId,
          activo: true,
        }),
      });
      
      if (postRes.ok) {
        successCount++;
      } else {
        errorCount++;
        const errorData = await postRes.json().catch(() => ({}));
        console.error(`❌ Error creando servicio ${servicioId}:`, postRes.status, errorData);
        
        // Guardar primeros 5 errores detallados
        if (erroresDetallados.length < 5) {
          erroresDetallados.push(`Servicio ${servicioId}: ${JSON.stringify(errorData)}`);
        }
      }
    }
    
    console.log(`\n✅ Guardado completado:`);
    console.log(`  - Eliminados: ${deleteSuccess}`);
    console.log(`  - Creados: ${successCount}`);
    console.log(`  - Errores: ${errorCount}`);
    
    // Mostrar mensaje al usuario
    let mensaje = `✅ Servicios actualizados exitosamente\n\n`;
    mensaje += `📊 Resumen:\n`;
    mensaje += `  • Servicios guardados: ${successCount}\n`;
    
    if (errorCount > 0) {
      mensaje += `  • Errores: ${errorCount}\n\n`;
      mensaje += `⚠️ Algunos servicios no se pudieron guardar.`;
    }
    
    alert(mensaje);
    
    // Cerrar modal y recargar
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

  // ← Filtros con tipos explícitos
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

  // Paginación
  const indiceUltimo = paginaActual * profesionalesPorPagina;
  const indicePrimero = indiceUltimo - profesionalesPorPagina;
  const profesionalesPaginados = profesionalesFiltrados.slice(indicePrimero, indiceUltimo);
  const totalPaginas = Math.ceil(profesionalesFiltrados.length / profesionalesPorPagina);

  const irAPagina = (pagina: number) => {
    setPaginaActual(pagina);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ← FUNCIÓN PARA CONSTRUIR URL ABSOLUTA DE IMÁGENES
// ← FUNCIÓN PARA CORREGIR URLs DE IMÁGENES (IP → DOMINIO)
const getCorrectImageUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  
  // Dominios correctos para producción
  const PRODUCTION_DOMAIN = 'https://api.dzsalon.com';
  const LOCAL_DOMAIN = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:8080';
  
  // Si ya es URL absoluta con dominio correcto, retornarla
  if (url.startsWith(PRODUCTION_DOMAIN)) {
    return url;
  }
  
  // Si es URL absoluta con IP o localhost, corregirla
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
      .replace('https://179.43.112.64', PRODUCTION_DOMAIN)
      .replace('http://179.43.112.64:8080', LOCAL_DOMAIN)
      .replace('http://127.0.0.1:8080', LOCAL_DOMAIN)
      .replace('http://localhost:8080', LOCAL_DOMAIN);
  }
  
  // Si es URL relativa (empieza con /media/), construir URL absoluta
  if (url.startsWith('/media/')) {
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? PRODUCTION_DOMAIN 
      : LOCAL_DOMAIN;
    return `${baseUrl}${url}`;
  }
  
  // Fallback: retornar null
  console.warn('⚠️ URL de imagen no reconocida:', url);
  return null;
};

  // ← Filtros de servicios con tipos explícitos
  const serviciosFiltradosPorCategoria = servicios.filter((s: Servicio) => {
    if (filtroServicioCategoria === 'todas') return true;
    return s.categoria.toString() === filtroServicioCategoria;
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
              {[...new Set(profesionales.map((p: Profesional) => p.especialidad))].map((esp: string) => (
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

      {/* Tabla de Profesionales */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Foto</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Especialidad</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Servicios</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {profesionalesPaginados.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">📭 No hay profesionales</td></tr>
              ) : (
                profesionalesPaginados.map((prof: Profesional) => (
                  <tr key={prof.id} className="hover:bg-gray-50 transition-colors">
                   <td className="px-4 py-3 whitespace-nowrap">
                      {prof.foto_url ? (
                        <img 
                          src={getCorrectImageUrl(prof.foto_url) || ''} 
                          alt={prof.nombre} 
                          className="w-12 h-12 object-cover rounded-full border-2 border-gray-200"
                          onError={(e) => {
                            console.error('❌ Error cargando foto:', prof.foto_url);
                            (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="%239ca3af" stroke-width="2"%3E%3Ccircle cx="12" cy="8" r="4"%3E%3C/circle%3E%3Cpath d="M20 21a8 8 0 10-16 0"%3E%3C/path%3E%3C/svg%3E';
                          }}
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                          <span className="text-gray-500 text-lg">👤</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {prof.titulo && <span className="text-gray-500 mr-1">{prof.titulo}</span>}
                        {prof.nombre}
                      </div>
                      {prof.es_medico && <span className="text-xs text-purple-600">🩺 Médico</span>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm text-gray-900">{prof.especialidad}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button
                        onClick={() => abrirModalAsignarServicios(prof)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
                      >
                        🛠️ {prof.serviciosCount || prof.servicios?.length || 0} servicios
                      </button>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button
                        onClick={() => toggleActivo(prof)}
                        className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                          prof.activo ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {prof.activo ? '✅ Activo' : '⏸️ Inactivo'}
                      </button>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button onClick={() => abrirModalEditar(prof)} className="text-blue-600 hover:text-blue-800 text-sm font-medium" title="Editar">✏️ Editar</button>
                        <button onClick={() => eliminarProfesional(prof)} className="text-red-600 hover:text-red-800 text-sm font-medium" title="Eliminar">🗑️ Eliminar</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
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

      {/* Modal Crear/Editar Profesional */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full my-8">
            <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-4 rounded-t-2xl flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">{modoEdicion ? '✏️ Editar Profesional' : '➕ Nuevo Profesional'}</h2>
                <p className="text-sm opacity-90">{modoEdicion ? 'Actualiza la información' : 'Registra un nuevo miembro del equipo'}</p>
              </div>
              <button onClick={() => setModalAbierto(false)} className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-6 max-h-[70vh] overflow-y-auto space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nombre *</label>
                  <input type="text" value={formData.nombre} onChange={(e) => handleInputChange('nombre', e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Ej: María López" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Título</label>
                  <input type="text" value={formData.titulo} onChange={(e) => handleInputChange('titulo', e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Ej: Dra., Lic., Estilista" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Especialidad *</label>
                  <input type="text" value={formData.especialidad} onChange={(e) => handleInputChange('especialidad', e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Ej: Peluquería, Dermatología" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Orden</label>
                  <input type="number" value={formData.orden} onChange={(e) => handleInputChange('orden', Number(e.target.value))} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="0" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">WhatsApp</label>
                  <input type="text" value={formData.telefono_whatsapp} onChange={(e) => handleInputChange('telefono_whatsapp', e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="+57 300 123 4567" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email Notificaciones</label>
                  <input type="email" value={formData.email_notificaciones} onChange={(e) => handleInputChange('email_notificaciones', e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="email@ejemplo.com" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Instagram</label>
                  <input type="text" value={formData.instagram} onChange={(e) => handleInputChange('instagram', e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="@usuario" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Biografía</label>
                  <textarea value={formData.bio} onChange={(e) => handleInputChange('bio', e.target.value)} rows={3} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Descripción profesional..." />
                </div>
                {/* Foto de Perfil */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Foto de Perfil</label>
                    {fotoPreview && (
                      <div className="mb-2">
                        <img 
                          src={getCorrectImageUrl(fotoPreview) || ''} 
                          alt="Vista previa" 
                          className="w-24 h-24 object-cover rounded-full border-2 border-gray-200"
                          onError={(e) => {
                            console.error('❌ Error cargando vista previa:', fotoPreview);
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                          loading="lazy"
                        />
                        {!modoEdicion && <p className="text-xs text-gray-500 mt-1">Se mostrará al crear el profesional</p>}
                        {modoEdicion && <p className="text-xs text-gray-500 mt-1">Foto actual. Sube una nueva para reemplazarla.</p>}
                      </div>
                    )}
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleFotoChange} 
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    {modoEdicion && !fotoPreview && (
                      <p className="text-xs text-orange-600 mt-1">⚠️ Este profesional no tiene foto. Sube una nueva.</p>
                    )}
                  </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t">
                <label className="flex items-center gap-2"><input type="checkbox" checked={formData.es_medico} onChange={(e) => handleInputChange('es_medico', e.target.checked)} className="w-4 h-4 text-blue-600 rounded" /><span className="text-sm">🩺 Médico</span></label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={formData.es_responsable} onChange={(e) => handleInputChange('es_responsable', e.target.checked)} className="w-4 h-4 text-blue-600 rounded" /><span className="text-sm">⭐ Responsable</span></label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={formData.activo} onChange={(e) => handleInputChange('activo', e.target.checked)} className="w-4 h-4 text-blue-600 rounded" /><span className="text-sm">✅ Activo</span></label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={formData.activo_reservas} onChange={(e) => handleInputChange('activo_reservas', e.target.checked)} className="w-4 h-4 text-blue-600 rounded" /><span className="text-sm">📅 Recibe reservas</span></label>
              </div>
            </div>
            <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t border-gray-200 rounded-b-2xl flex gap-3">
              <button onClick={() => setModalAbierto(false)} className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors">Cancelar</button>
              <button onClick={guardarProfesional} disabled={guardando} className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">{guardando ? 'Guardando...' : (modoEdicion ? 'Actualizar' : 'Crear')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Asignar Servicios - Mejorado */}
      {modalServiciosAbierto && profesionalSeleccionado && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full my-8">
            <div className="sticky top-0 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-6 py-4 rounded-t-2xl flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">🛠️ Asignar Servicios</h2>
                <p className="text-sm opacity-90">{profesionalSeleccionado.nombre}</p>
              </div>
              <button onClick={() => setModalServiciosAbierto(false)} className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="p-6 max-h-[70vh] overflow-y-auto">
              {/* Filtro por Categoría */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">📂 Filtrar por categoría</label>
                <select 
                  value={filtroServicioCategoria} 
                  onChange={(e) => setFiltroServicioCategoria(e.target.value)} 
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="todas">Todas las categorías</option>
                  {categorias.map((cat: Categoria) => (  // ← TIPO EXPLÍCITO
                    <option key={cat.id} value={cat.id.toString()}>{cat.nombre}</option>
                  ))}
                </select>
              </div>

              {/* Contador */}
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

              {/* Servicios agrupados por categoría */}
              <div className="space-y-4">
                {categorias
                  .filter((cat: Categoria) => filtroServicioCategoria === 'todas' || cat.id.toString() === filtroServicioCategoria)
                  .map((categoria: Categoria) => {
                    const serviciosDeCategoria = servicios.filter((s: Servicio) => s.categoria === categoria.id);
                    if (serviciosDeCategoria.length === 0) return null;
                    
                    return (
                      <div key={categoria.id} className="border border-gray-200 rounded-lg overflow-hidden">
                        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                            {categoria.icono && <span className="text-xl">{categoria.icono}</span>}
                            {categoria.nombre}
                            <span className="text-xs text-gray-500">({serviciosDeCategoria.length} servicios)</span>
                          </h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4">
                          {serviciosDeCategoria.map((servicio: Servicio) => (  // ← TIPO EXPLÍCITO
                            <label 
                              key={servicio.id} 
                              className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                                serviciosSeleccionados.includes(servicio.id)
                                  ? 'border-emerald-500 bg-emerald-50'
                                  : 'border-gray-200 hover:bg-gray-50'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={serviciosSeleccionados.includes(servicio.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setServiciosSeleccionados([...serviciosSeleccionados, servicio.id]);
                                  } else {
                                    setServiciosSeleccionados(serviciosSeleccionados.filter(id => id !== servicio.id));
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
                          ))}
                        </div>
                      </div>
                    );
                  })}
              </div>

              {servicios.length === 0 && (
                <p className="text-center text-gray-500 py-8">📭 No hay servicios disponibles</p>
              )}
            </div>
            
            <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t border-gray-200 rounded-b-2xl flex gap-3">
              <button 
                onClick={() => setModalServiciosAbierto(false)} 
                className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={guardarServiciosAsignados} 
                disabled={guardando}
                className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {guardando ? 'Guardando...' : `Guardar (${serviciosSeleccionados.length})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}