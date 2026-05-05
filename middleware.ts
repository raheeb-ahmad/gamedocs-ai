import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/api')) {
    if (request.nextUrl.pathname === '/api/login') {
      return NextResponse.next()
    }

    const cookie = request.cookies.get('gamedocs_auth')?.value

    if (cookie !== process.env.DEMO_PASSWORD) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/api/:path*',
}