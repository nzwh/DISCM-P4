'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkUser()
  }, [])

  async function checkUser() {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push('/')
      return
    }

    setUser(user)

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    setProfile(profile)
    setLoading(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <h1 className="text-xl font-bold text-gray-900">
              Enrollment System
            </h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                {profile?.full_name} ({profile?.role})
              </span>
              <button
                onClick={handleLogout}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link
            href="/courses"
            className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Browse Courses
            </h3>
            <p className="text-gray-600">
              View all available courses and enroll
            </p>
          </Link>

          {profile?.role === 'student' && (
            <>
              <Link
                href="/enrollments"
                className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow"
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  My Enrollments
                </h3>
                <p className="text-gray-600">
                  View your enrolled courses
                </p>
              </Link>

              <Link
                href="/grades"
                className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow"
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  My Grades
                </h3>
                <p className="text-gray-600">
                  View your academic grades
                </p>
              </Link>
            </>
          )}

          {profile?.role === 'faculty' && (
            <Link
              href="/faculty"
              className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Faculty Portal
              </h3>
              <p className="text-gray-600">
                Manage courses and upload grades
              </p>
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}