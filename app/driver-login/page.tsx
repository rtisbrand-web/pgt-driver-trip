'use client'

import { useState } from 'react'
import { supabase } from '../../lib/supabase'

type Driver = {
  id: string
  driver_name: string
  mobile: string
  pin: string
  is_active: boolean
}

export default function DriverLoginPage() {
  const [mobile, setMobile] = useState('')
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')

    const cleanMobile = mobile.trim().replace(/\s+/g, '')
    const cleanPin = pin.trim()

    const { data, error } = await supabase
      .from('drivers')
      .select('*')
      .eq('is_active', true)

    setLoading(false)

    if (error) {
      setErrorMsg(error.message)
      return
    }

    const driver = (data || []).find((item: Driver) => {
      return item.mobile.trim().replace(/\s+/g, '') === cleanMobile
    })

    if (!driver) {
      setErrorMsg('This mobile number is not registered as driver')
      return
    }

    if (driver.pin !== cleanPin) {
      setErrorMsg('Wrong PIN')
      return
    }

    localStorage.setItem(
      'pgt_driver',
      JSON.stringify({
        driver_id: driver.id,
        driver_name: driver.driver_name,
        mobile: driver.mobile,
      })
    )

    window.location.href = '/driver-dashboard'
  }

  return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900">
            PGT Logistic and Transport Services LLC
          </h1>
          <p className="text-slate-500 mt-2">
            Driver Trip Record Login
          </p>
        </div>

        <form onSubmit={handleLogin} className="mt-8 space-y-4">
          <input
            type="text"
            placeholder="Driver Mobile Number"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:ring-2 focus:ring-slate-900"
            required
          />

          <input
            type="text"
            placeholder="Driver PIN"
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

        <p className="mt-6 text-center text-xs text-slate-500">
          Default PIN: PGT101@
        </p>
      </div>
    </main>
  )
}