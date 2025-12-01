import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Allow the request to proceed - client-side validation will handle security
  return NextResponse.next()
}

export const config = {
  matcher: '/faculty/:path*',
}


