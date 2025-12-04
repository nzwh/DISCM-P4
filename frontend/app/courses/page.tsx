'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { courseService, enrollService } from '@/lib/api'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

// Format faculty name
function formatFacultyName(name: string | undefined): string {
  if (!name) return 'TBA'

  const formatted = name
    .replace(/[._-]/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
  
  return formatted
}

export default function CoursesPage() {
  const router = useRouter()
  const [courses, setCourses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [enrolling, setEnrolling] = useState<string | null>(null)

  useEffect(() => {
    loadCourses()
  }, [])

  async function loadCourses() {
    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        router.push('/')
        return
      }

      const { data: { user }, error } = await supabase.auth.getUser(token)
      if (error || !user) {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        router.push('/')
        return
      }

      const data = await courseService.getCourses(token)
      setCourses(data.courses || [])
    } catch (err: any) {
      setError(err.message)
      if (err.message?.includes('Unauthorized') || err.message?.includes('Invalid')) {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        router.push('/')
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleEnroll(sectionId: string) {
    setEnrolling(sectionId)
    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        router.push('/')
        return
      }

      const { data: { user }, error } = await supabase.auth.getUser(token)
      if (error || !user) {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        router.push('/')
        return
      }

      await enrollService.enroll(token, sectionId)
      alert('Enrolled successfully!')
      loadCourses()
    } catch (err: any) {
      alert(err.message)
      if (err.message?.includes('Unauthorized') || err.message?.includes('Invalid')) {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        router.push('/')
      }
    } finally {
      setEnrolling(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl">Loading courses...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <h1 className="text-xl font-bold text-gray-900">Available Courses</h1>
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
            Error loading courses: {error}. Course service may be down.
          </div>
        )}

        {courses.length === 0 && !error ? (
          <div className="bg-white p-8 rounded-lg text-center text-gray-600">
            No courses available at this time.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <div key={course.id} className="bg-white rounded-lg shadow-md p-6">
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-gray-900">
                    {course.code}
                  </h3>
                  <p className="text-gray-700 font-medium">{course.name}</p>
                  <p className="text-blue-600 text-sm font-medium mt-1">
                    {course.section_name}
                  </p>
                </div>

                <p className="text-gray-600 text-sm mb-4">
                  {course.description}
                </p>

                <div className="text-sm text-gray-500 mb-4">
                  <p>Faculty: {formatFacultyName(course.faculty?.full_name)}</p>
                  <p>{course.semester} {course.year}</p>
                  <p>Max: {course.max_students} students</p>
                </div>

                <button
                  onClick={() => handleEnroll(course.section_id || course.id)}
                  disabled={enrolling === course.id}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {enrolling === course.id ? 'Enrolling...' : 'Enroll'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}