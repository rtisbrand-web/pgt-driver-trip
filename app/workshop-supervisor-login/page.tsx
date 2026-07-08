'use client'

import { useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function WorkshopSupervisorLoginPage() {
  const [mobile, setMobile] = useState('')
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)

  async function login() {
    if (!mobile.trim() || !pin.trim()) {
      alert('Please enter Mobile Number and PIN.')
      return
    }

    setLoading(true)

    const { data, error } = await supabase
      .from('employees')
      .select(`
        id,
        employee_code,
        employee_name,
        designation,
        department,
        mobile,
        login_mobile,
        login_pin,
        app_access,
        employment_status,
        app_role
      `)
      .eq('login_mobile', mobile.trim())
      .eq('login_pin', pin.trim())
      .eq('app_access', true)
      .eq('employment_status', 'Active')
      .maybeSingle()

    setLoading(false)

    if (error) {
      alert(error.message)
      return
    }

    if (!data) {
      alert('Invalid Mobile Number or PIN.')
      return
    }

    const roleText = `${data.app_role || ''} ${data.designation || ''} ${data.department || ''}`.toLowerCase()

    if (
      !roleText.includes('workshop') &&
      !roleText.includes('supervisor') &&
      !roleText.includes('manager')
    ) {
      alert('This user is not allowed for Workshop Supervisor login.')
      return
    }

    localStorage.setItem(
      'pgt_workshop_supervisor',
      JSON.stringify({
        id: data.id,
        employeeCode: data.employee_code,
        name: data.employee_name,
        designation: data.designation,
        department: data.department,
        mobile: data.mobile,
      })
    )

    window.location.href = '/workshop-supervisor'
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-5">
      <section className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">
        <div className="rounded-3xl bg-slate-950 p-6 text-white">
          <p className="text-xs font-bold uppercase tracking-[0.30em] text-orange-300">
            PGT WORKSHOP
          </p>

          <h1 className="mt-3 text-4xl font-black">
            Supervisor Login
          </h1>

          <p className="mt-2 text-sm text-slate-300">
            Review breakdown alerts, assign workshop team, approve and close jobs.
          </p>
        </div>

        <div className="mt-8">
          <label className="text-xs font-bold uppercase text-slate-500">
            Mobile Number
          </label>

          <input
            value={mobile}
            onChange={(event) => setMobile(event.target.value)}
            placeholder="0501234567"
            className="mt-2 h-12 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 font-bold outline-none focus:border-orange-500"
          />

          <label className="mt-5 block text-xs font-bold uppercase text-slate-500">
            PIN
          </label>

          <input
            type="password"
            value={pin}
            onChange={(event) => setPin(event.target.value)}
            placeholder="1234"
            className="mt-2 h-12 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 font-bold outline-none focus:border-orange-500"
          />

          <button
            onClick={login}
            disabled={loading}
            className="mt-6 h-12 w-full rounded-2xl bg-orange-600 text-lg font-black text-white transition hover:bg-orange-700 disabled:opacity-60"
          >
            {loading ? 'Checking...' : 'Login'}
          </button>
        </div>

        <div className="mt-8 border-t pt-5 text-center">
          <p className="text-sm font-bold text-slate-600">
            PGT Logistic & Transport Services LLC
          </p>

          <p className="mt-1 text-xs text-slate-400">
            Workshop Supervisor Application
          </p>
        </div>
      </section>
    </main>
  )
}
