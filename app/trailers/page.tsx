'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

type Trailer = {
  id: string
  trailer_number: string
  trailer_type: string
  trailer_size: string | null
  is_active: boolean
}

export default function TrailersPage() {
  const [trailers, setTrailers] = useState<Trailer[]>([])
  const [trailerNumber, setTrailerNumber] = useState('')
  const [trailerType, setTrailerType] = useState('Flatbed')
  const [trailerSize, setTrailerSize] = useState('')
  const [loading, setLoading] = useState(false)

  async function loadTrailers() {
    const { data } = await supabase
      .from('trailers')
      .select('*')
      .order('trailer_number')

    setTrailers(data || [])
  }

  useEffect(() => {
    loadTrailers()
  }, [])

  async function addTrailer(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase.from('trailers').insert([
      {
        trailer_number: trailerNumber.trim().toUpperCase(),
        trailer_type: trailerType,
        trailer_size: trailerSize.trim(),
        is_active: true,
      },
    ])

    setLoading(false)

    if (error) {
      alert(error.message)
      return
    }

    setTrailerNumber('')
    setTrailerType('Flatbed')
    setTrailerSize('')
    loadTrailers()
  }

  async function toggleStatus(id: string, current: boolean) {
    await supabase
      .from('trailers')
      .update({ is_active: !current })
      .eq('id', id)

    loadTrailers()
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 rounded-2xl bg-white p-6 shadow">
          <h1 className="text-2xl font-bold text-slate-900">
            Trailers Management
          </h1>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow">
          <form onSubmit={addTrailer} className="grid gap-4 md:grid-cols-4">
            <input
              type="text"
              placeholder="Trailer Number"
              value={trailerNumber}
              onChange={(e) => setTrailerNumber(e.target.value)}
              className="rounded-xl border p-3 text-slate-900"
              required
            />

            <select
              value={trailerType}
              onChange={(e) => setTrailerType(e.target.value)}
              className="rounded-xl border p-3 text-slate-900"
              required
            >
              <option value="Flatbed">Flatbed</option>
              <option value="Lowbed">Lowbed</option>
              <option value="Side Cage">Side Cage</option>
              <option value="Tipper">Tipper</option>
              <option value="Tanker">Tanker</option>
            </select>

            <input
              type="text"
              placeholder="Size: 12M / 13M / 15M"
              value={trailerSize}
              onChange={(e) => setTrailerSize(e.target.value)}
              className="rounded-xl border p-3 text-slate-900"
            />

            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white"
            >
              {loading ? 'Saving...' : 'Add Trailer'}
            </button>
          </form>
        </div>

        <div className="mt-6 overflow-auto rounded-2xl bg-white p-6 shadow">
          <table className="w-full">
            <thead>
              <tr className="border-b text-slate-700">
                <th className="p-3 text-left">Trailer Number</th>
                <th className="p-3 text-left">Type</th>
                <th className="p-3 text-left">Size</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">Action</th>
              </tr>
            </thead>

            <tbody>
              {trailers.map((trailer) => (
                <tr key={trailer.id} className="border-b text-slate-900">
                  <td className="p-3 font-semibold">
                    {trailer.trailer_number}
                  </td>
                  <td className="p-3">{trailer.trailer_type}</td>
                  <td className="p-3">{trailer.trailer_size || '-'}</td>
                  <td className="p-3">
                    {trailer.is_active ? 'Active' : 'Inactive'}
                  </td>
                  <td className="p-3">
                    <button
                      onClick={() =>
                        toggleStatus(trailer.id, trailer.is_active)
                      }
                      className="rounded-lg bg-blue-600 px-3 py-2 text-white"
                    >
                      Change
                    </button>
                  </td>
                </tr>
              ))}

              {trailers.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-slate-500">
                    No trailers added yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  )
}