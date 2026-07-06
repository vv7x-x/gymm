import { useEffect, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Button } from '@heroui/react'
import QRCode from 'qrcode'
import { supabase } from '../lib/supabase'
import { useI18n } from '../contexts/I18nContext'
import { formatDate, formatCurrency, calculateDaysRemaining, getSubscriptionStatus } from '../lib/utils'
import type { Member as MemberType, Subscription, Payment } from '../types'

export default function Member() {
  const { id } = useParams()
  const { t, dir } = useI18n()
  const isRtl = dir === 'rtl'
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [member, setMember] = useState<MemberType | null>(null)
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    loadMember()
  }, [id])

  useEffect(() => {
    if (!member || !canvasRef.current) return
    canvasRef.current.width = 180
    canvasRef.current.height = 180
    QRCode.toCanvas(canvasRef.current, member.id, {
      width: 180,
      margin: 2,
      color: { dark: '#1a1a2e', light: '#ffffff' },
    })
  }, [member])

  async function loadMember() {
    try {
      const { data: m } = await supabase.from('members').select('*').eq('id', id).single()
      if (m) setMember(m)
      const { data: subs } = await supabase
        .from('subscriptions')
        .select('*, plans(*), service_assignments(*, services(*))')
        .eq('member_id', id)
        .order('start_date', { ascending: false })
        .limit(1)
      if (subs?.length) setSubscription(subs[0] as unknown as Subscription)
      const { data: pays } = await supabase
        .from('payments')
        .select('*')
        .eq('member_id', id)
        .order('paid_at', { ascending: false })
        .limit(20)
      setPayments(pays || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadQR = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const link = document.createElement('a')
    link.download = `QR-${member?.member_id || 'member'}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  const handlePrintQR = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const win = window.open('', '_blank', 'noopener,noreferrer')
    if (win) {
      win.document.write(`<img src="${canvas.toDataURL('image/png')}" onload="window.print();window.close()" style="width:100%;max-width:400px;margin:auto;display:block;padding:40px;">`)
      win.document.close()
    }
  }

  if (loading) return (
    <div className="p-8 space-y-6 animate-fade-up">
      <div className="skeleton h-8 w-48" />
      <div className="skeleton h-48 rounded-2xl" />
      <div className="skeleton h-36 rounded-2xl" />
      <div className="skeleton h-48 rounded-2xl" />
    </div>
  )

  if (!member) return (
    <div className="p-8 text-center py-20 animate-fade-up">
      <div className="w-20 h-20 mx-auto mb-4 rounded-2xl flex items-center justify-center" style={{ background: 'var(--bg-danger)' }}>
        <i className="bi bi-person-x text-3xl" style={{ color: 'var(--danger)' }} />
      </div>
      <h3 className="text-lg font-medium mb-2" style={{ color: 'var(--text-primary)' }}>{t('member.notFound')}</h3>
      <Link to="/members"><Button variant="tertiary">{t('member.back')}</Button></Link>
    </div>
  )

  const status = getSubscriptionStatus(subscription?.end_date)
  const days = calculateDaysRemaining(subscription?.end_date)

  const statusBadge = () => {
    const map: Record<string, { bg: string; color: string; icon: string; label: string }> = {
      active: { bg: 'var(--bg-success)', color: 'var(--success)', icon: 'bi-check-circle-fill', label: `${days} ${t('common.days')}` },
      expiring_soon: { bg: 'var(--bg-warning)', color: 'var(--warning)', icon: 'bi-exclamation-circle-fill', label: `${days} ${t('common.days')}` },
      expired: { bg: 'var(--bg-danger)', color: 'var(--danger)', icon: 'bi-x-circle-fill', label: t('common.expired') },
    }
    const s = map[status] || map.expired
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: s.bg, color: s.color }}>
        <i className={`bi ${s.icon} text-[10px]`} />
        {s.label}
      </span>
    )
  }

  return (
    <div className="p-8 space-y-6 animate-fade-up">
      <div className="flex items-center gap-3">
        <Link to="/members"><Button variant="ghost" isIconOnly><i className={`bi ${isRtl ? 'bi-arrow-left' : 'bi-arrow-right'} text-lg`} /></Button></Link>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>{t('member.title')}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
            <div className="p-6">
              <div className="flex items-start gap-5">
                <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shrink-0" style={{ background: 'var(--gradient-1)' }}>
                  {member.full_name?.[0] || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between flex-wrap gap-3">
                    <div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{member.full_name}</h2>
                        {subscription && statusBadge()}
                      </div>
                      <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>#{member.member_id}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 text-sm">
                    <div>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{t('members.phone')}</p>
                      <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{member.phone || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{t('members.age')}</p>
                      <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{member.age || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{t('member.weight')}</p>
                      <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{member.weight ? `${member.weight} kg` : '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{t('member.height')}</p>
                      <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{member.height ? `${member.height} cm` : '-'}</p>
                    </div>
                  </div>
                  {member.notes && <p className="mt-4 text-sm p-3 rounded-xl" style={{ background: 'var(--bg)', color: 'var(--text-secondary)' }}>{member.notes}</p>}
                </div>
              </div>
            </div>
          </div>

          {subscription && (
            <div className="rounded-2xl border p-6" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
              <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>{t('member.subscription')}</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{t('member.startDate')}</p>
                  <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{formatDate(subscription.start_date)}</p>
                </div>
                <div>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{t('member.endDate')}</p>
                  <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{formatDate(subscription.end_date)}</p>
                </div>
                <div>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{t('member.planPrice')}</p>
                  <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{formatCurrency(subscription.plan_price)}</p>
                </div>
                <div>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{t('member.totalPaid')}</p>
                  <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{formatCurrency(subscription.total_price)}</p>
                </div>
              </div>
              {(() => {
                const sas = subscription.service_assignments || []
                if (sas.length === 0) return null
                return (
                  <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
                    <p className="text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>{t('member.extraServices')}</p>
                    <div className="flex flex-wrap gap-2">
                      {sas.map(sa => (
                        <span key={sa.id} className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: 'var(--bg-info)', color: 'var(--info)' }}>
                          {sa.services?.name} ({formatCurrency(sa.price)})
                        </span>
                      ))}
                    </div>
                  </div>
                )
              })()}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border p-6 text-center" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
            <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
              <i className="bi bi-qr-code" /> {t('scan.title')}
            </h3>
            <div className="flex justify-center p-4 rounded-xl" style={{ background: 'var(--bg)' }}>
              <canvas ref={canvasRef} />
            </div>
            <div className="flex gap-2 justify-center mt-4">
              <Button variant="ghost" size="sm" onPress={handleDownloadQR}>
                <i className="bi bi-download" /> {t('common.download')}
              </Button>
              <Button variant="ghost" size="sm" onPress={handlePrintQR}>
                <i className="bi bi-printer" /> {t('common.print')}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border p-6" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>{t('member.paymentHistory')}</h3>
        {payments.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{t('common.noData')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
                  <th className={`py-3 px-2 font-medium ${isRtl ? 'text-right' : 'text-left'}`} style={{ color: 'var(--text-muted)' }}>{t('member.date')}</th>
                  <th className={`py-3 px-2 font-medium ${isRtl ? 'text-right' : 'text-left'}`} style={{ color: 'var(--text-muted)' }}>{t('member.type')}</th>
                  <th className={`py-3 px-2 font-medium ${isRtl ? 'text-right' : 'text-left'}`} style={{ color: 'var(--text-muted)' }}>{t('member.method')}</th>
                  <th className={`py-3 px-2 font-medium ${isRtl ? 'text-left' : 'text-right'}`} style={{ color: 'var(--text-muted)' }}>{t('member.amount')}</th>
                </tr>
              </thead>
              <tbody>
                {payments.map(p => (
                  <tr key={p.id} className="border-b" style={{ borderColor: 'var(--border)' }}>
                    <td className={`py-3 px-2 ${isRtl ? 'text-right' : 'text-left'}`} style={{ color: 'var(--text-primary)' }}>{formatDate(p.paid_at)}</td>
                    <td className={`py-3 px-2 ${isRtl ? 'text-right' : 'text-left'}`}>
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: 'var(--bg-info)', color: 'var(--info)' }}>
                        {p.payment_type}
                      </span>
                    </td>
                    <td className={`py-3 px-2 ${isRtl ? 'text-right' : 'text-left'}`} style={{ color: 'var(--text-primary)' }}>{p.payment_method || '-'}</td>
                    <td className={`py-3 px-2 font-semibold ${isRtl ? 'text-left' : 'text-right'}`} style={{ color: 'var(--text-primary)' }}>{formatCurrency(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
