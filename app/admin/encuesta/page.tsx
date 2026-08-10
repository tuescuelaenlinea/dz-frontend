// app/admin/encuesta/page.tsx
'use client';
import { useEffect, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080/api';

// ==========================================
// INTERFACES
// ==========================================
interface ConfigEncuesta {
  titulo: string; subtitulo: string; texto_comentario: string; activo: boolean;
  encabezado_url_full: string | null; pie_url_full: string | null;
}
interface Pregunta { id: number; texto: string; tipo: string; orden: number; activo: boolean; }
interface Servicio { id: number; nombre: string; icono: string; orden: number; activo: boolean; permite_texto: boolean; }
interface TabPregunta { pregunta_id: number; texto: string; si: number; no: number; sin_responder: number; pct_si: number; }
interface Stats {
  total: number; pct_si_global: number;
  tabulacion_preguntas: TabPregunta[];
  distribucion_servicios: { servicio: string; total: number }[];
  comentarios: { id: number; comentario: string; servicio: string; creado: string }[];
}

function getAuthHeaders(): HeadersInit {
  const token = typeof window !== 'undefined'
    ? (localStorage.getItem('admin_token') || localStorage.getItem('token')) : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}
const jsonHeaders = (): HeadersInit => ({ ...getAuthHeaders(), 'Content-Type': 'application/json' });
const hoyISO = () => new Date().toISOString().slice(0, 10);
const inicioMesISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`; };

export default function AdminEncuestaPage() {
  const [tab, setTab] = useState<'config' | 'tabulacion'>('config');
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">📋 Encuesta de Satisfacción</h1>
        <p className="text-sm text-gray-500 mb-6">Configuración de la encuesta pública /encuesta y tabulación de respuestas</p>

        <div className="flex gap-2 mb-6 border-b border-gray-200 pb-px">
          {([['config', '⚙️ Configuración'], ['tabulacion', '📊 Tabulación']] as const).map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`px-4 py-2.5 text-sm font-semibold rounded-t-lg transition-colors ${
                tab === key ? 'bg-[#0d0d0d] text-[#C6A15B]' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {label}
            </button>
          ))}
        </div>

        {tab === 'config' && <ConfigTab />}
        {tab === 'tabulacion' && <TabulacionTab />}
      </div>
    </div>
  );
}

// ==========================================
// TAB 1: CONFIGURACIÓN
// ==========================================
function ConfigTab() {
  const [config, setConfig] = useState<ConfigEncuesta | null>(null);
  const [form, setForm] = useState({ titulo: '', subtitulo: '', texto_comentario: '' });
  const [activo, setActivo] = useState(true);
  const [fileEnc, setFileEnc] = useState<File | null>(null);
  const [filePie, setFilePie] = useState<File | null>(null);
  const [prevEnc, setPrevEnc] = useState<string | null>(null);
  const [prevPie, setPrevPie] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [preguntas, setPreguntas] = useState<Pregunta[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [nuevaPregunta, setNuevaPregunta] = useState('');
  const [nuevoServicio, setNuevoServicio] = useState('');

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    const [c, p, s] = await Promise.all([
      fetch(`${API_URL}/encuesta/config/`, { headers: getAuthHeaders() }).then(r => r.json()),
      fetch(`${API_URL}/encuesta/preguntas/`, { headers: getAuthHeaders() }).then(r => r.json()),
      fetch(`${API_URL}/encuesta/servicios/`, { headers: getAuthHeaders() }).then(r => r.json()),
    ]);
    setConfig(c);
    setForm({ titulo: c.titulo || '', subtitulo: c.subtitulo || '', texto_comentario: c.texto_comentario || '' });
    setActivo(c.activo);
    setPreguntas(p.results || p);
    setServicios(s.results || s);
  }

  async function guardarConfig() {
    setGuardando(true); setMsg(null);
    const fd = new FormData();
    fd.append('titulo', form.titulo);
    fd.append('subtitulo', form.subtitulo);
    fd.append('texto_comentario', form.texto_comentario);
    fd.append('activo', String(activo));
    if (fileEnc) fd.append('encabezado', fileEnc);
    if (filePie) fd.append('pie', filePie);
    const res = await fetch(`${API_URL}/encuesta/config/`, { method: 'PATCH', headers: getAuthHeaders(), body: fd });
    setGuardando(false);
    if (res.ok) {
      const data = await res.json();
      setConfig(data); setFileEnc(null); setFilePie(null); setPrevEnc(null); setPrevPie(null);
      setMsg('✅ Configuración guardada');
    } else setMsg('❌ Error al guardar la configuración');
  }

  // ← CRUD preguntas
  async function addPregunta() {
    if (!nuevaPregunta.trim()) return;
    const res = await fetch(`${API_URL}/encuesta/preguntas/`, { method: 'POST', headers: jsonHeaders(), body: JSON.stringify({ texto: nuevaPregunta.trim() }) });
    if (res.ok) { setNuevaPregunta(''); cargar(); }
  }
  async function patchPregunta(id: number, data: Partial<Pregunta>) {
    await fetch(`${API_URL}/encuesta/preguntas/${id}/`, { method: 'PATCH', headers: jsonHeaders(), body: JSON.stringify(data) });
    cargar();
  }
  async function delPregunta(id: number) {
    if (!confirm('¿Eliminar esta pregunta?')) return;
    await fetch(`${API_URL}/encuesta/preguntas/${id}/`, { method: 'DELETE', headers: getAuthHeaders() });
    cargar();
  }
  async function moverPregunta(idx: number, dir: -1 | 1) {
    const arr = [...preguntas]; const other = arr[idx + dir];
    if (!other) return;
    const a = arr[idx]; arr[idx] = other; arr[idx + dir] = a;
    setPreguntas(arr);
    await Promise.all([
      fetch(`${API_URL}/encuesta/preguntas/${a.id}/`, { method: 'PATCH', headers: jsonHeaders(), body: JSON.stringify({ orden: other.orden }) }),
      fetch(`${API_URL}/encuesta/preguntas/${other.id}/`, { method: 'PATCH', headers: jsonHeaders(), body: JSON.stringify({ orden: a.orden }) }),
    ]);
  }

  // ← CRUD servicios
  async function addServicio() {
    if (!nuevoServicio.trim()) return;
    const res = await fetch(`${API_URL}/encuesta/servicios/`, { method: 'POST', headers: jsonHeaders(), body: JSON.stringify({ nombre: nuevoServicio.trim() }) });
    if (res.ok) { setNuevoServicio(''); cargar(); }
  }
  async function patchServicio(id: number, data: Partial<Servicio>) {
    await fetch(`${API_URL}/encuesta/servicios/${id}/`, { method: 'PATCH', headers: jsonHeaders(), body: JSON.stringify(data) });
    cargar();
  }
  async function delServicio(id: number) {
    if (!confirm('¿Eliminar este servicio?')) return;
    await fetch(`${API_URL}/encuesta/servicios/${id}/`, { method: 'DELETE', headers: getAuthHeaders() });
    cargar();
  }
  async function moverServicio(idx: number, dir: -1 | 1) {
    const arr = [...servicios]; const other = arr[idx + dir];
    if (!other) return;
    const a = arr[idx]; arr[idx] = other; arr[idx + dir] = a;
    setServicios(arr);
    await Promise.all([
      fetch(`${API_URL}/encuesta/servicios/${a.id}/`, { method: 'PATCH', headers: jsonHeaders(), body: JSON.stringify({ orden: other.orden }) }),
      fetch(`${API_URL}/encuesta/servicios/${other.id}/`, { method: 'PATCH', headers: jsonHeaders(), body: JSON.stringify({ orden: a.orden }) }),
    ]);
  }

  return (
    <div className="space-y-6">
      {/* ← Encabezado / pie / textos */}
      <div className="bg-white rounded-xl shadow p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">🖼️ Encabezado, pie y textos</h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs text-gray-500 mb-2">Encabezado (imagen superior)</label>
            <div className="h-32 rounded-lg border border-gray-200 bg-gray-50 bg-cover bg-center mb-2"
              style={{ backgroundImage: `url(${prevEnc || config?.encabezado_url_full || ''})` }} />
            <input type="file" accept="image/*" className="text-xs w-full"
              onChange={(e) => { const f = e.target.files?.[0] || null; setFileEnc(f); if (f) setPrevEnc(URL.createObjectURL(f)); }} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-2">Pie (imagen inferior)</label>
            <div className="h-32 rounded-lg border border-gray-200 bg-gray-50 bg-cover bg-center mb-2"
              style={{ backgroundImage: `url(${prevPie || config?.pie_url_full || ''})` }} />
            <input type="file" accept="image/*" className="text-xs w-full"
              onChange={(e) => { const f = e.target.files?.[0] || null; setFilePie(f); if (f) setPrevPie(URL.createObjectURL(f)); }} />
          </div>
        </div>
        <div className="grid md:grid-cols-3 gap-3 mt-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Título</label>
            <input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })}
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Subtítulo</label>
            <input value={form.subtitulo} onChange={(e) => setForm({ ...form, subtitulo: e.target.value })}
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Texto sección comentario</label>
            <input value={form.texto_comentario} onChange={(e) => setForm({ ...form, texto_comentario: e.target.value })}
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm" />
          </div>
        </div>
        <div className="flex items-center gap-4 mt-4">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} />
            Encuesta activa (visible al público)
          </label>
          <button onClick={guardarConfig} disabled={guardando}
            className="ml-auto px-6 py-2.5 bg-[#C6A15B] text-white text-sm font-bold rounded-md hover:bg-[#A9853D] disabled:opacity-60">
            {guardando ? 'Guardando...' : '💾 Guardar configuración'}
          </button>
        </div>
        {msg && <p className="text-sm text-gray-600 mt-3">{msg}</p>}
      </div>

      {/* ← Preguntas */}
      <div className="bg-white rounded-xl shadow p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">❓ Preguntas (Sí / No)</h3>
        <div className="space-y-2">
          {preguntas.map((p, idx) => (
            <div key={p.id} className="flex items-center gap-2">
              <span className="text-xs text-gray-400 w-6 text-right">{idx + 1}.</span>
              {/* ✅ CORREGIDO: Solo defaultValue, se añade key para forzar reset si cambia */}
              <input 
                defaultValue={p.texto} 
                key={`preg-${p.id}`}
                onBlur={(e) => e.target.value !== p.texto && patchPregunta(p.id, { texto: e.target.value })}
                className="flex-1 border border-gray-200 rounded-md px-3 py-2 text-sm" 
              />
              <button onClick={() => moverPregunta(idx, -1)} disabled={idx === 0} className="px-2 text-gray-500 disabled:opacity-30">↑</button>          
              <button onClick={() => moverPregunta(idx, 1)} disabled={idx === preguntas.length - 1} className="px-2 text-gray-500 disabled:opacity-30">↓</button>
              <label className="flex items-center gap-1 text-xs text-gray-600">
                <input type="checkbox" checked={p.activo} onChange={(e) => patchPregunta(p.id, { activo: e.target.checked })} /> Activa
              </label>
              <button onClick={() => delPregunta(p.id)} className="text-red-500 px-2">🗑️</button>
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-4">
          <input value={nuevaPregunta} onChange={(e) => setNuevaPregunta(e.target.value)} placeholder="Nueva pregunta..."
            className="flex-1 border border-gray-200 rounded-md px-3 py-2 text-sm" />
          <button onClick={addPregunta} className="px-5 py-2 bg-[#0d0d0d] text-[#C6A15B] text-sm font-semibold rounded-md hover:bg-black">
            + Agregar
          </button>
        </div>
      </div>

      {/* ← Servicios */}
      <div className="bg-white rounded-xl shadow p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">💈 Servicios recibidos (selección en la encuesta)</h3>
        <div className="space-y-2">
          {servicios.map((s, idx) => (
            <div key={s.id} className="flex items-center gap-2">
              {/* ✅ CORREGIDO: Input del icono */}
              <input 
                defaultValue={s.icono} 
                key={`serv-icon-${s.id}`}
                onBlur={(e) => e.target.value !== s.icono && patchServicio(s.id, { icono: e.target.value })}
                className="w-14 border border-gray-200 rounded-md px-2 py-2 text-sm text-center" 
                placeholder="✂️" 
              />
              {/* ✅ CORREGIDO: Input del nombre */}
              <input 
                defaultValue={s.nombre} 
                key={`serv-nombre-${s.id}`}
                onBlur={(e) => e.target.value !== s.nombre && patchServicio(s.id, { nombre: e.target.value })}
                className="flex-1 border border-gray-200 rounded-md px-3 py-2 text-sm" 
              />
              <button onClick={() => moverServicio(idx, -1)} disabled={idx === 0} className="px-2 text-gray-500 disabled:opacity-30">↑</button>
              {/* ... resto de tu código ... */}
              <button onClick={() => moverServicio(idx, 1)} disabled={idx === servicios.length - 1} className="px-2 text-gray-500 disabled:opacity-30">↓</button>
              <label className="flex items-center gap-1 text-xs text-gray-600" title="Permite escribir el servicio (opción 'Otro')">
                <input type="checkbox" checked={s.permite_texto} onChange={(e) => patchServicio(s.id, { permite_texto: e.target.checked })} /> Texto libre
              </label>
              <label className="flex items-center gap-1 text-xs text-gray-600">
                <input type="checkbox" checked={s.activo} onChange={(e) => patchServicio(s.id, { activo: e.target.checked })} /> Activo
              </label>
              <button onClick={() => delServicio(s.id)} className="text-red-500 px-2">🗑️</button>
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-4">
          <input value={nuevoServicio} onChange={(e) => setNuevoServicio(e.target.value)} placeholder="Nuevo servicio..."
            className="flex-1 border border-gray-200 rounded-md px-3 py-2 text-sm" />
          <button onClick={addServicio} className="px-5 py-2 bg-[#0d0d0d] text-[#C6A15B] text-sm font-semibold rounded-md hover:bg-black">
            + Agregar
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// TAB 2: TABULACIÓN
// ==========================================
function TabulacionTab() {
  const [fechaInicio, setFechaInicio] = useState(inicioMesISO());
  const [fechaFin, setFechaFin] = useState(hoyISO());
  const [stats, setStats] = useState<Stats | null>(null);
  const [cargando, setCargando] = useState(false);

  async function consultar() {
    setCargando(true);
    try {
      const res = await fetch(
        `${API_URL}/encuesta/respuestas/estadisticas/?fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`,
        { headers: getAuthHeaders() }
      );
      if (res.ok) setStats(await res.json());
      else console.error('❌ Error estadísticas encuesta:', res.status);
    } finally { setCargando(false); }
  }
  useEffect(() => { consultar(); }, []);

  const maxServ = Math.max(1, ...(stats?.distribucion_servicios.map(s => s.total) || [1]));

  return (
    <div>
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
        <button onClick={consultar} className="px-5 py-2 bg-[#0d0d0d] text-[#C6A15B] text-sm font-semibold rounded-md hover:bg-black">
          {cargando ? 'Consultando...' : 'Consultar'}
        </button>
      </div>

      {stats && (
        <>
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="bg-white rounded-xl shadow p-4 text-center">
              <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
              <div className="text-xs text-gray-500 mt-1">Encuestas respondidas</div>
            </div>
            <div className="bg-white rounded-xl shadow p-4 text-center">
              <div className="text-3xl font-bold text-green-600">{stats.pct_si_global}%</div>
              <div className="text-xs text-gray-500 mt-1">Respuestas SÍ globales</div>
            </div>
            <div className="bg-white rounded-xl shadow p-4 text-center">
              <div className="text-3xl font-bold text-[#C6A15B]">{stats.comentarios.length}</div>
              <div className="text-xs text-gray-500 mt-1">Comentarios recibidos</div>
            </div>
          </div>

          {/* ← Tabulación por pregunta */}
          <div className="bg-white rounded-xl shadow p-6 mt-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Tabulación por pregunta</h3>
            <div className="space-y-4">
              {stats.tabulacion_preguntas.map((t, i) => (
                <div key={t.pregunta_id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-800"><b>{i + 1}.</b> {t.texto}</span>
                    <span className="text-gray-500 text-xs whitespace-nowrap ml-3">
                      ✅ {t.si} SÍ · ❌ {t.no} NO · <b className="text-green-600">{t.pct_si}%</b>
                    </span>
                  </div>
                  <div className="w-full h-3 bg-red-100 rounded-full overflow-hidden">
                    <div className="h-3 bg-green-500 rounded-full" style={{ width: `${t.pct_si}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mt-6">
            {/* ← Servicios */}
            <div className="bg-white rounded-xl shadow p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Servicios recibidos</h3>
              {stats.distribucion_servicios.length === 0 && <p className="text-xs text-gray-400">Sin datos en el periodo</p>}
              <div className="space-y-2">
                {stats.distribucion_servicios.map((s) => (
                  <div key={s.servicio}>
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="text-gray-700">{s.servicio}</span>
                      <span className="font-semibold text-[#C6A15B]">{s.total}</span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-2 bg-[#C6A15B] rounded-full" style={{ width: `${(s.total / maxServ) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ← Comentarios */}
            <div className="bg-white rounded-xl shadow p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">💬 Comentarios opcionales</h3>
              {stats.comentarios.length === 0 && <p className="text-xs text-gray-400">Sin comentarios en el periodo</p>}
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {stats.comentarios.map((c) => (
                  <div key={c.id} className="bg-[#faf7ef] border-l-4 border-[#C6A15B] rounded-md p-3">
                    <p className="text-sm text-gray-800 whitespace-pre-line">{c.comentario}</p>
                    <p className="text-[11px] text-gray-400 mt-1">{c.servicio} · {c.creado}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}