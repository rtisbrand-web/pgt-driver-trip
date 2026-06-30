'use client'

import { useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function RefuelerLoginPage() {
  const [mobile, setMobile] = useState('')
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)

  async function login(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (!mobile.trim()) {
      alert('Please enter mobile number')
      return
    }

    if (!pin.trim()) {
      alert('Please enter PIN')
      return
    }

    setLoading(true)

    const { data, error } = await supabase
      .from('refueling_vehicles')
      .select(
        'id, vehicle_number, driver_name, mobile, pin_code, login_enabled, is_active'
      )
      .eq('mobile', mobile.trim())
      .eq('pin_code', pin.trim())
      .eq('login_enabled', true)
      .eq('is_active', true)
      .maybeSingle()

    setLoading(false)

    if (error) {
      alert(error.message)
      return
    }

    if (!data) {
      alert('Invalid mobile number or PIN')
      return
    }

    localStorage.setItem(
      'pgt_refueler',
      JSON.stringify({
        id: data.id,
        vehicle_number: data.vehicle_number,
        driver_name: data.driver_name,
        mobile: data.mobile,
      })
    )

    window.location.href = '/refueler-dashboard'
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow">
        <h1 className="text-2xl font-bold text-slate-900">
          Refueler Login
        </h1>

        <p className="mt-2 text-slate-500">
          PGT Logistic and Transport Services LLC
        </p>

        <form onSubmit={login} className="mt-6 space-y-4">
          <input
            type="text"
            placeholder="Mobile Number"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            className="w-full rounded-xl border p-3 text-slate-900"
          />

          <input
            type="password"
            placeholder="PIN"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            className="w-full rounded-xl border p-3 text-slate-900"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-blue-900 p-3 font-semibold text-white disabled:opacity-60"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </main>
  )
}