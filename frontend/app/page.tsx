'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

import { Info, LogIn, RectangleEllipsis } from 'lucide-react';

import XBackground from '@/components/Background';
import XContainer from '@/components/Container';
import XInputBox from '@/components/InputBox';
import XInputButton from '@/components/InputButton';
import XLogo from '@/components/Logo';
import XPanelHeader from '@/components/PanelHeader';

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) 
        throw error;

      if (data.session) {
        localStorage.setItem('access_token', data.session.access_token);
        localStorage.setItem('refresh_token', data.session.refresh_token);
      }

      router.push('/dashboard');
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <XBackground>
      <XContainer width="30rem">

        <XPanelHeader 
          title="Log-in to continue" 
          icon={<RectangleEllipsis size={24}/>} 
        />

        <form onSubmit={handleLogin} 
          className="flex flex-col gap-4">
          <XInputBox
            label="Email Address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@domain.com"
          />
          <XInputBox
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••••••••••"
          />
          <XInputButton
            type="submit"
            disabled={loading}
            idle="Sign in with an Email Address"
            loading="Signing you in..."
            icon={<LogIn size={16} />}
          />
          {error && (
            <div className="flex flex-row items-center gap-2 bg-red-50 p-3 rounded-lg text-red-600 text-sm">
              <Info size={16}/>
              <p>{error}</p>
            </div>
          )}
        </form>

        <aside className="flex flex-row justify-between items-center gap-1 text-sm">
          <p> Don&apos;t have an account? </p>
          <a href="/signup" className="mr-auto font-semibold hover:text-slate-600 hover:underline">
            Sign up here.
          </a>
          <XLogo />
        </aside>

      </XContainer>
    </XBackground>
  )
}