'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

import { ChevronRight, GraduationCap, Inbox, LayoutGrid, LibraryBig, Link, LogOut, ShieldUser } from 'lucide-react'
import FetchUserProfile from '@/lib/database/FetchUserProfile'
import { Profile } from '@/lib/types'

import XActionButton from '@/components/ActionButton'
import XBackground from '@/components/Background'
import XContainer from '@/components/Container'
import XLogo from '@/components/Logo'
import XPanelHeader from '@/components/PanelHeader'
import XPanelLink from '@/components/PanelLink'

// Format name
function formatName(name: string | undefined): string {
  if (!name) return 'User'

  const formatted = name
    .replace(/[._-]/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
  
  return formatted
}

export default function Dashboard() {
  const router = useRouter()

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {

      const token = localStorage.getItem('access_token');
      if (!token)
        return router.push('/');

      const { data: { user }, error } = await supabase.auth.getUser(token);
      const profile = await FetchUserProfile(user?.id || '');
      if (error || !user || !profile) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        return router.push('/');
      }
    
      setProfile(profile);
      setLoading(false);
    }

    checkUser();
  }, [router]);

  const handleLogout = async () => {
    const token = localStorage.getItem('access_token');
    
    // Call auth-service logout via API route
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-access-token': token || ''
        }
      });
    } catch (error) {
      console.error('Logout error:', error);
    }

    // Clear local tokens regardless of API response
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    
    router.push('/');
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
      <XContainer width="60rem">

        <XPanelHeader 
          title="Dashboard" 
          icon={<LayoutGrid size={20} />} 
        >
          <div className="flex flex-row items-center gap-4 text-sm">
            <p className="flex flex-row gap-2">
              {formatName(profile?.full_name)}
              <span className="font-bold capitalize">
                ({profile?.role})
              </span>
            </p>
            <XActionButton 
              icon={<LogOut size={14} strokeWidth={3} />}
              onClick={handleLogout}
            />
          </div>
        </XPanelHeader>

        <aside className="gap-4 grid grid-cols-1 md:grid-cols-2">
          <XPanelLink
            href="/courses"
            title="Browse Courses"
            icon={<LibraryBig size={18} />}
            description="View all the available courses and enroll to them."
          />
          <XPanelLink
            href="/enrollments"
            title="My Enrollments"
            icon={<Inbox size={18} />}
            description="View and manage your current course enrollments."
          />
          {profile?.role === 'student' && (
            <XPanelLink
              href="/grades"
              title="My Grades"
              icon={<GraduationCap size={18} />}
              description="View all of your current academic grades."
            />
          )}
          {profile?.role === 'faculty' && (
            <XPanelLink
              href="/faculty"
              title="Faculty Portal"
              icon={<ShieldUser size={18} />}
              description="Manage courses and upload your grades."
            />
          )}
        </aside>

        <XLogo />
      
      </XContainer>
    </XBackground>
  )
}