'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

import { Info, LogIn, RectangleEllipsis } from 'lucide-react'

import XBackground from '@/components/Background'
import XContainer from '@/components/Container'
import XInputBox from '@/components/InputBox'
import XInputButton from '@/components/InputButton'
import XLogo from '@/components/Logo'
import XPanelHeader from '@/components/PanelHeader'

export default function SignupPage() {
  const router = useRouter()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Redirect if already logged in
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      router.push('/dashboard');
    }
  }, [router]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          full_name: name || email.split('@')[0],
          role: 'student'
        })
      });

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Signup failed');
      }

      if (data.access_token) {
        localStorage.setItem('access_token', data.access_token);
      }
      if (data.refresh_token) {
        localStorage.setItem('refresh_token', data.refresh_token);
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
          title="Sign-up to continue"
          icon={<RectangleEllipsis size={24} />}
        />

        <form onSubmit={handleSignup} 
          className="flex flex-col gap-4">
          <XInputBox
            label="Full Name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Juan Dela Cruz"
          />
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
            placeholder="••••••••"
          />
          <XInputBox
            label="Confirm Password"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="••••••••"
          />
          <XInputButton
            type="submit"
            disabled={loading}
            idle="Sign up with an Email Address" 
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
          <p> Already have an account? </p>
          <Link href="/" className="mr-auto font-semibold hover:text-slate-600 hover:underline">
            Login here.
          </Link>
          <XLogo />
        </aside>

      </XContainer>
    </XBackground>
  )
}