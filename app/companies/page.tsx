'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

type Company = {
  id: string
  company_name: string
  contact_person: string | null
  mobile: string | null
  email: string | null
  address: string | null
  is_active: boolean
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [companyName, setCompanyName] = useState('')
  const [contactPerson, setContactPerson] = useState('')
  const [mobile, setMobile] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [loading, setLoading] = useState(false)

  async function loadCompanies() {
    const { data } = await supabase
      .from('companies')
      .select('*')
      .order('company_name')

    setCompanies(data || [])
  }

  useEffect(() => {
    loadCompanies()
  }, [])

  async function addCompany(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase.from('companies').insert([
      {
        company_name: companyName.trim(),
        contact_person: contactPerson.trim(),
        mobile: mobile.trim(),
        email: email.trim(),
        address: address.trim(),
        is_active: true,
      },
    ])

    setLoading(false)

    if (error) {
      alert(error.message)
      return
    }

    setCompanyName('')
    setContactPerson('')
    setMobile('')
    setEmail('')
    setAddress('')
    loadCompanies()
  }

  async function toggleStatus(id: string, current: boolean) {
    await supabase
      .from('companies')
      .update({ is_active: !current })
      .eq('id', id)

    loadCompanies()
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 rounded-2xl bg-white p-6 shadow">
          <h1 className="text-2xl font-bold text-slate-900">
            Companies Management
          </h1>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow">
          <form onSubmit={addCompany} className="grid gap-4 md:grid-cols-3">
            <input
              type="text"
              placeholder="Company Name"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="rounded-xl border p-3 text-slate-900"
              required
            />

            <input
              type="text"
              placeholder="Contact Person"
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
              className="rounded-xl border p-3 text-slate-900"
            />

            <input
              type="text"
              placeholder="Mobile Number"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              className="rounded-xl border p-3 text-slate-900"
            />

            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-xl border p-3 text-slate-900"
            />

            <input
              type="text"
              placeholder="Address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="rounded-xl border p-3 text-slate-900"
            />

            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white"
            >
              {loading ? 'Saving...' : 'Add Company'}
            </button>
          </form>
        </div>

        <div className="mt-6 overflow-auto rounded-2xl bg-white p-6 shadow">
          <table className="w-full">
            <thead>
              <tr className="border-b text-slate-700">
                <th className="p-3 text-left">Company</th>
                <th className="p-3 text-left">Contact</th>
                <th className="p-3 text-left">Mobile</th>
                <th className="p-3 text-left">Email</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">Action</th>
              </tr>
            </thead>

            <tbody>
              {companies.map((company) => (
                <tr key={company.id} className="border-b text-slate-900">
                  <td className="p-3 font-semibold">{company.company_name}</td>
                  <td className="p-3">{company.contact_person || '-'}</td>
                  <td className="p-3">{company.mobile || '-'}</td>
                  <td className="p-3">{company.email || '-'}</td>
                  <td className="p-3">
                    {company.is_active ? 'Active' : 'Inactive'}
                  </td>
                  <td className="p-3">
                    <button
                      onClick={() =>
                        toggleStatus(company.id, company.is_active)
                      }
                      className="rounded-lg bg-blue-600 px-3 py-2 text-white"
                    >
                      Change
                    </button>
                  </td>
                </tr>
              ))}

              {companies.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-500">
                    No companies added yet.
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