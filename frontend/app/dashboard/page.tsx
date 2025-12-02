'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight, Copyright, GraduationCap, Inbox, LayoutGrid, LibraryBig, LogOut, ShieldUser } from 'lucide-react'
import { Profile, User } from '@/lib/types'

export default function Dashboard() {
  const router = useRouter()

  // user states
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  // loading states
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function checkUser() {

      // token check
      const token = localStorage.getItem('access_token')
      if (!token) {
        router.push('/');
        return;
      }

      // verify token and get user
      // todo: move to db fetching file
      const { data: { user }, error } = await supabase.auth.getUser(token)
      // invalid token, redirect to login
      if (error || !user) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        router.push('/');
        return;
      }

      // valid user
      setUser({
        id: user.id,
        email: user.email || '',
        role: user.user_metadata.role || 'student'
      });
      // fetch profile
      // todo: move to db fetching file
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      setProfile(profile);
      setLoading(false)
    }

    checkUser();
  }, [router]);

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
      <div className="flex justify-center items-center bg-gray-50 min-h-screen">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col justify-center items-center gap-12 bg-linear-to-b from-[#CDCDCD] to-[#F0F0F0] p-4 w-full min-h-screen">

      <section id="container" 
        className="flex flex-col gap-8 bg-white px-6 py-6 rounded-xl w-2/5 h-180 tracking-tighter">
      
        <aside className="flex flex-row justify-start items-center gap-2 w-full">
          <LayoutGrid className="text-gray-800" size={20}/>
          <h2 className="font-bold text-gray-800 text-xl">
            Dashboard
          </h2>

          <div className="flex flex-row items-center gap-4 ml-auto">
            <p className="text-gray-600 text-sm">
              {profile?.full_name}
            </p>
            <p className="font-bold text-gray-800 text-sm capitalize">
              ({profile?.role})
            </p>
            <button
              onClick={handleLogout}
              className="flex flex-row items-center gap-1 bg-linear-to-b from-red-600 hover:from-red-700 to-red-700 hover:to-red-800 px-4 py-1 rounded-2xl font-semibold text-white text-sm transition-colors cursor-pointer">
              <LogOut size={14} strokeWidth={3}/>
              Logout
            </button>
          </div>
        </aside>

        <aside className="gap-4 grid grid-cols-1 md:grid-cols-2">
          <Link
            href="/courses"
            className="flex flex-col gap-2 bg-gray-100 hover:bg-gray-200 p-4 rounded-lg transition-colors">
            <div className="flex flex-row items-center gap-2">
              <LibraryBig size={18} className="text-slate-800"/>
              <h3 className="font-semibold text-gray-900 text-lg">
                Browse Courses
              </h3>
              <ChevronRight size={16} strokeWidth={3} className="ml-auto text-gray-500"/> 
            </div>
            <p className="text-gray-500 text-sm leading-4.5 tracking-tight">
              View all the available courses and enroll to them.
            </p>
          </Link>

          {profile?.role === 'student' && (
            <>
              <Link
                href="/enrollments"
                className="flex flex-col gap-2 bg-gray-100 hover:bg-gray-200 p-4 rounded-lg transition-colors">
                <div className="flex flex-row items-center gap-2">
                  <Inbox size={18} className="text-slate-800"/>
                  <h3 className="font-semibold text-gray-900 text-lg">
                    My Enrollments
                  </h3>
                  <ChevronRight size={16} strokeWidth={3} className="ml-auto text-gray-500"/> 
                </div>
                <p className="text-gray-500 text-sm leading-4.5 tracking-tight">
                  View all of your currently enrolled courses.
                </p>
              </Link>

              <Link
                href="/grades"
                className="flex flex-col gap-2 bg-gray-100 hover:bg-gray-200 p-4 rounded-lg transition-colors">
                <div className="flex flex-row items-center gap-2">
                  <GraduationCap size={18} className="text-slate-800"/>
                  <h3 className="font-semibold text-gray-900 text-lg">
                    My Grades
                  </h3>
                  <ChevronRight size={16} strokeWidth={3} className="ml-auto text-gray-500"/> 
                </div>
                <p className="text-gray-500 text-sm leading-4.5 tracking-tight">
                  View all of your current academic grades.
                </p>
              </Link>
            </>
          )}

          {profile?.role === 'faculty' && (
            <Link
              href="/faculty"
              className="flex flex-col gap-2 bg-gray-100 hover:bg-gray-200 p-4 rounded-lg transition-colors">
              <div className="flex flex-row items-center gap-2">
                <ShieldUser size={18} className="text-slate-800"/>
                <h3 className="font-semibold text-gray-900 text-lg">
                  Faculty Portal
                </h3>
                <ChevronRight size={16} strokeWidth={3} className="ml-auto text-gray-500"/> 
              </div>
              <p className="text-gray-500 text-sm leading-4.5 tracking-tight">
                Manage courses and upload your grades.
              </p>
            </Link>
          )}
        </aside>

        <aside className="flex flex-row items-center gap-1 mt-auto text-slate-800">
          <Copyright size={14}/>
          <h6><i>P4</i></h6>
        </aside>
      </section>

    </div>
  )
}