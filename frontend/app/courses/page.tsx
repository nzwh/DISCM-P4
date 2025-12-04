'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import { Info, LibraryBig, LogOut } from 'lucide-react'
import { courseService, enrollService } from '@/lib/api'
import { supabase } from '@/lib/supabase'
import FetchUserProfile from '@/lib/database/FetchUserProfile'

import XBackground from '@/components/Background'
import XContainer from '@/components/Container'
import XPanelHeader from '@/components/PanelHeader'
import XActionButton from '@/components/ActionButton'
import XCourseEntry from '@/components/CourseEntry'

export default function CoursesPage() {
  const router = useRouter();

  const [courses, setCourses] = useState<any[]>([]);
  const [enrolling, setEnrolling] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadCourses = async (token: string) => {
      const data = await courseService.getCourses(token)
      setCourses(data.courses || [])
    }
    const checkToken = async () => {
      try {
        const token = localStorage.getItem('access_token')
        if (!token) 
          return router.push('/');
        
        const { data: { user }, error } = await supabase.auth.getUser(token);
        const profile = await FetchUserProfile(user?.id);
        if (error || !user || !profile) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          return router.push('/');
        }

        await loadCourses(token);
      } catch (error: unknown) {
        setError(error instanceof Error ? error.message : String(error));
      } finally {
        setLoading(false);
      }
    }

    checkToken();
  }, [router])

  const handleEnroll = async (sectionId: string) => {
    setEnrolling(sectionId)
    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        router.push('/')
        return
      }

      await enrollService.enroll(token, sectionId)
      alert('Enrolled successfully!')
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : String(error))
      if (error instanceof Error && 
        (error.message.includes('Unauthorized') || error.message.includes('Invalid'))) {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        router.push('/')
      }
    } finally {
      setLoading(false)
      setEnrolling(null);
    }
  }

  if (loading) {
    return (
      <XBackground>
        <div className="text-xl">Loading...</div>
      </XBackground>
    )
  }

  return (
    <XBackground>
      <XContainer width="80rem">

        <XPanelHeader 
          title="Course Offerings" 
          icon={<LibraryBig size={20} />} 
        >
          <XActionButton
            title="Return to Dashboard"
            style="border-2 border-gray-400 text-gray-400 hover:border-gray-300 hover:text-gray-300 px-3"
            icon={<LogOut size={14} strokeWidth={3} />}
            onClick={() => router.push('/dashboard')}
          />
        </XPanelHeader>

        {error && (
          <aside className="flex flex-row items-center gap-2 bg-red-50 p-3 rounded-lg text-red-600 text-sm">
            <Info size={16}/>
            <p>Error loading courses: {error}</p>
          </aside>
        )}

        {courses.length === 0 && !error ? (
          <div className="flex flex-row items-center gap-2 bg-slate-100 p-3 rounded-lg text-slate-600 text-sm">
            <Info size={16}/>
            <p>No courses available at this time.</p>
          </div>
        ) : (
          <aside className="gap-6 grid grid-cols-1 md:grid-cols-2">
            {courses.map((course) => (
              <XCourseEntry 
                key={course.id} 
                course={course} 
                enrolling={enrolling} 
                handleEnroll={handleEnroll}
              />
            ))}
          </aside>
        )}
      </XContainer>
    </XBackground>
  )
}