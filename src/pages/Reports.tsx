import { useState } from 'react'
import { Button } from '@heroui/react'
import { supabase } from '../lib/supabase'
import { useI18n } from '../contexts/I18nContext'

export default function Reports() {
  const { t } = useI18n()
  const [reportData, setReportData] = useState<{ title: string; headers: string[]; rows: string[][] } | null>(null)
  const [loading, setLoading] = useState(false)

  async function loadReport(type: string) {
    setLoading(true)
    try {
      if (type === 'members') {
        const { data: d } = await supabase.from('members').select('member_id, full_name, phone, age, gender, created_at').limit(100)
        const data = d || []
        setReportData({
          title: t('reports.members'), headers: ['ID', t('members.fullName'), t('members.phone'), t('members.age'), t('members.gender'), t('members.created')],
          rows: data.map(r => [String(r.member_id || ''), String(r.full_name || ''), String(r.phone || ''), String(r.age ?? ''), String(r.gender || ''), r.created_at ? new Date(r.created_at).toLocaleDateString() : '']),
        })
      } else if (type === 'revenue') {
        const { data: d } = await supabase.from('payments').select('*, members:member_id(full_name)').order('paid_at', { ascending: false }).limit(100)
        const data = d || []
        setReportData({
          title: t('reports.revenue'), headers: [t('member.date'), t('members.title'), t('member.amount'), t('member.type'), t('member.method')],
          rows: data.map(r => [new Date(r.paid_at).toLocaleDateString(), (r.members as { full_name: string } | undefined)?.full_name || '-', String(r.amount || 0), String(r.payment_type || ''), String(r.payment_method || '')]),
        })
      } else if (type === 'expiring') {
        const { data: d } = await supabase.from('subscriptions').select('*, members:member_id(full_name, phone), plans:plan_id(name)').in('status', ['expiring_soon', 'active']).order('end_date').limit(100)
        const data = d || []
        setReportData({
          title: t('reports.expiring'), headers: [t('members.title'), t('members.phone'), t('plans.title'), t('member.endDate'), t('status.title')],
          rows: data.map(r => [String((r.members as { full_name: string } | undefined)?.full_name || ''), String((r.members as { phone: string } | undefined)?.phone || ''), String((r.plans as { name: string } | undefined)?.name || '-'), new Date(r.end_date as string).toLocaleDateString(), String(r.status || '')]),
        })
      }
    } finally { setLoading(false) }
  }

  function sanitizeCSV(val: string): string {
    const escaped = val.replace(/"/g, '""')
    if (/^[=+\-@]/.test(escaped)) return `\t"${escaped}"`
    return `"${escaped}"`
  }

  function exportCSV() {
    if (!reportData) return
    const csv = '\uFEFF' + [reportData.headers.join(','), ...reportData.rows.map(r => r.map(sanitizeCSV).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${reportData.title}.csv`; a.click()
  }

  const reports = [
    { type: 'members', icon: 'bi-people', label: t('reports.members'), desc: t('reports.membersDesc') },
    { type: 'revenue', icon: 'bi-currency-dollar', label: t('reports.revenue'), desc: t('reports.revenueDesc') },
    { type: 'expiring', icon: 'bi-clock-history', label: t('reports.expiring'), desc: t('reports.expiringDesc') },
  ]

  return (
    <div className="p-8 space-y-6 animate-fade-up">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>{t('reports.title')}</h1>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t('reports.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {reports.map(r => (
          <div key={r.type}
            className="card-hover rounded-2xl border p-5 cursor-pointer"
            style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}
            onClick={() => loadReport(r.type)}>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white text-lg mb-3" style={{ background: 'var(--gradient-1)' }}>
              <i className={`bi ${r.icon}`} />
            </div>
            <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{r.label}</h3>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>{r.desc}</p>
          </div>
        ))}
      </div>

      {loading && (
        <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
          <div className="animate-spin w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full mx-auto mb-3" />
          {t('common.loading')}
        </div>
      )}

      {reportData && !loading && (
        <div className="rounded-2xl border p-6 animate-fade-up" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{reportData.title}</h3>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onPress={exportCSV}><i className="bi bi-download" /> CSV</Button>
              <Button variant="ghost" size="sm" onPress={() => window.print()}><i className="bi bi-file-pdf" /> PDF</Button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
                  {reportData.headers.map((h, i) => (
                    <th key={i} className="text-left py-3 px-2 font-medium" style={{ color: 'var(--text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reportData.rows.map((row, i) => (
                  <tr key={i} className="border-b" style={{ borderColor: 'var(--border)' }}>
                    {row.map((cell, j) => (
                      <td key={j} className="py-3 px-2" style={{ color: 'var(--text-primary)' }}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
