// utils/pdfGenerator.ts
import { jsPDF } from 'jspdf';

interface ServicioPDF {
  nombre: string;
  cantidad: number;
  precio_unitario: number;
  total: number;
  imagen_url?: string;
  descripcion?: string;
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
}

// Función auxiliar para convertir URL de imagen a base64
const imageUrlToBase64 = async (url: string): Promise<string> => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const blob = await response.blob();
    
    // Verificar que sea una imagen válida
    if (!blob.type.startsWith('image/')) {
      throw new Error(`El archivo no es una imagen válida. Tipo: ${blob.type}`);
    }
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result) {
          resolve(reader.result as string);
        } else {
          reject(new Error('No se pudo leer la imagen'));
        }
      };
      reader.onerror = () => reject(new Error('Error al leer la imagen'));
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error cargando imagen:', error);
    throw error;
  }
};

// Función para validar si es un base64 válido
const isValidBase64Image = (str: string): boolean => {
  if (!str) return false;
  // Verificar que tenga el prefijo data:image
  return str.startsWith('data:image/') && str.includes('base64,');
};

// Función para detectar el tipo de imagen desde base64
const getImageTypeFromBase64 = (base64: string): 'PNG' | 'JPEG' => {
  if (base64.includes('image/png')) {
    return 'PNG';
  } else if (base64.includes('image/jpeg') || base64.includes('image/jpg')) {
    return 'JPEG';
  }
  // Default a PNG
  return 'PNG';
};

export const generarPDFCotizacion = async (cotizacion: CotizacionPDF) => {
  const doc = new jsPDF();

// Colores de marca
const colors = {
  primary: [180, 120, 60] as const,      // Dorado/Ámbar
  secondary: [40, 40, 40] as const,      // Gris oscuro
  accent: [200, 160, 100] as const,      // Dorado claro
  lightGray: [245, 245, 245] as const,   // Gris muy claro
  white: [255, 255, 255] as const,
} as const;

  // 1. CARGAR LOGO DEL SISTEMA
  let logoImage: string | null = null;
  try {
    const token = localStorage.getItem('admin_token');
    const configRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/configuracion/activa/`, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });
    
    if (configRes.ok) {
      const config = await configRes.json();
      if (config.logo_url) {
        console.log('🔍 Cargando logo desde:', config.logo_url);
        try {
          logoImage = await imageUrlToBase64(config.logo_url);
          console.log('✅ Logo cargado correctamente');
          console.log(' Tipo de imagen:', logoImage.substring(0, 50) + '...');
        } catch (imgError) {
          console.error('❌ Error cargando logo:', imgError);
          logoImage = null;
        }
      }
    }
  } catch (error) {
    console.error('Error cargando configuración:', error);
  }

  // 2. HEADER CON LOGO
  const renderFallbackHeader = () => {
    doc.setFillColor(...colors.secondary);
    doc.setFontSize(32);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.white);
    doc.text('DZ', 15, 25);
    doc.setFontSize(9);
    doc.text('DORIAN ZAMBRANO', 15, 30);
    doc.text('SALON SPA', 15, 34);
  };

  if (logoImage && isValidBase64Image(logoImage)) {
    try {
      // Determinar el tipo de imagen
      const imageType = getImageTypeFromBase64(logoImage);
      
      console.log(`🖼️ Agregando imagen tipo: ${imageType}`);
      
      // Agregar imagen al PDF
      doc.addImage(
        logoImage,
        imageType,
        15,  // x
        10,  // y
        40,  // width
        20   // height
      );
      
      console.log('✅ Logo agregado al PDF exitosamente');
    } catch (e) {
      console.error('❌ Error agregando logo:', e);
      console.error('📋 Detalles del error:', e);
      // Usar fallback si falla
      renderFallbackHeader();
    }
  } else {
    console.log('⚠️ Usando header de texto (sin logo o logo inválido)');
    renderFallbackHeader();
  }

  // Título y número de cotización
  doc.setTextColor(...colors.primary);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('Detalles de tu Cotización', 15, 50);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...colors.secondary);
  doc.text(`Número de Cotización: #${cotizacion.codigo_cotizacion.replace('COT-', '')}`, 15, 58);
  
  const fechaFormateada = new Date(cotizacion.fecha_creacion).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  doc.text(`Fecha de solicitud: ${fechaFormateada}`, 15, 64);

  // Línea divisoria
  doc.setDrawColor(...colors.accent);
  doc.setLineWidth(0.5);
  doc.line(15, 68, 195, 68);

  // 3. DATOS DEL CLIENTE
  let currentY = 80;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colors.secondary);
  doc.text('Datos del cliente', 15, currentY);
  
  currentY += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(cotizacion.cliente_nombre || 'No especificado', 15, currentY);
  currentY += 6;
  doc.text(`Cel: ${cotizacion.cliente_telefono || 'No especificado'}`, 15, currentY);
  currentY += 6;
  doc.text(`Correo: ${cotizacion.cliente_email || 'No especificado'}`, 15, currentY);

  currentY += 15;

  // 4. SERVICIOS COTIZADOS (Diseño tipo card/moderno)
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colors.primary);
  doc.text('Servicios Cotizados:', 15, currentY);
  
  currentY += 10;

  // Renderizar cada servicio como una "card"
  cotizacion.servicios.forEach((servicio, index) => {
    // Fondo de la card
    doc.setFillColor(...colors.lightGray);
    doc.roundedRect(15, currentY - 5, 180, 35, 3, 3, 'F');
    
    // Nombre del servicio con cantidad
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.secondary);
    const serviceName = `${servicio.nombre} (${servicio.cantidad})`;
    doc.text(serviceName, 20, currentY + 5);
    
    // Descripción o subtítulo (si existe)
    if (servicio.descripcion) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      const splitDesc = doc.splitTextToSize(servicio.descripcion, 100);
      doc.text(splitDesc, 20, currentY + 12);
    }
    
    // Precio unitario
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...colors.secondary);
    doc.text(`$${servicio.precio_unitario.toLocaleString('es-CO')} c/u`, 155, currentY + 5, { align: 'right' });
    
    // Subtotal del servicio
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(`$${servicio.total.toLocaleString('es-CO')}`, 185, currentY + 5, { align: 'right' });
    
    currentY += 45;
  });

  // 5. TOTALES (Diseño moderno)
  currentY += 10;
  
  // Subtotal
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...colors.secondary);
  doc.text('Subtotal:', 130, currentY, { align: 'right' });
  doc.text(`$${cotizacion.subtotal.toLocaleString('es-CO')} COP`, 185, currentY, { align: 'right' });
  
  currentY += 8;
  
  // Descuento
  if (cotizacion.descuento > 0) {
    doc.text('Descuento:', 130, currentY, { align: 'right' });
    doc.setTextColor(200, 0, 0);
    doc.text(`-$${cotizacion.descuento.toLocaleString('es-CO')} COP`, 185, currentY, { align: 'right' });
    doc.setTextColor(...colors.secondary);
    currentY += 8;
  }
  
  // Total (con fondo destacado)
  doc.setFillColor(...colors.primary);
  doc.roundedRect(130, currentY - 5, 65, 12, 2, 2, 'F');
  
  doc.setTextColor(...colors.white);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Total Estimado:', 140, currentY + 4, { align: 'right' });
  doc.text(`$${cotizacion.total.toLocaleString('es-CO')} COP`, 185, currentY + 4, { align: 'right' });

  // 6. NOTAS
  currentY += 25;
  doc.setTextColor(...colors.secondary);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Notas:', 15, currentY);
  
  currentY += 7;
  doc.setFont('helvetica', 'normal');
  const notas = cotizacion.notas || 'Gracias por confiar en DZSALON.\nEsta cotización tiene una validez de 15 días.';
  const splitNotas = doc.splitTextToSize(notas, 180);
  doc.text(splitNotas, 15, currentY);

  // 7. FOOTER
  const pageHeight = 297;
  doc.setFillColor(...colors.secondary);
  doc.rect(0, pageHeight - 40, 210, 40, 'F');
  
  doc.setTextColor(...colors.white);
  doc.setFontSize(10);
  doc.text('@dorianzambranosalon', 15, pageHeight - 20);
  
  doc.setFontSize(9);
  doc.text('Cartagena de Indias', 140, pageHeight - 23, { align: 'center' });
  doc.text('Bocagrande Cra 2 # 5-85', 140, pageHeight - 18, { align: 'center' });
  doc.text('CC NAO Piso 2 Local 33', 140, pageHeight - 13, { align: 'center' });
  
  doc.setFontSize(20);
  doc.setFont('times', 'italic');
  doc.setTextColor(...colors.accent);
  doc.text('Belleza', 170, pageHeight - 20);
  doc.text('que inspira', 170, pageHeight - 13);

  // Guardar PDF
  doc.save(`Cotizacion_${cotizacion.codigo_cotizacion}.pdf`);
};