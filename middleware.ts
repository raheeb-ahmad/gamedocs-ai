import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/api')) {
    const password = request.headers.get('x-demo-password')
    const expected = process.env.DEMO_PASSWORD

    console.log('incoming password:', password)
    console.log('expected password:', expected)

    if (!expected || password !== expected) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }
  return NextResponse.next()
}

export const config = {
  matcher: '/api/:path*',
}