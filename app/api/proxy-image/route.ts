// app/api/proxy-image/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const imageUrl = request.nextUrl.searchParams.get('url');
  
  if (!imageUrl) {
    return NextResponse.json({ error: 'URL requerida' }, { status: 400 });
  }

  // Validar que sea una URL de nuestro dominio (seguridad)
  if (!imageUrl.includes('api.dzsalon.com') && 
      !imageUrl.includes('179.43.112.64') &&
      !imageUrl.includes('localhost') &&
      !imageUrl.includes('127.0.0.1')) {
    return NextResponse.json({ error: 'Dominio no permitido' }, { status: 403 });
  }

  try {
    const response = await fetch(imageUrl, {
      headers: {
        'Accept': 'image/*',
      },
      next: { revalidate: 3600 } // Cache por 1 hora
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Imagen no disponible: ${response.status}` },
        { status: response.status }
      );
    }

    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/jpeg';

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Error en proxy de imagen:', error);
    return NextResponse.json({ error: 'Error al obtener imagen' }, { status: 500 });
  }
}