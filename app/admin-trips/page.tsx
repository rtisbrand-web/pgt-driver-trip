'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

type Trip = {
  trip_id: string
  trip_no: number
  trip_date: string
  driver_name: string | null
  vehicle_number: string | null
  trailer_number: string | null
  company_name: string | null
  from_location: string
  to_location: string
  trip_allowance: number | null
  trip_amount: number | null
  status: string
  remarks: string | null
  admin_notes: string | null
  document_count: number
}

type TripDocument = {
  id: string
  trip_id: string
  file_name: string | null
  file_url: string
  document_type: string | null
  uploaded_by: string | null
  uploaded_at: string
}

export default function AdminTripsPage() {
  const [trips, setTrips] = useState<Trip[]>([])
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null)
  const [documents, setDocuments] = useState<TripDocument[]>([])
  const [fromLocation, setFromLocation] = useState('')
  const [toLocation, setToLocation] = useState('')
  const [tripAmount, setTripAmount] = useState('')
  const [status, setStatus] = useState('Pending')
  const [adminNotes, setAdminNotes] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadTrips()
  }, [])

  async function loadTrips() {
    const { data, error } = await supabase
      .from('trip_report_view')
      .select('*')
      .order('trip_no', { ascending: false })

    if (error) {
      alert(error.message)
      return
    }

    setTrips(data || [])
  }

  async function loadDocuments(tripId: string) {
    const { data, error } = await supabase
      .from('trip_documents')
      .select('*')
      .eq('trip_id', tripId)
      .order('uploaded_at', { ascending: false })

    if (error) {
      alert(error.message)
      return
    }

    setDocuments(data || [])
  }

  function openEdit(trip: Trip) {
    setSelectedTrip(trip)
    setFromLocation(trip.from_location || '')
    setToLocation(trip.to_location || '')
    setTripAmount(trip.trip_amount ? String(trip.trip_amount) : '')
    setStatus(trip.status || 'Pending')
    setAdminNotes(trip.admin_notes || '')
    loadDocuments(trip.trip_id)
  }

  async function saveChanges(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!selectedTrip) return

    setLoading(true)

    const { error } = await supabase
      .from('trips')
      .update({
        from_location: fromLocation.trim(),
        to_location: toLocation.trim(),
        trip_amount: tripAmount ? Number(tripAmount) : null,
        status,
        admin_notes: adminNotes.trim(),
        is_admin_edited: true,
        verified_at: status === 'Verified' ? new Date().toISOString() : null,
      })
      .eq('id', selectedTrip.trip_id)

    setLoading(false)

    if (error) {
      alert(error.message)
      return
    }

    alert('Trip updated successfully')
    setSelectedTrip(null)
    setDocuments([])
    await loadTrips()
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 rounded-2xl bg-white p-6 shadow">
          <h1 className="text-2xl font-bold text-slate-900">
            Admin Trip Management
          </h1>
          <p className="mt-1 text-slate-500">
            Review documents, verify/reject trips, and add trip amount.
          </p>
        </div>

        {selectedTrip && (
          <div className="mb-6 rounded-2xl bg-white p-6 shadow">
            <h2 className="mb-4 text-xl font-bold text-slate-900">
              Edit Trip No: {selectedTrip.trip_no}
            </h2>

            <form onSubmit={saveChanges} className="grid gap-4 md:grid-cols-3">
              <input
                type="text"
                value={fromLocation}
                onChange={(e) => setFromLocation(e.target.value)}
                placeholder="From Location"
                className="rounded-xl border p-3 text-slate-900"
                required
              />

              <input
                type="text"
                value={toLocation}
                onChange={(e) => setToLocation(e.target.value)}
                placeholder="To Location"
                className="rounded-xl border p-3 text-slate-900"
                required
              />

              <input
                type="number"
                value={tripAmount}
                onChange={(e) => setTripAmount(e.target.value)}
                placeholder="Trip Amount"
                className="rounded-xl border p-3 text-slate-900"
              />

              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="rounded-xl border p-3 text-slate-900"
              >
                <option value="Pending">Pending</option>
                <option value="Documents Uploaded">Documents Uploaded</option>
                <option value="Verified">Verified</option>
                <option value="Rejected">Rejected</option>
              </select>

              <input
                type="text"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Admin Notes"
                className="rounded-xl border p-3 text-slate-900"
              />

              <button
                type="submit"
                disabled={loading}
                className="rounded-xl bg-blue-900 p-3 font-semibold text-white disabled:opacity-60"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedTrip(null)
                  setDocuments([])
                }}
                className="rounded-xl bg-slate-500 p-3 font-semibold text-white"
              >
                Cancel
              </button>
            </form>

            <div className="mt-6 rounded-2xl border p-4">
              <h3 className="mb-3 text-lg font-bold text-slate-900">
                Uploaded Documents
              </h3>

              {documents.length === 0 ? (
                <p className="text-slate-500">No documents uploaded yet.</p>
              ) : (
                <div className="grid gap-3 md:grid-cols-3">
                  {documents.map((doc) => (
                    <div key={doc.id} className="rounded-xl border p-3">
                      <p className="font-semibold text-slate-900">
                        {doc.document_type || 'Document'}
                      </p>
                      <p className="text-sm text-slate-500">
                        {doc.file_name || 'File'}
                      </p>

                      <a
                        href={doc.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-block rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white"
                      >
                        View / Download
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="overflow-auto rounded-2xl bg-white p-6 shadow">
          <table className="w-full">
            <thead>
              <tr className="border-b text-slate-700">
                <th className="p-3 text-left">Trip No</th>
                <th className="p-3 text-left">Date</th>
                <th className="p-3 text-left">Driver</th>
                <th className="p-3 text-left">Vehicle</th>
                <th className="p-3 text-left">Trailer</th>
                <th className="p-3 text-left">Company</th>
                <th className="p-3 text-left">From</th>
                <th className="p-3 text-left">To</th>
                <th className="p-3 text-left">Docs</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">Action</th>
              </tr>
            </thead>

            <tbody>
              {trips.map((trip) => (
                <tr key={trip.trip_id} className="border-b text-slate-900">
                  <td className="p-3 font-semibold">{trip.trip_no}</td>
                  <td className="p-3">{trip.trip_date}</td>
                  <td className="p-3">{trip.driver_name || '-'}</td>
                  <td className="p-3">{trip.vehicle_number || '-'}</td>
                  <td className="p-3">{trip.trailer_number || '-'}</td>
                  <td className="p-3">{trip.company_name || '-'}</td>
                  <td className="p-3">{trip.from_location}</td>
                  <td className="p-3">{trip.to_location}</td>
                  <td className="p-3">{trip.document_count || 0}</td>
                  <td className="p-3">{trip.status}</td>
                  <td className="p-3">
                    <button
                      onClick={() => openEdit(trip)}
                      className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white"
                    >
                      Review
                    </button>
                  </td>
                </tr>
              ))}

              {trips.length === 0 && (
                <tr>
                  <td colSpan={11} className="p-6 text-center text-slate-500">
                    No trips found.
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