'use client'

import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function LoginPage() {
  const [mobile, setMobile] = useState('')
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')

    const { data, error } = await supabase
      .from('admin_users')
      .select('*')
      .eq('mobile', mobile.trim())
      .eq('pin', pin.trim())
      .eq('is_active', true)
      .maybeSingle()

    setLoading(false)

    if (error || !data) {
      setErrorMsg('Invalid mobile number or PIN')
      return
    }

    localStorage.setItem('pgt_admin', JSON.stringify(data))
    window.location.href = '/dashboard'
  }

  return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900">
            PGT Logistic and Transport Services LLC
          </h1>
          <p className="text-slate-500 mt-2">
            Driver Trip Record Admin Login
          </p>
        </div>

        <form onSubmit={handleLogin} className="mt-8 space-y-4">
          <input
            type="text"
            placeholder="Admin Mobile Number"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:ring-2 focus:ring-slate-900"
            required
          />

          <input
            type="password"
            placeholder="Admin PIN"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:ring-2 focus:ring-slate-900"
            required
          />

          {errorMsg && (
            <p className="text-center text-sm font-medium text-red-600">
              {errorMsg}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-slate-900 py-3 font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {loading ? 'Checking...' : 'Login'}
          </button>
        </form>
      </div>
    </main>
  )
}