'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Copyright, LibraryBig } from 'lucide-react'

export default function SignupPage() {
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Call auth-service via API route
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          full_name: fullName || email.split('@')[0],
          role: 'student'
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Signup failed')
      }

      // Store tokens from auth-service response
      if (data.access_token) {
        localStorage.setItem('access_token', data.access_token)
      }
      if (data.refresh_token) {
        localStorage.setItem('refresh_token', data.refresh_token)
      }

      router.push('/dashboard')
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : String(error))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div id="main"
      className="bg-linear-to-b from-[#CDCDCD] to-[#F0F0F0] min-h-screen w-full flex flex-col justify-center items-center gap-12 p-4">

      <section id="container" 
        className="bg-white flex flex-col justify-between px-6 py-6 w-120 rounded-xl tracking-tighter">

        <aside className="flex flex-row gap-2 w-full items-center justify-start">
          <LibraryBig className="text-gray-800" size={20}/>
          <h2 className="text-xl font-bold text-gray-800">
            Sign Up
          </h2>
        </aside>

        <form onSubmit={handleSignup} 
          className="flex flex-col gap-4 w-full mt-4">
          
          <aside className="flex flex-col gap-2">
            <label htmlFor="fullName" 
              className="text-base font-medium text-gray-700">
              Full Name
            </label>
            <input
              className="w-full px-4 py-2 text-lg border border-gray-300 rounded-lg text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-0 focus:border-gray-500"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Juan Dela Cruz" />
          </aside>

          <aside className="flex flex-col gap-2">
            <label htmlFor="email" 
              className="text-base font-medium text-gray-700">
              Email
            </label>
            <input
              className="w-full px-4 py-2 text-lg border border-gray-300 rounded-lg text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-0 focus:border-gray-500"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student@domain.com"
              required />
          </aside>

          <aside className="flex flex-col gap-2">
            <label htmlFor="password" 
              className="text-base font-medium text-gray-700">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 text-lg border border-gray-300 rounded-lg text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-0 focus:border-gray-500"
              placeholder="••••••••"
              required />
          </aside>

          <aside className="flex flex-col gap-2">
            <label htmlFor="confirmPassword" 
              className="text-base font-medium text-gray-700">
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2 text-lg border border-gray-300 rounded-lg text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-0 focus:border-gray-500"
              placeholder="••••••••"
              required />
          </aside>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-linear-to-b from-slate-800 to-slate-600 cursor-pointer text-white py-2 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>

          <p className="text-sm text-gray-600 text-center">
            Already have an account?{' '}
            <a href="/" className="text-slate-800 font-medium hover:underline">
              Login
            </a>
          </p>
        </form>

        <aside className="mt-6 text-sm text-gray-600 justify-start flex flex-row items-center gap-2">
          <Copyright size={14}/>
          <h6>DISCM P4</h6>
        </aside>

      </section>
    </div>
  )
}