// src/lib/api.ts

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://179.43.112.64:8080/api';

export async function fetchAPI(endpoint: string, options: RequestInit = {}) {
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

export const api = {
  // Servicios
  getServicios: (page = 1) => fetchAPI(`/servicios/?page=${page}`),
  getServicio: (id: number) => fetchAPI(`/servicios/${id}/`),
  
  // Categorías
  getCategorias: () => fetchAPI('/categorias/'),
  
  // Paquetes
  getPaquetes: () => fetchAPI('/paquetes/'),
  
  // Profesionales
  getProfesionales: () => fetchAPI('/profesionales/'),
  
  // Configuración
  getConfiguracion: () => fetchAPI('/configuracion/'),
};