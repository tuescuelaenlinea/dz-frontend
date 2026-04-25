// ==========================================
// CONFIGURACIÓN DE API
// ==========================================
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080/api';
const API_DOMAIN = 'https://api.dzsalon.com';  // ← ✅ SIN ESPACIOS AL FINAL

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

  async getCategoriaServicios(categoriaId: number) {
    try {
      const res = await fetch(`${API_URL}/categorias/${categoriaId}/servicios/`);
      if (!res.ok) throw new Error('Error al cargar servicios de la categoría');
      return await res.json();
    } catch (err) {
      console.error('Error en getCategoriaServicios:', err);
      return { servicios: [], servicios_count: 0 };
    }
  },


  async agregarServiciosACategoria(categoriaId: number, serviciosIds: number[]) {
    const token = this.getToken();
    try {
      const res = await fetch(`${API_URL}/categorias/${categoriaId}/agregar-servicios/`, {
        method: 'POST',
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ servicios: serviciosIds }),
      });
      
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || error.detail || 'Error al asignar servicios');
      }
      
      return await res.json();
    } catch (err) {
      console.error('Error en agregarServiciosACategoria:', err);
      throw err;
    }
  },

  async getServiciosSinCategoria() {
    try {
      const res = await fetch(`${API_URL}/servicios/sin-categoria/`);
      if (!res.ok) throw new Error('Error al cargar servicios disponibles');
      return await res.json();
    } catch (err) {
      console.error('Error en getServiciosSinCategoria:', err);
      return { servicios: [], count: 0 };
    }
  },
  /**
   * Reasignar servicios a una categoría (permite mover entre categorías)
   * POST /api/categorias/{id}/reasignar-servicios/
   */
  async reasignarServiciosACategoria(categoriaId: number, serviciosIds: number[]) {
    const token = this.getToken();
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dzsalon.com/api';
    
    try {
      const res = await fetch(`${apiUrl}/categorias/${categoriaId}/reasignar-servicios/`, {
        method: 'POST',
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ servicios: serviciosIds }),
      });
      
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || error.detail || 'Error al reasignar servicios');
      }
      
      return await res.json();
    } catch (err) {
      console.error('❌ Error en reasignarServiciosACategoria:', err);
      throw err;
    }
  },

  // ==========================================
  // SERVICIOS
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

  async getServiciosDestacados(): Promise<Servicio[]> {
    try {
      // ← USAR la misma API_URL que el resto de métodos (sin duplicar /api/)
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080';
      
      // ← Construir URL correcta: si apiUrl ya termina en /api, no agregar otro
      const baseUrl = apiUrl.endsWith('/api') ? apiUrl : `${apiUrl}/api`;
      const url = `${baseUrl}/servicios/destacados/`;
      
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
        },
        // ← ELIMINAR: next: { revalidate } no funciona en cliente
        cache: 'no-store',  // ← Esto sí es válido para fetch en cliente
      });
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        console.error(`❌ Error ${response.status} en /servicios/destacados/:`, errorText);
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // ← Manejar respuesta con o sin paginación
      const resultados = data.results || data;
      
      // ← Validar que sea un array
      if (!Array.isArray(resultados)) {
        console.warn('⚠️ Respuesta de destacados no es un array:', data);
        return [];
      }
      
      return resultados;
      
    } catch (error: any) {
      // ← Log más detallado para debugging
      console.error('❌ Error en getServiciosDestacados:', {
        message: error?.message,
        name: error?.name,
        stack: error?.stack,
      });
      
      // ← Retornar array vacío de forma segura
      return [];
    }
  },

  async getServiciosPorCategoria(categoriaId: number) {
    const res = await fetch(`${API_URL}/servicios/?categoria=${categoriaId}`);
    if (!res.ok) throw new Error('Error al cargar servicios por categoría');
    return res.json();
  }, 

  async getServiciosParaAsignar() {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dzsalon.com/api';
      const res = await fetch(`${apiUrl}/servicios/todos-para-asignar/`);
      
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.detail || error.error || `Error HTTP ${res.status}`);
      }
      
      return await res.json();
    } catch (err) {
      console.error('❌ Error en getServiciosParaAsignar:', err);
      return { count: 0, servicios: [] };
    }
  },
 
  // ==========================================
  // ⭐ Obtener TODOS los servicios (paginación)
  // ==========================================
  async getAllServicios() {
    console.log('🔄 getAllServicios: Cargando con paginación...');
    
    const allServicios: any[] = [];
    let nextPage: string | null = `${API_DOMAIN}/api/servicios/?page=1&page_size=50`;
    
    while (nextPage) {
      console.log('📡 Fetching:', nextPage);
      
      const res: Response = await fetch(nextPage);
      if (!res.ok) throw new Error(`Error HTTP ${res.status}`);
      
      const data = await res.json();
      
      if (data.results) {
        allServicios.push(...data.results);
        console.log(`📦 Página: ${allServicios.length}/${data.count} servicios`);
      } else if (Array.isArray(data)) {
        allServicios.push(...data);
        break;
      }
      
      if (data.next) {
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
  /**
   * Obtener profesionales, opcionalmente filtrados por servicio y fecha
   * @param servicioId - Filtrar por servicios que puede realizar este profesional
   * @param fecha - (Opcional) Fecha para verificar disponibilidad
   */
  async getProfesionales(servicioId?: number, fecha?: string) {
    let url = `${API_URL}/profesionales-filtrados/`;
    const params = new URLSearchParams();
    
    if (servicioId) params.append('servicio', servicioId.toString());
    if (fecha) params.append('fecha', fecha);
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    
    const res = await fetch(url);
    if (!res.ok) throw new Error('Error cargando profesionales');
    
    const data = await res.json();
    
    if (Array.isArray(data)) {
      return data;
    } else if (data.results && Array.isArray(data.results)) {
      return data.results;
    } else if (Array.isArray(data.data)) {
      return data.data;
    }
    
    return [];
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
    const token = this.getToken();
    const res = await fetch(`${API_URL}/citas/`, {
      headers: this.getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Error al cargar citas');
    return res.json();
  },

  async getCitasProximas() {
    const token = this.getToken();
    const res = await fetch(`${API_URL}/citas/proximas/`, {
      headers: this.getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Error al cargar citas próximas');
    return res.json();
  },

  async getCitaById(id: number) {
  // ← CORREGIDO: Buscar admin_token primero, luego token
  const token = localStorage.getItem('admin_token') || localStorage.getItem('token');
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dzsalon.com/api';
  
  const res = await fetch(`${apiUrl}/citas/${id}/`, {
    headers: token ? { 'Authorization': `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error('Error al cargar cita');
  return res.json();
},

  async createCita(data: any) {
    const token = this.getToken();
    const res = await fetch(`${API_URL}/citas/`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Error al crear cita');
    return res.json();
  },

  async confirmarCita(id: number) {
    const token = this.getToken();
    const res = await fetch(`${API_URL}/citas/${id}/confirmar/`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Error al confirmar cita');
    return res.json();
  },

  async cancelarCita(id: number, motivo: string) {
    const token = this.getToken();
    const res = await fetch(`${API_URL}/citas/${id}/cancelar/`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ motivo }),
    });
    if (!res.ok) throw new Error('Error al cancelar cita');
    return res.json();
  },

  // ==========================================
  // ← NUEVA: PAGOS DE UNA CITA
  // ==========================================
  /**
   * Obtener historial de pagos de una cita específica
   * GET /api/citas/{id}/pagos/
  
  async getCitaPagos(citaId: number) {
    const token = this.getToken();
    const res = await fetch(`${API_URL}/citas/${citaId}/pagos/`, {
      headers: this.getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Error al cargar pagos de la cita');
    return res.json();
  }, */

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

  async register(userData: {
    username: string;
    email: string;
    password: string;
    first_name?: string;
    last_name?: string;
    telefono?: string;
  }) {
    const res = await fetch(`${API_URL}/register/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    if (!res.ok) throw new Error('Error al registrar usuario');
    return res.json();
  },

  // ==========================================
  // ← NUEVAS FUNCIONES: PERFIL DE USUARIO
  // ==========================================
  
  /**
   * Obtener perfil extendido del usuario (teléfono, preferencias, etc.)
   */
  async getPerfilUsuario() {
    const token = this.getToken();
    if (!token) throw new Error('No autenticado');
    
    const res = await fetch(`${API_URL}/perfil/`, {
      headers: this.getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Error cargando perfil');
    return res.json();
  },

  /**
   * Actualizar perfil del usuario (teléfono, dirección, preferencias)
   */
  async updatePerfilUsuario(data: Partial<{
    telefono: string;
    fecha_nacimiento: string;
    genero: string;
    direccion: string;
    ciudad: string;
    recibir_newsletter: boolean;
    recibir_recordatorios_whatsapp: boolean;
  }>) {
    const token = this.getToken();
    if (!token) throw new Error('No autenticado');
    
    const res = await fetch(`${API_URL}/perfil/`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Error actualizando perfil');
    return res.json();
  },

  /**
   * Actualizar datos básicos del usuario (nombre, email, teléfono)
   */
  async updateUsuario(data: Partial<{
    first_name: string;
    last_name: string;
    email: string;
    telefono: string;
  }>) {
    const token = this.getToken();
    if (!token) throw new Error('No autenticado');
    
    const res = await fetch(`${API_URL}/usuario/actualizar/`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Error actualizando usuario');
    return res.json();
  },

  // ==========================================
  // UTILIDADES - Tokens y Headers
  // ==========================================
  
  getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('token');
  },

  setToken(token: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('token', token);
  },

  removeToken(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('token');
  },

  getAuthHeaders(): HeadersInit {
    const token = this.getToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  },

  // ==========================================
  // UTILIDADES - Imágenes
  // ==========================================
  getImageUrl(imagenPath: string | null, imagenUrl?: string | null): string | null {
    if (!imagenPath && !imagenUrl) return null;
    
    if (imagenUrl?.startsWith('https://api.dzsalon.com')) {
      return imagenUrl;
    }
    
    if (imagenPath?.startsWith('http')) {
      return imagenPath
        .replace(/https?:\/\/127\.0\.0\.1(:\d+)?/, API_DOMAIN)
        .replace(/https?:\/\/localhost(:\d+)?/, API_DOMAIN)
        .replace(/https?:\/\/179\.43\.112\.64(:\d+)?/, API_DOMAIN);
    }
    
    const imagePath = imagenPath?.startsWith('/') ? imagenPath : `/${imagenPath}`;
    return `${API_DOMAIN}${imagePath}`;
  },

  // ← VERIFICAR DISPONIBILIDAD DE PROFESIONAL
  async getDisponibilidadProfesional(profesionalId: number, fecha: string) {
    const url = `${API_DOMAIN}/api/disponibilidad/?profesional=${profesionalId}&fecha=${fecha}`;
    
    const res = await fetch(url);
    if (!res.ok) throw new Error('Error cargando disponibilidad');
    return await res.json();
  },

async validarDisponibilidadCita(data: {
  profesional_id: number;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  cita_id_editar?: number | null;
}) {
  const res = await fetch(`${API_URL}/validar-disponibilidad/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  
  if (!res.ok) throw new Error('Error validando disponibilidad');
  return await res.json();
},

// ==========================================
// SERVICIOS - PROFESIONALES ASIGNADOS
// ==========================================

/**
 * Obtener profesionales asignados a un servicio
 * GET /api/servicios/{id}/profesionales/
 */
async getServicioProfesionales(servicioId: number) {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dzsalon.com/api';
    const res = await fetch(`${apiUrl}/servicios/${servicioId}/profesionales/`);
    
    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.detail || error.error || `Error HTTP ${res.status}`);
    }
    
    return await res.json();
  } catch (err) {
    console.error('❌ Error en getServicioProfesionales:', err);
    return { profesionales: [], profesionales_count: 0 };
  }
},

/**
 * Asignar profesionales a un servicio
 * POST /api/servicios/{id}/profesionales/
 */
async asignarProfesionalesAServicio(servicioId: number, profesionalesIds: number[]) {
  const token = this.getToken();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dzsalon.com/api';
  
  try {
    const res = await fetch(`${apiUrl}/servicios/${servicioId}/profesionales/`, {
      method: 'POST',
      headers: {
        ...this.getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ profesionales: profesionalesIds }),
    });
    
    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.error || error.detail || 'Error al asignar profesionales');
    }
    
    return await res.json();
  } catch (err) {
    console.error('❌ Error en asignarProfesionalesAServicio:', err);
    throw err;
  }
},
// ==========================================
// CITAS - ADMIN (Funciones para el modal admin)
// ==========================================

/**
 * Actualizar cita (PUT) - Solo para admin
 */
async updateCita(id: number, data: any) {  // ← ✅ CON 'data'
  const token = localStorage.getItem('admin_token') || localStorage.getItem('token');
  
  if (!token) {
    throw new Error('No hay token de autenticación');
  }
  
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dzsalon.com/api';
  
  const res = await fetch(`${apiUrl}/citas/${id}/`, {
    method: 'PUT',
    headers: {
      ...this.getAuthHeaders(),
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || error.error || 'Error al actualizar cita');
  }
  
  return await res.json();
},

/**
 * Crear pago manual - Solo para admin
 */
async createPago(data: any) {
  const token = this.getToken();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dzsalon.com/api';
  
  const res = await fetch(`${apiUrl}/pagos/`, {
    method: 'POST',
    headers: {
      ...this.getAuthHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || error.detail || 'Error al crear pago');
  }
  
  return await res.json();
},

/**
 * Subir comprobante a un pago
 */
async subirComprobantePago(pagoId: number, file: File) {
  // ← CORREGIDO: Buscar admin_token primero, luego token
  const token = localStorage.getItem('admin_token') || localStorage.getItem('token');
  
  if (!token) {
    throw new Error('No hay token de autenticación');
  }
  
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dzsalon.com/api';
  
  const formData = new FormData();
  formData.append('comprobante', file);
  
  const res = await fetch(`${apiUrl}/pagos/${pagoId}/subir-comprobante/`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });
  
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || error.detail || 'Error al subir comprobante');
  }
  
  return await res.json();
},

/**
 * Obtener pagos de una cita
 */
async getCitaPagos(citaId: number) {
  const token = this.getToken();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dzsalon.com/api';
  
  const res = await fetch(`${apiUrl}/citas/${citaId}/pagos/`, {
    headers: token ? { 'Authorization': `Bearer ${token}` } : {},
  });
  
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || error.error || 'Error al cargar pagos');
  }
  
  return await res.json();
},
};
