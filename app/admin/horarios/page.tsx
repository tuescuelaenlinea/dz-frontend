// app\admin\horarios\page.tsx
// app\admin\horarios\page.tsx
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Profesional {
  id: number;
  nombre: string;
  especialidad: string;
  activo: boolean;
  foto_url?: string | null;
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

interface CitaSemana {
  id: number;
  cliente_nombre: string;
  cliente_telefono: string;
  servicio_nombre: string;
  profesional?: number | null;
  profesional_nombre?: string | null;
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
  
  // Modal horario individual (DETALLADO)
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [horarioSeleccionado, setHorarioSeleccionado] = useState<Horario | null>(null);
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

  // Modal detalle semanal
  const [modalSemanaAbierto, setModalSemanaAbierto] = useState(false);
  const [profesionalSemana, setProfesionalSemana] = useState<Profesional | null>(null);
  const [semanaActual, setSemanaActual] = useState<Date>(new Date());
  const [diasSemana, setDiasSemana] = useState<DiaSemana[]>([]);
  const [cargandoSemana, setCargandoSemana] = useState(false);
  const [errorSemana, setErrorSemana] = useState<string | null>(null);

  // ← MODIFICADO: Modal editar día (24 horas) - ahora recibe día específico
  const [modalEditarDiaAbierto, setModalEditarDiaAbierto] = useState(false);
  const [diaEditar, setDiaEditar] = useState<{profesional: Profesional, dia: string, fecha?: string} | null>(null);
  const [horasSeleccionadas, setHorasSeleccionadas] = useState<Record<string, boolean>>({});
  const [diaActivo, setDiaActivo] = useState(true);
  const [guardandoDia, setGuardandoDia] = useState(false);

  // ← NUEVO: Estado para selección múltiple de días en creación
  const [diasSeleccionadosCreacion, setDiasSeleccionadosCreacion] = useState<Record<string, boolean>>({
    lunes: false, martes: false, miercoles: false, jueves: false, viernes: false, sabado: false, domingo: false
  });

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

  // Todas las horas del día (24 horas)
  const horasDia24 = Array.from({ length: 24 }, (_, i) => {
    return `${i.toString().padStart(2, '0')}:00`;
  });

  useEffect(() => {
    cargarHorarios();
    cargarProfesionales();
  }, []);

  useEffect(() => {
    setPaginaActual(1);
  }, [filtroProfesional, filtroDia, filtroActivo, busqueda]);

  const cargarHorarios = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('admin_token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dzsalon.com/api';
      
      let allHorarios: Horario[] = [];
      let nextPage: string | null = `${apiUrl}/horarios/?ordering=profesional__nombre,dia_semana&page_size=200`;
      let page = 1;
      const maxPages = 20;
      
      while (nextPage && page <= maxPages) {
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
        
        if (data.results && Array.isArray(data.results)) {
          allHorarios = [...allHorarios, ...data.results];
        } else if (Array.isArray(data)) {
          allHorarios = [...allHorarios, ...data];
          break;
        } else {
          break;
        }
        
        if (data.next) {
          try {
            const nextUrl = new URL(data.next);
            const apiOrigin = apiUrl.replace(/\/api\/?$/, '');
            nextPage = `${apiOrigin}${nextUrl.pathname}${nextUrl.search}`;
          } catch (e) {
            nextPage = data.next;
          }
        } else {
          nextPage = null;
        }
        page++;
      }
      
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
      
      const res = await fetch(`${apiUrl}/profesionales/?ordering=nombre`, {
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

  // Funciones de utilidad para fechas
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
      
      const res = await fetch(`${apiUrl}/citas/?profesional=${profesional.id}&fecha_min=${fechaInicio}&fecha_max=${fechaFin}&ordering=fecha,hora_inicio`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!res.ok) {
        throw new Error('Error al cargar citas');
      }
      
      const data = await res.json();
      const citasList: CitaSemana[] = Array.isArray(data) ? data : (data.results || []);
      
      const diasConCitas = getDiasDeSemana(fechaSemana).map(dia => ({
        ...dia,
        citas: citasList.filter(cita => cita.fecha === dia.fecha),
      }));
      
      setDiasSemana(diasConCitas);
      
    } catch (err: any) {
      console.error('❌ Error cargando citas:', err);
      setErrorSemana(err.message || 'Error al cargar citas');
      setDiasSemana(getDiasDeSemana(fechaSemana));
    } finally {
      setCargandoSemana(false);
    }
  };

  const abrirDetalleSemana = async (profesional: Profesional) => {
    setProfesionalSemana(profesional);
    setSemanaActual(new Date());
    setModalSemanaAbierto(true);
    await cargarCitasSemana(profesional, new Date());
  };

  // ← MODIFICADO: Abrir modal para editar un día específico (24 horas)
  const abrirModalEditarDia = async (profesional: Profesional, dia: string, fecha?: string) => {
   
    
    setDiaEditar({ profesional, dia, fecha });
    
    // Cargar horarios existentes para este profesional + día
    const horariosExistentes = horarios.filter(
      h => h.profesional === profesional.id && h.dia_semana === dia
    );
    
    // Inicializar horas seleccionadas
    const horasInit: Record<string, boolean> = {};
    horasDia24.forEach(hora => {
      const estaActiva = horariosExistentes.some(h => {
        const inicio = parseInt(h.hora_inicio.replace(':', ''));
        const fin = parseInt(h.hora_fin.replace(':', ''));
        const horaNum = parseInt(hora.replace(':', ''));
        return horaNum >= inicio && horaNum < fin && h.activo;
      });
      horasInit[hora] = estaActiva;
    });
    
    setHorasSeleccionadas(horasInit);
    setDiaActivo(horariosExistentes.some(h => h.activo));
    setModalEditarDiaAbierto(true);
  };

  // Toggle hora individual en modal de edición de día
  const toggleHora = (hora: string) => {
    setHorasSeleccionadas(prev => ({
      ...prev,
      [hora]: !prev[hora]
    }));
  };

 // Guardar cambios del día (24 horas) - CON LOGS DETALLADOS
const guardarCambiosDia = async () => {
  if (!diaEditar) {
    console.error('❌ No hay día seleccionado para editar');
    return;
  }
  
  try {
    setGuardandoDia(true);
    const token = localStorage.getItem('admin_token');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dzsalon.com/api';
    
    const { profesional, dia } = diaEditar;
    
    console.log('\n=== 💾 GUARDANDO CAMBIOS DEL DÍA ===');
    console.log('👤 Profesional:', profesional.nombre, '(ID:', profesional.id + ')');
    console.log('📅 Día:', dia);
    console.log('✅ Día activo:', diaActivo);
    console.log('🕐 Horas seleccionadas:', Object.entries(horasSeleccionadas).filter(([_, activa]) => activa).length);
    
    // Obtener rangos continuos de horas seleccionadas
    const horasActivas = Object.entries(horasSeleccionadas)
      .filter(([_, activa]) => activa)
      .map(([hora]) => hora)
      .sort();
    
    console.log('📋 Horas activas:', horasActivas);
    
   // ← FUNCIÓN AUXILIAR: Sumar 1 hora a una hora en formato HH:MM
      const sumarUnaHora = (hora: string): string => {
        const [h, m] = hora.split(':').map(Number);
        const nuevaHora = (h + 1) % 24;
        return `${nuevaHora.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      };

      // Convertir horas activas en rangos [inicio, fin]
      const rangos: { inicio: string; fin: string }[] = [];
      if (horasActivas.length > 0) {
        let rangoInicio = horasActivas[0];
        let rangoFin = horasActivas[0];
        
        for (let i = 1; i < horasActivas.length; i++) {
          const horaActual = horasActivas[i];
          const horaAnterior = horasActivas[i - 1];
          
          // ← CORREGIR: Comparar horas correctamente (parsear HH:MM)
          const [hActual] = horaActual.split(':').map(Number);
          const [hAnterior] = horaAnterior.split(':').map(Number);
          const diff = hActual - hAnterior;
          
          if (diff === 1) {
            // Hora continua, extender rango
            rangoFin = horaActual;
          } else {
            // Hora discontinua, guardar rango anterior e iniciar nuevo
            const horaFinCompleta = sumarUnaHora(rangoFin);
            rangos.push({ inicio: rangoInicio, fin: horaFinCompleta });
            console.log('  ➕ Rango creado:', rangoInicio, '-', horaFinCompleta);
            rangoInicio = horaActual;
            rangoFin = horaActual;
          }
        }
        // Guardar último rango
        const horaFinCompleta = sumarUnaHora(rangoFin);
        rangos.push({ inicio: rangoInicio, fin: horaFinCompleta });
        console.log('  ➕ Rango creado:', rangoInicio, '-', horaFinCompleta);
      }
    
    console.log('📊 Total de rangos a crear:', rangos.length);
    
    // Eliminar horarios existentes primero
    const horariosExistentes = horarios.filter(
      h => h.profesional === profesional.id && h.dia_semana === dia
    );
    
    console.log('🗑️ Horarios existentes a eliminar:', horariosExistentes.length);
    
    for (const h of horariosExistentes) {
      console.log('   Eliminando horario ID:', h.id, h.hora_inicio, '-', h.hora_fin);
      const deleteRes = await fetch(`${apiUrl}/horarios/${h.id}/`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (!deleteRes.ok) {
        console.error('   ❌ Error eliminando:', deleteRes.status);
      }
    }
    
    // Crear nuevos horarios para los rangos
    console.log('✨ Creando nuevos horarios...');
    for (const rango of rangos) {
      const body = {
        profesional: profesional.id,
        dia_semana: dia,
        hora_inicio: rango.inicio,
        hora_fin: rango.fin,
        activo: diaActivo,
      };
      
      console.log('   POST:', body);
      
      const createRes = await fetch(`${apiUrl}/horarios/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      
      if (createRes.ok) {
        const nuevoHorario = await createRes.json();
        console.log('   ✅ Creado:', nuevoHorario);
      } else {
        const errorData = await createRes.json().catch(() => ({}));
        console.error('   ❌ Error creando horario:', createRes.status, errorData);
      }
    }
    
    console.log('✅ Proceso completado');
    console.log('===============================\n');
    
    alert(`✅ Horario del ${diasSemanaLista.find(d => d.value === dia)?.label} actualizado\n\n📊 Rangos creados: ${rangos.length}\n⏰ Horas activas: ${horasActivas.length}`);
    
    setModalEditarDiaAbierto(false);
    await cargarHorarios();
    
  } catch (err: any) {
    console.error('❌ Error guardando día:', err);
    alert(`❌ Error: ${err.message}`);
  } finally {
    setGuardandoDia(false);
  }
};

 const abrirModalCrear = (profesionalSinHorario?: Profesional) => {
  setModoEdicion(false);
  setHorarioSeleccionado(null);
  
  // ← NUEVO: Resetear selección de días
  setDiasSeleccionadosCreacion({
    lunes: false, martes: false, miercoles: false, jueves: false, viernes: false, sabado: false, domingo: false
  });
  
  if (profesionalSinHorario) {
    setFormData({
      profesional: profesionalSinHorario.id,
      dia_semana: 'lunes',  // ← Valor por defecto (se usará si no hay días seleccionados)
      hora_inicio: '09:00',
      hora_fin: '19:00',
      activo: true,
    });
  } else {
    setFormData({
      profesional: profesionales[0]?.id || 0,
      dia_semana: 'lunes',
      hora_inicio: '09:00',
      hora_fin: '19:00',
      activo: true,
    });
  }
  
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

  // ← NUEVO: Toggle para selección múltiple de días
const toggleDiaCreacion = (dia: string) => {
  setDiasSeleccionadosCreacion(prev => ({
    ...prev,
    [dia]: !prev[dia]
  }));
};

// ← NUEVO: Seleccionar/deseleccionar todos los días
const toggleTodosDiasCreacion = (activo: boolean) => {
  setDiasSeleccionadosCreacion({
    lunes: activo, martes: activo, miercoles: activo, 
    jueves: activo, viernes: activo, sabado: activo, domingo: activo
  });
};

  const guardarHorario = async () => {
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

  // ← NUEVO: Obtener días a crear (seleccionados o el día único del form)
  const diasAProcesar = Object.entries(diasSeleccionadosCreacion)
    .filter(([_, seleccionado]) => seleccionado)
    .map(([dia]) => dia);
  
  // Si no hay días seleccionados, usar el día del formulario (comportamiento original)
  const diasFinales = diasAProcesar.length > 0 ? diasAProcesar : [formData.dia_semana || 'lunes'];

  try {
    setGuardando(true);
    const token = localStorage.getItem('admin_token');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080/api';
    
    const bodyBase = {
      profesional: formData.profesional,
      hora_inicio: formData.hora_inicio,
      hora_fin: formData.hora_fin,
      activo: formData.activo,
    };

    // ← NUEVO: Crear un horario por cada día seleccionado
    for (const dia of diasFinales) {
      const body = { ...bodyBase, dia_semana: dia };
      
      let res: Response;
      if (modoEdicion && horarioSeleccionado && diasFinales.length === 1) {
        // Modo edición tradicional (un solo día)
        res = await fetch(`${apiUrl}/horarios/${horarioSeleccionado.id}/`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });
      } else {
        // Creación nueva (uno o múltiples días)
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
        throw new Error(`Error en ${dia}: ${errorData.detail || errorData.non_field_errors?.[0] || 'Error al guardar'}`);
      }
    }

    alert(`✅ Horario ${modoEdicion ? 'actualizado' : 'creado'} exitosamente en ${diasFinales.length} día(s)`);
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
      
      const res = await fetch(`${apiUrl}/horarios/${horario.id}/`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ activo: !horario.activo }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || `Error ${res.status}`);
      }

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

  // ← AGREGAR ESTA FUNCIÓN (antes del return del componente)
const getCorrectImageUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  
  const PRODUCTION_DOMAIN = 'https://api.dzsalon.com';
  const LOCAL_DOMAIN = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:8080';
  
  if (url.startsWith(PRODUCTION_DOMAIN)) {
    return url;
  }
  
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
      .replace('https://179.43.112.64', PRODUCTION_DOMAIN)
      .replace('http://179.43.112.64:8080', LOCAL_DOMAIN)
      .replace('http://127.0.0.1:8080', LOCAL_DOMAIN)
      .replace('http://localhost:8080', LOCAL_DOMAIN);
  }
  
  if (url.startsWith('/media/')) {
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? PRODUCTION_DOMAIN 
      : LOCAL_DOMAIN;
    return `${baseUrl}${url}`;
  }
  
  return null;
};

  // ← NUEVO: Helpers para cards
  const profesionalesActivos = profesionales.filter(p => p.activo);
  
  // Profesionales SIN horario asignado (para el botón "+")
  const profesionalesSinHorario = profesionalesActivos.filter(
    prof => !horarios.some(h => h.profesional === prof.id)
  );
  
  // Profesionales CON horario asignado (para mostrar en cards)
  const profesionalesConHorario = profesionalesActivos.filter(
    prof => horarios.some(h => h.profesional === prof.id)
  );

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
        {/* ← MODIFICADO: Solo botón "Nuevo Horario Detallado"
        <button
          onClick={() => abrirModalCrear()}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2"
          title="Crear horario detallado para un profesional"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
           Nuevo Horario Detallado
        </button> */}
      </div>

        {/* ← MODIFICADO: Sección para profesionales SIN horario (con fotos) */}
        {profesionalesSinHorario.length > 0 && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
            <h3 className="text-sm font-semibold text-yellow-800 mb-3">
              ⚠️ Profesionales sin horario configurado
            </h3>
            <div className="flex flex-wrap gap-2">
              {profesionalesSinHorario.map((prof) => (
                <button
                  key={prof.id}
                  onClick={() => abrirModalCrear(prof)}
                  className="flex items-center gap-2 px-3 py-2 bg-white border border-yellow-300 rounded-lg hover:border-yellow-500 hover:shadow transition-all text-left"
                  title="Crear horario para este profesional"
                >
                  {/* ← AGREGAR: Foto del profesional con fallback */}
                  {prof.foto_url ? (
                    <img 
                      src={getCorrectImageUrl(prof.foto_url) ?? 'data:image/svg+xml,...'} 
                      alt={prof.nombre}
                      className="w-8 h-8 rounded-full object-cover border border-gray-200"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="%239ca3af" stroke-width="2"%3E%3Ccircle cx="12" cy="8" r="4"%3E%3C/circle%3E%3Cpath d="M20 21a8 8 0 10-16 0"%3E%3C/path%3E%3C/svg%3E';
                      }}
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  )}
                  
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{prof.nombre}</p>
                    <p className="text-[10px] text-gray-500 truncate">{prof.especialidad}</p>
                  </div>
                  <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] rounded-full flex-shrink-0">
                    + Configurar
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

      {/* Vista Resumen por Profesional - SOLO CON HORARIO */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">📊 Profesionales con Horario</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {profesionalesConHorario.length === 0 ? (
            <div className="col-span-full text-center py-8 text-gray-500">
              📭 No hay profesionales con horario configurado
            </div>
          ) : (
            profesionalesConHorario.map((prof) => {
              const horariosProf = horarios.filter(h => h.profesional === prof.id && h.activo);
              const diasTrabaja: string[] = [...new Set(horariosProf.map(h => h.dia_semana))];
              
              return (
                // ← MODIFICADO: Card con imagen, días clickeables, sin botones redundantes
                <div 
                  key={prof.id} 
                  className="bg-white rounded-xl shadow-lg overflow-hidden border-l-4 border-blue-500 cursor-pointer hover:shadow-xl transition-all hover:scale-[1.02]"
                  onClick={() => abrirDetalleSemana(prof)}
                  title="Clic en la card para ver horario semanal detallado"
                >
                  {/* ← IMAGEN DEL PROFESIONAL con fallback a icono */}
                  {/* ← IMAGEN DEL PROFESIONAL - Igual que en Profesionales */}
                  <div className="relative h-32 bg-gradient-to-br from-blue-100 to-indigo-100 overflow-hidden">
                    {prof.foto_url ? (
                      <img 
                        src={getCorrectImageUrl(prof.foto_url) ?? 'data:image/svg+xml,...'} 
                        alt={prof.nombre}
                        className="absolute inset-0 w-full h-full object-cover"
                        onError={(e) => {
                          // ← Fallback con SVG inline (igual que en Profesionales)
                          (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 24 24" fill="none" stroke="%239ca3af" stroke-width="2"%3E%3Ccircle cx="12" cy="8" r="4"%3E%3C/circle%3E%3Cpath d="M20 21a8 8 0 10-16 0"%3E%3C/path%3E%3C/svg%3E';
                        }}
                        loading="lazy"
                      />
                    ) : (
                      /* ← Icono fallback cuando no hay foto_url */
                      <div className="absolute inset-0 flex items-center justify-center">
                        <svg className="w-16 h-16 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                    )}
                    
                    {/* Overlay para contraste */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    
                    {/* Info sobre la imagen */}
                    <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                      <h3 className="font-bold text-sm">{prof.nombre}</h3>
                      <p className="text-xs opacity-90">{prof.especialidad}</p>
                    </div>
                    
                    {/* Badge de días */}
                    <div className="absolute top-2 right-2">
                      <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded-full font-semibold">
                        {diasTrabaja.length} días
                      </span>
                    </div>
                  </div>
                  
                  {/* ← Días de trabajo - TODOS LOS DÍAS SON CLICKEABLES */}
                    <div className="p-3">
                      <div className="flex flex-wrap gap-1 mb-3">
                        {diasSemanaLista.map((dia) => {
                          const estaActivo = diasTrabaja.includes(dia.value as string);
                          return (
                            <button
                              key={dia.value}
                              onClick={(e) => {
                                e.stopPropagation(); // ← Evitar que abra el modal semanal
                                // ← PERMITIR CLIC en todos los días (activos e inactivos)
                                abrirModalEditarDia(prof, dia.value as string);
                              }}
                              className={`text-[10px] px-2 py-1 rounded font-medium transition-all ${
                                estaActivo
                                  ? 'bg-green-100 text-green-800 hover:bg-green-200 hover:scale-105 cursor-pointer ring-2 ring-green-300'
                                  : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:scale-105 cursor-pointer ring-1 ring-gray-200 hover:ring-gray-300'
                              }`}
                              title={`Clic para ${estaActivo ? 'editar' : 'agregar'} horario del ${dia.label}`}
                            >
                              {dia.label.slice(0, 3)}
                              {estaActivo && <span className="ml-0.5">✓</span>}
                            </button>
                          );
                        })}
                      </div>
                      
                      {/* Indicador visual */}
                      <p className="text-[10px] text-gray-400 text-center">
                        💡 Clic en cualquier día para {diasTrabaja.length > 0 ? 'editar/agregar' : 'configurar'} horarios
                      </p>
                    </div>

                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Filtros 
      <div className="bg-white rounded-xl shadow-lg p-4 lg:p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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

        <div className="mt-4 text-sm text-gray-600">
          Mostrando <strong>{horariosFiltrados.length}</strong> de <strong>{horarios.length}</strong> horarios
        </div>
      </div>*/}

      {/* Tabla de Horarios 
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
      </div>*/}

      {/* Paginación 
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
      )}*/}

      {/* Modal Crear/Editar Horario Detallado */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full">
            <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-4 rounded-t-2xl flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">
                  {modoEdicion ? '✏️ Editar Horario' : '➕ Nuevo Horario Detallado'}
                </h2>
                <p className="text-sm opacity-90">Configura la disponibilidad del profesional</p>
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

            <div className="p-6 space-y-4">
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
                    <option key={p.id} value={p.id} disabled={horarios.some(h => h.profesional === p.id && !modoEdicion)}>
                      {p.nombre} - {p.especialidad}
                      {horarios.some(h => h.profesional === p.id) && !modoEdicion ? ' (ya tiene horario)' : ''}
                    </option>
                  ))}
                </select>
                {/* ← Hint para profesionales sin horario */}
                {!modoEdicion && formData.profesional && horarios.some(h => h.profesional === formData.profesional) && (
                  <p className="text-[10px] text-yellow-600 mt-1">
                    ⚠️ Este profesional ya tiene horarios configurados. ¿Quieres editarlos en su lugar?
                  </p>
                )}
              </div>

              {/* ← NUEVO: Selector múltiple de días (solo en modo creación) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    {modoEdicion ? 'Día de la semana *' : 'Días de trabajo *'}
                  </label>
                  {!modoEdicion && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleTodosDiasCreacion(true)}
                        className="text-[10px] text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Seleccionar todos
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleTodosDiasCreacion(false)}
                        className="text-[10px] text-gray-500 hover:text-gray-700"
                      >
                        Limpiar
                      </button>
                    </div>
                  )}
                </div>
                
                {modoEdicion ? (
                  /* ← Modo edición: select tradicional (un solo día) */
                  <select
                    value={formData.dia_semana}
                    onChange={(e) => handleInputChange('dia_semana', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {diasSemanaLista.map((d) => (
                      <option key={d.value} value={d.value}>{d.label}</option>
                    ))}
                  </select>
                ) : (
                  /* ← Modo creación: checkboxes para múltiples días */
                  <div className="grid grid-cols-4 gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    {diasSemanaLista.map((dia) => (
                      <label 
                        key={dia.value}
                        className={`flex flex-col items-center gap-1 p-2 rounded-lg cursor-pointer transition-all ${
                          diasSeleccionadosCreacion[dia.value]
                            ? 'bg-blue-100 border-2 border-blue-500 text-blue-800'
                            : 'bg-white border-2 border-gray-200 hover:border-gray-300 text-gray-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={diasSeleccionadosCreacion[dia.value]}
                          onChange={() => toggleDiaCreacion(dia.value)}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <span className="text-[10px] font-medium">{dia.label.slice(0, 3)}</span>
                      </label>
                    ))}
                  </div>
                )}
                
                {/* ← Hint informativo */}
                {!modoEdicion && (
                  <p className="text-[10px] text-gray-500 mt-2">
                    💡 Selecciona uno o varios días. Todos usarán el mismo horario: {formData.hora_inicio} - {formData.hora_fin}
                  </p>
                )}
              </div>

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

              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">👁️ Vista Previa</h4>
                
                {/* ← Mostrar días seleccionados o el día único */}
                {(() => {
                  const diasAProcesar = Object.entries(diasSeleccionadosCreacion)
                    .filter(([_, seleccionado]) => seleccionado)
                    .map(([dia]) => diasSemanaLista.find(d => d.value === dia)?.label);
                  
                  const diasDisplay = diasAProcesar.length > 0 
                    ? diasAProcesar.join(', ') 
                    : diasSemanaLista.find(d => d.value === formData.dia_semana)?.label;
                  
                  return (
                    <p className="text-sm text-gray-900">
                      <strong>{profesionales.find(p => p.id === formData.profesional)?.nombre || 'Profesional'}</strong>
                      {' '}trabaja los{' '}
                      <strong className="text-blue-600">{diasDisplay}</strong>
                      {' '}de{' '}
                      <strong className="font-mono">{formData.hora_inicio}</strong> a{' '}
                      <strong className="font-mono">{formData.hora_fin}</strong>
                    </p>
                  );
                })()}
                
                {/* ← Contador de días */}
                {!modoEdicion && Object.values(diasSeleccionadosCreacion).some(d => d) && (
                  <p className="text-[10px] text-green-600 mt-2">
                    ✅ Se crearán {Object.values(diasSeleccionadosCreacion).filter(d => d).length} registros de horario
                  </p>
                )}
              </div>
            </div>

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

      {/* Modal Editar Día (24 horas con toggle) */}
      {modalEditarDiaAbierto && diaEditar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-2">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[95vh] flex flex-col">
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-3 rounded-t-xl flex items-center justify-between flex-shrink-0">
              <div>
                <h2 className="text-lg font-bold">✏️ Editar Horario - {diasSemanaLista.find(d => d.value === diaEditar.dia)?.label}</h2>
                <p className="text-xs opacity-90">{diaEditar.profesional.nombre}</p>
              </div>
              <button
                onClick={() => setModalEditarDiaAbierto(false)}
                className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Toggle día activo/inactivo */}
            <div className="px-4 py-3 bg-gray-50 border-b flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Estado del día:</span>
              <button
                onClick={() => setDiaActivo(!diaActivo)}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                  diaActivo 
                    ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                }`}
              >
                {diaActivo ? '✅ Día Activo' : '⏸️ Día Inactivo'}
              </button>
            </div>

            {/* Grid de 24 horas - AHORA SIEMPRE CLICKEABLES */}
              <div className="p-4 overflow-y-auto flex-1">
                <p className="text-xs text-gray-500 mb-3">
                  💡 Haz clic en las horas para activar/desactivar
                  {!diaActivo && (
                    <span className="text-yellow-600 font-semibold ml-1">
                      • Al activar una hora, el día se activará automáticamente
                    </span>
                  )}
                </p>
                
                <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-12 gap-2">
                  {horasDia24.map((hora) => {
                    const estaActiva = horasSeleccionadas[hora];
                    return (
                      <button
                        key={hora}
                        onClick={() => {
                          toggleHora(hora);
                          // ← AUTOMÁTICAMENTE activar el día si se activa una hora
                          if (!horasSeleccionadas[hora] && !diaActivo) {
                            setDiaActivo(true);
                          }
                        }}
                        // ← REMOVIDO: disabled={!diaActivo} - ahora siempre se puede hacer clic
                        className={`p-2 rounded-lg text-xs font-medium transition-all ${
                          estaActiva
                            ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md scale-105'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:scale-105'
                        }`}
                        title={`${hora} - ${estaActiva ? 'Disponible' : 'No disponible'}`}
                      >
                        {hora}
                      </button>
                    );
                  })}
                </div>
                
                {/* Leyenda */}
                <div className="flex items-center gap-4 mt-4 text-xs text-gray-600">
                  <div className="flex items-center gap-1">
                    <span className="w-4 h-4 rounded bg-blue-600"></span>
                    <span>Activa</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-4 h-4 rounded bg-gray-100 border border-gray-300"></span>
                    <span>Inactiva</span>
                  </div>
                  {!diaActivo && Object.values(horasSeleccionadas).some(h => h) && (
                    <div className="flex items-center gap-1 text-yellow-600 ml-auto">
                      <span className="text-lg">⚠️</span>
                      <span className="font-semibold">Activa el día para guardar</span>
                    </div>
                  )}
                </div>
              </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-gray-50 px-4 py-3 border-t rounded-b-xl flex gap-2 flex-shrink-0">
              <button
                onClick={() => setModalEditarDiaAbierto(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300"
              >
                Cancelar
              </button>
              <button
                onClick={guardarCambiosDia}
                disabled={guardandoDia}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {guardandoDia ? 'Guardando...' : '💾 Guardar Cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Detalle Semanal de Profesional */}
      {modalSemanaAbierto && profesionalSemana && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full my-8">
            <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-4 rounded-t-2xl flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">📅 Horario Semanal</h2>
                <p className="text-sm opacity-90">{profesionalSemana.nombre} - {profesionalSemana.especialidad}</p>
              </div>
              <button
                onClick={() => setModalSemanaAbierto(false)}
                className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
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
                  {new Date(getInicioSemana(semanaActual).getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
                <button onClick={irAHoy} className="text-xs text-indigo-600 hover:underline mt-1">Ir a hoy</button>
              </div>
              <button
                onClick={() => irASemana('siguiente')}
                className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-2"
              >
                Semana siguiente →
              </button>
            </div>
            
            <div className="p-6 max-h-[70vh] overflow-y-auto">
              {cargandoSemana ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent"></div>
                  <span className="ml-3 text-gray-600">Cargando citas...</span>
                </div>
              ) : errorSemana ? (
                <div className="text-center py-8 text-red-600">❌ {errorSemana}</div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
                  {diasSemana.map((dia) => (
                    <div 
                      key={dia.fecha} 
                      className={`border rounded-xl p-3 ${
                        dia.esHoy ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 bg-white'
                      }`}
                    >
                      <div className={`text-center pb-2 border-b ${dia.esHoy ? 'border-indigo-200' : 'border-gray-100'}`}>
                        <p className={`font-semibold ${dia.esHoy ? 'text-indigo-700' : 'text-gray-900'}`}>
                          {dia.diaNombre}
                        </p>
                        {dia.esHoy && <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">Hoy</span>}
                        <p className="text-xs text-gray-500 mt-1">{dia.citas.length} cita{dia.citas.length !== 1 ? 's' : ''}</p>
                      </div>
                      <div className="space-y-2 mt-3 max-h-96 overflow-y-auto">
                        {Array.from({ length: 12 }, (_, i) => `${(i + 9).toString().padStart(2, '0')}:00`).map((hora) => {
                          const citaEnHora = dia.citas.find(c => c.hora_inicio.startsWith(hora));
                          return (
                            <div key={hora} className="min-h-[60px]">
                              {citaEnHora ? (
                                <div className={`p-2 rounded-lg text-xs border-l-4 cursor-pointer hover:shadow transition-shadow ${
                                  citaEnHora.estado === 'cancelada' ? 'bg-red-50 border-red-400 text-red-800' :
                                  citaEnHora.estado === 'confirmada' ? 'bg-green-50 border-green-400 text-green-800' :
                                  citaEnHora.estado === 'completada' ? 'bg-gray-100 border-gray-400 text-gray-700' :
                                  'bg-yellow-50 border-yellow-400 text-yellow-800'
                                }`}>
                                  <p className="font-semibold truncate">{citaEnHora.cliente_nombre}</p>
                                  <p className="truncate text-gray-600">{citaEnHora.servicio_nombre}</p>
                                </div>
                              ) : (
                                <div className="p-2 text-gray-300 text-xs border border-dashed border-gray-200 rounded">{hora}</div>
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
            
            <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t border-gray-200 rounded-b-2xl flex justify-end">
              <button onClick={() => setModalSemanaAbierto(false)} className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}