const COURSE_SERVICE = process.env.NEXT_PUBLIC_COURSE_SERVICE_URL
const ENROLL_SERVICE = process.env.NEXT_PUBLIC_ENROLL_SERVICE_URL
const GRADE_SERVICE = process.env.NEXT_PUBLIC_GRADE_SERVICE_URL

// Validate environment variables
if (!COURSE_SERVICE || !ENROLL_SERVICE || !GRADE_SERVICE) {
  console.error('Missing service URLs:', {
    COURSE_SERVICE: !!COURSE_SERVICE,
    ENROLL_SERVICE: !!ENROLL_SERVICE,
    GRADE_SERVICE: !!GRADE_SERVICE
  })
}

// Debug: Log service URLs (only in development)
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  console.log('Service URLs:', {
    COURSE_SERVICE,
    ENROLL_SERVICE,
    GRADE_SERVICE
  })
}

export async function apiCall(url: string, token: string, options: RequestInit = {}) {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
    })
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ 
        error: `Service unavailable (${response.status} ${response.statusText})` 
      }))
      throw new Error(error.error || `Request failed with status ${response.status}`)
    }
    
    return response.json()
  } catch (err: any) {
    // Handle network errors (connection refused, CORS, etc.)
    if (err instanceof TypeError && err.message.includes('fetch')) {
      console.error('Network error:', err.message, 'URL:', url)
      throw new Error(`Cannot connect to service at ${url}. Service may be down or unreachable.`)
    }
    throw err
  }
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