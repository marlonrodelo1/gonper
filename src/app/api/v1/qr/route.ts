import { NextResponse } from 'next/server';
import QRCode from 'qrcode';

/**
 * GET /api/v1/qr?text=URL&size=512
 *
 * Devuelve un PNG con el código QR del texto/URL pasado.
 * Sin auth: este endpoint sólo genera una imagen a partir de un texto público
 * (típicamente la URL pública del salón). No revela información del tenant.
 *
 * Parámetros:
 * - text  (requerido): texto a codificar.
 * - size  (opcional): ancho/alto en px. Por defecto 512. Min 128, max 1024.
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const text = url.searchParams.get('text');
    const sizeRaw = url.searchParams.get('size');

    if (!text || text.length === 0) {
      return NextResponse.json(
        { error: 'Falta el parámetro "text"' },
        { status: 400 },
      );
    }
    if (text.length > 1024) {
      return NextResponse.json(
        { error: 'El parámetro "text" supera 1024 caracteres' },
        { status: 400 },
      );
    }

    const sizeNum = sizeRaw ? Number.parseInt(sizeRaw, 10) : 512;
    const size = Number.isFinite(sizeNum)
      ? Math.max(128, Math.min(1024, sizeNum))
      : 512;

    const buffer = await QRCode.toBuffer(text, {
      type: 'png',
      width: size,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#1A1815', // ink (matching brand)
        light: '#FBF8F2', // paper
      },
    });

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400, immutable',
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error generando QR';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
