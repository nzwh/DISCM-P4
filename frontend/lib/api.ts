const COURSE_SERVICE = process.env.NEXT_PUBLIC_COURSE_SERVICE_URL!
const ENROLL_SERVICE = process.env.NEXT_PUBLIC_ENROLL_SERVICE_URL!
const GRADE_SERVICE = process.env.NEXT_PUBLIC_GRADE_SERVICE_URL!

export async function apiCall(url: string, token: string, options: RequestInit = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  })
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Service unavailable' }))
    throw new Error(error.error || 'Request failed')
  }
  
  return response.json()
}

export const courseService = {
  getCourses: (token: string) => apiCall(`${COURSE_SERVICE}/api/courses`, token),
  getCourse: (token: string, id: string) => apiCall(`${COURSE_SERVICE}/api/courses/${id}`, token),
}

export const enrollService = {
  getEnrollments: (token: string) => apiCall(`${ENROLL_SERVICE}/api/enrollments`, token),
  enroll: (token: string, courseId: string) => 
    apiCall(`${ENROLL_SERVICE}/api/enroll`, token, {
      method: 'POST',
      body: JSON.stringify({ course_id: courseId }),
    }),
  drop: (token: string, enrollmentId: string) =>
    apiCall(`${ENROLL_SERVICE}/api/enroll/${enrollmentId}`, token, {
      method: 'DELETE',
    }),
}

export const gradeService = {
  getGrades: (token: string) => apiCall(`${GRADE_SERVICE}/api/grades`, token),
  getCourseGrades: (token: string, courseId: string) =>
    apiCall(`${GRADE_SERVICE}/api/grades/course/${courseId}`, token),
  uploadGrade: (token: string, data: any) =>
    apiCall(`${GRADE_SERVICE}/api/grades`, token, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
}