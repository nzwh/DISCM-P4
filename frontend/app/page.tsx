'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Copyright, LibraryBig } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();

  //- Form Input
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    router.push('/dashboard');
  }

  // const handleLogin = async (e: React.FormEvent) => {
  //   e.preventDefault()

  //   // Reset error state
  //   setLoading(true);
  //   setError('');

  //   try {
  //     const { data, error } = await supabase.auth.signInWithPassword({
  //       email,
  //       password,
  //     })

  //     if (error) throw error

  //     // Create or update profile
  //     const { error: profileError } = await supabase
  //       .from('profiles')
  //       .upsert({
  //         id: data.user.id,
  //         email: data.user.email,
  //         full_name: data.user.email?.split('@')[0] || 'User',
  //       })
  //       .select()

  //     if (profileError && profileError.code !== '23505') {
  //       console.error('Profile error:', profileError)
  //     }

  //     router.push('/dashboard')
  //   } catch (error: any) {
  //     setError(error.message)
  //   } finally {
  //     setLoading(false)
  //   }
  // }

  const [pageName, setPageName] = useState('Login');

  return (
    <div className="bg-linear-to-b from-[#CDCDCD] to-[#F0F0F0] / min-h-screen w-full / flex flex-col justify-center items-center / gap-12 p-4">

      <section id="container" 
        className="bg-white / flex flex-col justify-between / px-6 py-6 / w-120 / rounded-xl / tracking-tighter">

        <aside className="flex flex-row gap-2 / w-full / items-center justify-start">
          <LibraryBig className="text-gray-800" size={20}/>
          <h2 className="text-xl font-bold text-gray-800">
            {pageName}
          </h2>
        </aside>

        <form onSubmit={handleLogin} 
          className="flex flex-col gap-4 / w-full / mt-4">
          
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
            />
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
            />
          </aside>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-linear-to-b from-slate-800 to-slate-600 cursor-pointer text-white py-2 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <aside className="mt-6 text-sm text-gray-600 justify-start flex flex-row items-center gap-2">
          <Copyright size={14}/>
          <h6>DISCM P4 Assignment</h6>
        </aside>
      </section>
    </div>
    // <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
    //   <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
    //     <h1 className="text-3xl font-bold text-center text-gray-800 mb-8">
    //       Enrollment System
    //     </h1>
        
    //     <form onSubmit={handleLogin} className="space-y-6">
    //       <div>
    //         <label className="block text-sm font-medium text-gray-700 mb-2">
    //           Email
    //         </label>
    //         <input
    //           type="email"
    //           value={email}
    //           onChange={(e) => setEmail(e.target.value)}
    //           className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
    //           placeholder="student@test.com"
    //         />
    //       </div>

    //       <div>
    //         <label className="block text-sm font-medium text-gray-700 mb-2">
    //           Password
    //         </label>
    //         <input
    //           type="password"
    //           value={password}
    //           onChange={(e) => setPassword(e.target.value)}
    //           className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
    //           placeholder="••••••••"
    //         />
    //       </div>

    //       {error && (
    //         <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
    //           {error}
    //         </div>
    //       )}

    //       <button
    //         type="submit"
    //         disabled={loading}
    //         className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    //       >
    //         {loading ? 'Signing in...' : 'Sign In'}
    //       </button>
    //     </form>

    //     <div className="mt-6 text-center text-sm text-gray-600">
    //       <p>Test Accounts:</p>
    //       <p>Student: student@test.com</p>
    //       <p>Faculty: faculty@test.com</p>
    //     </div>
    //   </div>
    // </div>
  )
}