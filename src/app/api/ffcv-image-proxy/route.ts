import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const imageUrl = searchParams.get('url');

    if (!imageUrl) {
      return new NextResponse('Missing url parameter', { status: 400 });
    }

    // Only allow fetching from official novanet / ffcv image domains
    const isAllowedDomain = 
      imageUrl.startsWith('https://appwebffcv.novanet.es/pnfg/') ||
      imageUrl.startsWith('https://ffcv.es/pnfg/') ||
      imageUrl.startsWith('http://appwebffcv.novanet.es/pnfg/') ||
      imageUrl.startsWith('http://ffcv.es/pnfg/');

    if (!isAllowedDomain) {
      return new NextResponse('Forbidden domain', { status: 403 });
    }

    // Ensure it targets appwebffcv.novanet.es
    const targetUrl = imageUrl.replace(/^https?:\/\/(?:www\.)?ffcv\.es\/pnfg\//i, 'https://appwebffcv.novanet.es/pnfg/');

    const res = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      cache: 'force-cache'
    });

    if (!res.ok) {
      return new NextResponse('Image not found', { status: res.status });
    }

    const contentType = res.headers.get('content-type') || 'image/png';
    const buffer = await res.arrayBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=604800, immutable',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
      }
    });
  } catch (err: any) {
    console.error('[ffcv-image-proxy] Error:', err);
    return new NextResponse('Internal error', { status: 500 });
  }
}
