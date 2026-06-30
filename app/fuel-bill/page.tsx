'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

type FuelBill = {
  id: string
  bill_no: string | null
  created_at: string
  requested_gallons: number | null
  issued_gallons: number | null
  wallet_used_gallons: number | null
  extra_approved_gallons: number | null
  balance_before: number | null
  balance_after: number | null
  fuel_type: string | null
  status: string | null
  remarks: string | null
  gps_map_link: string | null
  odometer_reading: string | null
  tank_before_photo_url: string | null
  tank_after_photo_url: string | null
  refuel_photo_url: string | null
  vehicles: { vehicle_number: string } | null
  drivers: { driver_name: string } | null
  refueling_vehicles: { vehicle_number: string; driver_name: string | null } | null
  fuel_stations: { station_name: string } | null
}

export default function FuelBillPage() {
  const [bill, setBill] = useState<FuelBill | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadBill()
  }, [])

  async function loadBill() {
    const id = new URLSearchParams(window.location.search).get('id')

    if (!id) {
      alert('Fuel bill ID missing')
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('fuel_entries')
      .select(`
        *,
        vehicles(vehicle_number),
        drivers(driver_name),
        refueling_vehicles(vehicle_number, driver_name),
        fuel_stations(station_name)
      `)
      .eq('id', id)
      .maybeSingle()

    setLoading(false)

    if (error) {
      alert(error.message)
      return
    }

    setBill(data as FuelBill)
  }

  function printBill() {
    window.print()
  }

  function autoPrint() {
    setTimeout(() => window.print(), 300)
  }

  if (loading) {
    return <main className="p-6">Loading bill...</main>
  }

  if (!bill) {
    return <main className="p-6">Fuel bill not found.</main>
  }

  const qrText = `${bill.bill_no || bill.id} | ${bill.vehicles?.vehicle_number || ''} | ${bill.issued_gallons || 0} Gallons`
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(qrText)}`

  return (
    <main className="min-h-screen bg-slate-100 p-4 print:bg-white print:p-0">
      <div className="mx-auto mb-4 flex max-w-5xl justify-between print:hidden">
        <button
          onClick={() => history.back()}
          className="rounded-xl bg-slate-800 px-5 py-3 font-semibold text-white"
        >
          ← Back
        </button>

        <div className="flex gap-3">
          <button
            onClick={printBill}
            className="rounded-xl bg-green-700 px-5 py-3 font-semibold text-white"
          >
            Print / Save PDF
          </button>

          <button
            onClick={autoPrint}
            className="rounded-xl bg-blue-900 px-5 py-3 font-semibold text-white"
          >
            Auto Print
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-5xl rounded-2xl bg-white p-8 shadow print:max-w-none print:rounded-none print:p-6 print:shadow-none">
        <div className="grid grid-cols-3 gap-4 border-b pb-6">
          <div>
            <div className="text-5xl font-black text-blue-950">PGT</div>
            <div className="mt-1 text-sm font-bold text-slate-700">
              LOGISTIC & TRANSPORT
            </div>
          </div>

          <div className="text-center">
            <h1 className="text-2xl font-black text-blue-950">
              PGT LOGISTIC AND TRANSPORT SERVICES LLC
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Dubai, United Arab Emirates
            </p>
            <p className="text-sm font-semibold text-blue-950">
              Trusted Transport. Reliable Solutions.
            </p>
          </div>

          <div className="rounded-xl border text-center">
            <div className="rounded-t-xl bg-blue-950 p-2 font-bold text-white">
              FUEL ISSUE BILL
            </div>
            <p className="mt-3 text-sm text-slate-500">Bill No.</p>
            <p className="text-2xl font-black text-red-700">
              {bill.bill_no || '-'}
            </p>
            <p className="mt-2 text-sm text-slate-500">Date & Time</p>
            <p className="mb-3 font-semibold">
              {new Date(bill.created_at).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-4 gap-4 rounded-xl border p-4">
          <Info title="Vehicle Number" value={bill.vehicles?.vehicle_number || '-'} />
          <Info title="Driver Name" value={bill.drivers?.driver_name || '-'} />
          <Info title="Odometer" value={bill.odometer_reading || '-'} />
          <div className="row-span-3 text-center">
            <img src={qrUrl} alt="QR Code" className="mx-auto h-32 w-32" />
            <p className="mt-2 text-sm font-bold">Scan to Verify</p>
          </div>

          <Info title="Refueler Vehicle" value={bill.refueling_vehicles?.vehicle_number || '-'} />
          <Info title="Refueler Name" value={bill.refueling_vehicles?.driver_name || '-'} />
          <Info title="Fuel Station" value={bill.fuel_stations?.station_name || 'Company Vehicle Wallet'} />

          <Info title="Fuel Source" value={bill.fuel_stations?.station_name ? 'Fuel Station' : 'Company Vehicle'} />
          <div>
            <p className="text-sm text-slate-500">GPS Location</p>
            {bill.gps_map_link ? (
              <a href={bill.gps_map_link} target="_blank" className="font-bold text-blue-700 underline">
                Open in Google Maps
              </a>
            ) : (
              <p className="font-bold">-</p>
            )}
          </div>
          <Info title="Location Captured" value={new Date(bill.created_at).toLocaleString()} />
        </div>

        <SectionTitle title="Fuel Transaction Details" />

        <div className="grid grid-cols-7 rounded-xl border text-center">
          <FuelBox title="Issued Gallons" value={bill.issued_gallons} color="text-green-700" />
          <FuelBox title="Wallet Used" value={bill.wallet_used_gallons} color="text-blue-700" />
          <FuelBox title="Approved Extra" value={bill.extra_approved_gallons} color="text-red-700" />
          <FuelBox title="Balance Before" value={bill.balance_before} />
          <FuelBox title="Balance After" value={bill.balance_after} />
          <div className="border-r p-4">
            <p className="text-sm text-slate-500">Transaction Type</p>
            <p className="font-black">{bill.fuel_type || '-'}</p>
          </div>
          <div className="p-4">
            <p className="text-sm text-slate-500">Status</p>
            <p className="font-black text-green-700">{bill.status || '-'}</p>
          </div>
        </div>

        <div className="mt-5 rounded-xl border p-4">
          <p className="text-sm text-slate-500">Remarks</p>
          <p className="font-semibold">{bill.remarks || '-'}</p>
        </div>

        <SectionTitle title="Photos" />

        <div className="grid grid-cols-3 gap-4">
          <PhotoBox title="Tank Before" url={bill.tank_before_photo_url} />
          <PhotoBox title="Tank After" url={bill.tank_after_photo_url} />
          <PhotoBox title="Refuel Photo" url={bill.refuel_photo_url} />
        </div>

        <SectionTitle title="Authorized Signatures" />

        <div className="grid grid-cols-3 gap-8 rounded-xl border p-8 text-center">
          <Signature title="Refueler Signature" name={bill.refueling_vehicles?.driver_name || 'Refueler'} />
          <div className="flex items-center justify-center">
            <div className="rounded-full border-4 border-blue-950 p-6 text-center font-black text-blue-950">
              PGT<br />DUBAI UAE
            </div>
          </div>
          <Signature title="Admin / Supervisor Signature" name="Authorized Signatory" />
        </div>

        <div className="mt-8 flex justify-between text-sm text-slate-600">
          <div>
            <p className="font-bold text-slate-900">Note:</p>
            <p>1. This is a system generated document.</p>
            <p>2. Please retain this receipt for audit purposes.</p>
          </div>

          <div className="text-right">
            <p>Powered By</p>
            <p className="font-bold text-blue-800">PGT Digital System</p>
          </div>
        </div>
      </div>
    </main>
  )
}

function Info({ title, value }: { title: string; value: string }) {
  return (
    <div>
      <p className="text-sm text-slate-500">{title}</p>
      <p className="font-bold text-slate-900">{value}</p>
    </div>
  )
}

function SectionTitle({ title }: { title: string }) {
  return (
    <div className="mt-6 rounded-t-xl bg-blue-950 p-2 text-center font-bold uppercase text-white">
      {title}
    </div>
  )
}

function FuelBox({
  title,
  value,
  color = 'text-slate-900',
}: {
  title: string
  value: number | null
  color?: string
}) {
  return (
    <div className="border-r p-4">
      <p className="text-sm text-slate-500">{title}</p>
      <p className={`text-xl font-black ${color}`}>
        {Number(value || 0).toFixed(2)}
      </p>
    </div>
  )
}

function PhotoBox({ title, url }: { title: string; url: string | null }) {
  return (
    <div className="rounded-xl border p-3 text-center">
      <p className="mb-2 font-bold text-slate-700">{title}</p>
      {url ? (
        <img src={url} alt={title} className="h-44 w-full rounded-lg object-cover" />
      ) : (
        <div className="flex h-44 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
          No Photo
        </div>
      )}
    </div>
  )
}

function Signature({ title, name }: { title: string; name: string }) {
  return (
    <div>
      <p className="font-semibold">{title}</p>
      <div className="mt-10 border-t pt-3">
        <p className="font-bold">{name}</p>
      </div>
    </div>
  )
}