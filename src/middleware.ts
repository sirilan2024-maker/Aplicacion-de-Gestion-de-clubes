// middleware simplificado para evitar errores de fetch en desarrollo
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // Por ahora, no se realiza ninguna verificación de autenticación.
  // Simplemente dejamos pasar la solicitud.
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
