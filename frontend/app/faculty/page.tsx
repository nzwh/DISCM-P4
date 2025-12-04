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
  const [selectedStudent, setSelectedStudent] = useState<any>(null)
  
  const [updateGradeForm, setUpdateGradeForm] = useState({
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
      await loadCourses(user.id)
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

  async function loadCourses(facultyUserId: string) {
    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        router.push('/')
        return
      }

      const data = await courseService.getCourses(token)
      // Filter to only show sections where this faculty is the instructor
      const facultyCourses = (data.courses || []).filter(
        (course: any) => course.faculty_id === facultyUserId
      )
      setCourses(facultyCourses)
    } catch (err: any) {
      setError(err.message)
    }
  }

  async function loadGrades(sectionId: string) {
    try {
      setLoading(true)
      const token = localStorage.getItem('access_token')
      if (!token) return

      const data = await gradeService.getCourseGrades(token, sectionId)
      setGrades(data.grades || [])
      setSelectedStudent(null)
      setUpdateGradeForm({ grade: '', percentage: '', remarks: '' })
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleUpdateGrade(e: React.FormEvent) {
    e.preventDefault()
    
    if (!selectedStudent) {
      alert('Please select a student first')
      return
    }

    try {
      const token = localStorage.getItem('access_token')
      if (!token) return

      await gradeService.updateGrade(token, selectedStudent.id, {
        grade: updateGradeForm.grade,
        percentage: updateGradeForm.percentage ? parseFloat(updateGradeForm.percentage) : undefined,
        remarks: updateGradeForm.remarks || undefined
      })

      alert('Grade updated successfully!')
      setUpdateGradeForm({ grade: '', percentage: '', remarks: '' })
      setSelectedStudent(null)
      
      if (selectedCourse) {
        loadGrades(selectedCourse)
      }
    } catch (err: any) {
      alert(err.message)
    }
  }

  function handleStudentSelect(grade: any) {
    setSelectedStudent(grade)
    setUpdateGradeForm({
      grade: grade.grade || '',
      percentage: grade.percentage ? grade.percentage.toString() : '',
      remarks: grade.remarks || ''
    })
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
                  setSelectedStudent(null)
                  setGrades([])
                  if (e.target.value) loadGrades(e.target.value)
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Select a section --</option>
                {courses.length === 0 ? (
                  <option value="" disabled>No sections found</option>
                ) : (
                  courses.map((course) => (
                    <option key={course.id} value={course.section_id || course.id}>
                      {course.code} - {course.name} {course.section_name ? `(${course.section_name})` : ''}
                    </option>
                  ))
                )}
              </select>
            </div>

            {selectedCourse && (
              <>
                {grades.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    {loading ? 'Loading students...' : 'No students enrolled in this course yet.'}
                  </div>
                ) : (
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
                            Percentage
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {grades.map((grade) => (
                          <tr
                            key={grade.id}
                            onClick={() => handleStudentSelect(grade)}
                            className={`cursor-pointer transition-colors ${
                              selectedStudent?.id === grade.id
                                ? 'bg-blue-50'
                                : 'hover:bg-gray-50'
                            }`}
                          >
                            <td className="px-4 py-2 text-sm">{grade.student?.full_name || 'Unknown Student'}</td>
                            <td className="px-4 py-2 text-sm font-bold">{grade.grade || 'No Grade'}</td>
                            <td className="px-4 py-2 text-sm text-gray-500">
                              {grade.percentage ? `${grade.percentage}%` : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Update Grade Form */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {selectedStudent ? 'Update Grade' : 'Select a Student'}
            </h2>
            
            {selectedStudent ? (
              <form onSubmit={handleUpdateGrade} className="space-y-4">
                <div className="bg-gray-50 p-3 rounded-lg mb-4">
                  <div className="text-sm text-gray-600">Student</div>
                  <div className="font-medium text-gray-900">
                    {selectedStudent.student?.full_name || 'Unknown'}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {selectedStudent.student?.email || ''}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Grade
                  </label>
                  <input
                    type="text"
                    value={updateGradeForm.grade}
                    onChange={(e) => setUpdateGradeForm({ ...updateGradeForm, grade: e.target.value })}
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
                    min="0"
                    max="100"
                    value={updateGradeForm.percentage}
                    onChange={(e) => setUpdateGradeForm({ ...updateGradeForm, percentage: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="85.5"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Remarks (Optional)
                  </label>
                  <textarea
                    value={updateGradeForm.remarks}
                    onChange={(e) => setUpdateGradeForm({ ...updateGradeForm, remarks: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Additional comments"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Update Grade
                </button>
              </form>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>Select a course and click on a student to update their grade.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}