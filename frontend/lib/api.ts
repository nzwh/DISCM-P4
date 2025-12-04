// Frontend API client - now uses Next.js API routes which internally use gRPC
const API_BASE = ''; // Use relative paths for Next.js API routes

export async function apiCall(url: string, token: string, options: RequestInit = {}) {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'x-access-token': token,
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
  getCourses: (token: string) => apiCall(`${API_BASE}/api/courses`, token),
  getCourse: (token: string, id: string) => apiCall(`${API_BASE}/api/courses/${id}`, token),
}

export const enrollService = {
  getEnrollments: (token: string) => apiCall(`${API_BASE}/api/enrollments`, token),
  enroll: (token: string, courseId: string) => 
    apiCall(`${API_BASE}/api/enrollments`, token, {
      method: 'POST',
      body: JSON.stringify({ course_id: courseId }),
    }),
  drop: (token: string, enrollmentId: string) =>
    apiCall(`${API_BASE}/api/enroll/${enrollmentId}`, token, {
      method: 'DELETE',
    }),
}

export const gradeService = {
  getGrades: (token: string) => apiCall(`${API_BASE}/api/grades`, token),
  getCourseGrades: (token: string, courseId: string) =>
    apiCall(`${API_BASE}/api/grades/course/${courseId}`, token),
  uploadGrade: (token: string, data: any) =>
    apiCall(`${API_BASE}/api/grades`, token, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateGrade: (token: string, gradeId: string, data: any) =>
    apiCall(`${API_BASE}/api/grades/${gradeId}`, token, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
}
