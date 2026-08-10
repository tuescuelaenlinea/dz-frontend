// app/encuesta/page.tsx
'use client';
import { useEffect, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080/api';

interface ConfigEncuesta {
  titulo: string; subtitulo: string; texto_comentario: string; activo: boolean;
  encabezado_url_full: string | null; pie_url_full: string | null;
}
interface Pregunta { id: number; texto: string; orden: number; }
interface Servicio { id: number; nombre: string; icono: string; permite_texto: boolean; }

export default function EncuestaPage() {
  const [config, setConfig] = useState<ConfigEncuesta | null>(null);
  const [preguntas, setPreguntas] = useState<Pregunta[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [loading, setLoading] = useState(true);

  const [respuestas, setRespuestas] = useState<Record<string, 'si' | 'no'>>({});
  const [servicio, setServicio] = useState('');
  const [servicioOtro, setServicioOtro] = useState('');
  const [comentario, setComentario] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [token] = useState(() => {
    if (typeof window === 'undefined') return '';
    let t = localStorage.getItem('dz_enc_token');
    if (!t) { t = 'enc-' + Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem('dz_enc_token', t); }
    return t;
  });

  useEffect(() => {
    (async () => {
      try {
        const [c, p, s] = await Promise.all([
          fetch(`${API_URL}/encuesta/config/`).then(r => r.json()),
          fetch(`${API_URL}/encuesta/preguntas/`).then(r => r.json()),
          fetch(`${API_URL}/encuesta/servicios/`).then(r => r.json()),
        ]);
        setConfig(c);
        setPreguntas(p.results || p);
        setServicios(s.results || s);
      } catch (e) { console.error(e); }
      setLoading(false);
    })();
  }, []);

  const responder = (id: number, val: 'si' | 'no') => {
    setError(null);
    setRespuestas((r) => ({ ...r, [String(id)]: val }));
  };

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    const sinResponder = preguntas.filter((p) => !respuestas[String(p.id)]);
    if (sinResponder.length) { setError(`Por favor responde todas las preguntas (faltan ${sinResponder.length}).`); return; }
    if (!servicio) { setError('Selecciona el servicio que realizaste.'); return; }
    const srvOtro = servicios.find((s) => s.nombre === servicio);
    if (srvOtro?.permite_texto && !servicioOtro.trim()) { setError('Escribe cuál fue el servicio recibido.'); return; }

    setEnviando(true); setError(null);
    try {
      const res = await fetch(`${API_URL}/encuesta/respuestas/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          respuestas,
          servicio,
          servicio_otro: servicioOtro.trim(),
          comentario: comentario.trim(),
          token_sesion: token,
        }),
      });
      if (res.ok) setEnviado(true);
      else setError('No se pudo enviar la encuesta. Intenta nuevamente.');
    } catch { setError('Error de conexión. Intenta nuevamente.'); }
    setEnviando(false);
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f6f4f0]">
      <div className="animate-spin rounded-full h-14 w-14 border-b-2 border-[#C6A15B]" />
    </div>
  );

  if (config && !config.activo) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f6f4f0]">
      <p className="text-gray-600 text-lg">Esta página no está disponible por el momento.</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f6f4f0] dz-sans">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Great+Vibes&family=Montserrat:wght@400;500;600;700&display=swap');
        .dz-serif { font-family: 'Cormorant Garamond', serif; }
        .dz-script { font-family: 'Great Vibes', cursive; }
        .dz-sans { font-family: 'Montserrat', sans-serif; }
      `}</style>

      {/* ═══ ENCABEZADO CONFIGURADO ═══ */}
      {config?.encabezado_url_full ? (
        <img src={config.encabezado_url_full} alt="Encabezado encuesta" className="w-full object-cover" />
      ) : (
        <header className="bg-[#0d0d0d] text-center py-10 px-4">
          <div className="dz-serif text-5xl text-[#C6A15B]">DZ</div>
          <div className="text-white tracking-[0.25em] text-sm mt-1">DORIAN ZAMBRANO — SALÓN SPA</div>
          <h1 className="dz-serif text-3xl md:text-4xl text-[#C6A15B] tracking-widest mt-4">{config?.titulo}</h1>
          <p className="text-gray-300 text-sm mt-1">{config?.subtitulo}</p>
        </header>
      )}

      {enviado ? (
        <div className="max-w-xl mx-auto text-center py-20 px-4">
          <div className="text-6xl">💛</div>
          <h2 className="dz-serif text-3xl text-gray-900 mt-4">¡GRACIAS POR TU RESPUESTA!</h2>
          <p className="dz-script text-3xl text-[#C6A15B] mt-3">Tu opinión es muy importante</p>
          <p className="text-gray-500 text-sm mt-4">Nos ayuda a ofrecer experiencias excepcionales cada día.</p>
        </div>
      ) : (
        <form onSubmit={enviar} className="max-w-6xl mx-auto px-4 py-10">
          <div className="grid lg:grid-cols-5 gap-8">
            {/* ═══ COLUMNA IZQ: PREGUNTAS SÍ/NO ═══ */}
            <div className="lg:col-span-3">
              <h2 className="flex items-center gap-2 text-sm font-bold tracking-wide text-gray-900 mb-4">
                <span className="w-9 h-9 rounded-full bg-[#C6A15B] text-white flex items-center justify-center">📋</span>
                RESPONDE CON SÍ O NO
              </h2>
              <div className="space-y-3">
                {preguntas.map((p, i) => (
                  <div key={p.id} className="bg-white rounded-xl border border-[#e8e0cf] px-4 py-3 flex items-center gap-3">
                    <span className="text-xs text-gray-400 w-5 text-right shrink-0">{i + 1}.</span>
                    <p className="flex-1 text-sm text-gray-800">{p.texto}</p>
                    <button type="button" onClick={() => responder(p.id, 'si')}
                      className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                        respuestas[String(p.id)] === 'si'
                          ? 'bg-[#C6A15B] text-white border-[#C6A15B]'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-[#C6A15B]'}`}>
                      SÍ
                    </button>
                    <button type="button" onClick={() => responder(p.id, 'no')}
                      className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                        respuestas[String(p.id)] === 'no'
                          ? 'bg-[#0d0d0d] text-white border-[#0d0d0d]'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-500'}`}>
                      NO
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* ═══ COLUMNA DER: SERVICIO RECIBIDO ═══ */}
            <div className="lg:col-span-2">
              <h2 className="flex items-center gap-2 text-sm font-bold tracking-wide text-gray-900 mb-4">
                <span className="w-9 h-9 rounded-full bg-[#C6A15B] text-white flex items-center justify-center">💇</span>
                SERVICIO RECIBIDO
              </h2>
              <p className="text-[#C6A15B] text-xs font-semibold mb-3">Selecciona el servicio que realizaste:</p>
              <div className="bg-white rounded-xl border border-[#e8e0cf] p-4 space-y-1">
                {servicios.map((s) => (
                  <div key={s.id}>
                    <label className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-[#faf7ef] cursor-pointer">
                      <span className="w-8 h-8 rounded-full border border-[#e8e0cf] flex items-center justify-center text-sm">{s.icono}</span>
                      <span className="flex-1 text-sm text-gray-800">{s.nombre}{s.permite_texto ? ':' : ''}</span>
                      <input type="radio" name="servicio" value={s.nombre} checked={servicio === s.nombre}
                        onChange={() => { setServicio(s.nombre); setError(null); }}
                        className="accent-[#C6A15B] w-4 h-4" />
                    </label>
                    {servicio === s.nombre && s.permite_texto && (
                      <input value={servicioOtro} onChange={(e) => setServicioOtro(e.target.value)}
                        placeholder="Escribe el servicio"
                        className="ml-11 mb-2 flex-1 border border-gray-200 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-[#C6A15B] w-[70%]" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ═══ COMENTARIO OPCIONAL ═══ */}
          <div className="bg-white rounded-xl border border-[#e8e0cf] p-5 mt-8">
            <h2 className="flex items-center gap-2 text-sm font-bold tracking-wide text-gray-900">
              <span className="w-9 h-9 rounded-full bg-[#C6A15B] text-white flex items-center justify-center">💬</span>
              COMENTARIO <span className="text-gray-400 font-normal">(OPCIONAL)</span>
            </h2>
            <p className="text-xs text-gray-500 mt-2">{config?.texto_comentario}</p>
            <textarea rows={3} value={comentario} onChange={(e) => setComentario(e.target.value)}
              className="w-full mt-2 border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#C6A15B]" />
          </div>

          {error && <p className="text-red-600 text-sm text-center mt-4">{error}</p>}

          {/* ═══ BOTÓN ENVIAR ═══ */}
          <div className="text-center mt-6">
            <button type="submit" disabled={enviando}
              className="px-10 py-3.5 bg-[#0d0d0d] text-[#C6A15B] font-bold tracking-[0.2em] text-sm rounded-lg hover:bg-black transition-colors disabled:opacity-60 shadow-lg">
              {enviando ? 'ENVIANDO...' : '✉️ ENVIAR RESPUESTA DE ENCUESTA'}
            </button>
            <p className="dz-script text-2xl text-[#C6A15B] mt-4">¡Gracias por elegirnos!</p>
          </div>
        </form>
      )}

      {/* ═══ PIE CONFIGURADO ═══ */}
      {config?.pie_url_full && (
        <footer className="mt-6">
          <img src={config.pie_url_full} alt="Pie de encuesta" className="w-full object-cover" />
        </footer>
      )}
    </div>
  );
}