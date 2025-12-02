'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

import { Copyright, Info, LibraryBig, LogIn } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();

  // form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // loading states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    // reset states
    setLoading(true);
    setError('');

    try {
      // todo: move to db fetching file
      // auth with supabase
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) 
        throw error

      // store tokens in local storage
      if (data.session) {
        localStorage.setItem('access_token', data.session.access_token)
        localStorage.setItem('refresh_token', data.session.refresh_token)
      }

      // redirect to dashboard
      router.push('/dashboard')
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : String(error))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div id="main"
      className="flex flex-col justify-center items-center gap-12 bg-linear-to-b from-[#CDCDCD] to-[#F0F0F0] p-4 w-full min-h-screen">

      <section id="container" 
        className="flex flex-col justify-between gap-6 bg-white px-6 py-6 rounded-xl w-120 tracking-tighter">

        <aside className="flex flex-row justify-start items-center gap-2 w-full">
          <LibraryBig className="text-gray-800" size={20}/>
          <h2 className="font-bold text-gray-800 text-xl">
            Log-in to continue
          </h2>
        </aside>

        <form onSubmit={handleLogin} 
          className="flex flex-col gap-4 w-full">
          
          <aside className="flex flex-col gap-2">
            <label htmlFor="email" 
              className="font-medium text-gray-700 text-base">
              Email Address
            </label>
            <input
              className="px-4 py-2 border border-gray-300 focus:border-gray-500 rounded-lg focus:outline-none focus:ring-0 w-full text-gray-800 placeholder:text-gray-400 text-lg"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student@domain.com" />
          </aside>

          <aside className="flex flex-col gap-2">
            <label htmlFor="password" 
              className="font-medium text-gray-700 text-base">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="px-4 py-2 border border-gray-300 focus:border-gray-500 rounded-lg focus:outline-none focus:ring-0 w-full text-gray-800 placeholder:text-gray-400 text-lg"
              placeholder="••••••••••••••••"/>
          </aside>

          {error && (
            <div className="flex flex-row items-center gap-2 bg-red-50 p-3 rounded-lg text-red-600 text-sm">
              <Info size={16}/>
              <p>{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex flex-row justify-center items-center gap-2 bg-linear-to-b from-slate-800 hover:from-slate-700 to-slate-600 hover:to-slate-500 disabled:opacity-50 px-4 py-2 rounded-lg w-full text-white transition-colors cursor-pointer disabled:cursor-not-allowed">
            <LogIn size={16}/>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <aside className="flex flex-row justify-between items-center text-gray-600 text-sm">
          <p className="text-gray-600 text-sm text-center">
            Don&apos;t have an account? {' '}
            <a href="/signup" className="font-semibold text-slate-800 hover:underline">
              Sign up here.
            </a>
          </p>

          <div className="flex flex-row items-center gap-1">
            <Copyright size={14}/>
            <h6><i>P4</i></h6>
          </div>
        </aside>

      </section>
    </div>
  )
}