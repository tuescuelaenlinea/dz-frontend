import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

interface ServicioPDF {
  id: number;
  nombre: string;
  cantidad: number;
  precio_unitario: number;
  total: number;
  imagen_url?: string | null;
  descripcion_corta?: string;
}

interface ConfiguracionSalon {
  nombre_salon?: string;
  slogan?: string;
  direccion?: string;
  telefono_1?: string;
  telefono_2?: string;
  whatsapp?: string;
  email?: string;
  instagram_url?: string;
  facebook_url?: string;
  web_url?: string;
}

interface CotizacionPDF {
  id: number;
  codigo_cotizacion: string;
  cliente_nombre: string;
  cliente_telefono: string;
  cliente_email: string;
  fecha_creacion: string;
  servicios: ServicioPDF[];
  subtotal: number;
  descuento: number;
  total: number;
  notas?: string;
  foto_referencia_url?: string;
  logo_url?: string | null;
  configuracion_salon?: ConfiguracionSalon; // ← ← ← NUEVO
}

// ==========================================
// FUNCIÓN DE NORMALIZACIÓN (IGUAL QUE page.tsx)
// ==========================================
const normalizeImageUrl = (url: string): string => {
  if (!url) return '';
  
  const API_DOMAIN = 'https://api.dzsalon.com';
  let normalized = url;
  
  // 1. Si ya es URL absoluta de producción, usarla tal cual
  if (normalized.startsWith('https://api.dzsalon.com')) {
    return normalized;
  }
  
  // 2. Si es URL relativa (/media/...), construir con dominio de producción
  if (normalized.startsWith('/media/')) {
    return `${API_DOMAIN}${normalized}`;
  }
  
  // 3. Si es URL con localhost o IP, reemplazar con dominio de producción
  if (normalized.includes('127.0.0.1') || normalized.includes('localhost') || normalized.includes('179.43.112.64')) {
    const mediaPath = normalized.split('/media/')[1];
    if (mediaPath) {
      return `${API_DOMAIN}/media/${mediaPath}`;
    }
  }
  
  return normalized;
};

// ==========================================
// FUNCIÓN QUE USA EL PROXY (CON LOGS DETALLADOS)
// ==========================================
const imageUrlToBase64 = async (url: string): Promise<string> => {
  const normalizedUrl = normalizeImageUrl(url);
  if (!normalizedUrl) return '';

  const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(normalizedUrl)}`;
  console.log(`📥 Intentando cargar vía proxy: ${normalizedUrl}`);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(proxyUrl, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ El proxy retornó error ${response.status}: ${errorText}`);
      console.error(`   URL original solicitada: ${normalizedUrl}`);
      return '';
    }

    const blob = await response.blob();
    
    if (!blob.type.startsWith('image/')) {
      console.warn(`⚠️ La respuesta del servidor no es una imagen: ${blob.type}`);
      return '';
    }

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => {
        console.error(` Error leyendo el blob de la imagen`);
        resolve('');
      };
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error(`❌ Error de red o timeout al cargar vía proxy:`, error);
    console.error(`   URL original: ${normalizedUrl}`);
    return '';
  }
};

// ==========================================
// HELPERS VISUALES PARA FALLBACKS
// ==========================================
function drawLogoFallback(doc: any, colors: any, x: number, y: number) {
  doc.setTextColor(...colors.white);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('DZ SALÓN', x, y + 8);
}

function drawImagePlaceholder(doc: any, x: number, y: number, w: number, h: number) {
  doc.setFillColor(240, 240, 240);
  doc.roundedRect(x, y, w, h, 2, 2, 'F');
  doc.setFontSize(12);
  doc.text('💆', x + (w / 2) - 5, y + (h / 2) + 4);
}

// ==========================================
// FUNCIÓN PARA AGREGAR HEADER EN NUEVAS PÁGINAS
// ==========================================
function addPageHeader(doc: any, colors: any, logoBase64: string, pageNumber: number) {
  const pageHeight = 297;
  
  // Header simplificado para páginas adicionales
  doc.setFillColor(...colors.secondary);
  doc.rect(0, 0, 210, 30, 'F');
  
  if (logoBase64 && pageNumber === 1) {
    try {
      doc.addImage(logoBase64, 'JPEG', 15, 5, 40, 20);
    } catch (error) {
      drawLogoFallback(doc, colors, 15, 5);
    }
  } else {
    drawLogoFallback(doc, colors, 15, 5);
  }
  
  if (pageNumber > 1) {
    doc.setFontSize(9);
    doc.setTextColor(...colors.white);
    doc.text(`Página ${pageNumber}`, 195, 20, { align: 'right' });
  }
  
  return 35; // Retornar Y inicial después del header
}

// ==========================================
// FUNCIÓN PARA AGREGAR FOOTER (DINÁMICO)
// ==========================================
function addPageFooter(doc: any, colors: any, pageNumber: number, totalPages: number, config?: ConfiguracionSalon) {
  const pageHeight = 297;
  
  doc.setFillColor(...colors.secondary);
  doc.rect(0, pageHeight - 35, 210, 35, 'F');
  
  // ← ← ← INFORMACIÓN DINÁMICA DEL SALÓN ← ← ←
  const nombreSalon = config?.nombre_salon || 'DZ SALÓN';
  const slogan = config?.slogan || 'Belleza que inspira';
  const direccion = config?.direccion || 'Cartagena de Indias';
  const telefono = config?.telefono_1 || config?.telefono_2 || '';
  const whatsapp = config?.whatsapp || '';
  const email = config?.email || '';
  const instagram = config?.instagram_url || '';
  
  // Extraer usuario de Instagram de la URL
  const instagramUser = instagram ? instagram.replace(/.*instagram\.com\//, '@') : '@dorianzambranosalon';
  
  // Columna izquierda: Redes sociales y contacto
  doc.setTextColor(...colors.white);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  
  let leftY = pageHeight - 22;
  doc.text(instagramUser, 15, leftY);
  
  if (whatsapp) {
    leftY += 5;
    doc.text(`WhatsApp: ${whatsapp}`, 15, leftY);
  }
  
  if (email) {
    leftY += 5;
    doc.text(email, 15, leftY);
  }
  
  // Columna central: Dirección
  doc.setFontSize(8);
  const direccionLines = doc.splitTextToSize(direccion, 60);
  let centerStartY = pageHeight - 23;
  
  direccionLines.forEach((line: string, index: number) => {
    doc.text(line, 105, centerStartY + (index * 5), { align: 'center' });
  });
  
  // Columna derecha: Slogan
  const sloganLines = slogan.split(' ');
  if (sloganLines.length > 1) {
    // Slogan en dos líneas
    const primeraParte = sloganLines.slice(0, Math.ceil(sloganLines.length / 2)).join(' ');
    const segundaParte = sloganLines.slice(Math.ceil(sloganLines.length / 2)).join(' ');
    
    doc.setFontSize(14);
    doc.setFont('times', 'italic');
    doc.setTextColor(...colors.accent);
    doc.text(primeraParte, 175, pageHeight - 22, { align: 'center' });
    doc.text(segundaParte, 175, pageHeight - 16, { align: 'center' });
  } else {
    // Slogan en una línea
    doc.setFontSize(12);
    doc.setFont('times', 'italic');
    doc.setTextColor(...colors.accent);
    doc.text(slogan, 175, pageHeight - 19, { align: 'center' });
  }
  
  // Número de página
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...colors.white);
  doc.text(`Página ${pageNumber} de ${totalPages}`, 195, pageHeight - 12, { align: 'right' });
}

export const generarPDFCotizacion = async (cotizacion: CotizacionPDF) => {
  const doc = new jsPDF();
  
  const colors = {
    primary: [180, 120, 60] as [number, number, number],
    secondary: [40, 40, 40] as [number, number, number],
    accent: [200, 160, 100] as [number, number, number],
    white: [255, 255, 255] as [number, number, number],
  };

  let logoBase64 = '';
  const servicioImages: Record<number, string> = {};

  if (cotizacion.logo_url) {
    logoBase64 = await imageUrlToBase64(cotizacion.logo_url);
  }

  for (const servicio of cotizacion.servicios) {
    if (servicio.imagen_url) {
      servicioImages[servicio.id] = await imageUrlToBase64(servicio.imagen_url);
    }
  }

  // ==========================================
  // CONFIGURACIÓN DE ESPACIOS OPTIMIZADOS
  // ==========================================
  const PAGE_HEIGHT = 297;
  const PAGE_WIDTH = 210;
  const MARGIN_TOP = 50;
  const MARGIN_BOTTOM = 35;
  const CARD_HEIGHT = 25;
  const CARD_SPACING = 3;
  const IMAGE_WIDTH = 18;
  const IMAGE_HEIGHT = 18;
  
  let currentY = MARGIN_TOP;
  let pageNumber = 1;
  const maxServicesPerPage = Math.floor((PAGE_HEIGHT - MARGIN_TOP - MARGIN_BOTTOM - 100) / (CARD_HEIGHT + CARD_SPACING));
  
  // Agregar header inicial
  currentY = addPageHeader(doc, colors, logoBase64, pageNumber);

  // ==========================================
  // SALUDO Y DETALLES DE COTIZACIÓN
  // ==========================================
  currentY += 5;
  // Saludo personalizado
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...colors.secondary);
  doc.text(`Hola ${cotizacion.cliente_nombre || 'cliente'},`, 15, currentY);
  currentY += 8;
  
  // Mensaje de bienvenida
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  const mensajeBienvenida = 'Esperamos que estés teniendo un excelente día. Nos permitimos presentar los detalles de la cotización que solicitaste con nosotros.';
  const splitMensaje = doc.splitTextToSize(mensajeBienvenida, 180);
  doc.text(splitMensaje, 15, currentY);
  currentY += 10;
  
  // Sección "Detalles de tu Cotización"
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colors.primary);
  doc.text('Detalles de tu Cotización', 15, currentY);
  currentY += 1;
  
  // Línea decorativa debajo del título
  doc.setDrawColor(...colors.primary);
  doc.setLineWidth(0.5);
  doc.line(15, currentY, 65, currentY);
  currentY += 5;
  
  // Número de cotización y fecha
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...colors.secondary);
  
  doc.setFont('helvetica', 'bold');
  doc.text('Número de Cotización:', 15, currentY);
  doc.setFont('helvetica', 'normal');
  doc.text(`#${cotizacion.codigo_cotizacion.replace('COT-', '')}`, 195, currentY, { align: 'right' });
  currentY += 4;
  
  doc.setFont('helvetica', 'bold');
  doc.text('Fecha de solicitud:', 15, currentY);
  
  // Formatear fecha
  const fechaFormateada = new Date(cotizacion.fecha_creacion).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
  doc.setFont('helvetica', 'normal');
  doc.text(fechaFormateada, 195, currentY, { align: 'right' });
  
  currentY += 5; 

  // ==========================================
  // SERVICIOS COTIZADOS
  // ==========================================
  currentY += 4; 
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colors.primary);
  doc.text('Servicios Cotizados:', 15, currentY);
  currentY += 4;

  // Calcular total de páginas necesarias
  const totalServices = cotizacion.servicios.length;
  const totalPages = Math.max(1, Math.ceil(totalServices / maxServicesPerPage));

  for (let i = 0; i < cotizacion.servicios.length; i++) {
    const servicio = cotizacion.servicios[i];
    
    // Verificar si necesita nueva página
    const spaceNeeded = CARD_HEIGHT + CARD_SPACING + 80; // 80 para totales, términos y footer
    if (currentY + spaceNeeded > PAGE_HEIGHT - MARGIN_BOTTOM) {
      // Agregar footer a la página actual
      addPageFooter(doc, colors, pageNumber, totalPages, cotizacion.configuracion_salon);
      
      // Crear nueva página
      doc.addPage();
      pageNumber++;
      currentY = addPageHeader(doc, colors, logoBase64, pageNumber);
      
      // Si es la última página, ajustar totales
      if (i === cotizacion.servicios.length - 1) {
        currentY += 5;
      }
    }
    
    const cardWidth = 180;
    const imageX = 15;
    const imageY = currentY + 4;
    const textX = imageX + IMAGE_WIDTH + 8;
    
    // Fondo de la tarjeta
    doc.setFillColor(250, 250, 250);
    doc.roundedRect(15, currentY, cardWidth, CARD_HEIGHT, 2, 2, 'F');
    
    // Imagen o placeholder
    const imagenBase64 = servicioImages[servicio.id];
    if (imagenBase64) {
      try {
        doc.addImage(imagenBase64, 'JPEG', imageX, imageY, IMAGE_WIDTH, IMAGE_HEIGHT, undefined, 'FAST');
      } catch (error) {
        drawImagePlaceholder(doc, imageX, imageY, IMAGE_WIDTH, IMAGE_HEIGHT);
      }
    } else {
      drawImagePlaceholder(doc, imageX, imageY, IMAGE_WIDTH, IMAGE_HEIGHT);
    }
    
    // Nombre del servicio con cantidad
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.secondary);
    doc.text(`${servicio.nombre} (${servicio.cantidad})`, textX, currentY + 8);
    
    // Descripción corta
    if (servicio.descripcion_corta) {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(100, 100, 100);
      const splitDesc = doc.splitTextToSize(servicio.descripcion_corta, 110);
      doc.text(splitDesc, textX, currentY + 14);
    }
    
    // Precio unitario
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...colors.secondary);
    doc.text(`$ ${servicio.precio_unitario.toLocaleString('es-CO')} c/u`, textX, currentY + 20);
    
    // Subtotal del servicio (derecha)
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.primary);
    doc.text(`$ ${servicio.total.toLocaleString('es-CO')}`, 185, currentY + 20, { align: 'right' });
    
    currentY += CARD_HEIGHT + CARD_SPACING;
  }

  // ==========================================
  // TOTALES (en la última página)
  // ==========================================
  currentY += 4;
  
  // Verificar si hay espacio para totales, si no, nueva página
  if (currentY + 60 > PAGE_HEIGHT - MARGIN_BOTTOM) {
    addPageFooter(doc, colors, pageNumber, totalPages, cotizacion.configuracion_salon);
    doc.addPage();
    pageNumber++;
    currentY = addPageHeader(doc, colors, logoBase64, pageNumber) + 10;
  }
  
  doc.setDrawColor(...colors.accent);
  doc.setLineWidth(0.5);
  doc.line(15, currentY, 195, currentY);
  currentY += 5;
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...colors.secondary);
  
  doc.setFont('helvetica', 'bold');
  doc.text('Subtotal:', 140, currentY, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.text(`$ ${cotizacion.subtotal.toLocaleString('es-CO')} COP`, 195, currentY, { align: 'right' });
  
  if (cotizacion.descuento > 0) {
    currentY += 5;
    doc.setFont('helvetica', 'bold');
    doc.text('Descuento:', 140, currentY, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(200, 0, 0);
    doc.text(`- $ ${cotizacion.descuento.toLocaleString('es-CO')} COP`, 195, currentY, { align: 'right' });
    doc.setTextColor(...colors.secondary);
  }
  
  currentY += 8;
  doc.setFillColor(...colors.primary);
  doc.roundedRect(130, currentY - 4, 75, 12, 2, 2, 'F');
  
  doc.setTextColor(...colors.white);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Total Estimado:', 150, currentY + 4, { align: 'center' });
  doc.text(`$ ${cotizacion.total.toLocaleString('es-CO')} COP`, 195, currentY + 4, { align: 'right' });

  // ==========================================
  // NOTAS
  // ==========================================
  currentY += 9;
  
  // Verificar espacio para notas y términos
  if (currentY + 60 > PAGE_HEIGHT - MARGIN_BOTTOM) {
    addPageFooter(doc, colors, pageNumber, totalPages, cotizacion.configuracion_salon);
    doc.addPage();
    pageNumber++;
    currentY = addPageHeader(doc, colors, logoBase64, pageNumber) + 10;
  }

  doc.setTextColor(...colors.secondary);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Notas:', 15, currentY);
  
  doc.setFont('helvetica', 'normal');
  const notas = cotizacion.notas || 'Gracias por confiar en DZ SALÓN.';
  const splitNotas = doc.splitTextToSize(notas, 180);
  doc.text(splitNotas, 15, currentY + 6);

  // ==========================================
  // TÉRMINOS Y CONDICIONES (NUEVO)
  // ==========================================
  currentY += 13;
  
  // Verificar espacio para términos
  if (currentY + 45 > PAGE_HEIGHT - MARGIN_BOTTOM) {
    addPageFooter(doc, colors, pageNumber, totalPages, cotizacion.configuracion_salon);
    doc.addPage();
    pageNumber++;
    currentY = addPageHeader(doc, colors, logoBase64, pageNumber) + 10;
  }

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colors.primary);
  doc.text('Términos y Condiciones:', 15, currentY);
  currentY += 5;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  
  const terminos = 
    "1. Validez: Esta cotización tiene una validez de 15 días calendario a partir de la fecha de emisión.\n" +
    "2. Reserva: Para confirmar la cita, se requiere un anticipo del 50% del valor total estimado.\n" +
    "3. Cancelaciones: Deben realizarse con mínimo 24 horas de anticipación. De lo contrario, el anticipo no será reembolsable.\n" +
    "4. Servicios adicionales: Cualquier servicio o producto no contemplado en esta cotización será cobrado por separado el día del servicio.";
  
  const splitTerminos = doc.splitTextToSize(terminos, 180);
  doc.text(splitTerminos, 15, currentY);

  // ==========================================
  // FOOTER FINAL (CON CONFIGURACIÓN DINÁMICA)
  // ==========================================
  addPageFooter(doc, colors, pageNumber, totalPages, cotizacion.configuracion_salon);

  doc.save(`Cotizacion_${cotizacion.codigo_cotizacion}.pdf`);
};