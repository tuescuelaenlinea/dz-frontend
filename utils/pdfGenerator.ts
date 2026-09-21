import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Extender el tipo jsPDF para incluir autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

interface ServicioPDF {
  nombre: string;
  cantidad: number;
  precio_unitario: number;
  total: number;
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

export const generarPDFCotizacion = (cotizacion: CotizacionPDF) => {
  const doc = new jsPDF();
  
const colors: {
  primary: [number, number, number];
  secondary: [number, number, number];
  accent: [number, number, number];
  white: [number, number, number];
} = {
  primary: [180, 120, 60],
  secondary: [40, 40, 40],
  accent: [200, 160, 100],
  white: [255, 255, 255],
};
  // Header
  doc.setFillColor(...colors.secondary);
  doc.rect(0, 0, 210, 40, 'F');
  
  doc.setTextColor(...colors.white);
  doc.setFontSize(36);
  doc.setFont('helvetica', 'bold');
  doc.text('DZ', 15, 28);
  
  doc.setFontSize(10);
  doc.text('DORIAN ZAMBRANO', 15, 34);
  doc.text('SALON SPA', 15, 38);

  doc.setTextColor(...colors.secondary);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text('COTIZACIÓN', 195, 20, { align: 'right' });
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`N.° ${cotizacion.codigo_cotizacion}`, 195, 28, { align: 'right' });
  
  const fechaFormateada = new Date(cotizacion.fecha_creacion).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  doc.text(`Fecha: ${fechaFormateada}`, 195, 34, { align: 'right' });
  doc.text('Validez: 15 días', 195, 39, { align: 'right' });

  // Datos del cliente
  doc.setTextColor(...colors.secondary);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Datos del cliente', 15, 55);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(cotizacion.cliente_nombre, 15, 62);
  doc.text(`Cel: ${cotizacion.cliente_telefono}`, 15, 68);
  doc.text(`Correo: ${cotizacion.cliente_email}`, 15, 74);

  // Tabla de servicios
  const servicios = cotizacion.servicios || [];
  
  const tableData = servicios.map(servicio => [
    servicio.nombre,
    String(servicio.cantidad),
    `$ ${servicio.precio_unitario.toLocaleString('es-CO')}`,
    `$ ${servicio.total.toLocaleString('es-CO')}`
  ]);

  // ← ← ← CLAVE: Usar autoTable como función importada ← ← ←
  autoTable(doc, {
    startY: 90,
    head: [['Servicio', 'Cantidad', 'Valor unitario', 'Total']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: colors.accent,
      textColor: colors.secondary,
      fontStyle: 'bold',
      fontSize: 10
    },
    bodyStyles: {
      fontSize: 9
    },
    styles: {
      cellPadding: 3,
      halign: 'left'
    },
    columnStyles: {
      0: { cellWidth: 80 },
      1: { cellWidth: 30, halign: 'center' },
      2: { cellWidth: 45, halign: 'right' },
      3: { cellWidth: 45, halign: 'right' }
    }
  });

  // Totales
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...colors.secondary);
  
  doc.setFont('helvetica', 'bold');
  doc.text('Subtotal', 150, finalY, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.text(`$ ${cotizacion.subtotal.toLocaleString('es-CO')}`, 195, finalY, { align: 'right' });
  
  if (cotizacion.descuento > 0) {
    doc.setFont('helvetica', 'bold');
    doc.text('Descuento', 150, finalY + 6, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(200, 0, 0);
    doc.text(`- $ ${cotizacion.descuento.toLocaleString('es-CO')}`, 195, finalY + 6, { align: 'right' });
    doc.setTextColor(...colors.secondary);
  }
  
  const totalY = cotizacion.descuento > 0 ? finalY + 14 : finalY + 8;
  
  doc.setFillColor(...colors.primary);
  doc.rect(130, totalY - 5, 75, 12, 'F');
  doc.setTextColor(...colors.white);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Total', 150, totalY + 3, { align: 'right' });
  doc.text(`$ ${cotizacion.total.toLocaleString('es-CO')}`, 195, totalY + 3, { align: 'right' });

  // Notas
  doc.setTextColor(...colors.secondary);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Notas:', 15, totalY + 20);
  
  doc.setFont('helvetica', 'normal');
  const notas = cotizacion.notas || 'Gracias por confiar en DZSALON.\nEsta cotización tiene una validez de 15 días.';
  const splitNotas = doc.splitTextToSize(notas, 180);
  doc.text(splitNotas, 15, totalY + 27);

  // Footer
  const pageHeight = 297;
  doc.setFillColor(...colors.secondary);
  doc.rect(0, pageHeight - 45, 210, 45, 'F');
  
  doc.setTextColor(...colors.white);
  doc.setFontSize(10);
  doc.text('@dorianzambranosalon', 15, pageHeight - 25);
  
  doc.setFontSize(9);
  doc.text('Cartagena de Indias', 140, pageHeight - 28, { align: 'center' });
  doc.text('Bocagrande Cra 2 # 5-85', 140, pageHeight - 22, { align: 'center' });
  doc.text('CC NAO Piso 2 Local 33', 140, pageHeight - 16, { align: 'center' });
  
  doc.setFontSize(22);
  doc.setFont('times', 'italic');
  doc.setTextColor(...colors.accent);
  doc.text('Belleza', 175, pageHeight - 25);
  doc.text('que inspira', 175, pageHeight - 17);

  // Guardar PDF
  doc.save(`Cotizacion_${cotizacion.codigo_cotizacion}.pdf`);
};