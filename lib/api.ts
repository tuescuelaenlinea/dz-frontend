// lib/api.ts
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080/api';

export const api = {
  // ==========================================
  // CONFIGURACIÓN
  // ==========================================
  async getConfiguracion() {
    const res = await fetch(`${API_URL}/configuracion/activa/`);
    if (!res.ok) throw new Error('Error al cargar configuración');
    return res.json();
  },

  // ==========================================
  // CATEGORÍAS
  // ==========================================
  async getCategorias() {
    const res = await fetch(`${API_URL}/categorias/`);
    if (!res.ok) throw new Error('Error al cargar categorías');
    return res.json();
  },

  // ==========================================
  // SERVICIOS - Versión simple con paginación
  // ==========================================
  async getServicios() {
    const res = await fetch(`${API_URL}/servicios/`);
    if (!res.ok) throw new Error('Error al cargar servicios');
    return res.json();
  },

  async getServicioById(id: number) {
    const res = await fetch(`${API_URL}/servicios/${id}/`);
    if (!res.ok) throw new Error('Error al cargar servicio');
    return res.json();
  },

  async getServiciosDestacados() {
    const res = await fetch(`${API_URL}/servicios/destacados/`);
    if (!res.ok) throw new Error('Error al cargar servicios destacados');
    return res.json();
  },

  async getServiciosPorCategoria(categoriaId: number) {
    const res = await fetch(`${API_URL}/servicios/?categoria=${categoriaId}`);
    if (!res.ok) throw new Error('Error al cargar servicios por categoría');
    return res.json();
  },

// ==========================================
// ⭐ Obtener TODOS los servicios (paginación con dominio correcto)
// ==========================================
async getAllServicios() {
  console.log('🔄 getAllServicios: Cargando con paginación...');
  
  const allServicios: any[] = [];
  const API_DOMAIN = 'https://api.dzsalon.com';
  let nextPage = `${API_DOMAIN}/api/servicios/?page=1&page_size=50`;
  
  while (nextPage) {
    console.log('📡 Fetching:', nextPage);
    
    const res = await fetch(nextPage);
    if (!res.ok) throw new Error(`Error HTTP ${res.status}`);
    
    const data = await res.json();
    
    // Agregar resultados
    if (data.results) {
      allServicios.push(...data.results);
      console.log(`📦 Página: ${allServicios.length}/${data.count} servicios`);
    } else if (Array.isArray(data)) {
      allServicios.push(...data);
      break;
    }
    
    // Construir siguiente página con dominio correcto (evitar IP)
    if (data.next) {
      // Extraer query params de la URL next y reconstruir con dominio correcto
      const url = new URL(data.next);
      nextPage = `${API_DOMAIN}${url.pathname}${url.search}`;
      console.log('🔗 Next URL corregida:', nextPage);
    } else {
      nextPage = null;
    }
  }
  
  console.log('✅ getAllServicios: Total cargado:', allServicios.length);
  return allServicios;
},

  // ==========================================
  // PROFESIONALES
  // ==========================================
  async getProfesionales() {
    const res = await fetch(`${API_URL}/profesionales/`);
    if (!res.ok) throw new Error('Error al cargar profesionales');
    return res.json();
  },

  async getProfesionalesMedicos() {
    const res = await fetch(`${API_URL}/profesionales/medicos/`);
    if (!res.ok) throw new Error('Error al cargar profesionales médicos');
    return res.json();
  },

  // ==========================================
  // PAQUETES
  // ==========================================
  async getPaquetes() {
    const res = await fetch(`${API_URL}/paquetes/`);
    if (!res.ok) throw new Error('Error al cargar paquetes');
    return res.json();
  },

  async getPaquetesDestacados() {
    const res = await fetch(`${API_URL}/paquetes/destacados/`);
    if (!res.ok) throw new Error('Error al cargar paquetes destacados');
    return res.json();
  },

  async getPaquetesPorTipo(tipo: string) {
    const res = await fetch(`${API_URL}/paquetes/?tipo=${tipo}`);
    if (!res.ok) throw new Error('Error al cargar paquetes por tipo');
    return res.json();
  },

  // ==========================================
  // GALERÍA
  // ==========================================
  async getGaleria() {
    const res = await fetch(`${API_URL}/galeria/`);
    if (!res.ok) throw new Error('Error al cargar galería');
    return res.json();
  },

  async getGaleriaDestacada() {
    const res = await fetch(`${API_URL}/galeria/destacados/`);
    if (!res.ok) throw new Error('Error al cargar galería destacada');
    return res.json();
  },

  // ==========================================
  // CITAS
  // ==========================================
  async getCitas() {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_URL}/citas/`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    if (!res.ok) throw new Error('Error al cargar citas');
    return res.json();
  },

  async getCitasProximas() {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_URL}/citas/proximas/`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    if (!res.ok) throw new Error('Error al cargar citas próximas');
    return res.json();
  },

  async getCitaById(id: number) {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_URL}/citas/${id}/`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    if (!res.ok) throw new Error('Error al cargar cita');
    return res.json();
  },

  async createCita(data: any) {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_URL}/citas/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Error al crear cita');
    return res.json();
  },

  async confirmarCita(id: number) {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_URL}/citas/${id}/confirmar/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    if (!res.ok) throw new Error('Error al confirmar cita');
    return res.json();
  },

  async cancelarCita(id: number, motivo: string) {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_URL}/citas/${id}/cancelar/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ motivo }),
    });
    if (!res.ok) throw new Error('Error al cancelar cita');
    return res.json();
  },

  // ==========================================
  // AUTENTICACIÓN
  // ==========================================
  async login(username: string, password: string) {
    const res = await fetch(`${API_URL}/token/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) throw new Error('Credenciales inválidas');
    return res.json();
  },

  async refreshToken(refreshToken: string) {
    const res = await fetch(`${API_URL}/token/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh: refreshToken }),
    });
    if (!res.ok) throw new Error('Error al refrescar token');
    return res.json();
  },

  // ==========================================
  // UTILIDADES - Imágenes
  // ==========================================
  getImageUrl(imagenPath: string | null, imagenUrl?: string | null): string | null {
    if (!imagenPath && !imagenUrl) return null;
    
    if (imagenUrl?.startsWith('https://api.dzsalon.com')) {
      return imagenUrl;
    }
    
    const DOMAIN = 'https://api.dzsalon.com';
    
    if (imagenPath?.startsWith('http')) {
      return imagenPath
        .replace(/https?:\/\/127\.0\.0\.1/, DOMAIN)
        .replace(/https?:\/\/localhost/, DOMAIN)
        .replace(/https?:\/\/179\.43\.112\.64/, DOMAIN);
    }
    
    const imagePath = imagenPath?.startsWith('/') ? imagenPath : `/${imagenPath}`;
    return `${DOMAIN}${imagePath}`;
  },
}; // ← ✅ CIERRA aquí el objeto api