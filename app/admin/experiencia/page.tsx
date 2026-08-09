// app/admin/experiencia/page.tsx
'use client';
import { useEffect, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080/api';

// ==========================================
// INTERFACES
// ==========================================
interface Registro {
  id: number;
  calificacion: number;
  nombre: string;
  telefono: string;
  email: string;
  servicio: string;
  profesional: string;
  fecha_servicio: string | null;
  que_ocurrio: string;
  como_mejorar: string;
  estado_gestion: string;
  notas_internas: string;
  respuesta_cliente: string;
  fecha_respuesta: string | null;
  creado: string;
}

interface Estadisticas {
  total: number;
  promedio: number;
  distribucion: Record<string, number>;
  positivas: number;
  pqrs: number;
  top_servicios: { servicio: string; total: number }[];
  top_profesionales: { profesional: string; total: number }[];
}

// ==========================================
// HELPERS
// ==========================================
function getAuthHeaders(): HeadersInit {
  const token = typeof window !== 'undefined'
    ? (localStorage.getItem('admin_token') || localStorage.getItem('token'))
    : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function jsonHeaders(): HeadersInit {
  return { ...getAuthHeaders(), 'Content-Type': 'application/json' };
}

const hoyISO = () => new Date().toISOString().slice(0, 10);
const inicioMesISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
};

const ESTADO_LABEL: Record<string, string> = {
  pendiente: '⏳ Pendiente',
  en_proceso: '🔄 En proceso',
  resuelta: '✅ Resuelta',
};

const ESTADO_COLOR: Record<string, string> = {
  pendiente: 'bg-red-100 text-red-700',
  en_proceso: 'bg-yellow-100 text-yellow-700',
  resuelta: 'bg-green-100 text-green-700',
};

// ==========================================
// PÁGINA PRINCIPAL
// ==========================================
export default function AdminExperienciaPage() {
  const [tab, setTab] = useState<'stats' | 'pqrs' | 'config'>('stats');

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">⭐ Experiencia del Cliente</h1>
        <p className="text-sm text-gray-500 mb-6">
          Gestión de valoraciones, PQRs y configuración de la página /experiencia
        </p>

        {/* ← Tabs ← */}
        <div className="flex gap-2 mb-6 border-b border-gray-200 pb-px">
          {([
            ['stats', '📊 Calificaciones'],
            ['pqrs', '🚨 PQRs'],
            ['config', '🖼️ Fondos y Config'],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-2.5 text-sm font-semibold rounded-t-lg transition-colors ${
                tab === key
                  ? 'bg-[#0d0d0d] text-[#C6A15B]'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'stats' && <StatsTab />}
        {tab === 'pqrs' && <PQRSTab />}
        {tab === 'config' && <ConfigTab />}
      </div>
    </div>
  );
}

// ==========================================
// TAB 1: ESTADÍSTICAS (gráfico por periodo)
// ==========================================
function StatsTab() {
  const [fechaInicio, setFechaInicio] = useState(inicioMesISO());
  const [fechaFin, setFechaFin] = useState(hoyISO());
  const [stats, setStats] = useState<Estadisticas | null>(null);
  const [cargando, setCargando] = useState(false);

  async function consultar() {
    setCargando(true);
    try {
      const res = await fetch(
        `${API_URL}/experiencia/registros/estadisticas/?fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`,
        { headers: getAuthHeaders() }
      );
      if (res.ok) setStats(await res.json());
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => { consultar(); }, []);

  const dist = stats?.distribucion || {};
  const getCount = (i: number) => dist[i] ?? dist[String(i)] ?? 0;
  const max = Math.max(1, ...[1, 2, 3, 4, 5].map(getCount));

  return (
    <div>
      {/* ← Filtro de periodo ← */}
      <div className="bg-white rounded-xl shadow p-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Desde</label>
          <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)}
            className="border border-gray-200 rounded-md px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Hasta</label>
          <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)}
            className="border border-gray-200 rounded-md px-3 py-2 text-sm" />
        </div>
        <button onClick={consultar}
          className="px-5 py-2 bg-[#0d0d0d] text-[#C6A15B] text-sm font-semibold rounded-md hover:bg-black">
          {cargando ? 'Consultando...' : 'Consultar'}
        </button>
      </div>

      {stats && (
        <>
          {/* ← Tarjetas resumen ← */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-white rounded-xl shadow p-4 text-center">
              <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
              <div className="text-xs text-gray-500 mt-1">Total calificaciones</div>
            </div>
            <div className="bg-white rounded-xl shadow p-4 text-center">
              <div className="text-3xl font-bold text-[#C6A15B]">{stats.promedio} ★</div>
              <div className="text-xs text-gray-500 mt-1">Promedio</div>
            </div>
            <div className="bg-white rounded-xl shadow p-4 text-center">
              <div className="text-3xl font-bold text-green-600">{stats.positivas}</div>
              <div className="text-xs text-gray-500 mt-1">Positivas (4-5 ★) → Google/Tripadvisor</div>
            </div>
            <div className="bg-white rounded-xl shadow p-4 text-center">
              <div className="text-3xl font-bold text-red-600">{stats.pqrs}</div>
              <div className="text-xs text-gray-500 mt-1">PQRs (1-3 ★)</div>
            </div>
          </div>

          {/* ← Gráfico de barras (distribución de estrellas) ← */}
          <div className="bg-white rounded-xl shadow p-6 mt-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Distribución de calificaciones</h3>
            <div className="flex items-end justify-center gap-6 md:gap-10 h-44">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex flex-col items-center justify-end h-full w-14">
                  <span className="text-sm font-bold text-gray-700 mb-1">{getCount(i)}</span>
                  <div
                    className={`w-full rounded-t ${i <= 3 ? 'bg-red-400' : 'bg-[#C6A15B]'}`}
                    style={{ height: `${(getCount(i) / max) * 130}px` }}
                  />
                  <span className="text-xs text-gray-500 mt-2">{i} ★</span>
                </div>
              ))}
            </div>
          </div>

          {/* ← Tops ← */}
          <div className="grid md:grid-cols-2 gap-4 mt-6">
            <div className="bg-white rounded-xl shadow p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Top servicios mencionados</h3>
              {stats.top_servicios.length === 0 && <p className="text-xs text-gray-400">Sin datos en el periodo</p>}
              <ul className="space-y-2">
                {stats.top_servicios.map((s) => (
                  <li key={s.servicio} className="flex justify-between text-sm">
                    <span className="text-gray-700">{s.servicio}</span>
                    <span className="font-semibold text-[#C6A15B]">{s.total}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-white rounded-xl shadow p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Top profesionales mencionados</h3>
              {stats.top_profesionales.length === 0 && <p className="text-xs text-gray-400">Sin datos en el periodo</p>}
              <ul className="space-y-2">
                {stats.top_profesionales.map((p) => (
                  <li key={p.profesional} className="flex justify-between text-sm">
                    <span className="text-gray-700">{p.profesional}</span>
                    <span className="font-semibold text-[#C6A15B]">{p.total}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ==========================================
// TAB 2: PQRs (ver respuestas + contactar cliente)
// ==========================================
function PQRSTab() {
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [estado, setEstado] = useState('');
  const [search, setSearch] = useState('');
  const [fechaInicio, setFechaInicio] = useState(inicioMesISO());
  const [fechaFin, setFechaFin] = useState(hoyISO());
  const [expandido, setExpandido] = useState<number | null>(null);
  const [cargando, setCargando] = useState(false);

  async function cargar() {
    setCargando(true);
    const params = new URLSearchParams({ tipo: 'pqr', ordering: '-creado' });
    if (estado) params.append('estado_gestion', estado);
    if (search) params.append('search', search);
    if (fechaInicio) params.append('fecha_inicio', fechaInicio);
    if (fechaFin) params.append('fecha_fin', fechaFin);
    try {
      const res = await fetch(`${API_URL}/experiencia/registros/?${params}`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setRegistros(data.results || data);
      }
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => { cargar(); }, []);

  return (
    <div>
      {/* ← Filtros ← */}
      <div className="bg-white rounded-xl shadow p-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Desde</label>
          <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)}
            className="border border-gray-200 rounded-md px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Hasta</label>
          <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)}
            className="border border-gray-200 rounded-md px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Estado</label>
          <select value={estado} onChange={(e) => setEstado(e.target.value)}
            className="border border-gray-200 rounded-md px-3 py-2 text-sm">
            <option value="">Todos</option>
            <option value="pendiente">⏳ Pendiente</option>
            <option value="en_proceso">🔄 En proceso</option>
            <option value="resuelta">✅ Resuelta</option>
          </select>
        </div>
        <div className="flex-1 min-w-[160px]">
          <label className="block text-xs text-gray-500 mb-1">Buscar</label>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nombre, email, teléfono..."
            className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm" />
        </div>
        <button onClick={cargar}
          className="px-5 py-2 bg-[#0d0d0d] text-[#C6A15B] text-sm font-semibold rounded-md hover:bg-black">
          {cargando ? 'Cargando...' : 'Filtrar'}
        </button>
      </div>

      {/* ← Lista de PQRs ← */}
      <div className="space-y-3 mt-6">
        {registros.length === 0 && (
          <div className="bg-white rounded-xl shadow p-10 text-center text-gray-400 text-sm">
            No hay PQRs para los filtros seleccionados 🎉
          </div>
        )}
        {registros.map((r) => (
          <div key={r.id} className="bg-white rounded-xl shadow overflow-hidden">
            {/* Row resumen */}
            <button
              onClick={() => setExpandido(expandido === r.id ? null : r.id)}
              className="w-full flex flex-wrap items-center gap-3 p-4 text-left hover:bg-gray-50"
            >
              <span className="text-[#C6A15B] font-bold whitespace-nowrap">
                {'★'.repeat(r.calificacion)}{'☆'.repeat(5 - r.calificacion)}
              </span>
              <span className="font-semibold text-gray-900">{r.nombre}</span>
              <span className="text-xs text-gray-500">{r.servicio}</span>
              <span className="text-xs text-gray-400 ml-auto">
                {new Date(r.creado).toLocaleDateString('es-CO')}
              </span>
              <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${ESTADO_COLOR[r.estado_gestion]}`}>
                {ESTADO_LABEL[r.estado_gestion] || r.estado_gestion}
              </span>
              <span className="text-gray-400 text-sm">{expandido === r.id ? '▲' : '▼'}</span>
            </button>

            {/* Detalle + gestión */}
            {expandido === r.id && (
              <GestionPQR registro={r} onActualizado={(nuevo) =>
                setRegistros((prev) => prev.map((x) => (x.id === nuevo.id ? nuevo : x))
              )} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ==========================================
// DETALLE DE PQR + RESPUESTA AL CLIENTE
// ==========================================
function GestionPQR({ registro, onActualizado }: { registro: Registro; onActualizado: (r: Registro) => void }) {
  const [asunto, setAsunto] = useState('Respuesta a tu PQR - DZ Salón');
  const [mensaje, setMensaje] = useState('');
  const [estadoGestion, setEstadoGestion] = useState(registro.estado_gestion);
  const [enviando, setEnviando] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function cambiarEstado() {
    const res = await fetch(`${API_URL}/experiencia/registros/${registro.id}/`, {
      method: 'PATCH',
      headers: jsonHeaders(),
      body: JSON.stringify({ estado_gestion: estadoGestion }),
    });
    if (res.ok) {
      onActualizado(await res.json());
      setMsg('✅ Estado actualizado');
    }
  }

  async function enviarRespuesta() {
    if (!mensaje.trim()) { setMsg('❌ Escribe el mensaje para el cliente'); return; }
    setEnviando(true);
    setMsg(null);
    const res = await fetch(`${API_URL}/experiencia/registros/${registro.id}/responder/`, {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify({ asunto, mensaje, estado_gestion: estadoGestion }),
    });
    const data = await res.json();
    setEnviando(false);
    if (res.ok) {
      setMsg('✅ Respuesta enviada al cliente por correo');
      setMensaje('');
      onActualizado(data.registro);
    } else {
      setMsg('❌ ' + (data.error || 'Error al enviar la respuesta'));
    }
  }

  return (
    <div className="border-t border-gray-100 p-5 grid md:grid-cols-2 gap-6">
      {/* ← Datos del formulario ← */}
      <div className="text-sm space-y-2">
        <h4 className="font-semibold text-gray-800 mb-2">📋 Datos de la PQR</h4>
        <p><span className="text-gray-500">Cliente:</span> <b>{registro.nombre}</b></p>
        <p><span className="text-gray-500">Teléfono:</span> {registro.telefono}</p>
        <p><span className="text-gray-500">Email:</span> {registro.email}</p>
        <p><span className="text-gray-500">Servicio:</span> {registro.servicio}</p>
        <p><span className="text-gray-500">Profesional:</span> {registro.profesional || 'No indicado'}</p>
        <p><span className="text-gray-500">Fecha servicio:</span> {registro.fecha_servicio || 'No indicada'}</p>
        <div className="bg-red-50 border-l-4 border-red-400 p-3 mt-2">
          <p className="text-gray-500 text-xs mb-1">¿Qué ocurrió?</p>
          <p className="text-gray-800">{registro.que_ocurrio}</p>
        </div>
        {registro.como_mejorar && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3">
            <p className="text-gray-500 text-xs mb-1">¿Cómo podemos mejorar?</p>
            <p className="text-gray-800">{registro.como_mejorar}</p>
          </div>
        )}
        {registro.respuesta_cliente && (
          <div className="bg-green-50 border-l-4 border-green-400 p-3">
            <p className="text-gray-500 text-xs mb-1">
              ✅ Última respuesta enviada {registro.fecha_respuesta ? new Date(registro.fecha_respuesta).toLocaleString('es-CO') : ''}
            </p>
            <p className="text-gray-800 whitespace-pre-line">{registro.respuesta_cliente}</p>
          </div>
        )}
        <a href={`mailto:${registro.email}?subject=${encodeURIComponent(asunto)}`}
          className="inline-block text-xs text-blue-600 hover:underline mt-1">
          ✉️ Abrir en tu cliente de correo (mailto)
        </a>
      </div>

      {/* ← Gestión y respuesta ← */}
      <div className="text-sm space-y-3">
        <h4 className="font-semibold text-gray-800">💬 Gestionar y responder</h4>

        <div className="flex items-center gap-2">
          <select value={estadoGestion} onChange={(e) => setEstadoGestion(e.target.value)}
            className="flex-1 border border-gray-200 rounded-md px-3 py-2 text-sm">
            <option value="pendiente">⏳ Pendiente</option>
            <option value="en_proceso">🔄 En proceso</option>
            <option value="resuelta">✅ Resuelta</option>
          </select>
          <button onClick={cambiarEstado}
            className="px-4 py-2 bg-gray-800 text-white text-sm rounded-md hover:bg-gray-900">
            Guardar estado
          </button>
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Asunto del email</label>
          <input value={asunto} onChange={(e) => setAsunto(e.target.value)}
            className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Mensaje para {registro.nombre}</label>
          <textarea rows={5} value={mensaje} onChange={(e) => setMensaje(e.target.value)}
            placeholder="Escribe la respuesta que recibirá el cliente en su correo..."
            className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#C6A15B]" />
        </div>
        <button onClick={enviarRespuesta} disabled={enviando}
          className="w-full py-2.5 bg-[#C6A15B] text-white text-sm font-bold rounded-md hover:bg-[#A9853D] disabled:opacity-60">
          {enviando ? 'Enviando...' : '📨 Enviar respuesta al cliente'}
        </button>
        {msg && <p className="text-xs text-center text-gray-600">{msg}</p>}
      </div>
    </div>
  );
}

// ==========================================
// TAB 3: CONFIGURACIÓN (fondos + URLs)
// ==========================================
function ConfigTab() {
  const [config, setConfig] = useState<any>(null);
  const [fileDesktop, setFileDesktop] = useState<File | null>(null);
  const [fileMobile, setFileMobile] = useState<File | null>(null);
  const [previewDesktop, setPreviewDesktop] = useState<string | null>(null);
  const [previewMobile, setPreviewMobile] = useState<string | null>(null);
  const [form, setForm] = useState({ url_google: '', url_tripadvisor: '', email_notificaciones: '' });
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch(`${API_URL}/experiencia/config/`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
        setForm({
          url_google: data.url_google || '',
          url_tripadvisor: data.url_tripadvisor || '',
          email_notificaciones: data.email_notificaciones || '',
        });
      }
    })();
  }, []);

  async function guardar() {
    setGuardando(true);
    setMsg(null);
    const fd = new FormData();
    fd.append('url_google', form.url_google);
    fd.append('url_tripadvisor', form.url_tripadvisor);
    fd.append('email_notificaciones', form.email_notificaciones);
    if (fileDesktop) fd.append('imagen_fondo_desktop', fileDesktop);
    if (fileMobile) fd.append('imagen_fondo_mobile', fileMobile);

    const res = await fetch(`${API_URL}/experiencia/config/`, {
      method: 'PATCH',
      headers: getAuthHeaders(), // ← sin Content-Type (FormData)
      body: fd,
    });
    setGuardando(false);
    if (res.ok) {
      const data = await res.json();
      setConfig(data);
      setFileDesktop(null); setFileMobile(null);
      setPreviewDesktop(null); setPreviewMobile(null);
      setMsg('✅ Configuración guardada correctamente');
    } else {
      setMsg('❌ Error al guardar la configuración');
    }
  }

  return (
    <div className="bg-white rounded-xl shadow p-6 max-w-3xl">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">🖼️ Imágenes de fondo de /experiencia</h3>

      <div className="grid md:grid-cols-2 gap-6">
        {/* ← Fondo desktop ← */}
        <div>
          <label className="block text-xs text-gray-500 mb-2">Fondo Desktop (1920×1080)</label>
          <div className="h-40 rounded-lg border border-gray-200 bg-gray-50 bg-cover bg-center mb-2"
            style={{ backgroundImage: `url(${previewDesktop || config?.fondo_desktop_url || ''})` }} />
          <input type="file" accept="image/*"
            onChange={(e) => {
              const f = e.target.files?.[0] || null;
              setFileDesktop(f);
              if (f) setPreviewDesktop(URL.createObjectURL(f));
            }}
            className="text-xs w-full" />
        </div>

        {/* ← Fondo mobile ← */}
        <div>
          <label className="block text-xs text-gray-500 mb-2">Fondo Mobile (1080×1920)</label>
          <div className="h-40 rounded-lg border border-gray-200 bg-gray-50 bg-cover bg-center mb-2"
            style={{ backgroundImage: `url(${previewMobile || config?.fondo_mobile_url || ''})` }} />
          <input type="file" accept="image/*"
            onChange={(e) => {
              const f = e.target.files?.[0] || null;
              setFileMobile(f);
              if (f) setPreviewMobile(URL.createObjectURL(f));
            }}
            className="text-xs w-full" />
        </div>
      </div>

      <h3 className="text-sm font-semibold text-gray-700 mt-8 mb-4">🔗 URLs y notificaciones</h3>
      <div className="space-y-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">URL para calificar en Google</label>
          <input value={form.url_google} onChange={(e) => setForm({ ...form, url_google: e.target.value })}
            className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">URL para calificar en Tripadvisor</label>
          <input value={form.url_tripadvisor} onChange={(e) => setForm({ ...form, url_tripadvisor: e.target.value })}
            className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Email que recibe PQRs y valoraciones</label>
          <input value={form.email_notificaciones} onChange={(e) => setForm({ ...form, email_notificaciones: e.target.value })}
            className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm" />
        </div>
      </div>

      <button onClick={guardar} disabled={guardando}
        className="mt-6 px-6 py-2.5 bg-[#C6A15B] text-white text-sm font-bold rounded-md hover:bg-[#A9853D] disabled:opacity-60">
        {guardando ? 'Guardando...' : '💾 Guardar configuración'}
      </button>
      {msg && <p className="text-sm text-gray-600 mt-3">{msg}</p>}
    </div>
  );
}