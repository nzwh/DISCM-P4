// hooks/useAuth.js
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import FetchUserProfile from '@/lib/database/FetchUserProfile';
import { Profile } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { Session } from '@supabase/supabase-js';

export const useAuth = () => {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.access_token) {
        router.push('/');
        localStorage.clear();
        setLoading(false);
        return;
      }

      const { data: { user }, error } = await supabase.auth.getUser(session.access_token);
      if (error || !user) {
        router.push('/');
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        setLoading(false);
        return;
      }

      const info = await FetchUserProfile(user.id);
      if (!info) {
        router.push('/');
        setProfile(null);
        return;
      }

      console.log('User profile fetched:', info);
      console.log('Session:', session);

      setProfile(info);
      setLoading(false);
      setSession(session);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        localStorage.clear();
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  return { profile, loading, session };
};
