// app/experiencia/page.tsx
'use client';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

// ==========================================
// INTERFACES
// ==========================================
interface ConfigExperiencia {
  activo: boolean;
  url_google: string;
  url_tripadvisor: string;
  fondo_desktop_url: string | null;
  fondo_mobile_url: string | null;
  logo_url: string | null;
  nombre_salon: string;
  direccion: string;
  telefono_1: string;
  instagram_url: string;
  web_url: string;
}

interface Sugerencia {
  id: number;
  nombre: string;
}

interface FormPQR {
  nombre: string;
  telefono: string;
  email: string;
  servicio: string;
  profesional: string;
  fecha_servicio: string;
  que_ocurrio: string;
  como_mejorar: string;
}

const FORM_INICIAL: FormPQR = {
  nombre: '',
  telefono: '',
  email: '',
  servicio: '',
  profesional: '',
  fecha_servicio: '',
  que_ocurrio: '',
  como_mejorar: '',
};

export default function ExperienciaPage() {
  const [config, setConfig] = useState<ConfigExperiencia | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [calificacion, setCalificacion] = useState(0);
  const [hover, setHover] = useState(0);
  const [panel, setPanel] = useState<'positivo' | 'pqr' | null>(null);
  const [form, setForm] = useState<FormPQR>(FORM_INICIAL);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [msgError, setMsgError] = useState<string | null>(null);

  const [serviciosSug, setServiciosSug] = useState<Sugerencia[]>([]);
  const [profesionalesSug, setProfesionalesSug] = useState<Sugerencia[]>([]);

  //const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const API_DOMAIN = 'https://api.dzsalon.com';
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080';

  // ← ← ← TOKEN DE SESIÓN (evita duplicados al cambiar estrellas) ← ← ←
  const [token] = useState(() => {
    if (typeof window === 'undefined') return '';
    let t = localStorage.getItem('dz_exp_token');
    if (!t) {
      t = 'tok-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem('dz_exp_token', t);
    }
    return t;
  });

  // ==========================================
  // CARGA DE DATOS
  // ==========================================
  useEffect(() => {
    async function loadData() {
      try {
        const cfg = await api.getExperienciaConfig();
        setConfig(cfg);
      } catch (err) {
        console.error('Error cargando configuración de experiencia:', err);
        setError('Error al cargar los datos. Verifica la conexión.');
      }

      // ← Sugerencias de servicios y profesionales (catálogo real) ←
      try {
        const sRes = await fetch(`${API_URL}/servicios/?page_size=600`);
        const sData = await sRes.json();
        setServiciosSug(Array.isArray(sData) ? sData : sData.results || []);
      } catch { /* opcional */ }
      try {
        const pRes = await fetch(`${API_URL}/profesionales/?page_size=600`);
        const pData = await pRes.json();
        setProfesionalesSug(Array.isArray(pData) ? pData : pData.results || []);
      } catch { /* opcional */ }

      setLoading(false);
    }
    loadData();
  }, [API_URL]);

  // ==========================================
  // HELPERS
  // ==========================================
  const getImageUrl = (imagenUrl?: string | null): string | null => {
    if (!imagenUrl) return null;
    if (imagenUrl.startsWith('https://api.dzsalon.com')) return imagenUrl;
    if (imagenUrl.startsWith('/')) return `${API_DOMAIN}${imagenUrl}`;
    if (imagenUrl.startsWith('http')) {
      return imagenUrl
        .replace(/https?:\/\/127\.0\.0\.1/, API_DOMAIN)
        .replace(/https?:\/\/localhost/, API_DOMAIN)
        .replace(/https?:\/\/179\.43\.112\.64/, API_DOMAIN);
    }
    return imagenUrl;
  };

  async function enviarRegistro(payload: Record<string, unknown>): Promise<boolean> {
    try {
      const res = await api.createRegistroExperiencia(payload);
      return res.ok || res.status === 429; // 429 = ya envió antes, no mostrar error
    } catch (e) {
      console.error('Error enviando registro:', e);
      return false;
    }
  }

    // ==========================================
  // SELECCIÓN DE ESTRELLAS (lógica condicional)
  // ==========================================
  const seleccionar = (n: number) => {
    setCalificacion(n);
    setMsgError(null);
    setEnviado(false); // ← Resetear estado al cambiar calificación
    

    if (n >= 4) {
      // ═══ FLUJO POSITIVO: mostrar botón "Enviar valoración" ═══
      // NO se envía automáticamente - espera clic del usuario
      setPanel('positivo');
    } else {
      // ═══ FLUJO PQR: muestra el formulario ═══
      setPanel('pqr');
    }
  };

  // ← ← ← NUEVA FUNCIÓN: Enviar valoración positiva (4-5⭐) ← ← ←
  const enviarValoracionPositiva = async () => {
    setEnviando(true);
    setMsgError(null);
    const ok = await enviarRegistro({ calificacion, token_sesion: token });
    setEnviando(false);
    if (ok) {
      setEnviado(true); // ← Muestra enlaces externos después de enviar
    } else {
      setMsgError('No se pudo enviar. Intenta nuevamente.');
    }
  };

  const actualizar = (campo: keyof FormPQR, valor: string) =>
    setForm((f) => ({ ...f, [campo]: valor }));

  // ==========================================
  // ENVÍO DEL FORMULARIO PQR
  // ==========================================
  const submitPQR = async (e: React.FormEvent) => {
    e.preventDefault();
    const faltan: string[] = [];
    if (!form.nombre.trim()) faltan.push('Nombre');
    if (!form.telefono.trim()) faltan.push('Teléfono');
    if (!form.email.trim()) faltan.push('Correo');
    if (!form.servicio.trim()) faltan.push('Servicio');
    if (!form.fecha_servicio) faltan.push('Fecha');
    if (!form.que_ocurrio.trim()) faltan.push('¿Qué ocurrió?');
    if (faltan.length) {
      setMsgError('Por favor completa: ' + faltan.join(', '));
      return;
    }

    setEnviando(true);
    setMsgError(null);
    const ok = await enviarRegistro({
      calificacion,
      token_sesion: token,
      nombre: form.nombre.trim(),
      telefono: form.telefono.trim(),
      email: form.email.trim(),
      servicio: form.servicio.trim(),
      profesional: form.profesional.trim(),
      fecha_servicio: form.fecha_servicio,
      que_ocurrio: form.que_ocurrio.trim(),
      como_mejorar: form.como_mejorar.trim(),
    });
    setEnviando(false);
    if (ok) {
      setEnviado(true);
    } else {
      setMsgError('No se pudo enviar. Intenta nuevamente.');
    }
  };

  // ==========================================
  // ESTADOS DE CARGA / ERROR
  // ==========================================
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#C6A15B] mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando tu experiencia...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-600 text-lg">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-6 py-2 bg-[#C6A15B] text-white rounded-lg hover:bg-[#A9853D]"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (config && !config.activo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f6f4f0]">
        <p className="text-gray-600 text-lg">Esta página no está disponible por el momento.</p>
      </div>
    );
  }

  const fondoDesktop = getImageUrl(config?.fondo_desktop_url);
  const fondoMobile = getImageUrl(config?.fondo_mobile_url);
  const logoUrl = getImageUrl(config?.logo_url);

  return (
    <div className="min-h-screen dz-sans relative">
      {/* ← ← ← FUENTES Y CLASES DE TIPOGRAFÍA ← ← ← */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Great+Vibes&family=Montserrat:wght@400;500;600;700&display=swap');
        .dz-serif { font-family: 'Cormorant Garamond', serif; }
        .dz-script { font-family: 'Great Vibes', cursive; }
        .dz-sans { font-family: 'Montserrat', sans-serif; }
      `}</style>

      {/* ═══ CAPA 1: FONDO FIJO (z-0) — solo fondos, nada más ═══ */}
      <div className="fixed inset-0 z-0 bg-[#f6f4f0]">
        {fondoDesktop && (
          <div
            className="hidden md:block absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${fondoDesktop})` }}
          />
        )}
        {fondoMobile && (
          <div
            className="md:hidden absolute inset-0 bg-cover bg-top"
            style={{ backgroundImage: `url(${fondoMobile})` }}
          />
        )}
      </div>

      {/* ═══ CAPA 2: TODO EL CONTENIDO (z-10) — cierra DESPUÉS del footer ═══ */}
      <div className="relative z-10">

        {/* ══════════════════ HEADER ══════════════════ */}
        <header className="text-center pt-10 px-4">
          {logoUrl ? (
            <img src={logoUrl} alt={config?.nombre_salon || 'DZ Salón'} className="h-20 md:h-24 w-auto object-contain mx-auto mb-2" />
          ) : (
            <div className="dz-serif text-6xl text-[#C6A15B] leading-none">DZ</div>
          )}
          <h1 className="dz-serif text-3xl md:text-4xl tracking-[0.15em] font-semibold text-gray-900">
            DORIAN ZAMBRANO
          </h1>
          <div className="text-[#C6A15B] tracking-[0.4em] text-xs md:text-sm mt-1 mb-6">— SALÓN SPA —</div>

          <h2 className="text-lg md:text-xl font-semibold text-gray-900 tracking-wide">
            TU OPINIÓN ES MUY IMPORTANTE PARA NOSOTROS
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            Gracias por visitarnos. Queremos conocer tu experiencia para seguir mejorando.
          </p>

          <p className="text-[#C6A15B] font-semibold text-base md:text-lg mt-7 mb-3 tracking-wide">
            ¿CÓMO CALIFICARÍAS EL SERVICIO RECIBIDO?
          </p>

          {/* ← ← ← ESTRELLAS 1-5 ← ← ← */}
          <div className="flex justify-center gap-2 md:gap-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <button
                key={i}
                type="button"
                aria-label={`Calificar con ${i} estrellas`}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(0)}
                onClick={() => seleccionar(i)}
                className="transition-transform hover:scale-110 p-1"
              >
                <svg
                  viewBox="0 0 24 24"
                  className={`w-10 h-10 md:w-14 md:h-14 drop-shadow-md ${(hover || calificacion) >= i ? 'fill-[#C6A15B]' : 'fill-[#e5d9bd]'}`}
                >
                  <path d="M12 1.8l3 6.8 7.2.7-5.4 4.9 1.6 7.1L12 17.6l-6.4 3.7 1.6-7.1L1.8 9.3l7.2-.7z" />
                </svg>
              </button>
            ))}
          </div>
          <p className="text-gray-500 text-xs md:text-sm mt-2">Selecciona de 1 a 5 estrellas</p>
        </header>

                {/* ══════════════════ PANEL 4-5 ESTRELLAS ══════════════════ */}
        {panel === 'positivo' && (
          <section className="max-w-md mx-auto mt-10 px-4">
            <div className="bg-white rounded-2xl border border-[#e8e0cf] shadow-xl px-6 pb-6 pt-0 text-center relative">
              <span className="inline-block bg-[#0d0d0d] text-[#C6A15B] text-[11px] font-semibold tracking-widest px-5 py-2 rounded-md -mt-4 mb-4">
                SI CALIFICAS CON 4 O 5 ESTRELLAS
              </span>

              {/* ← ← ← PASO 1: BOTÓN ENVIAR VALORACIÓN (antes de enviar) ← ← ← */}
              {!enviado && (
                <>
                  <div className="text-4xl text-[#C6A15B]">♡</div>
                  <h3 className="font-semibold text-gray-900 mt-2 leading-snug">
                    ¡NOS ALEGRA SABER QUE<br />DISFRUTASTE TU EXPERIENCIA!
                  </h3>
                  <p className="dz-script text-2xl text-[#C6A15B] my-3">
                    ¿Nos compartes tu opinión?
                  </p>

                  {/* ← ← ← BOTÓN PRINCIPAL: ENVIAR VALORACIÓN ← ← ← */}
                  <button
                    type="button"
                    onClick={enviarValoracionPositiva}
                    disabled={enviando}
                    className="w-full max-w-[320px] mx-auto flex items-center justify-center gap-2 bg-[#0d0d0d] text-[#C6A15B] font-bold tracking-[0.2em] text-sm py-3.5 rounded-lg hover:bg-black transition-colors disabled:opacity-60 shadow-lg"
                  >
                    {enviando ? (
                      <>
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        ENVIANDO...
                      </>
                    ) : (
                      <>✉️ ENVIAR VALORACIÓN</>
                    )}
                  </button>

                  {msgError && (
                    <p className="text-red-600 text-xs text-center mt-3">{msgError}</p>
                  )}
                </>
              )}

              {/* ← ← ← PASO 2: ENLACES EXTERNOS (después de enviar) ← ← ← */}
              {enviado && (
                <>
                  <div className="text-5xl mb-2">🎉</div>
                  <h3 className="font-semibold text-gray-900 mt-2 leading-snug">
                    ¡GRACIAS POR TU<br />VALORACIÓN!
                  </h3>
                  <p className="dz-script text-2xl text-[#C6A15B] my-3">¿Nos ayudas dejando una reseña pública?</p>

                  {/* ← Botón Google ← */}
                  <a
                    href={config?.url_google || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-stretch bg-white border border-gray-100 rounded-xl overflow-hidden max-w-[320px] mx-auto my-3 shadow-md hover:shadow-lg transition-shadow text-left"
                  >
                    <span className="w-14 flex items-center justify-center bg-white p-2">
                      <img 
                        src={`${API_DOMAIN}/media/experiencia/google.jpg`} 
                        alt="Google" 
                        className="w-10 h-10 object-contain"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    </span>
                    <span className="flex-1 border-l border-gray-100 px-3 py-2">
                      <small className="block text-gray-500 text-[11px]">Calificar en</small>
                      <b className="text-gray-900 text-lg">Google</b>
                    </span>
                    <span className="bg-[#C6A15B] text-white flex items-center px-4 text-xl">›</span>
                  </a>

                  {/* ← Botón Tripadvisor ← */}
                  <a
                    href={config?.url_tripadvisor || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-stretch bg-white border border-gray-100 rounded-xl overflow-hidden max-w-[320px] mx-auto my-3 shadow-md hover:shadow-lg transition-shadow text-left"
                  >
                    <span className="w-14 flex items-center justify-center bg-white p-2">
                      <img 
                        src={`${API_DOMAIN}/media/experiencia/tripadvisor.jpg`} 
                        alt="Tripadvisor" 
                        className="w-10 h-10 object-contain rounded"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    </span>
                    <span className="flex-1 border-l border-gray-100 px-3 py-2">
                      <small className="block text-gray-500 text-[11px]">Calificar en</small>
                      <b className="text-gray-900 text-lg">Tripadvisor</b>
                    </span>
                    <span className="bg-[#C6A15B] text-white flex items-center px-4 text-xl">›</span>
                  </a>

                  <p className="dz-script text-2xl text-[#C6A15B] mt-4">¡Gracias por recomendarnos!</p>
                </>
              )}
            </div>
          </section>
        )}

        {/* ══════════════════ PANEL PQR 1-3 ESTRELLAS ══════════════════ */}
        {panel === 'pqr' && (
          <section className="max-w-2xl mx-auto mt-10 px-4">
            <div className="bg-white rounded-2xl border border-[#e8e0cf] shadow-xl p-6 relative">
              <div className="text-center">
                <span className="inline-block bg-[#0d0d0d] text-[#C6A15B] text-[11px] font-semibold tracking-widest px-5 py-2 rounded-md -mt-10 mb-5">
                  SI CALIFICAS CON 1, 2 O 3 ESTRELLAS
                </span>
              </div>

              {enviado ? (
                /* ← ← ← CONFIRMACIÓN DE ENVÍO ← ← ← */
                <div className="text-center py-10">
                  <div className="text-5xl">💛</div>
                  <h3 className="font-semibold text-gray-900 mt-4 text-lg">¡GRACIAS POR CONTARNOS!</h3>
                  <p className="text-gray-500 text-sm mt-2">
                    Tu PQR fue enviada. Nuestro equipo te contactará muy pronto.
                  </p>
                </div>
              ) : (
                <form onSubmit={submitPQR} noValidate>
                  <div className="flex items-start gap-3 mb-5">
                    <span className="text-3xl">☹️</span>
                    <div>
                      <h3 className="font-semibold text-gray-900 text-sm tracking-wide">
                        LAMENTAMOS QUE TU EXPERIENCIA NO HAYA SIDO LA ESPERADA.
                      </h3>
                      <p className="text-[#C6A15B] font-semibold text-sm">Queremos solucionarlo.</p>
                    </div>
                  </div>

                  {/* ← Filas del formulario (icono + label + input) ← */}
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <span className="hidden sm:block w-7 text-center text-[#C6A15B]">👤</span>
                      <label className="sm:w-40 text-xs text-gray-700 shrink-0">Nombre</label>
                      <input className="flex-1 border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#C6A15B]" placeholder="Escribe tu nombre" value={form.nombre} onChange={(e) => actualizar('nombre', e.target.value)} />
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <span className="hidden sm:block w-7 text-center text-[#C6A15B]">📞</span>
                      <label className="sm:w-40 text-xs text-gray-700 shrink-0">Teléfono</label>
                      <input className="flex-1 border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#C6A15B]" placeholder="Escribe tu teléfono" value={form.telefono} onChange={(e) => actualizar('telefono', e.target.value)} />
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <span className="hidden sm:block w-7 text-center text-[#C6A15B]">✉️</span>
                      <label className="sm:w-40 text-xs text-gray-700 shrink-0">Correo electrónico</label>
                      <input type="email" className="flex-1 border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#C6A15B]" placeholder="Escribe tu correo" value={form.email} onChange={(e) => actualizar('email', e.target.value)} />
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <span className="hidden sm:block w-7 text-center text-[#C6A15B]">✂️</span>
                      <label className="sm:w-40 text-xs text-gray-700 shrink-0">Servicio recibido</label>
                      <input list="listaServicios" className="flex-1 border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#C6A15B]" placeholder="Ej: Corte, Color, Manicure, Spa, etc." value={form.servicio} onChange={(e) => actualizar('servicio', e.target.value)} />
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <span className="hidden sm:block w-7 text-center text-[#C6A15B]">👤</span>
                      <label className="sm:w-40 text-xs text-gray-700 shrink-0">Profesional que te atendió</label>
                      <input list="listaProfesionales" className="flex-1 border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#C6A15B]" placeholder="Nombre del profesional" value={form.profesional} onChange={(e) => actualizar('profesional', e.target.value)} />
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <span className="hidden sm:block w-7 text-center text-[#C6A15B]">📅</span>
                      <label className="sm:w-40 text-xs text-gray-700 shrink-0">Fecha</label>
                      <input type="date" className="flex-1 border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#C6A15B]" value={form.fecha_servicio} onChange={(e) => actualizar('fecha_servicio', e.target.value)} />
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <span className="hidden sm:block w-7 text-center text-[#C6A15B]">💬</span>
                      <label className="sm:w-40 text-xs text-gray-700 shrink-0">¿Qué ocurrió?</label>
                      <input className="flex-1 border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#C6A15B]" placeholder="Cuéntanos qué sucedió" value={form.que_ocurrio} onChange={(e) => actualizar('que_ocurrio', e.target.value)} />
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-start gap-2">
                      <span className="hidden sm:block w-7 text-center text-[#C6A15B]">⚡</span>
                      <label className="sm:w-40 text-xs text-gray-700 shrink-0 pt-2">¿Cómo podemos mejorar?</label>
                      <textarea rows={2} className="flex-1 border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#C6A15B]" placeholder="Tu opinión nos ayuda a mejorar" value={form.como_mejorar} onChange={(e) => actualizar('como_mejorar', e.target.value)} />
                    </div>
                  </div>

                  {/* ← Datalists con sugerencias del catálogo real ← */}
                  <datalist id="listaServicios">
                    {serviciosSug.map((s) => (
                      <option key={s.id} value={s.nombre} />
                    ))}
                  </datalist>
                  <datalist id="listaProfesionales">
                    {profesionalesSug.map((p) => (
                      <option key={p.id} value={p.nombre} />
                    ))}
                  </datalist>

                  <button
                    type="submit"
                    disabled={enviando}
                    className="w-full mt-5 flex items-center justify-center gap-2 bg-[#0d0d0d] text-[#C6A15B] font-bold tracking-[0.2em] text-sm py-3.5 rounded-lg hover:bg-black transition-colors disabled:opacity-60"
                  >
                    ✉️ {enviando ? 'ENVIANDO...' : 'ENVIAR PQR'}
                  </button>

                  {msgError && (
                    <p className="text-red-600 text-xs text-center mt-3">{msgError}</p>
                  )}
                </form>
              )}
            </div>
          </section>
        )}

        {/* ══════════════════ ¿CÓMO FUNCIONA? (sin QR) ══════════════════ */}
        <div className="max-w-5xl mx-auto px-4 mt-14">
          <div className="flex justify-center">
            <span className="bg-[#0d0d0d] text-white text-xs font-semibold tracking-widest px-7 py-2.5 rounded-lg">
              ¿CÓMO FUNCIONA?
            </span>
          </div>
          <div className="bg-white border border-[#e8e0cf] rounded-xl p-6 mt-4">
            <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-6 text-center md:text-left">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 border-2 border-[#C6A15B] rounded-lg flex items-center justify-center text-xl text-[#C6A15B] shrink-0">★</div>
                <div>
                  <b className="text-sm text-gray-900 block">Califica de<br />1 a 5 estrellas</b>
                </div>
              </div>
              <span className="text-[#C6A15B] text-xl rotate-90 md:rotate-0">→</span>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 border-2 border-[#C6A15B] rounded-lg flex items-center justify-center text-xl shrink-0">😊</div>
                <div>
                  <b className="text-sm text-gray-900 block">4–5 estrellas</b>
                  <small className="text-gray-500 text-[11px]">Google o Tripadvisor<br />(Reseña pública)</small>
                </div>
              </div>
              <span className="text-[#C6A15B] text-xl rotate-90 md:rotate-0">→</span>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 border-2 border-[#C6A15B] rounded-lg flex items-center justify-center text-xl shrink-0">☹️</div>
                <div>
                  <b className="text-sm text-gray-900 block">1–3 estrellas</b>
                  <small className="text-gray-500 text-[11px]">Formulario PQR<br />(Correo privado al salón)</small>
                </div>
              </div>
            </div>
          </div>

          {/* ══════════════════ ¿QUÉ RECIBIMOS? ══════════════════ */}
          <div className="flex justify-center mt-10">
            <span className="bg-[#0d0d0d] text-white text-xs font-semibold tracking-widest px-7 py-2.5 rounded-lg">
              ¿QUÉ RECIBIMOS EN NUESTRO CORREO?
            </span>
          </div>
          <div className="grid md:grid-cols-2 gap-5 mt-4">
            <div className="bg-white border border-[#e8e0cf] rounded-xl p-6">
              <h4 className="flex items-center gap-2 text-sm font-semibold tracking-wide text-gray-900">
                <span className="w-9 h-9 rounded-full bg-[#C6A15B] text-white flex items-center justify-center">★</span>
                NUEVA VALORACIÓN <span className="text-[#C6A15B]">★★★★★</span>
                <span className="ml-auto text-3xl relative">✉️<span className="absolute -top-2 -right-2 bg-black text-white rounded-full w-5 h-5 text-[11px] flex items-center justify-center">1</span></span>
              </h4>
              <ul className="mt-4 text-gray-600 text-xs space-y-1.5">
                {['Cliente', 'Servicio', 'Profesional', 'Calificación', 'Comentario'].map((x) => (
                  <li key={x}><span className="text-[#C6A15B] mr-2">•</span>{x}</li>
                ))}
              </ul>
            </div>
            <div className="bg-white border border-[#e8e0cf] rounded-xl p-6">
              <h4 className="flex items-center gap-2 text-sm font-semibold tracking-wide text-gray-900">
                <span className="w-9 h-9 rounded-full bg-[#B8860B] text-white flex items-center justify-center font-bold">!</span>
                NUEVA PQR
                <span className="ml-auto text-3xl relative">✉️<span className="absolute -top-2 -right-2 bg-black text-white rounded-full w-5 h-5 text-[11px] flex items-center justify-center">1</span></span>
              </h4>
              <ul className="mt-4 text-gray-600 text-xs space-y-1.5">
                {['Nombre del cliente', 'Celular', 'Correo', 'Servicio', 'Profesional', 'Fecha', 'Calificación', 'Comentarios'].map((x) => (
                  <li key={x}><span className="text-[#C6A15B] mr-2">•</span>{x}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* ══════════════════ FOOTER ══════════════════ */}
        <footer className="bg-[#0d0d0d] text-white mt-14 py-10 px-4 text-center">
          <div className="dz-serif text-3xl text-[#C6A15B]">DZ</div>
          <div className="tracking-[0.2em] text-sm mt-1">{config?.nombre_salon || 'DORIAN ZAMBRANO'}</div>
          <p className="text-[#C6A15B] tracking-[0.15em] text-xs mt-4">
            TU EXPERIENCIA NOS INSPIRA A SER MEJORES CADA DÍA<br />♥
          </p>
          <div className="text-gray-400 text-xs mt-5 space-y-1">
            {config?.direccion && <p>📍 {config.direccion}</p>}
            {config?.telefono_1 && <p>📞 {config.telefono_1}</p>}
            {config?.instagram_url && (
              <p>
                <a href={config.instagram_url} target="_blank" rel="noopener noreferrer" className="hover:text-white">📷 {config.instagram_url.replace('https://', '').replace('http://', '')}</a>
              </p>
            )}
            {config?.web_url && (
              <p>
                <a href={config.web_url.startsWith('http') ? config.web_url : `https://${config.web_url}`} target="_blank" rel="noopener noreferrer" className="hover:text-white">🌐 {config.web_url.replace('https://', '').replace('http://', '')}</a>
              </p>
            )}
          </div>
        </footer>

      </div> {/* ← Cierre del wrapper z-10 */}
    </div>
  );
}