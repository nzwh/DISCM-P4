'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { enrollService } from '@/lib/api'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function EnrollmentsPage() {
  const router = useRouter()
  const [enrollments, setEnrollments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadEnrollments()
  }, [])

  async function loadEnrollments() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/')
        return
      }

      const data = await enrollService.getEnrollments(session.access_token)
      setEnrollments(data.enrollments || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleDrop(enrollmentId: string) {
    if (!confirm('Are you sure you want to drop this course?')) return

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      await enrollService.drop(session.access_token, enrollmentId)
      alert('Course dropped successfully!')
      loadEnrollments()
    } catch (err: any) {
      alert(err.message)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl">Loading enrollments...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <h1 className="text-xl font-bold text-gray-900">My Enrollments</h1>
            <Link
              href="/dashboard"
              className="text-blue-600 hover:text-blue-800"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">
            Error loading enrollments: {error}. Enrollment service may be down.
          </div>
        )}

        {enrollments.length === 0 && !error ? (
          <div className="bg-white p-8 rounded-lg text-center text-gray-600">
            <p className="mb-4">You are not enrolled in any courses yet.</p>
            <Link
              href="/courses"
              className="text-blue-600 hover:text-blue-800 underline"
            >
              Browse available courses
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {enrollments.map((enrollment) => (
              <div key={enrollment.id} className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  {enrollment.courses.code}
                </h3>
                <p className="text-gray-700 font-medium mb-4">
                  {enrollment.courses.name}
                </p>
                
                <div className="text-sm text-gray-600 mb-4">
                  <p>{enrollment.courses.semester} {enrollment.courses.year}</p>
                  <p>Enrolled: {new Date(enrollment.enrolled_at).toLocaleDateString()}</p>
                </div>

                <button
                  onClick={() => handleDrop(enrollment.id)}
                  className="w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors"
                >
                  Drop Course
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}