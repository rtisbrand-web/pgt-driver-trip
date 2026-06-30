'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

type ApprovalRequest = {
  id: string
  vehicle_id: string
  driver_id: string | null
  refueling_vehicle_id: string | null
  requested_gallons: number
  allowed_balance_gallons: number
  extra_gallons: number
  reason: string | null
  status: string
  admin_notes: string | null
  created_at: string
  approved_at: string | null
  gps_latitude: number | null
  gps_longitude: number | null
  gps_map_link: string | null
  odometer_reading: string | null
  tank_before_photo_url: string | null
  tank_after_photo_url: string | null
  refuel_photo_url: string | null
  vehicles: { vehicle_number: string } | null
  drivers: { driver_name: string } | null
  refueling_vehicles: { vehicle_number: string; driver_name: string | null } | null
}

export default function FuelApprovalsPage() {
  const [requests, setRequests] = useState<ApprovalRequest[]>([])
  const [loading, setLoading] = useState(false)
  const [processingId, setProcessingId] = useState('')
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({})

  useEffect(() => {
    loadRequests()
  }, [])

  async function loadRequests() {
    setLoading(true)

    const { data, error } = await supabase
      .from('fuel_approval_requests')
      .select(`
        id,
        vehicle_id,
        driver_id,
        refueling_vehicle_id,
        requested_gallons,
        allowed_balance_gallons,
        extra_gallons,
        reason,
        status,
        admin_notes,
        created_at,
        approved_at,
        gps_latitude,
        gps_longitude,
        gps_map_link,
        odometer_reading,
        tank_before_photo_url,
        tank_after_photo_url,
        refuel_photo_url,
        vehicles(vehicle_number),
        drivers(driver_name),
        refueling_vehicles(vehicle_number, driver_name)
      `)
      .order('created_at', { ascending: false })

    setLoading(false)

    if (error) {
      alert(error.message)
      return
    }

    setRequests((data || []) as ApprovalRequest[])
  }

  async function approveRequest(request: ApprovalRequest) {
    const confirmApprove = confirm(
      `Approve over fuel request?\n\nVehicle: ${
        request.vehicles?.vehicle_number || '-'
      }\nRequested: ${request.requested_gallons} Gallons\nAvailable: ${
        request.allowed_balance_gallons
      } Gallons\nExtra: ${request.extra_gallons} Gallons`
    )

    if (!confirmApprove) return

    setProcessingId(request.id)

    const safeBalance = Math.max(Number(request.allowed_balance_gallons || 0), 0)
    const requestedGallons = Number(request.requested_gallons || 0)
    const walletUsed = Math.min(safeBalance, requestedGallons)
    const extraApproved = Math.max(requestedGallons - walletUsed, 0)

    const entryRes = await supabase.from('fuel_entries').insert([
      {
        vehicle_id: request.vehicle_id,
        driver_id: request.driver_id || null,
        fuel_source_type: 'Company Vehicle',
        refueling_vehicle_id: request.refueling_vehicle_id || null,
        requested_gallons: requestedGallons,
        issued_gallons: requestedGallons,
        wallet_used_gallons: walletUsed,
        extra_approved_gallons: extraApproved,
        balance_before: safeBalance,
        balance_after: 0,
        fuel_type: 'Approved Extra',
        status: 'Approved Extra',
        gps_latitude: request.gps_latitude,
        gps_longitude: request.gps_longitude,
        gps_map_link: request.gps_map_link,
        odometer_reading: request.odometer_reading || null,
        tank_before_photo_url: request.tank_before_photo_url,
        tank_after_photo_url: request.tank_after_photo_url,
        refuel_photo_url: request.refuel_photo_url,
        extra_reason: request.reason || 'Approved over fuel request',
        remarks:
          adminNotes[request.id] ||
          `Admin approved over fuel request. Extra gallons: ${extraApproved}`,
      },
    ])

    if (entryRes.error) {
      setProcessingId('')
      alert(entryRes.error.message)
      return
    }

    const updateRes = await supabase
      .from('fuel_approval_requests')
      .update({
        status: 'Approved',
        admin_notes: adminNotes[request.id] || null,
        approved_at: new Date().toISOString(),
      })
      .eq('id', request.id)

    setProcessingId('')

    if (updateRes.error) {
      alert(updateRes.error.message)
      return
    }

    alert('Over fuel request approved and fuel bill created.')
    await loadRequests()
  }

  async function rejectRequest(request: ApprovalRequest) {
    const confirmReject = confirm(
      `Reject this over fuel request?\n\nVehicle: ${
        request.vehicles?.vehicle_number || '-'
      }\nRequested: ${request.requested_gallons} Gallons`
    )

    if (!confirmReject) return

    setProcessingId(request.id)

    const { error } = await supabase
      .from('fuel_approval_requests')
      .update({
        status: 'Rejected',
        admin_notes: adminNotes[request.id] || null,
      })
      .eq('id', request.id)

    setProcessingId('')

    if (error) {
      alert(error.message)
      return
    }

    alert('Over fuel request rejected.')
    await loadRequests()
  }

  function statusBadge(status: string) {
    const s = status.toLowerCase()

    if (s === 'approved') {
      return 'rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-700'
    }

    if (s === 'rejected') {
      return 'rounded-full bg-red-100 px-3 py-1 text-sm font-semibold text-red-700'
    }

    return 'rounded-full bg-yellow-100 px-3 py-1 text-sm font-semibold text-yellow-700'
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 rounded-2xl bg-white p-6 shadow">
          <h1 className="text-2xl font-bold text-slate-900">
            Fuel Approval Requests
          </h1>
          <p className="mt-1 text-slate-500">
            Approve or reject over-fuel requests created from the Refueler app and Fuel Issue screen.
          </p>
        </div>

        <div className="overflow-auto rounded-2xl bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-bold text-slate-900">
            Over Fuel Requests
          </h2>

          {loading ? (
            <div className="p-6 text-center text-slate-500">Loading...</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b text-slate-700">
                  <th className="p-3 text-left">Date</th>
                  <th className="p-3 text-left">Vehicle</th>
                  <th className="p-3 text-left">Refueler</th>
                  <th className="p-3 text-left">Driver</th>
                  <th className="p-3 text-left">Available</th>
                  <th className="p-3 text-left">Requested</th>
                  <th className="p-3 text-left">Extra</th>
                  <th className="p-3 text-left">Reason</th>
                  <th className="p-3 text-left">GPS</th>
                  <th className="p-3 text-left">Status</th>
                  <th className="p-3 text-left">Admin Notes</th>
                  <th className="p-3 text-left">Action</th>
                </tr>
              </thead>

              <tbody>
                {requests.map((request) => (
                  <tr key={request.id} className="border-b text-slate-900">
                    <td className="p-3">
                      {new Date(request.created_at).toLocaleString()}
                    </td>

                    <td className="p-3 font-semibold">
                      {request.vehicles?.vehicle_number || '-'}
                    </td>

                    <td className="p-3">
                      {request.refueling_vehicles?.vehicle_number
                        ? `${request.refueling_vehicles.vehicle_number} - ${
                            request.refueling_vehicles.driver_name || '-'
                          }`
                        : '-'}
                    </td>

                    <td className="p-3">
                      {request.drivers?.driver_name || '-'}
                    </td>

                    <td className="p-3">
                      {Math.max(Number(request.allowed_balance_gallons || 0), 0).toFixed(2)}
                    </td>

                    <td className="p-3 font-semibold">
                      {Number(request.requested_gallons || 0).toFixed(2)}
                    </td>

                    <td className="p-3 font-bold text-red-600">
                      {Number(request.extra_gallons || 0).toFixed(2)}
                    </td>

                    <td className="p-3">{request.reason || '-'}</td>

                    <td className="p-3">
                      {request.gps_map_link ? (
                        <a
                          href={request.gps_map_link}
                          target="_blank"
                          className="font-semibold text-blue-700 underline"
                        >
                          Map
                        </a>
                      ) : (
                        '-'
                      )}
                    </td>

                    <td className="p-3">
                      <span className={statusBadge(request.status)}>
                        {request.status}
                      </span>
                    </td>

                    <td className="p-3">
                      {request.status === 'Pending' ? (
                        <input
                          type="text"
                          placeholder="Admin notes"
                          value={adminNotes[request.id] || ''}
                          onChange={(e) =>
                            setAdminNotes({
                              ...adminNotes,
                              [request.id]: e.target.value,
                            })
                          }
                          className="min-w-52 rounded-xl border p-2 text-slate-900"
                        />
                      ) : (
                        request.admin_notes || '-'
                      )}
                    </td>

                    <td className="p-3">
                      {request.status === 'Pending' ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => approveRequest(request)}
                            disabled={processingId === request.id}
                            className="rounded-lg bg-green-700 px-4 py-2 font-semibold text-white disabled:opacity-60"
                          >
                            Approve
                          </button>

                          <button
                            onClick={() => rejectRequest(request)}
                            disabled={processingId === request.id}
                            className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white disabled:opacity-60"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-500">Completed</span>
                      )}
                    </td>
                  </tr>
                ))}

                {requests.length === 0 && (
                  <tr>
                    <td colSpan={12} className="p-6 text-center text-slate-500">
                      No fuel approval requests found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </main>
  )
}