import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Server-side API route to validate faculty access
export async function GET(request: NextRequest) {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.split(' ')[1] || request.headers.get('x-access-token')
    
    if (!token) {
      return NextResponse.json(
        { authorized: false, error: 'No token provided' },
        { status: 401 }
      )
    }

    // Create Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Verify token and get user
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    
    if (userError || !user) {
      return NextResponse.json(
        { authorized: false, error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { authorized: false, error: 'Profile not found' },
        { status: 403 }
      )
    }

    // Only allow faculty
    if (profile.role !== 'faculty') {
      return NextResponse.json(
        { authorized: false, error: 'Faculty access required' },
        { status: 403 }
      )
    }

    return NextResponse.json({ authorized: true, role: profile.role })
  } catch (error) {
    console.error('Faculty check error:', error)
    return NextResponse.json(
      { authorized: false, error: 'Server error' },
      { status: 500 }
    )
  }
}


