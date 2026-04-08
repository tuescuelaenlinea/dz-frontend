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

  // Días de la semana
  const diasSemana = [
    { value: 'lunes', label: 'Lunes' },
    { value: 'martes', label: 'Martes' },
    { value: 'miercoles', label: 'Miércoles' },
    { value: 'jueves', label: 'Jueves' },
    { value: 'viernes', label: 'Viernes' },
    { value: 'sabado', label: 'Sábado' },
    { value: 'domingo', label: 'Domingo' },
  ];

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
      
      const res = await fetch(`${apiUrl}/horarios/?ordering=profesional__nombre,dia_semana`, {
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
        throw new Error('Error al cargar horarios');
      }

      const data = await res.json();
      const horariosList = Array.isArray(data) ? data : (data.results || []);
      setHorarios(horariosList);
    } catch (err: any) {
      console.error('Error cargando horarios:', err);
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
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080/api';
      
      const res = await fetch(`${apiUrl}/horarios/${horario.id}/`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ activo: !horario.activo }),
      });

      if (res.ok) {
        cargarHorarios();
      }
    } catch (err) {
      console.error('Error actualizando estado:', err);
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
              <div key={prof.id} className="bg-white rounded-xl shadow-lg p-4 border-l-4 border-blue-500">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">{prof.nombre}</h3>
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                    {diasTrabaja.length} días
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-3">{prof.especialidad}</p>
                <div className="flex flex-wrap gap-1">
                  {diasSemana.map((dia) => (
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
              {diasSemana.map((d) => (
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
                  {diasSemana.map((d) => (
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
                  <strong>{diasSemana.find(d => d.value === formData.dia_semana)?.label}</strong>
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
    </div>
  );
}