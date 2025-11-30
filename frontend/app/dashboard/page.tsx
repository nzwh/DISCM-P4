'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { LibraryBig } from 'lucide-react'

export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [pageName, setPageName] = useState('Dashboard');

  useEffect(() => {
    checkUser()
  }, [])

  async function checkUser() {
    // Check if token exists
    const token = localStorage.getItem('access_token')
    
    if (!token) {
      router.push('/')
      return
    }

    // Verify token and get user
    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
      // Token invalid, clear and redirect
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
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
    // Sign out from Supabase
    await supabase.auth.signOut()
    
    // Clear tokens from localStorage
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    
    // Redirect to login
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }

  // const profile = {
  //   full_name: 'John Doe',
  //   role: 'student',
  // };

  // const handleLogout = () => {
  //   // Placeholder for logout functionality
  //   console.log('Logout clicked');
  // }

  // const [pageName, setPageName] = useState('Dashboard');

  return (
    <div className="bg-linear-to-b from-[#CDCDCD] to-[#F0F0F0] / min-h-screen w-full / flex flex-col justify-center items-center / gap-12 p-4">

      <section id="container" 
        className="bg-white / flex flex-col gap-8 / px-6 py-6 / w-360 h-180 / rounded-xl / tracking-tighter">
        
        <aside className="flex flex-row gap-2 / w-full / items-center justify-start">
          <LibraryBig className="text-gray-800" size={20}/>
          <h2 className="text-xl font-bold text-gray-800">
            {pageName}
          </h2>

          <div className="flex items-center gap-4 ml-auto">
            <span className="text-sm text-gray-600">
              {profile?.full_name} ({profile?.role})
            </span>
            <button
              onClick={handleLogout}
              className="bg-red-600 text-sm text-white px-4 py-1 rounded-lg hover:bg-red-700 transition-colors">
              Logout
            </button>
          </div>
        </aside>

        <aside className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/courses"
            className="bg-gray-100 p-4 rounded-lg hover:bg-gray-200 transition-colors">
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
                className="bg-gray-100 p-4 rounded-lg hover:bg-gray-200 transition-colors">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  My Enrollments
                </h3>
                <p className="text-gray-600">
                  View your enrolled courses
                </p>
              </Link>

              <Link
                href="/grades"
                className="bg-gray-100 p-4 rounded-lg hover:bg-gray-200 transition-colors">
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
              className="bg-gray-100 p-4 rounded-lg hover:bg-gray-200 transition-colors">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Faculty Portal
              </h3>
              <p className="text-gray-600">
                Manage courses and upload grades
              </p>
            </Link>
          )}
        </aside>

      </section>

    </div>
    // <div className="min-h-screen bg-gray-50">
    //   <nav className="bg-white shadow-sm">
    //     <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    //       <div className="flex justify-between h-16 items-center">
    //         <h1 className="text-xl font-bold text-gray-900">
    //           Enrollment System
    //         </h1>
    //         <div className="flex items-center gap-4">
    //           <span className="text-sm text-gray-600">
    //             {profile?.full_name} ({profile?.role})
    //           </span>
    //           <button
    //             onClick={handleLogout}
    //             className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
    //           >
    //             Logout
    //           </button>
    //         </div>
    //       </div>
    //     </div>
    //   </nav>

    //   <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    //     <h2 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h2>

    //     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    //       <Link
    //         href="/courses"
    //         className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow"
    //       >
    //         <h3 className="text-lg font-semibold text-gray-900 mb-2">
    //           Browse Courses
    //         </h3>
    //         <p className="text-gray-600">
    //           View all available courses and enroll
    //         </p>
    //       </Link>

    //       {profile?.role === 'student' && (
    //         <>
    //           <Link
    //             href="/enrollments"
    //             className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow"
    //           >
    //             <h3 className="text-lg font-semibold text-gray-900 mb-2">
    //               My Enrollments
    //             </h3>
    //             <p className="text-gray-600">
    //               View your enrolled courses
    //             </p>
    //           </Link>

    //           <Link
    //             href="/grades"
    //             className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow"
    //           >
    //             <h3 className="text-lg font-semibold text-gray-900 mb-2">
    //               My Grades
    //             </h3>
    //             <p className="text-gray-600">
    //               View your academic grades
    //             </p>
    //           </Link>
    //         </>
    //       )}

    //       {profile?.role === 'faculty' && (
    //         <Link
    //           href="/faculty"
    //           className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow"
    //         >
    //           <h3 className="text-lg font-semibold text-gray-900 mb-2">
    //             Faculty Portal
    //           </h3>
    //           <p className="text-gray-600">
    //             Manage courses and upload grades
    //           </p>
    //         </Link>
    //       )}
    //     </div>
    //   </div>
    // </div>
  )
}