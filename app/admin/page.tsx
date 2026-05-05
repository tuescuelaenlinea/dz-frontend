// app/admin/page.tsx
'use client';
import { useState, useEffect, useMemo } from 'react';
import { api } from '@/lib/api';
import ProfessionalModal from '@/components/booking/ProfessionalModal';
import PaymentMethodModal from '@/components/booking/PaymentMethodModal';
import ProductoModal, { ProductoSeleccionado } from '@/components/admin/ProductoModal';
import CitasTab from '@/components/admin/CitasTab';
import ProfesionalesTab from '@/components/admin/ProfesionalesTab';
import CajaPage from '@/app/admin/caja/page';

// ← ← ← CSS PARA OCULTAR SPINNERS DE INPUTS NUMBER ← ← ←
// Agregar en <style jsx global> o en globals.css si usas Tailwind
const hideNumberSpinners = `
  input[type="number"]::-webkit-outer-spin-button,
  input[type="number"]::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  input[type="number"] {
    -moz-appearance: textfield;
    appearance: textfield;
  }
`;


// ← ← ← INTERFACES ← ← ←

interface Categoria {
  id: number;
  nombre: string;
  slug: string;
  icono: string;
  imagen: string | null;
  imagen_url: string | null;
  orden: number;
  activo: boolean;
  servicios_count: number;
}

interface Servicio {
  id: number;
  nombre: string;
  slug: string;
  precio_min: string | number;
  precio_max: string | null;
  duracion: string;
  categoria: number;
  categoria_nombre: string;
  imagen: string | null;
  imagen_url: string | null;
}

interface Producto {
  id: number;
  nombre: string;
  marca: string;
  precio_venta: string | number;
  stock_actual: number;
  categoria_nombre: string;
  imagen_url: string | null;
}

interface Profesional {
  id: number;
  nombre: string;
  titulo: string;
  especialidad: string;
  foto: string | null;
  foto_url: string | null;
  activo: boolean;
}

interface Cliente {
  id: number;
  nombre: string;
  telefono: string;
  email: string;
  esRegistrado: boolean;
  userId?: number;
}

interface NuevoClienteData {
  nombre: string;
  telefono: string;
  email: string;
}

interface CitaProductoForm {
  productoId: number;
  productoNombre: string;
  productoMarca: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

interface ReciboItem {
  id: string;
  tipo: 'servicio' | 'producto';
  servicioId?: number;
  productoId?: number;
  descripcion: string;
  categoria: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  duracion?: string;
  profesionalId?: number;
  profesionalNombre?: string;
  imagenUrl?: string | null;
  productosAsociados: CitaProductoForm[];
  stockActual?: number;
  // ← ← ← NUEVO: Para rastrear citas existentes
  citaId?: number;
  codigoReserva?: string;
}

interface PropinaDistribucion {
  profesionalId: number;
  nombre: string;
  monto: number;
  porcentaje: number;
}

type TabType = 'control' | 'citas' | 'profesionales' | 'caja';

// ← ← ← FUNCIONES AUXILIARES ← ← ←

const getFechaLocal = (): string => {
  const ahora = new Date();
  const year = ahora.getFullYear();
  const month = String(ahora.getMonth() + 1).padStart(2, '0');
  const day = String(ahora.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getHoraLocal = (): string => {
  const ahora = new Date();
  const hours = String(ahora.getHours()).padStart(2, '0');
  const minutes = String(ahora.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value).replace('COP', '$').trim();
};

// ← ← ← FUNCIÓN PARA NORMALIZAR URLs DE IMÁGENES ← ← ←
const getImageUrl = (imagenPath: string | null, imagenUrl?: string | null): string | null => {
  const API_DOMAIN = 'https://api.dzsalon.com';
  
  // Si ya hay URL completa, normalizarla
  if (imagenUrl) {
    if (imagenUrl.startsWith('https://api.dzsalon.com')) return imagenUrl;
    if (imagenUrl.startsWith('/')) return `${API_DOMAIN}${imagenUrl}`;
    if (imagenUrl.startsWith('http')) {
      return imagenUrl
        .replace(/https?:\/\/127\.0\.0\.1/, API_DOMAIN)
        .replace(/https?:\/\/localhost/, API_DOMAIN)
        .replace(/https?:\/\/179\.43\.112\.64/, API_DOMAIN);
    }
  }
  
  // Si solo hay path relativo
  if (!imagenPath) return null;
  if (imagenPath.startsWith('http')) {
    return imagenPath
      .replace(/https?:\/\/127\.0\.0\.1/, API_DOMAIN)
      .replace(/https?:\/\/localhost/, API_DOMAIN)
      .replace(/https?:\/\/179\.43\.112\.64/, API_DOMAIN);
  }
  
  const imagePath = imagenPath.startsWith('/') ? imagenPath : `/${imagenPath}`;
  return `${API_DOMAIN}${imagePath}`;
};

// ← ← ← COMPONENTE PRINCIPAL ← ← ←

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<TabType>('control');
  
  // ← Datos principales
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [profesionales, setProfesionales] = useState<Profesional[]>([]);

  const [itemParaProfesional, setItemParaProfesional] = useState<ReciboItem | null>(null);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  
  // ← Búsquedas
  const [serviceSearchTerm, setServiceSearchTerm] = useState('');
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [clienteSearchTerm, setClienteSearchTerm] = useState('');
  
  // ← NUEVO: Categoría seleccionada para filtrar servicios
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<number | null>(null);
  
  // ← Modales
  const [showClientModal, setShowClientModal] = useState(false);
  const [showProfessionalModal, setShowProfessionalModal] = useState(false);
  const [showPaymentMethodModal, setShowPaymentMethodModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [productoModalOpen, setProductoModalOpen] = useState(false);
  const [itemParaProductos, setItemParaProductos] = useState<ReciboItem | null>(null);
  
  // ← Datos del recibo
  const [reciboItems, setReciboItems] = useState<ReciboItem[]>([]);
  const [clienteSeleccionadoId, setClienteSeleccionadoId] = useState<number | null>(null);
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteTelefono, setClienteTelefono] = useState('');
  const [clienteEmail, setClienteEmail] = useState('');
  
  // ← Propina y pago
  const [propinaTotal, setPropinaTotal] = useState(0);
  const [propinaMetodo, setPropinaMetodo] = useState<'equitativa' | 'proporcional' | 'manual'>('proporcional');
  const [propinaDistribucion, setPropinaDistribucion] = useState<PropinaDistribucion[]>([]);
  const [metodoPago, setMetodoPago] = useState<string>('bold');
  const [metodoPagoSeleccionadoId, setMetodoPagoSeleccionadoId] = useState<number | null>(null);
  
  // ← Datos adicionales
  const [datosAdicionalesOpen, setDatosAdicionalesOpen] = useState(false);
  const [fechaCita, setFechaCita] = useState(getFechaLocal());
  const [horaInicio, setHoraInicio] = useState(getHoraLocal());
  const [notasCliente, setNotasCliente] = useState('');

  // ← ← ← Estado para recibo que se va a editar en Caja ← ← ←
  const [reciboParaEditar, setReciboParaEditar] = useState<any | null>(null);
  
  // ← Nuevo cliente
  const [nuevoClienteData, setNuevoClienteData] = useState<NuevoClienteData>({
    nombre: '',
    telefono: '',
    email: ''
  });

  // ← API config
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dzsalon.com/api';
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;

  // ← ← ← CARGA DE DATOS INICIAL ← ← ←
  useEffect(() => {
    async function loadData() {
      try {
        console.log('🔍 [AdminPage] Cargando datos iniciales...');
        
        // ← ← ← CARGAR CATEGORÍAS ← ← ←
        const categoriasRes = await fetch(`${apiUrl}/categorias/?activo=true&ordering=orden`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        const categoriasData = await categoriasRes.json();
        const categoriasList = Array.isArray(categoriasData) ? categoriasData : (categoriasData.results || []);
        setCategorias(categoriasList);
        
        const [serviciosData, productosData, profsData] = await Promise.all([
          api.getAllServicios ? api.getAllServicios() : api.getServicios(),
          fetch(`${apiUrl}/productos/?activo=true&limit=20`, {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
          }).then(res => res.ok ? res.json() : { results: [] }),
          api.getProfesionales(),
        ]);
        
        const serviciosList = Array.isArray(serviciosData) ? serviciosData : (serviciosData.results || []);
        const productosList = Array.isArray(productosData) ? productosData : (productosData.results || []);
        const profsList = Array.isArray(profsData) ? profsData : (profsData.results || []);
        
        setServicios(serviciosList.slice(0, 300)); // Cargar más servicios para filtrar por categoría
        setProductos(productosList);
        setProfesionales(profsList);
        
        console.log(`✅ [AdminPage] Cargados: ${categoriasList.length} categorías, ${serviciosList.length} servicios, ${productosList.length} productos, ${profsList.length} profesionales`);
      } catch (err) {
        console.error('❌ [AdminPage] Error cargando datos:', err);
      }
    }
    loadData();
  }, []);

  // ← Cargar clientes cuando se abre el modal
  useEffect(() => {
    if (showClientModal) {
      loadClientes();
    }
  }, [showClientModal]);

  // En AdminPage, dentro del useEffect principal o en un useEffect separado:
useEffect(() => {
  const handleRedirigirAsignarProfesionales = (event: CustomEvent) => {
    const { reciboId, origen } = event.detail;
    console.log('🔄 [AdminPage] Redirigiendo para asignar profesionales:', { reciboId, origen });
    
    // Cambiar al tab de control
    setActiveTab('control');
    
    // Opcional: cargar el recibo para edición si es necesario
     setReciboParaEditar(reciboId);
  };

  window.addEventListener('redirigirAsignarProfesionales', handleRedirigirAsignarProfesionales as EventListener);
  
  return () => {
    window.removeEventListener('redirigirAsignarProfesionales', handleRedirigirAsignarProfesionales as EventListener);
  };
}, []);

  const loadClientes = async () => {
    try {
      const usuariosRes = await fetch(`${apiUrl}/usuarios/`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      
      let usuariosRegistrados: Cliente[] = [];
      if (usuariosRes.ok) {
        const usuariosData = await usuariosRes.json();
        const usuariosList = Array.isArray(usuariosData) ? usuariosData : (usuariosData.results || []);
        
        usuariosRegistrados = usuariosList.map((u: any) => ({
          id: u.id,
          nombre: [u.first_name, u.last_name, '-', u.username].filter(Boolean).join(' ').trim() || u.email?.split('@')[0] || 'Usuario',
          telefono: u.perfil?.telefono || u.telefono || u.username || '',
          email: u.email || '',
          esRegistrado: true,
          userId: u.id
        }));
      }
      
      const citasRes = await fetch(`${apiUrl}/citas/`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      
      let clientesNoRegistrados: Cliente[] = [];
      if (citasRes.ok) {
        const citasData = await citasRes.json();
        const citasList = Array.isArray(citasData) ? citasData : (citasData.results || []);
        
        const clientesMap = new Map<string, Cliente>();
        for (const cita of citasList) {
          const nombre = cita.cliente_nombre?.trim();
          const email = cita.cliente_email?.trim()?.toLowerCase();
          const clienteId = cita.cliente;
          
          if (!nombre || clienteId) continue;
          
          const key = `${nombre.toLowerCase()}|${email || ''}`;
          if (!clientesMap.has(key)) {
            clientesMap.set(key, {
              id: -Date.now() - Math.random() * 1000,
              nombre: nombre,
              telefono: cita.cliente_telefono || '',
              email: email || '',
              esRegistrado: false
            });
          }
        }
        clientesNoRegistrados = Array.from(clientesMap.values());
      }
      
      const clientesCombinadosMap = new Map<number, Cliente>();
      for (const usuario of usuariosRegistrados) clientesCombinadosMap.set(usuario.id, usuario);
      for (const cliente of clientesNoRegistrados) clientesCombinadosMap.set(cliente.id, cliente);
      
      const todosClientes = Array.from(clientesCombinadosMap.values())
        .sort((a, b) => {
          if (a.esRegistrado && !b.esRegistrado) return -1;
          if (!a.esRegistrado && b.esRegistrado) return 1;
          return a.nombre.localeCompare(b.nombre);
        });
      
      setClientes(todosClientes.slice(0, 300));
    } catch (err) {
      console.error('❌ [AdminPage] Error cargando clientes:', err);
    }
  };

  // ← ← ← FILTROS DE BÚSQUEDA ← ← ←
  
  // ← ← ← NUEVO: Servicios filtrados por categoría seleccionada (cuando NO hay búsqueda)
  const serviciosPorCategoria = useMemo(() => {
    if (categoriaSeleccionada === null) return servicios;
    return servicios.filter(s => s.categoria === categoriaSeleccionada);
  }, [servicios, categoriaSeleccionada]);
  
// ← ← ← FILTROS DE BÚSQUEDA (prioridad sobre categoría) ← ← ←
const serviciosFiltrados = useMemo(() => {
  if (!serviceSearchTerm.trim()) return serviciosPorCategoria;
  
  const searchTerm = serviceSearchTerm.toLowerCase();
  
  return servicios.filter(s => {
    // ← ← ← VERIFICAR QUE LOS CAMPOS EXISTAN ANTES DE USAR toLowerCase ← ← ←
    const nombre = s.nombre?.toLowerCase() || '';
    const categoria = s.categoria_nombre?.toLowerCase() || '';
    
    return nombre.includes(searchTerm) || categoria.includes(searchTerm);
  });
}, [servicios, serviceSearchTerm, serviciosPorCategoria]);

  const productosFiltrados = useMemo(() => {
  if (!productSearchTerm.trim()) return productos;
  
  const searchTerm = productSearchTerm.toLowerCase();
  
  return productos.filter(p => {
    const nombre = p.nombre?.toLowerCase() || '';
    const marca = p.marca?.toLowerCase() || '';
    
    return nombre.includes(searchTerm) || marca.includes(searchTerm);
  });
}, [productos, productSearchTerm]);

  const clientesFiltrados = useMemo(() => {
    if (!clienteSearchTerm.trim()) return clientes;
    return clientes.filter(c => 
      c.nombre.toLowerCase().includes(clienteSearchTerm.toLowerCase()) ||
      c.telefono.includes(clienteSearchTerm) ||
      c.email.toLowerCase().includes(clienteSearchTerm.toLowerCase())
    );
  }, [clientes, clienteSearchTerm]);

  // ← ← ← CÁLCULOS AUTOMÁTICOS ← ← ←
  const subtotal = useMemo(() => {
    return reciboItems.reduce((sum, item) => sum + item.subtotal, 0);
  }, [reciboItems]);

  const total = useMemo(() => {
    return subtotal + propinaTotal;
  }, [subtotal, propinaTotal]);

  const calcularDistribucionPropina = useMemo(() => {
    if (propinaTotal <= 0) return [];
    
    const profesionalesConServicios = Array.from(
      new Set(
        reciboItems
          .filter(item => item.tipo === 'servicio' && item.profesionalId)
          .map(item => item.profesionalId)
      )
    ).map(id => profesionales.find(p => p.id === id)).filter(Boolean) as Profesional[];
    
    if (profesionalesConServicios.length === 0) return [];
    
    if (propinaMetodo === 'equitativa') {
      const montoPorPersona = propinaTotal / profesionalesConServicios.length;
      return profesionalesConServicios.map(p => ({
        profesionalId: p!.id,
        nombre: p!.nombre,
        monto: Math.round(montoPorPersona),
        porcentaje: Math.round(100 / profesionalesConServicios.length)
      }));
    }
    
    if (propinaMetodo === 'proporcional') {
      const subtotalesPorProfesional = new Map<number, number>();
      
      reciboItems
        .filter(item => item.tipo === 'servicio' && item.profesionalId)
        .forEach(item => {
          const current = subtotalesPorProfesional.get(item.profesionalId!) || 0;
          subtotalesPorProfesional.set(item.profesionalId!, current + item.subtotal);
        });
      
      const totalServicios = Array.from(subtotalesPorProfesional.values()).reduce((a, b) => a + b, 0);
      
      if (totalServicios === 0) return [];
      
      return Array.from(subtotalesPorProfesional.entries()).map(([profId, subtotal]) => {
        const profesional = profesionales.find(p => p.id === profId);
        const porcentaje = (subtotal / totalServicios) * 100;
        return {
          profesionalId: profId,
          nombre: profesional?.nombre || 'Desconocido',
          monto: Math.round(propinaTotal * (porcentaje / 100)),
          porcentaje: Math.round(porcentaje)
        };
      });
    }
    
    return profesionalesConServicios.map(p => ({
      profesionalId: p!.id,
      nombre: p!.nombre,
      monto: 0,
      porcentaje: 0
    }));
  }, [propinaTotal, propinaMetodo, reciboItems, profesionales]);

  // ← ← ← AGREGAR ITEMS AL RECIBO ← ← ←
  const agregarServicio = (servicio: Servicio) => {
    const precio = typeof servicio.precio_min === 'string' ? parseFloat(servicio.precio_min) : servicio.precio_min;
    
    const nuevoItem: ReciboItem = {
      id: `servicio-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      tipo: 'servicio',
      servicioId: servicio.id,
      citaId: undefined,  // ← ← ← NUEVO: undefined para servicios nuevos
      codigoReserva: undefined,
      descripcion: servicio.nombre,
      categoria: servicio.categoria_nombre,
      cantidad: 1,
      precioUnitario: precio,
      subtotal: precio,
      duracion: servicio.duracion,
      // ← ← ← CAMBIO: Dejar profesional en null/undefined para que el usuario seleccione
      profesionalId: undefined,
      profesionalNombre: undefined,
      imagenUrl: servicio.imagen_url,
      productosAsociados: []
    };
    
    setReciboItems(prev => [...prev, nuevoItem]);
    setServiceSearchTerm('');
    
    // ← ← ← NUEVO: Regresar automáticamente a categorías después de agregar servicio
    //setCategoriaSeleccionada(null);
  };

  const agregarProducto = (producto: Producto) => {
    const precio = typeof producto.precio_venta === 'string' ? parseFloat(producto.precio_venta) : producto.precio_venta;
    
    const nuevoItem: ReciboItem = {
      id: `producto-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      tipo: 'producto',
      productoId: producto.id,
      descripcion: producto.nombre,
      categoria: producto.categoria_nombre,
      cantidad: 1,
      precioUnitario: precio,
      subtotal: precio,
      imagenUrl: producto.imagen_url,
      stockActual: producto.stock_actual,
      productosAsociados: []
    };
    
    setReciboItems(prev => [...prev, nuevoItem]);
    setProductSearchTerm('');
  };

  // ← Actualizar cantidad
  const actualizarCantidad = (itemId: string, nuevaCantidad: number) => {
    if (nuevaCantidad < 1) return;
    
    setReciboItems(prev => prev.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          cantidad: nuevaCantidad,
          subtotal: nuevaCantidad * item.precioUnitario
        };
      }
      return item;
    }));
  };

  // ← Actualizar precio
  const actualizarPrecio = (itemId: string, nuevoPrecio: number) => {
    if (nuevoPrecio < 0) return;
    
    setReciboItems(prev => prev.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          precioUnitario: nuevoPrecio,
          subtotal: item.cantidad * nuevoPrecio
        };
      }
      return item;
    }));
  };

  // ← Remover item
  const removerItem = (itemId: string) => {
    setReciboItems(prev => prev.filter(item => item.id !== itemId));
  };

  // ← Seleccionar cliente
  const handleClienteSelect = (cliente: Cliente) => {
    setClienteNombre(cliente.nombre);
    setClienteTelefono(cliente.telefono);
    setClienteEmail(cliente.email);
    setClienteSeleccionadoId(cliente.esRegistrado ? cliente.userId || null : null);
    setShowClientModal(false);
  };

  // ← Nuevo cliente
  const handleNuevoCliente = () => {
    setNuevoClienteData({ nombre: '', telefono: '', email: '' });
    setShowRegisterModal(true);
  };

  const handleGuardarNuevoCliente = () => {
    if (!nuevoClienteData.nombre.trim()) {
      alert('⚠️ El nombre es requerido');
      return;
    }
    
    setClienteNombre(nuevoClienteData.nombre);
    setClienteTelefono(nuevoClienteData.telefono);
    setClienteEmail(nuevoClienteData.email);
    setClienteSeleccionadoId(null);
    setShowRegisterModal(false);
    setShowClientModal(false);
    alert(`✅ Cliente "${nuevoClienteData.nombre}" agregado`);
  };

  // ← ← ← MODAL DE PRODUCTOS PARA ITEM ← ← ←
  const handleOpenProductosModal = (item: ReciboItem) => {
    setItemParaProductos(item);
    setProductoModalOpen(true);
  };

  const handleProductosSeleccionados = async (productos: ProductoSeleccionado[]) => {
    if (!itemParaProductos) return;
    
    const productosForm: CitaProductoForm[] = productos.map(p => ({
      productoId: p.productoId,
      productoNombre: p.productoNombre,
      productoMarca: p.productoMarca,
      cantidad: p.cantidad,
      precioUnitario: p.precioUnitario,
      subtotal: p.subtotal
    }));
    
    setReciboItems(prev => prev.map(item => 
      item.id === itemParaProductos.id 
        ? { ...item, productosAsociados: productosForm }
        : item
    ));
    
    setProductoModalOpen(false);
    setItemParaProductos(null);
  };

 // ← ← ← CREAR RECIBO + CITAS AUTOMÁTICAS ← ← ←
const handleCrearRecibo = async () => {
  if (reciboItems.length === 0) {
    alert('⚠️ Agrega al menos un servicio o producto');
    return;
  }
  if (!clienteNombre.trim()) {
    alert('⚠️ Ingresa el nombre del cliente');
    return;
  }

  try {
    // Calcular hora fin basada en el primer servicio
    const primerServicio = reciboItems.find(item => item.tipo === 'servicio');
    let horaFinBase = horaInicio;
    
    if (primerServicio && primerServicio.duracion) {
      const duracionMinutos = parseInt(primerServicio.duracion.replace(/\D/g, '')) || 60;
      const [hours, minutes] = horaInicio.split(':').map(Number);
      const fechaInicio = new Date();
      fechaInicio.setHours(hours, minutes, 0, 0);
      const fechaFin = new Date(fechaInicio.getTime() + duracionMinutos * 60000);
      horaFinBase = `${String(fechaFin.getHours()).padStart(2, '0')}:${String(fechaFin.getMinutes()).padStart(2, '0')}`;
    }

    const codigoReserva = 'DZ-' + Math.random().toString(36).substr(2, 6).toUpperCase();

    // ← ← ← CORREGIDO: itemsPayload compatible con backend y frontend ← ← ←
    // ← ← ← CORREGIDO: itemsPayload para el backend ← ← ←
    const itemsPayload = reciboItems.map((item) => {
      const baseItem = {
        tipo_item: item.tipo,
        descripcion: item.descripcion,
        cantidad: item.cantidad,
        precio_unitario: item.precioUnitario,
        subtotal: item.subtotal
      };

      // CASO A: Servicio Nuevo (Desde categorías o buscador)
      // → Enviamos 'servicio_id' para que el backend cree la cita automáticamente.
      // → NO enviamos 'cita'.
      if (item.tipo === 'servicio' && item.servicioId) {
        return {
          ...baseItem,
          servicio_id: item.servicioId,
          profesional: item.profesionalId || null
        };
      }

      // CASO B: Cita Existente (Vinculada desde otro modal)
      // → Enviamos el ID de la cita ya creada.
      if (item.tipo === 'servicio' && item.citaId) {
        return {
          ...baseItem,
          cita: item.citaId,
          servicio_id: item.servicioId || null, // Referencia opcional
          profesional: item.profesionalId || null
        };
      }

      // CASO C: Producto
      if (item.tipo === 'producto' && item.productoId) {
        return {
          ...baseItem,
          producto: item.productoId
        };
      }

      return baseItem;
    });


        // ← ← ← PAYLOAD DEL RECIBO CON FECHA/HORA PARA CITAS ← ← ←
    const payloadRecibo = {
      tipo: 'venta',
      estado: 'borrador',
      subtotal: subtotal,
      descuento: 0,
      total: total,
      propina_total: propinaTotal,
      propina_distribuida: propinaTotal > 0 && propinaDistribucion.length > 0,
      propina_metodo_distribucion: propinaTotal > 0 ? propinaMetodo : null,
      metodo_pago: metodoPago,
      cliente_nombre: clienteNombre,
      cliente_telefono: clienteTelefono,
      cliente_email: clienteEmail,
      notas: notasCliente || '',
      
      // ← ← ← CLAVE: El backend usa esto para crear las citas nuevas
      fecha_cita: fechaCita,       
      hora_inicio_cita: horaInicio, 
      
      items_data: itemsPayload,
    };

    console.log('📦 [AdminPage] Creando recibo borrador:', payloadRecibo);

    // ← ← ← PASO 1: CREAR RECIBO ← ← ←
    const resRecibo = await fetch(`${apiUrl}/caja/recibos/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify(payloadRecibo)
    });

    // ← ← ← MANEJAR RESPUESTA NO-JSON (error 500 devuelve HTML) ← ← ←
    if (!resRecibo.ok) {
      const errorText = await resRecibo.text();
      console.error('❌ Error raw del servidor:', errorText.substring(0, 500));
      
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { detail: errorText.substring(0, 200) };
      }
      console.error('❌ Error creando recibo:', errorData);
      throw new Error(errorData.detail || JSON.stringify(errorData));
    }

    const reciboCreado = await resRecibo.json();
    console.log('✅ [AdminPage] Recibo creado:', reciboCreado.codigo_recibo);

    // ← ← ← PASO 3: DISTRIBUIR PROPINA SI APLICA ← ← ←
    if (propinaTotal > 0 && propinaDistribucion.length > 0) {
      await fetch(`${apiUrl}/caja/recibos/${reciboCreado.id}/distribuir-propina/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          monto_propina: propinaTotal,
          metodo: propinaMetodo,
          distribucion: propinaDistribucion.map(d => ({
            profesional: d.profesionalId,
            monto: d.monto,
            porcentaje: d.porcentaje
          }))
        })
      });
    }

    // ← ← ← MENSAJE FINAL SIMPLIFICADO ← ← ←
    alert(`✅ Recibo ${reciboCreado.codigo_recibo} creado con citas agendadas`);

    // ← ← ← REDIRIGIR A CAJA ← ← ←
    setActiveTab('caja');

    // ← ← ← NUEVO: Disparar evento para abrir modal de edición en CajaPage ← ← ←
    // Pequeño delay para asegurar que CajaPage esté montado y escuchando
    setTimeout(() => {
      console.log('📦 [AdminPage] Disparando evento para abrir recibo en Caja:', reciboCreado.id);
      window.dispatchEvent(new CustomEvent('abrirReciboBorrador', {
        detail: { reciboId: reciboCreado.id }
      }));
    }, 150);  // ← ← ← Delay de 150ms para asegurar que CajaPage esté listo

    // ← ← ← RESETEAR FORMULARIO ← ← ←
    setReciboItems([]);
    // ... resto del reset ...

    // ← ← ← RESETEAR FORMULARIO ← ← ←
    setReciboItems([]);
    setPropinaTotal(0);
    setPropinaDistribucion([]);
    setClienteNombre('');
    setClienteTelefono('');
    setClienteEmail('');
    setClienteSeleccionadoId(null);
    setMetodoPago('efectivo');
    setFechaCita(getFechaLocal());
    setHoraInicio(getHoraLocal());
    setNotasCliente('');

  } catch (err: any) {
    console.error('❌ [AdminPage] Error creando recibo:', err);
    alert(`❌ Error: ${err.message}`);
  }
};

 // ← ← ← MANEJO DE INPUT DE PROPINA ← ← ←
      const handlePropinaFocus = (e: React.FocusEvent<HTMLInputElement>) => {
        // Seleccionar todo el texto al obtener foco
        e.target.select();
      };

      const handlePropinaBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        // Si está vacío al perder foco, establecer 0
        const value = e.target.value;
        if (!value || value.trim() === '') {
          setPropinaTotal(0);
        }
      };

      const handlePropinaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        // Permitir vacío temporalmente mientras escribe
        if (value === '') {
          setPropinaTotal(0);
        } else {
          const numValue = parseFloat(value);
          setPropinaTotal(isNaN(numValue) ? 0 : numValue);
        }
      };

  const handleCancelar = () => {
    if (confirm('¿Estás seguro de cancelar? Se perderán todos los datos del recibo.')) {
      setReciboItems([]);
      setPropinaTotal(0);
      setPropinaDistribucion([]);
      setClienteNombre('');
      setClienteTelefono('');
      setClienteEmail('');
      setClienteSeleccionadoId(null);
      setMetodoPago('bold');
      setFechaCita(getFechaLocal());
      setHoraInicio(getHoraLocal());
      setNotasCliente('');
      setServiceSearchTerm('');
      setProductSearchTerm('');
      setCategoriaSeleccionada(null); // ← ← ← NUEVO: Resetear categoría al cancelar
    }
  };

  // ← ← ← RENDERIZADO ← ← ←
  return (
    <div className="min-h-screen bg-gray-900 -mx-4 -my-2">
      
      {/* ========== HEADER CON TABS ========== */}
      <div className="bg-gradient-to-r from-gray-800 to-gray-900 shadow-xl border-b border-gray-700">
        <div className="px-6">
          <div className="flex gap-0 overflow-x-auto">
            {(['control', 'citas', 'profesionales', 'caja'] as TabType[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-4 font-semibold transition-all border-b-4 whitespace-nowrap ${
                  activeTab === tab
                    ? 'bg-gray-700 text-white border-blue-500'
                    : 'bg-transparent text-gray-400 border-transparent hover:bg-gray-800 hover:text-white'
                }`}
              >
                {tab === 'control' && '📋 Control de Citas'}
                {tab === 'citas' && '📅 Citas'}
                {tab === 'profesionales' && '👨‍️ Profesionales'}
                {tab === 'caja' && '🏦 Caja'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ========== CONTENIDO PRINCIPAL ========== */}
      <div className="p-4">
        
        {/* TAB: CONTROL */}
        {activeTab === 'control' && (
          <div className="grid grid-cols-12 gap-4 min-h-[calc(100vh-180px)]">
            
            {/* ========== PANEL IZQUIERDO (70%) ========== */}
            <div className="col-span-12 lg:col-span-8 xl:col-span-9 flex flex-col">
              
              {/* Buscadores */}
              <div className="mb-4">
                <div>
                  <input
                    type="text"
                    placeholder="🔍 Buscar servicios o productos..."
                    value={serviceSearchTerm}
                    onChange={(e) => {
                      setServiceSearchTerm(e.target.value);
                      // ← ← ← NUEVO: Al buscar, ocultar categorías y mostrar resultados
                      if (e.target.value.trim()) {
                        setCategoriaSeleccionada(null);
                      }
                    }}
                    className="w-full px-4 py-3 bg-gray-800 border-2 border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* ← ← ← NUEVO: Mostrar categorías SOLO si NO hay búsqueda activa ← ← ← */}
              {!serviceSearchTerm.trim() && !productSearchTerm.trim() && categoriaSeleccionada === null && (
                <>
                {/* Grid de Categorías - Cards ~40% más pequeñas que original */}
                  <div className="overflow-y-auto pr-2 bg-gray-900 max-h-[calc(100vh-280px)] mb-4">
                    <h3 className="text-sm font-semibold text-gray-300 mb-2 px-2">
                      📁 Categorías
                    </h3>
                    
                    {/* ← ← ← Grid ultra-compacto: más columnas + gap mínimo ← ← ← */}
                    <div className="grid grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-1.5">
                      {categorias.map((categoria) => {
                        // ← ← ← NORMALIZAR URL DE IMAGEN ← ← ←
                        const categoriaImagenUrl = getImageUrl(
                          categoria.imagen ?? null,
                          categoria.imagen_url ?? null
                        );
                        
                        return (
                          <button
                            key={`categoria-${categoria.id}`}
                            onClick={() => setCategoriaSeleccionada(categoria.id)}
                            className="relative aspect-square rounded-md overflow-hidden hover:shadow-lg transition-all transform hover:scale-105 border border-gray-700 hover:border-blue-500"
                          >
                            <div className="absolute inset-0">
                              {categoriaImagenUrl ? (
                                <img 
                                  src={categoriaImagenUrl} 
                                  alt={categoria.nombre} 
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                    if (target.parentElement) {
                                      target.parentElement.innerHTML = `
                                        <div class="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-700 to-gray-800">
                                          <span class="text-xl">${categoria.icono || '📁'}</span>
                                        </div>
                                      `;
                                    }
                                  }}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-700 to-gray-800">
                                  <span className="text-xl">{categoria.icono || '📁'}</span>
                                </div>
                              )}
                              
                              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent" />
                              
                              {/* ← ← ← Textos ultra-compactos ← ← ← */}
                              <div className="absolute inset-0 p-1 flex flex-col justify-end">
                                <h3 className="font-medium text-[12px] text-white mb-0.5 line-clamp-2 drop-shadow-lg leading-tight">
                                  {categoria.nombre}
                                </h3>
                                <p className="text-[10px] text-gray-300 drop-shadow leading-none">
                                  {categoria.servicios_count} svc
                                </p>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              {/* ← ← ← NUEVO: Vista de servicios de categoría seleccionada ← ← ← */}
              {categoriaSeleccionada !== null && !serviceSearchTerm.trim() && !productSearchTerm.trim() && (
                <>
                  {/* Botón Regresar + Título */}
                  <div className="flex items-center justify-between mb-4 px-2">
                    <button
                      onClick={() => setCategoriaSeleccionada(null)}
                      className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      Regresar a categorías
                    </button>
                    <h3 className="text-sm font-semibold text-gray-300">
                      📋 {categorias.find(c => c.id === categoriaSeleccionada)?.nombre}
                    </h3>
                  </div>
                  
                  {/* Grid de Servicios de la categoría */}
                  <div className="overflow-y-auto pr-2 bg-gray-900 max-h-[calc(100vh-280px)]">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                      {serviciosPorCategoria.map((servicio) => (
                        <button
                          key={`servicio-${servicio.id}`}
                          onClick={() => agregarServicio(servicio)}
                          className="relative aspect-square rounded-xl overflow-hidden hover:shadow-2xl transition-all transform hover:scale-105 border-2 border-gray-700 hover:border-blue-500"
                        >
                          <div className="absolute inset-0">
                            {servicio.imagen_url ? (
                              <img src={servicio.imagen_url} alt={servicio.nombre} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gray-800">
                                <span className="text-4xl">🔧</span>
                              </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
                            <div className="absolute inset-0 p-2 flex flex-col justify-end">
                              <h3 className="font-bold text-xs text-white mb-0.5 line-clamp-2 drop-shadow-lg">
                                {servicio.nombre}
                              </h3>
                              <p className="text-[10px] text-gray-300 mb-1 line-clamp-1 drop-shadow">
                                {servicio.categoria_nombre}
                              </p>
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-bold text-blue-400 drop-shadow">
                                  ${typeof servicio.precio_min === 'string' ? parseInt(servicio.precio_min).toLocaleString() : servicio.precio_min}
                                </p>
                                {servicio.duracion && (
                                  <p className="text-[10px] text-gray-400 drop-shadow">⏱ {servicio.duracion}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>

                    {serviciosPorCategoria.length === 0 && (
                      <div className="text-center py-12 bg-gray-800 rounded-xl mt-4">
                        <p className="text-gray-400 text-lg">
                          Esta categoría no tiene servicios disponibles
                        </p>
                        <button
                          onClick={() => setCategoriaSeleccionada(null)}
                          className="mt-4 text-sm text-blue-400 hover:text-blue-300"
                        >
                          ← Regresar a categorías
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Grid de búsqueda (servicios/productos) - Solo si hay término de búsqueda */}
              {(serviceSearchTerm.trim() || productSearchTerm.trim()) && (
                <div className="overflow-y-auto pr-2 bg-gray-900 max-h-[calc(100vh-280px)]">
                  <h3 className="text-sm font-semibold text-gray-300 mb-3 px-2">
                    🔍 Resultados para "{serviceSearchTerm || productSearchTerm}"
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                    
                    {/* Servicios filtrados por búsqueda */}
                    {serviceSearchTerm.trim() && serviciosFiltrados.map((servicio) => (
                      <button
                        key={`servicio-${servicio.id}`}
                        onClick={() => agregarServicio(servicio)}
                        className="relative aspect-square rounded-xl overflow-hidden hover:shadow-2xl transition-all transform hover:scale-105 border-2 border-gray-700 hover:border-blue-500"
                      >
                        <div className="absolute inset-0">
                          {servicio.imagen_url ? (
                            <img src={servicio.imagen_url} alt={servicio.nombre} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-800">
                              <span className="text-4xl">🔧</span>
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
                          <div className="absolute inset-0 p-2 flex flex-col justify-end">
                            <h3 className="font-bold text-xs text-white mb-0.5 line-clamp-2 drop-shadow-lg">
                              {servicio.nombre}
                            </h3>
                            <p className="text-[10px] text-gray-300 mb-1 line-clamp-1 drop-shadow">
                              {servicio.categoria_nombre}
                            </p>
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-bold text-blue-400 drop-shadow">
                                ${typeof servicio.precio_min === 'string' ? parseInt(servicio.precio_min).toLocaleString() : servicio.precio_min}
                              </p>
                              {servicio.duracion && (
                                <p className="text-[10px] text-gray-400 drop-shadow">⏱ {servicio.duracion}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}

                    {/* Productos filtrados por búsqueda */}
                    {productosFiltrados.map((producto) => (
                      <button
                        key={`producto-${producto.id}`}
                        onClick={() => agregarProducto(producto)}
                        className="relative aspect-square rounded-xl overflow-hidden hover:shadow-2xl transition-all transform hover:scale-105 border-2 border-gray-700 hover:border-purple-500"
                      >
                        <div className="absolute inset-0">
                          {producto.imagen_url ? (
                            <img src={producto.imagen_url} alt={producto.nombre} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-800">
                              <span className="text-4xl">📦</span>
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
                          <div className="absolute inset-0 p-2 flex flex-col justify-end">
                            <h3 className="font-bold text-xs text-white mb-0.5 line-clamp-2 drop-shadow-lg">
                              {producto.nombre}
                            </h3>
                            <p className="text-[10px] text-gray-300 mb-1 line-clamp-1 drop-shadow">
                              {producto.marca}
                            </p>
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-bold text-purple-400 drop-shadow">
                                ${typeof producto.precio_venta === 'string' ? parseInt(producto.precio_venta).toLocaleString() : producto.precio_venta}
                              </p>
                              <p className={`text-[10px] drop-shadow ${producto.stock_actual > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                📦 {producto.stock_actual}
                              </p>
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>

                  {serviciosFiltrados.length === 0 && productosFiltrados.length === 0 && (serviceSearchTerm.trim() || productSearchTerm.trim()) && (
                    <div className="text-center py-12 bg-gray-800 rounded-xl mt-4">
                      <p className="text-gray-400 text-lg">
                        No se encontraron resultados para "{serviceSearchTerm || productSearchTerm}"
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ========== PANEL DERECHO (30%) ========== */}
            <div className="col-span-12 lg:col-span-4 xl:col-span-3">
              <div className="bg-gray-800 rounded-xl shadow-2xl border-2 border-gray-700 sticky top-4 self-start max-h-[calc(100vh-100px)] flex flex-col">
                
                {/* [20%] HEADER */}
                <div className="p-4 border-b border-gray-700 flex-shrink-0">
                  <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                    <span className="text-2xl">📝</span> Nuevo Recibo
                  </h2>
                  
                  {/* Cliente */}
                  <div className="mb-3">
                    <label className="block text-xs font-semibold text-gray-400 mb-1 flex items-center justify-between">
                      <span>👤 Cliente</span>
                      <button
                        type="button"
                        onClick={() => setShowClientModal(true)}
                        className="text-blue-400 hover:text-blue-300 text-xs flex items-center gap-1"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        Buscar
                      </button>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={clienteNombre}
                        onChange={(e) => setClienteNombre(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm focus:border-blue-500 focus:outline-none pr-8"
                        placeholder="Nombre del cliente"
                      />
                      {clienteSeleccionadoId && (
                        <button
                          onClick={() => {
                            setClienteSeleccionadoId(null);
                            setClienteNombre('');
                            setClienteTelefono('');
                            setClienteEmail('');
                          }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-400"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Acordeón Datos Adicionales */}
                  <div className="border border-gray-700 rounded-lg overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setDatosAdicionalesOpen(!datosAdicionalesOpen)}
                      className="w-full px-3 py-2 bg-gray-700/50 hover:bg-gray-700 transition-colors flex items-center justify-between"
                    >
                      <span className="text-xs font-semibold text-gray-300">📋 Datos adicionales</span>
                      <svg className={`w-4 h-4 text-gray-400 transition-transform ${datosAdicionalesOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {datosAdicionalesOpen && (
                      <div className="px-3 py-2 bg-gray-800/50 space-y-2 border-t border-gray-700">
                        <input
                          type="date"
                          value={fechaCita}
                          onChange={(e) => setFechaCita(e.target.value)}
                          className="w-full px-2 py-1.5 bg-gray-900 border border-gray-600 rounded text-white text-xs"
                        />
                        <input
                          type="time"
                          value={horaInicio}
                          onChange={(e) => setHoraInicio(e.target.value)}
                          className="w-full px-2 py-1.5 bg-gray-900 border border-gray-600 rounded text-white text-xs"
                        />
                        <textarea
                          value={notasCliente}
                          onChange={(e) => setNotasCliente(e.target.value)}
                          placeholder="Notas adicionales..."
                          rows={2}
                          className="w-full px-2 py-1.5 bg-gray-900 border border-gray-600 rounded text-white text-xs resize-none"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* [60%] ITEMS DEL RECIBO - 2 Columnas */}
                <div className="flex-1 overflow-y-auto p-4">
                  <h3 className="text-sm font-semibold text-gray-300 mb-3">
                    📦 Items del Recibo ({reciboItems.length})
                  </h3>
                  
                  {reciboItems.length === 0 ? (
                    <p className="text-center text-gray-400 py-8 text-sm">
                      Agrega servicios o productos de la izquierda
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {reciboItems.map((item) => (
                        <div key={item.id} className="relative rounded-lg overflow-hidden border border-gray-700 bg-gray-900">
                          {/* Imagen de fondo compacta */}
                          <div className="absolute inset-0 h-16">
                            {item.imagenUrl ? (
                              <img src={item.imagenUrl} alt={item.descripcion} className="w-full h-full object-cover opacity-30" />
                            ) : (
                              <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                                <span className="text-xl">{item.tipo === 'servicio' ? '🔧' : '📦'}</span>
                              </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/80 to-transparent" />
                          </div>
                          
                          {/* Contenido compacto */}
                          <div className="relative p-2">
                            <div className="flex items-start justify-between mb-1">
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-white text-xs truncate">{item.descripcion}</p>
                                <p className="text-[10px] text-gray-400 truncate">{item.categoria}</p>
                              </div>
                              <button
                                onClick={() => removerItem(item.id)}
                                className="text-red-400 hover:text-red-300 ml-1 flex-shrink-0"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                            
                            {/* Fila única: Cantidad | Precio | Subtotal */}
                              <div className="flex items-center gap-1 mb-2">
                                
                                {/* ← ← ← CANTIDAD: Ancho reducido a la mitad (w-6) + sin spinners ← ← ← */}
                                <input
                                  type="number"
                                  min="1"
                                  value={item.cantidad}
                                  onChange={(e) => actualizarCantidad(item.id, parseInt(e.target.value) || 1)}
                                  className="w-6 bg-gray-800 border border-gray-600 rounded py-0.5 text-white text-xs text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                                
                                <div className="flex-1">
                                  {/* ← ← ← PRECIO: Sin spinners ← ← ← */}
                                  <input
                                    type="number"
                                    min="0"
                                    step="100"
                                    value={item.precioUnitario}
                                    onChange={(e) => actualizarPrecio(item.id, parseFloat(e.target.value) || 0)}
                                    className="w-full bg-gray-800 border border-gray-600 rounded py-0.5 text-white text-xs px-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  />
                                </div>
                                <span className="text-xs font-bold text-blue-400 whitespace-nowrap">
                                  {formatCurrency(item.subtotal)}
                                </span>
                              </div>
                            
                            {/* Botones compactos */}
                            <div className="flex gap-1">
                              {item.tipo === 'servicio' && (
                               <button
                                onClick={() => {
                                  setItemParaProfesional(item);
                                  setShowProfessionalModal(true);
                                }}
                                className="flex-1 flex items-center justify-center px-1 py-0.5 bg-blue-900/30 border border-blue-700 rounded text-[10px] text-blue-300 hover:bg-blue-900/50"
                              >
                                👨 {item.profesionalNombre ? '✓' : 'Profesinal'}
                              </button>
                              )}
                             {/* <button
                                onClick={() => handleOpenProductosModal(item)}
                                className="flex-1 flex items-center justify-center px-1 py-0.5 bg-purple-900/30 border border-purple-700 rounded text-[10px] text-purple-300 hover:bg-purple-900/50"
                              >
                                📦 {item.productosAsociados.length}
                              </button>*/}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

           {/* [15%] SECCIÓN PAGO - Compacta */}
            <div className="p-3 border-t border-gray-700 flex-shrink-0 bg-gray-900/50 space-y-2">
              
              {/* Propina + Método en una fila - Mismo ancho para ambos */}
              <div className="flex items-center gap-2">
                
                {/* ← ← ← LABEL DE PROPINA (ancho fijo) ← ← ← */}
                <span className="text-xs font-semibold text-gray-400 whitespace-nowrap w-16">
                  💎 Propina:
                </span>
                
                {/* ← ← ← INPUT DE PROPINA (50% del espacio restante) ← ← ← */}
                <div className="flex-1 relative min-w-0">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={propinaTotal === 0 ? '' : propinaTotal}  /* ← Mostrar vacío si es 0 */
                    onFocus={handlePropinaFocus}                     /* ← Seleccionar todo al focus */
                    onBlur={handlePropinaBlur}                       /* ← Restaurar 0 al blur si vacío */
                    onChange={handlePropinaChange}
                    className="w-full pl-5 pr-2 py-1 bg-gray-800 border border-gray-600 rounded text-white text-xs focus:border-purple-500 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    placeholder="0"
                  />
                </div>
                
                {/* ← ← ← SELECT DE MÉTODO (50% del espacio restante) ← ← ← */}
                <select
                  value={propinaMetodo}
                  onChange={(e) => setPropinaMetodo(e.target.value as any)}
                  className="flex-1 px-2 py-1 bg-gray-800 border border-gray-600 rounded text-xs text-gray-300 whitespace-nowrap min-w-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                >
                  {/* ← ← ← PALABRAS COMPLETAS EN LUGAR DE ABREVIATURAS ← ← ← */}
                  <option value="proporcional">Proporcional</option>
                  <option value="equitativa">Equitativa</option>
                  <option value="manual">Manual</option>
                </select>
              </div>

              {/* Total + Método de pago en una fila */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-300 whitespace-nowrap">TOTAL:</span>
                <span className="text-lg font-bold text-green-400 flex-1 text-right">{formatCurrency(total)}</span>
                <button
                  onClick={() => setShowPaymentMethodModal(true)}
                  className="px-3 py-1 bg-orange-900/30 border border-orange-700 rounded text-xs text-orange-300 hover:bg-orange-900/50 whitespace-nowrap"
                >
                  💳 {metodoPago.charAt(0).toUpperCase() + metodoPago.slice(1)}
                </button>
              </div>
            </div>
                {/* [5%] ACCIONES - Una fila */}
      <div className="p-3 border-t border-gray-700 flex-shrink-0 flex gap-2">
        <button
          onClick={handleCancelar}
          className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors text-sm"
        >
          ❌ Cancelar
        </button>
        <button
          onClick={handleCrearRecibo}
          disabled={reciboItems.length === 0}
          className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          ✅ Confirmar
          </button>
        </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: CITAS */}
        {activeTab === 'citas' && (
          <div className="bg-gray-800 rounded-xl shadow-2xl p-6 border-2 border-gray-700">
            <CitasTab />
          </div>
        )}

        {/* TAB: PROFESIONALES */}
        {activeTab === 'profesionales' && (
          <div className="bg-gray-800 rounded-xl shadow-2xl p-6 border-2 border-gray-700">
            <ProfesionalesTab />
          </div>
        )}

        {/* TAB: CAJA */}
        {activeTab === 'caja' && (
          <div className="bg-gray-800 rounded-xl shadow-2xl p-4 lg:p-6 border-2 border-gray-700">
            <CajaPage />
          </div>
        )}
      </div>

      {/* ← ← ← MODALES ← ← ← */}
      
      {/* Modal Clientes */}
      {showClientModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setShowClientModal(false)}>
          <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden border-2 border-gray-700" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h3 className="text-lg font-bold text-white">👥 Seleccionar Cliente</h3>
              <button onClick={() => setShowClientModal(false)} className="text-gray-400 hover:text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 border-b border-gray-700">
              <input
                type="text"
                placeholder="🔍 Buscar por nombre, teléfono o email..."
                value={clienteSearchTerm}
                onChange={(e) => setClienteSearchTerm(e.target.value)}
                className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                autoFocus
              />
            </div>
            <div className="overflow-y-auto max-h-96 p-2">
              <button
                onClick={handleNuevoCliente}
                className="w-full p-4 mb-2 bg-green-900/50 border-2 border-green-700 rounded-xl text-left hover:bg-green-800/50 transition-colors flex items-center gap-3"
              >
                <div className="w-10 h-10 bg-green-700 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-white">➕ Nuevo Cliente</p>
                  <p className="text-xs text-gray-400">Registrar cliente nuevo</p>
                </div>
              </button>
              {clientesFiltrados.map((cliente) => (
                <button
                  key={`${cliente.esRegistrado ? 'reg' : 'no'}-${cliente.id}`}
                  onClick={() => handleClienteSelect(cliente)}
                  className="w-full p-4 mb-2 bg-gray-900 border border-gray-700 rounded-xl text-left hover:bg-gray-700 hover:border-blue-500 transition-all flex items-center gap-3"
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${cliente.esRegistrado ? 'bg-blue-900' : 'bg-gray-700'}`}>
                    {cliente.nombre.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white truncate">
                      {cliente.nombre} {cliente.esRegistrado && cliente.userId && `(${cliente.userId})`}
                    </p>
                    <p className="text-xs text-gray-400 truncate">{cliente.telefono || 'Sin teléfono'}</p>
                    {cliente.email && <p className="text-xs text-gray-500 truncate">{cliente.email}</p>}
                  </div>
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal Nuevo Cliente */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setShowRegisterModal(false)}>
          <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border-2 border-gray-700" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h3 className="text-lg font-bold text-white">➕ Nuevo Cliente</h3>
              <button onClick={() => setShowRegisterModal(false)} className="text-gray-400 hover:text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Nombre completo *</label>
                <input
                  type="text"
                  value={nuevoClienteData.nombre}
                  onChange={(e) => setNuevoClienteData(prev => ({ ...prev, nombre: e.target.value }))}
                  className="w-full px-3 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                  placeholder="Ej: Wilmer Quijano"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Teléfono</label>
                <input
                  type="tel"
                  value={nuevoClienteData.telefono}
                  onChange={(e) => setNuevoClienteData(prev => ({ ...prev, telefono: e.target.value }))}
                  className="w-full px-3 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                  placeholder="Ej: 300 123 4567"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Email</label>
                <input
                  type="email"
                  value={nuevoClienteData.email}
                  onChange={(e) => setNuevoClienteData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                  placeholder="Ej: cliente@email.com"
                />
              </div>
            </div>
            <div className="p-4 border-t border-gray-700 flex gap-3">
              <button onClick={() => setShowRegisterModal(false)} className="flex-1 py-3 bg-gray-700 text-white rounded-lg font-semibold hover:bg-gray-600 transition-colors">
                Cancelar
              </button>
              <button onClick={handleGuardarNuevoCliente} className="flex-1 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors">
                ✅ Agregar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Profesional */}
      {showProfessionalModal && (
        <ProfessionalModal
          isOpen={showProfessionalModal}
          onClose={() => {
            setShowProfessionalModal(false);
            setItemParaProfesional(null);
          }}
          onSelect={(profesional) => {
            if (itemParaProfesional) {
              setReciboItems(prev => prev.map(item =>
                item.id === itemParaProfesional.id
                  ? { ...item, profesionalId: profesional.id, profesionalNombre: profesional.nombre }
                  : item
              ));
            }
            setShowProfessionalModal(false);
            setItemParaProfesional(null);
          }}
          servicioId={itemParaProfesional?.servicioId || null}
          profesionalSeleccionadoId={itemParaProfesional?.profesionalId || null}
        />
      )}

      {/* Modal Método de Pago */}
      {showPaymentMethodModal && (
        <PaymentMethodModal
          isOpen={showPaymentMethodModal}
          onClose={() => setShowPaymentMethodModal(false)}
          onSelect={(metodo) => {
            setMetodoPago(metodo.banco.toLowerCase());
            setMetodoPagoSeleccionadoId(
              typeof metodo.id === 'number' 
                ? metodo.id 
                : parseInt(metodo.id as string) || null
            );
            setShowPaymentMethodModal(false);
          }}
          metodoSeleccionadoId={metodoPagoSeleccionadoId}
        />
      )}

      {/* Modal Productos para Item */}
      {productoModalOpen && itemParaProductos && (
        <ProductoModal
          isOpen={productoModalOpen}
          onClose={() => {
            setProductoModalOpen(false);
            setItemParaProductos(null);
          }}
          onSelect={handleProductosSeleccionados}
          apiUrl={apiUrl}
          token={token || undefined}
          productosExistentes={itemParaProductos.productosAsociados.map(p => ({
            productoId: p.productoId,
            productoNombre: p.productoNombre,
            productoMarca: p.productoMarca,
            cantidad: p.cantidad,
            precioUnitario: p.precioUnitario,
            precioBase: p.precioUnitario,
            subtotal: p.subtotal,
            stockDisponible: 999
          }))}
        />
      )}
    </div>
  );
}