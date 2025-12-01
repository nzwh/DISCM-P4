'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { courseService, gradeService } from '@/lib/api'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function FacultyPage() {
  const router = useRouter()
  const [courses, setCourses] = useState<any[]>([])
  const [selectedCourse, setSelectedCourse] = useState<string>('')
  const [grades, setGrades] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isAuthorized, setIsAuthorized] = useState(false)
  
  const [gradeForm, setGradeForm] = useState({
    enrollment_id: '',
    grade: '',
    percentage: '',
    remarks: ''
  })

  useEffect(() => {
    checkAuthorization()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function checkAuthorization() {
    try {
      // Check if token exists - authentication required
      const token = localStorage.getItem('access_token')
      
      if (!token) {
        // No token found - user must login
        router.push('/')
        return
      }

      // Call API to verify faculty access
      try {
        const validationResponse = await fetch('/api/auth/check-faculty', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'x-access-token': token,
          },
        })

        if (!validationResponse.ok) {
          // Not authorized as faculty or invalid token
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
          
          // If 401 (unauthorized), redirect to login
          // If 403 (forbidden), redirect to dashboard
          if (validationResponse.status === 401) {
            router.push('/')
          } else {
            router.push('/dashboard')
          }
          return
        }

        const validationData = await validationResponse.json()
        if (!validationData.authorized) {
          // Server confirmed: not faculty (student or guest)
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
          router.push('/dashboard')
          return
        }
      } catch (apiError) {
        // If API check fails, treat as unauthorized for security
        console.error('Server-side validation failed:', apiError)
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        router.push('/')
        return
      }

      // CLIENT-SIDE VALIDATION: Additional check for defense in depth
      // Verify token and get user
      const { data: { user }, error: userError } = await supabase.auth.getUser(token)

      if (userError || !user) {
        // Token invalid, clear and redirect to login
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        router.push('/')
        return
      }

      // Get user profile to check role
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileError || !profile) {
        // No profile found, redirect to login
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        router.push('/')
        return
      }

      // CRITICAL: Only allow faculty role - reject students and guests
      if (profile.role !== 'faculty') {
        // User is not faculty (student or guest), redirect to dashboard
        router.push('/dashboard')
        return
      }

      // User is authorized as faculty (both server and client confirmed)
      setIsAuthorized(true)
      await loadCourses()
    } catch (err: any) {
      console.error('Authorization error:', err)
      // On any error, clear tokens and redirect to login for security
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      router.push('/')
    } finally {
      setLoading(false)
    }
  }

  async function loadCourses() {
    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        router.push('/')
        return
      }

      const data = await courseService.getCourses(token)
      setCourses(data.courses || [])
    } catch (err: any) {
      setError(err.message)
    }
  }

  async function loadGrades(courseId: string) {
    try {
      const token = localStorage.getItem('access_token')
      if (!token) return

      const data = await gradeService.getCourseGrades(token, courseId)
      setGrades(data.grades || [])
    } catch (err: any) {
      alert(err.message)
    }
  }

  async function handleUploadGrade(e: React.FormEvent) {
    e.preventDefault()
    
    try {
      const token = localStorage.getItem('access_token')
      if (!token) return

      await gradeService.uploadGrade(token, {
        ...gradeForm,
        percentage: gradeForm.percentage ? parseFloat(gradeForm.percentage) : null
      })

      alert('Grade uploaded successfully!')
      setGradeForm({ enrollment_id: '', grade: '', percentage: '', remarks: '' })
      
      if (selectedCourse) {
        loadGrades(selectedCourse)
      }
    } catch (err: any) {
      alert(err.message)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }

  // If not authorized (not faculty), don't render the page content
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl font-bold text-red-600 mb-2">Access Denied</div>
          <div className="text-gray-600 mb-4">You do not have permission to access this page.</div>
          <Link href="/dashboard" className="text-blue-600 hover:text-blue-800 underline">
            Return to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <h1 className="text-xl font-bold text-gray-900">Faculty Portal</h1>
            <Link href="/dashboard" className="text-blue-600 hover:text-blue-800">
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">
            Error: {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upload Grade Form */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Upload Grade</h2>
            
            <form onSubmit={handleUploadGrade} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Enrollment ID
                </label>
                <input
                  type="text"
                  value={gradeForm.enrollment_id}
                  onChange={(e) => setGradeForm({ ...gradeForm, enrollment_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter enrollment ID"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Get from course grades table</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Grade
                </label>
                <input
                  type="text"
                  value={gradeForm.grade}
                  onChange={(e) => setGradeForm({ ...gradeForm, grade: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="A, B+, C, etc."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Percentage (Optional)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={gradeForm.percentage}
                  onChange={(e) => setGradeForm({ ...gradeForm, percentage: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="85.5"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Remarks (Optional)
                </label>
                <textarea
                  value={gradeForm.remarks}
                  onChange={(e) => setGradeForm({ ...gradeForm, remarks: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Additional comments"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Upload Grade
              </button>
            </form>
          </div>

          {/* View Grades */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">View Course Grades</h2>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Course
              </label>
              <select
                value={selectedCourse}
                onChange={(e) => {
                  setSelectedCourse(e.target.value)
                  if (e.target.value) loadGrades(e.target.value)
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Select a course --</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.code} - {course.name}
                  </option>
                ))}
              </select>
            </div>

            {grades.length > 0 && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                        Student
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                        Grade
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                        Enrollment ID
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {grades.map((grade) => (
                      <tr key={grade.id}>
                        <td className="px-4 py-2 text-sm">{grade.student.full_name}</td>
                        <td className="px-4 py-2 text-sm font-bold">{grade.grade}</td>
                        <td className="px-4 py-2 text-sm text-gray-500 font-mono text-xs">
                          {grade.enrollment_id}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}