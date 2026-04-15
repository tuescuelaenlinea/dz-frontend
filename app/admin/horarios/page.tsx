// app\admin\horarios\page.tsx
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Profesional {
  id: number;
  nombre: string;
  especialidad: string;
  activo: boolean;
}

interface Horario {
  id: number;
  profesional: number;
  profesional_nombre: string;
  dia_semana: 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado' | 'domingo';
  dia_nombre: string;
  hora_inicio: string;
  hora_fin: string;
  activo: boolean;
}

// ← NUEVO: Interfaces para el modal semanal
interface CitaSemana {
  id: number;
  cliente_nombre: string;
  cliente_telefono: string;
  servicio_nombre: string;
  profesional?: number | null;        // ← ID del profesional (opcional)
  profesional_nombre?: string | null; // ← Nombre para mostrar (opcional)
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  estado: 'pendiente' | 'confirmada' | 'completada' | 'cancelada';
  precio_total: string;
}

interface DiaSemana {
  fecha: string;
  diaNombre: string;
  diaValor: string;
  esHoy: boolean;
  citas: CitaSemana[];
}

export default function AdminHorariosPage() {
  const router = useRouter();
  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [profesionales, setProfesionales] = useState<Profesional[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filtros
  const [filtroProfesional, setFiltroProfesional] = useState<string>('todos');
  const [filtroDia, setFiltroDia] = useState<string>('todos');
  const [filtroActivo, setFiltroActivo] = useState<string>('todos');
  const [busqueda, setBusqueda] = useState<string>('');
  
  // Modal
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [horarioSeleccionado, setHorarioSeleccionado] = useState<Horario | null>(null);
  
  // Formulario
  const [formData, setFormData] = useState<Partial<Horario>>({
    profesional: 0,
    dia_semana: 'lunes',
    hora_inicio: '09:00',
    hora_fin: '19:00',
    activo: true,
  });
  
  const [guardando, setGuardando] = useState(false);
  
  // Paginación
  const [paginaActual, setPaginaActual] = useState(1);
  const [horariosPorPagina, setHorariosPorPagina] = useState(20);

  // ← NUEVO: Estados para el modal semanal
  const [modalSemanaAbierto, setModalSemanaAbierto] = useState(false);
  const [profesionalSemana, setProfesionalSemana] = useState<Profesional | null>(null);
  const [semanaActual, setSemanaActual] = useState<Date>(new Date());
  const [diasSemana, setDiasSemana] = useState<DiaSemana[]>([]);
  const [cargandoSemana, setCargandoSemana] = useState(false);
  const [errorSemana, setErrorSemana] = useState<string | null>(null);

  // Días de la semana
  const diasSemanaLista = [
    { value: 'lunes', label: 'Lunes' },
    { value: 'martes', label: 'Martes' },
    { value: 'miercoles', label: 'Miércoles' },
    { value: 'jueves', label: 'Jueves' },
    { value: 'viernes', label: 'Viernes' },
    { value: 'sabado', label: 'Sábado' },
    { value: 'domingo', label: 'Domingo' },
  ];

  // ← NUEVO: Horas del día para el calendario (9 AM - 8 PM)
  const horasDia = Array.from({ length: 12 }, (_, i) => {
    const hora = i + 9;
    return `${hora.toString().padStart(2, '0')}:00`;
  });

  useEffect(() => {
    cargarHorarios();
    cargarProfesionales();
  }, []);

  // Resetear paginación al filtrar
  useEffect(() => {
    setPaginaActual(1);
  }, [filtroProfesional, filtroDia, filtroActivo, busqueda]);

  const cargarHorarios = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('admin_token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dzsalon.com/api';
      
      console.log('🔄 Cargando horarios con paginación...');
      
      let allHorarios: Horario[] = [];
      // ← Page size grande para reducir requests
      let nextPage: string | null = `${apiUrl}/horarios/?ordering=profesional__nombre,dia_semana&page_size=200`;
      let page = 1;
      const maxPages = 20;  // ← Límite de seguridad
      
      while (nextPage && page <= maxPages) {
        console.log(`📡 Página ${page}:`, nextPage);
        
        const res: Response = await fetch(nextPage, {
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
          throw new Error(`Error HTTP ${res.status} al cargar horarios`);
        }

        const data = await res.json();
        
        // ← Manejar respuesta paginada o array directo
        if (data.results && Array.isArray(data.results)) {
          allHorarios = [...allHorarios, ...data.results];
          console.log(`✅ Página ${page}: ${data.results.length} horarios (total: ${allHorarios.length}/${data.count})`);
        } else if (Array.isArray(data)) {
          // Respuesta sin paginación
          allHorarios = [...allHorarios, ...data];
          console.log(`✅ Respuesta directa: ${data.length} horarios`);
          break;
        } else {
          console.warn('⚠️ Formato de respuesta inesperado:', data);
          break;
        }
        
        // ← Manejar siguiente página
        if (data.next) {
          try {
            // Corregir URL si el backend devuelve dominio diferente
            const nextUrl = new URL(data.next);
            const apiOrigin = apiUrl.replace(/\/api\/?$/, '');
            nextPage = `${apiOrigin}${nextUrl.pathname}${nextUrl.search}`;
            console.log('🔗 Next URL corregida:', nextPage);
          } catch (e) {
            console.warn('⚠️ Error parseando next URL, usando raw:', data.next);
            nextPage = data.next;
          }
        } else {
          nextPage = null;
          console.log('✅ No hay más páginas');
        }
        
        page++;
      }
      
      console.log('✅ Total de horarios cargados:', allHorarios.length);
      setHorarios(allHorarios);
      
    } catch (err: any) {
      console.error('❌ Error cargando horarios:', err);
      setError(err.message || 'Error al cargar horarios');
    } finally {
      setLoading(false);
    }
  };

  const cargarProfesionales = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080/api';
      
      const res = await fetch(`${apiUrl}/profesionales/?activo=true&ordering=nombre`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setProfesionales(Array.isArray(data) ? data : (data.results || []));
      }
    } catch (err) {
      console.error('Error cargando profesionales:', err);
    }
  };

  // ← NUEVO: Funciones de utilidad para fechas
  const getInicioSemana = (fecha: Date): Date => {
    const d = new Date(fecha);
    const dia = d.getDay();
    const diff = d.getDate() - dia + (dia === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const formatDateForAPI = (fecha: Date): string => {
    return fecha.toISOString().split('T')[0];
  };

  const formatDateForDisplay = (fecha: Date): { diaNombre: string; diaNumero: string } => {
    const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return {
      diaNombre: dias[fecha.getDay()],
      diaNumero: fecha.getDate().toString(),
    };
  };

  const getDiasDeSemana = (fechaBase: Date): DiaSemana[] => {
    const inicio = getInicioSemana(fechaBase);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    const dias: DiaSemana[] = [];
    const diasMap: Record<string, string> = {
      '0': 'domingo', '1': 'lunes', '2': 'martes', '3': 'miercoles',
      '4': 'jueves', '5': 'viernes', '6': 'sabado'
    };
    
    for (let i = 0; i < 7; i++) {
      const dia = new Date(inicio);
      dia.setDate(inicio.getDate() + i);
      
      const { diaNombre, diaNumero } = formatDateForDisplay(dia);
      
      dias.push({
        fecha: formatDateForAPI(dia),
        diaNombre: `${diaNombre} ${diaNumero}`,
        diaValor: diasMap[dia.getDay().toString()],
        esHoy: dia.getTime() === hoy.getTime(),
        citas: [],
      });
    }
    
    return dias;
  };

  // ← NUEVO: Navegación entre semanas
  const irASemana = (direccion: 'anterior' | 'siguiente') => {
    const nuevaSemana = new Date(semanaActual);
    nuevaSemana.setDate(semanaActual.getDate() + (direccion === 'anterior' ? -7 : 7));
    setSemanaActual(nuevaSemana);
    if (profesionalSemana) {
      cargarCitasSemana(profesionalSemana, nuevaSemana);
    }
  };

  const irAHoy = () => {
    setSemanaActual(new Date());
    if (profesionalSemana) {
      cargarCitasSemana(profesionalSemana, new Date());
    }
  };

  // ← NUEVO: Cargar citas de la semana
const cargarCitasSemana = async (profesional: Profesional, fechaSemana: Date) => {
  try {
    setCargandoSemana(true);
    setErrorSemana(null);
    
    const token = localStorage.getItem('admin_token');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dzsalon.com/api';
    
    const inicio = getInicioSemana(fechaSemana);
    const fin = new Date(inicio);
    fin.setDate(inicio.getDate() + 6);
    
    const fechaInicio = formatDateForAPI(inicio);
    const fechaFin = formatDateForAPI(fin);
    
    // ← AGREGAR: Logs detallados
    console.log(`\n📅 ========== CARGANDO CITAS ==========`);
    console.log(`👤 Profesional ID: ${profesional.id}`);
    console.log(`👤 Profesional Nombre: ${profesional.nombre}`);
    console.log(`📅 Rango: ${fechaInicio} a ${fechaFin}`);
    
    // ← Verificar URL completa que se va a llamar
    const urlCompleta = `${apiUrl}/citas/?profesional=${profesional.id}&fecha_min=${fechaInicio}&fecha_max=${fechaFin}&ordering=fecha,hora_inicio`;
    console.log(`🔗 URL: ${urlCompleta}`);
    
    const res = await fetch(urlCompleta, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!res.ok) {
      console.error(`❌ Error HTTP ${res.status}`);
      throw new Error('Error al cargar citas');
    }
    
    const data = await res.json();
    const citasList: CitaSemana[] = Array.isArray(data) ? data : (data.results || []);
    
    // ← AGREGAR: Mostrar detalles de cada cita
    console.log(`\n✅ Citas recibidas: ${citasList.length}`);
    console.log('📋 Detalle de citas:');
    citasList.forEach((cita, idx) => {
      console.log(`  ${idx + 1}. [${cita.fecha} ${cita.hora_inicio}] ${cita.cliente_nombre} - ${cita.servicio_nombre}`);
      console.log(`     Profesional ID en cita: ${cita.profesional}`);  // ← Importante ver esto
    });
    
    const diasConCitas = getDiasDeSemana(fechaSemana).map(dia => {
      const citasDelDia = citasList.filter(cita => cita.fecha === dia.fecha);
      
      return {
        ...dia,
        citas: citasDelDia,
      };
    });
    
    setDiasSemana(diasConCitas);
    console.log(`\n=====================================\n`);
    
  } catch (err: any) {
    console.error('❌ Error cargando citas:', err);
    setErrorSemana(err.message || 'Error al cargar citas');
    setDiasSemana(getDiasDeSemana(fechaSemana));
  } finally {
    setCargandoSemana(false);
  }
};

  // ← NUEVO: Abrir modal de detalle semanal
  const abrirDetalleSemana = async (profesional: Profesional) => {
  console.log(`\n🎯 ABRIR DETALLE SEMANAL`);
  console.log(`👤 Profesional recibido:`);
  console.log(`   ID: ${profesional.id}`);
  console.log(`   Nombre: ${profesional.nombre}`);
  console.log(`   Especialidad: ${profesional.especialidad}`);
  
  setProfesionalSemana(profesional);
  setSemanaActual(new Date());
  setModalSemanaAbierto(true);
  
  await cargarCitasSemana(profesional, new Date());
};

  const abrirModalCrear = () => {
    setModoEdicion(false);
    setHorarioSeleccionado(null);
    setFormData({
      profesional: profesionales[0]?.id || 0,
      dia_semana: 'lunes',
      hora_inicio: '09:00',
      hora_fin: '19:00',
      activo: true,
    });
    setModalAbierto(true);
  };

  const abrirModalEditar = (horario: Horario) => {
    setModoEdicion(true);
    setHorarioSeleccionado(horario);
    setFormData({
      profesional: horario.profesional,
      dia_semana: horario.dia_semana,
      hora_inicio: horario.hora_inicio,
      hora_fin: horario.hora_fin,
      activo: horario.activo,
    });
    setModalAbierto(true);
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const guardarHorario = async () => {
    // Validaciones
    if (!formData.profesional) {
      alert('❌ Debes seleccionar un profesional');
      return;
    }
    if (!formData.hora_inicio || !formData.hora_fin) {
      alert('❌ Debes definir hora de inicio y fin');
      return;
    }
    if (formData.hora_inicio >= formData.hora_fin) {
      alert('❌ La hora de inicio debe ser anterior a la hora de fin');
      return;
    }

    try {
      setGuardando(true);
      const token = localStorage.getItem('admin_token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080/api';
      
      const body = {
        profesional: formData.profesional,
        dia_semana: formData.dia_semana,
        hora_inicio: formData.hora_inicio,
        hora_fin: formData.hora_fin,
        activo: formData.activo,
      };

      let res;
      if (modoEdicion && horarioSeleccionado) {
        res = await fetch(`${apiUrl}/horarios/${horarioSeleccionado.id}/`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });
      } else {
        res = await fetch(`${apiUrl}/horarios/`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });
      }

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || errorData.non_field_errors?.[0] || 'Error al guardar');
      }

      alert(`✅ Horario ${modoEdicion ? 'actualizado' : 'creado'} exitosamente`);
      setModalAbierto(false);
      cargarHorarios();
    } catch (err: any) {
      console.error('Error guardando horario:', err);
      alert(`❌ Error: ${err.message}`);
    } finally {
      setGuardando(false);
    }
  };

  const eliminarHorario = async (horario: Horario) => {
    if (!confirm(`¿Eliminar horario de ${horario.profesional_nombre} los ${horario.dia_nombre}?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('admin_token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080/api';
      
      const res = await fetch(`${apiUrl}/horarios/${horario.id}/`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error('Error al eliminar horario');
      }

      alert('✅ Horario eliminado exitosamente');
      cargarHorarios();
    } catch (err: any) {
      console.error('Error eliminando horario:', err);
      alert(`❌ Error: ${err.message}`);
    }
  };

  const toggleActivo = async (horario: Horario) => {
  try {
    const token = localStorage.getItem('admin_token');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dzsalon.com/api';
    
    console.log(`🔄 Toggle activo para horario ID ${horario.id}: ${horario.activo} → ${!horario.activo}`);
    
    const body = JSON.stringify({ activo: !horario.activo });
    console.log('📦 Body enviado:', body);
    
    const res = await fetch(`${apiUrl}/horarios/${horario.id}/`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: body,
    });

    console.log('📥 Response status:', res.status);
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      console.error('❌ Error del backend:', errorData);
      throw new Error(errorData.detail || `Error ${res.status}`);
    }

    const data = await res.json();
    console.log('✅ Horario actualizado:', data);
    
    cargarHorarios();
    
  } catch (err: any) {
    console.error('❌ Error actualizando estado:', err);
    alert(`❌ Error: ${err.message}`);
    cargarHorarios();
  }
};

  // Filtros
  const horariosFiltrados = horarios.filter((horario) => {
    if (filtroProfesional !== 'todos' && horario.profesional.toString() !== filtroProfesional) {
      return false;
    }
    if (filtroDia !== 'todos' && horario.dia_semana !== filtroDia) {
      return false;
    }
    if (filtroActivo !== 'todos') {
      const activo = filtroActivo === 'si';
      if (horario.activo !== activo) return false;
    }
    if (busqueda) {
      const busquedaLower = busqueda.toLowerCase();
      const coincideProfesional = horario.profesional_nombre.toLowerCase().includes(busquedaLower);
      const coincideDia = horario.dia_nombre.toLowerCase().includes(busquedaLower);
      if (!coincideProfesional && !coincideDia) return false;
    }
    return true;
  });

  // Paginación
  const indiceUltimo = paginaActual * horariosPorPagina;
  const indicePrimero = indiceUltimo - horariosPorPagina;
  const horariosPaginados = horariosFiltrados.slice(indicePrimero, indiceUltimo);
  const totalPaginas = Math.ceil(horariosFiltrados.length / horariosPorPagina);

  const irAPagina = (pagina: number) => {
    setPaginaActual(pagina);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getDiaBadge = (dia: string) => {
    const colores: Record<string, string> = {
      lunes: 'bg-blue-100 text-blue-800',
      martes: 'bg-green-100 text-green-800',
      miercoles: 'bg-yellow-100 text-yellow-800',
      jueves: 'bg-purple-100 text-purple-800',
      viernes: 'bg-pink-100 text-pink-800',
      sabado: 'bg-orange-100 text-orange-800',
      domingo: 'bg-red-100 text-red-800',
    };
    return colores[dia] || 'bg-gray-100 text-gray-800';
  };

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
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">🕐 Gestión de Horarios</h1>
          <p className="text-gray-600 mt-2">Configura la disponibilidad de tus profesionales</p>
        </div>
        <button
          onClick={abrirModalCrear}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nuevo Horario
        </button>
      </div>

      {/* Vista Resumen por Profesional */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">📊 Resumen de Disponibilidad</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {profesionales.map((prof) => {
            const horariosProf = horarios.filter(h => h.profesional === prof.id && h.activo);
            const diasTrabaja: string[] = [...new Set(horariosProf.map(h => h.dia_semana))];
            
            return (
              // ← MODIFICADO: Agregar onClick para abrir detalle semanal
              <div 
                key={prof.id} 
                className="bg-white rounded-xl shadow-lg p-4 border-l-4 border-blue-500 cursor-pointer hover:shadow-xl transition-shadow"
                onClick={() => abrirDetalleSemana(prof)}
                title="Clic para ver horario semanal detallado"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">{prof.nombre}</h3>
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                    {diasTrabaja.length} días
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-3">{prof.especialidad}</p>
                <div className="flex flex-wrap gap-1">
                  {diasSemanaLista.map((dia) => (
                    <span
                      key={dia.value}
                      className={`text-xs px-2 py-1 rounded ${
                        diasTrabaja.includes(dia.value as string)
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      {dia.label.slice(0, 3)}
                    </span>
                  ))}
                </div>
                {/* ← Indicador visual de que es clickable */}
                <div className="mt-3 text-xs text-blue-600 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  Ver horario semanal
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-lg p-4 lg:p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Búsqueda */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">🔍 Buscar</label>
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Profesional o día..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Profesional */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Profesional</label>
            <select
              value={filtroProfesional}
              onChange={(e) => setFiltroProfesional(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="todos">Todos</option>
              {profesionales.map((p) => (
                <option key={p.id} value={p.id.toString()}>{p.nombre}</option>
              ))}
            </select>
          </div>

          {/* Día */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Día</label>
            <select
              value={filtroDia}
              onChange={(e) => setFiltroDia(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="todos">Todos</option>
              {diasSemanaLista.map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </div>

          {/* Estado */}
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

          {/* Limpiar */}
          <div className="flex items-end">
            <button
              onClick={() => {
                setFiltroProfesional('todos');
                setFiltroDia('todos');
                setFiltroActivo('todos');
                setBusqueda('');
              }}
              className="w-full px-4 py-2 text-blue-600 hover:text-blue-800 font-medium border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
            >
              Limpiar
            </button>
          </div>
        </div>

        {/* Contador */}
        <div className="mt-4 text-sm text-gray-600">
          Mostrando <strong>{horariosFiltrados.length}</strong> de <strong>{horarios.length}</strong> horarios
        </div>
      </div>

      {/* Tabla de Horarios */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Profesional</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Día</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Horario</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {horariosPaginados.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    📭 No hay horarios configurados
                  </td>
                </tr>
              ) : (
                horariosPaginados.map((horario) => (
                  <tr key={horario.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{horario.profesional_nombre}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getDiaBadge(horario.dia_semana)}`}>
                        {horario.dia_nombre}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-900 font-mono">
                        {horario.hora_inicio} - {horario.hora_fin}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button
                        onClick={() => toggleActivo(horario)}
                        className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                          horario.activo
                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {horario.activo ? '✅ Activo' : '⏸️ Inactivo'}
                      </button>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => abrirModalEditar(horario)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          title="Editar"
                        >
                          ✏️ Editar
                        </button>
                        <button
                          onClick={() => eliminarHorario(horario)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium"
                          title="Eliminar"
                        >
                          🗑️ Eliminar
                        </button>
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
              Mostrando <strong>{indicePrimero + 1}</strong> a{' '}
              <strong>{Math.min(indiceUltimo, horariosFiltrados.length)}</strong> de{' '}
              <strong>{horariosFiltrados.length}</strong> horarios
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Mostrar:</label>
              <select
                value={horariosPorPagina}
                onChange={(e) => {
                  setHorariosPorPagina(Number(e.target.value));
                  setPaginaActual(1);
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => irAPagina(paginaActual - 1)}
                disabled={paginaActual === 1}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                ← Anterior
              </button>
              <button
                onClick={() => irAPagina(paginaActual + 1)}
                disabled={paginaActual === totalPaginas}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Siguiente →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Crear/Editar */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full">
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-4 rounded-t-2xl flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">
                  {modoEdicion ? '✏️ Editar Horario' : '➕ Nuevo Horario'}
                </h2>
                <p className="text-sm opacity-90">
                  Configura la disponibilidad del profesional
                </p>
              </div>
              <button
                onClick={() => setModalAbierto(false)}
                className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Contenido */}
            <div className="p-6 space-y-4">
              {/* Profesional */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Profesional *</label>
                <select
                  value={formData.profesional}
                  onChange={(e) => handleInputChange('profesional', Number(e.target.value))}
                  disabled={modoEdicion}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                >
                  <option value={0}>Seleccionar...</option>
                  {profesionales.map((p) => (
                    <option key={p.id} value={p.id}>{p.nombre} - {p.especialidad}</option>
                  ))}
                </select>
              </div>

              {/* Día */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Día de la semana *</label>
                <select
                  value={formData.dia_semana}
                  onChange={(e) => handleInputChange('dia_semana', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {diasSemanaLista.map((d) => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
              </div>

              {/* Horas */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Hora Inicio *</label>
                  <input
                    type="time"
                    value={formData.hora_inicio}
                    onChange={(e) => handleInputChange('hora_inicio', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Hora Fin *</label>
                  <input
                    type="time"
                    value={formData.hora_fin}
                    onChange={(e) => handleInputChange('hora_fin', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Estado */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="activo"
                  checked={formData.activo}
                  onChange={(e) => handleInputChange('activo', e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <label htmlFor="activo" className="text-sm text-gray-700">
                  ✅ Horario activo (disponible para reservas)
                </label>
              </div>

              {/* Vista Previa */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">👁️ Vista Previa</h4>
                <p className="text-sm text-gray-900">
                  <strong>{profesionales.find(p => p.id === formData.profesional)?.nombre || 'Profesional'}</strong>
                  {' '}trabaja los{' '}
                  <strong>{diasSemanaLista.find(d => d.value === formData.dia_semana)?.label}</strong>
                  {' '}de{' '}
                  <strong className="font-mono">{formData.hora_inicio}</strong> a{' '}
                  <strong className="font-mono">{formData.hora_fin}</strong>
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t border-gray-200 rounded-b-2xl flex gap-3">
              <button
                onClick={() => setModalAbierto(false)}
                className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={guardarHorario}
                disabled={guardando}
                className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {guardando ? 'Guardando...' : (modoEdicion ? 'Actualizar' : 'Crear')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ← NUEVO: Modal Detalle Semanal de Profesional */}
      {modalSemanaAbierto && profesionalSemana && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full my-8">
            
            {/* Header del Modal */}
            <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-4 rounded-t-2xl flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">📅 Horario Semanal</h2>
                <p className="text-sm opacity-90">{profesionalSemana.nombre} - {profesionalSemana.especialidad}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setModalSemanaAbierto(false)}
                  className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            {/* Navegación de Semanas */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <button
                onClick={() => irASemana('anterior')}
                className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-2"
              >
                ← Semana anterior
              </button>
              
              <div className="text-center">
                <p className="font-semibold text-gray-900">
                  {getInicioSemana(semanaActual).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })} - 
                  {' '}
                  {new Date(getInicioSemana(semanaActual).getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
                <button
                  onClick={irAHoy}
                  className="text-xs text-indigo-600 hover:underline mt-1"
                >
                  Ir a hoy
                </button>
              </div>
              
              <button
                onClick={() => irASemana('siguiente')}
                className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-2"
              >
                Semana siguiente →
              </button>
            </div>
            
            {/* Contenido del Calendario */}
            <div className="p-6 max-h-[70vh] overflow-y-auto">
              {cargandoSemana ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent"></div>
                  <span className="ml-3 text-gray-600">Cargando citas...</span>
                </div>
              ) : errorSemana ? (
                <div className="text-center py-8 text-red-600">
                  ❌ {errorSemana}
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
                  {diasSemana.map((dia) => (
                    <div 
                      key={dia.fecha} 
                      className={`border rounded-xl p-3 ${
                        dia.esHoy ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 bg-white'
                      }`}
                    >
                      {/* Cabecera del Día */}
                      <div className={`text-center pb-2 border-b ${dia.esHoy ? 'border-indigo-200' : 'border-gray-100'}`}>
                        <p className={`font-semibold ${dia.esHoy ? 'text-indigo-700' : 'text-gray-900'}`}>
                          {dia.diaNombre}
                        </p>
                        {dia.esHoy && (
                          <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                            Hoy
                          </span>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          {dia.citas.length} cita{dia.citas.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                      
                      {/* Lista de Citas por Hora */}
                        <div className="space-y-2 mt-3 max-h-96 overflow-y-auto">
                          {horasDia.map((hora) => {
                            // ← CORREGIR: Normalizar formato de hora (quitar segundos si existen)
                            const citaEnHora = dia.citas.find(c => {
                              const horaCita = c.hora_inicio.split(':').slice(0, 2).join(':');  // "09:00:00" → "09:00"
                              const horaBuscada = hora.split(':').slice(0, 2).join(':');  // "09:00" → "09:00"
                              return horaCita === horaBuscada;
                            });
                            
                            // ← DEBUG: Si hay citas pero no se encuentran, mostrar warning
                            if (dia.citas.length > 0 && !citaEnHora) {
                              console.log(`⚠️ ${dia.diaNombre}: Hora ${hora} no tiene cita. Citas disponibles:`, 
                                dia.citas.map(c => c.hora_inicio));
                            }
                            
                            return (
                              <div key={hora} className="min-h-[60px]">
                                {citaEnHora ? (
                                  <div 
                                    className={`p-2 rounded-lg text-xs border-l-4 cursor-pointer hover:shadow transition-shadow ${
                                      citaEnHora.estado === 'cancelada'
                                        ? 'bg-red-50 border-red-400 text-red-800'
                                        : citaEnHora.estado === 'confirmada'
                                        ? 'bg-green-50 border-green-400 text-green-800'
                                        : citaEnHora.estado === 'completada'
                                        ? 'bg-gray-100 border-gray-400 text-gray-700'
                                        : 'bg-yellow-50 border-yellow-400 text-yellow-800'
                                    }`}
                                    title={`${citaEnHora.servicio_nombre}\n${citaEnHora.cliente_nombre}\n${citaEnHora.cliente_telefono}`}
                                  >
                                    <p className="font-semibold truncate">{citaEnHora.cliente_nombre}</p>
                                    <p className="truncate text-gray-600">{citaEnHora.servicio_nombre}</p>
                                    <p className="text-gray-500">
                                      {citaEnHora.hora_inicio} - {citaEnHora.hora_fin}
                                    </p>
                                    <span className={`inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] ${
                                      citaEnHora.estado === 'cancelada' ? 'bg-red-200' :
                                      citaEnHora.estado === 'confirmada' ? 'bg-green-200' :
                                      citaEnHora.estado === 'completada' ? 'bg-gray-200' :
                                      'bg-yellow-200'
                                    }`}>
                                      {citaEnHora.estado}
                                    </span>
                                  </div>
                                ) : (
                                  <div className="p-2 text-gray-300 text-xs border border-dashed border-gray-200 rounded">
                                    {hora}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t border-gray-200 rounded-b-2xl flex justify-end">
              <button
                onClick={() => setModalSemanaAbierto(false)}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}