'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

type Driver = {
  id: string
  driver_name: string
  mobile: string
  pin: string
  is_active: boolean
}

export default function DriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [driverName, setDriverName] = useState('')
  const [mobile, setMobile] = useState('')
  const [loading, setLoading] = useState(false)

  async function loadDrivers() {
    const { data } = await supabase
      .from('drivers')
      .select('*')
      .order('driver_name')

    setDrivers(data || [])
  }

  useEffect(() => {
    loadDrivers()
  }, [])

  async function addDriver(e: React.FormEvent) {
    e.preventDefault()

    setLoading(true)

    const { error } = await supabase
      .from('drivers')
      .insert([
        {
          driver_name: driverName,
          mobile: mobile,
          pin: 'PGT101@',
          is_active: true,
        },
      ])

    setLoading(false)

    if (error) {
      alert(error.message)
      return
    }

    setDriverName('')
    setMobile('')

    loadDrivers()
  }

  async function toggleStatus(id: string, current: boolean) {
    await supabase
      .from('drivers')
      .update({
        is_active: !current,
      })
      .eq('id', id)

    loadDrivers()
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-7xl">

        <div className="mb-6 rounded-2xl bg-white p-6 shadow">
          <h1 className="text-2xl font-bold">
            Drivers Management
          </h1>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow">
          <form
            onSubmit={addDriver}
            className="grid gap-4 md:grid-cols-3"
          >
            <input
              type="text"
              placeholder="Driver Name"
              value={driverName}
              onChange={(e) =>
                setDriverName(e.target.value)
              }
              className="rounded-xl border p-3"
              required
            />

            <input
              type="text"
              placeholder="Mobile Number"
              value={mobile}
              onChange={(e) =>
                setMobile(e.target.value)
              }
              className="rounded-xl border p-3"
              required
            />

            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-slate-900 text-white"
            >
              {loading
                ? 'Saving...'
                : 'Add Driver'}
            </button>
          </form>
        </div>

        <div className="mt-6 rounded-2xl bg-white p-6 shadow overflow-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="p-3 text-left">
                  Driver Name
                </th>
                <th className="p-3 text-left">
                  Mobile
                </th>
                <th className="p-3 text-left">
                  PIN
                </th>
                <th className="p-3 text-left">
                  Status
                </th>
                <th className="p-3 text-left">
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {drivers.map((driver) => (
                <tr
                  key={driver.id}
                  className="border-b"
                >
                  <td className="p-3">
                    {driver.driver_name}
                  </td>

                  <td className="p-3">
                    {driver.mobile}
                  </td>

                  <td className="p-3">
                    {driver.pin}
                  </td>

                  <td className="p-3">
                    {driver.is_active
                      ? 'Active'
                      : 'Inactive'}
                  </td>

                  <td className="p-3">
                    <button
                      onClick={() =>
                        toggleStatus(
                          driver.id,
                          driver.is_active
                        )
                      }
                      className="rounded-lg bg-blue-600 px-3 py-2 text-white"
                    >
                      Change
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </main>
  )
}