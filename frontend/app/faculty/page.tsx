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
  
  const [gradeForm, setGradeForm] = useState({
    enrollment_id: '',
    grade: '',
    percentage: '',
    remarks: ''
  })

  useEffect(() => {
    loadCourses()
  }, [])

  async function loadCourses() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/')
        return
      }

      const data = await courseService.getCourses(session.access_token)
      setCourses(data.courses || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function loadGrades(courseId: string) {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const data = await gradeService.getCourseGrades(session.access_token, courseId)
      setGrades(data.grades || [])
    } catch (err: any) {
      alert(err.message)
    }
  }

  async function handleUploadGrade(e: React.FormEvent) {
    e.preventDefault()
    
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      await gradeService.uploadGrade(session.access_token, {
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