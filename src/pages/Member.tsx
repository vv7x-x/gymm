import { useEffect, useState, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { Button } from '@heroui/react'
import { motion } from 'framer-motion'
import QRCode from 'qrcode'
import { supabase } from '../lib/supabase'
import { useI18n } from '../contexts/I18nContext'
import { useToast } from '../contexts/ToastContext'
import { formatDate, formatCurrency, calculateDaysRemaining, getSubscriptionStatus } from '../lib/utils'
import type { Member as MemberType, Subscription, Payment, Plan, Service } from '../types'
import ConfirmModal from '../components/ConfirmModal'
import RenewDialog from '../components/RenewDialog'

const easeOut = [0.25, 0.1, 0.25, 1] as [number, number, number, number]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: easeOut } },
}

function getStatusStyle(status: string) {
  switch (status) {
    case 'active': return { bg: 'var(--bg-success)', color: 'var(--success)', icon: 'bi-check-circle-fill' }
    case 'expiring_soon': return { bg: 'var(--bg-warning)', color: 'var(--warning)', icon: 'bi-exclamation-circle-fill' }
    case 'expired': return { bg: 'var(--bg-danger)', color: 'var(--danger)', icon: 'bi-x-circle-fill' }
    default: return { bg: 'var(--bg-info)', color: 'var(--info)', icon: 'bi-question-circle' }
  }
}

export default function Member() {
  const { id } = useParams()
  const { t, dir, lang } = useI18n()
  const { toast } = useToast()
  const isRtl = dir === 'rtl'
  const navigate = useNavigate()
  const [member, setMember] = useState<MemberType | null>(null)
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [qrError, setQrError] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showRenew, setShowRenew] = useState(false)
  const [plans, setPlans] = useState<Plan[]>([])
  const [services, setServices] = useState<Service[]>([])
  useEffect(() => {
    if (!id) return
    async function loadMember() {
      try {
        const { data: m } = await supabase.from('members').select('*').eq('id', id).single()
        if (m) setMember(m)
        const { data: subs } = await supabase
          .from('subscriptions')
          .select('*, plans(*), service_assignments(*, services(*))')
          .eq('member_id', id)
          .order('start_date', { ascending: false }).limit(1)
        if (subs?.length) setSubscription(subs[0] as unknown as Subscription)
        const { data: pays } = await supabase
          .from('payments').select('*').eq('member_id', id)
          .order('paid_at', { ascending: false }).limit(20)
        setPayments(pays || [])
      } catch (e) { console.error('[Member] load error:', e) } finally { setLoading(false) }
    }
    loadMember()
    Promise.all([
      supabase.from('plans').select('*').eq('is_active', true),
      supabase.from('services').select('*').eq('is_active', true),
    ]).then(([p, s]) => { setPlans(p.data || []); setServices(s.data || []) })
  }, [id])

  async function handleDelete() {
    const { error } = await supabase.from('members').delete().eq('id', member!.id)
    if (error) { toast(error.message, 'error'); return }
    toast('Member deleted', 'success')
    navigate('/members')
  }

  const generateQr = useCallback(async () => {
    if (!member) return
    const qrUrl = `${window.location.origin}/members/${member.id}`
    try {
      setQrError(false)
      const url = await QRCode.toDataURL(qrUrl, { width: 220, margin: 2, color: { dark: '#1a1a2e', light: '#ffffff' } })
      setQrDataUrl(url)
    } catch (err) { console.error('[QR Generation Error]', err); setQrError(true) }
  }, [member])

  useEffect(() => { generateQr() }, [generateQr])

  const handleDownloadQR = useCallback(() => {
    if (!qrDataUrl) return
    const link = document.createElement('a')
    link.download = `QR-${member?.member_id || 'member'}.png`
    link.href = qrDataUrl; link.click()
  }, [qrDataUrl, member])

  const handlePrintQR = useCallback(() => {
    if (!qrDataUrl) return
    const win = window.open('', '_blank', 'noopener,noreferrer')
    if (win) {
      win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>QR Code - ${member?.full_name || 'Member'}</title><style>
        * { margin:0;padding:0;box-sizing:border-box; }
        body { display:flex;justify-content:center;align-items:center;min-height:100vh;font-family:sans-serif;background:#fff;flex-direction:column;gap:16px;padding:20px; }
        .qr-wrap { text-align:center; }
        .qr-wrap img { width:280px;height:280px;image-rendering:pixelated; }
        .label { font-size:14px;color:#333;margin-top:8px; }
        .label strong { font-size:18px; }
        @media print { body { padding:0; } }
      </style></head><body>
        <div class="qr-wrap"><img src="${qrDataUrl}" alt="QR Code" /><div class="label"><strong>${member?.full_name || ''}</strong><br />#${member?.member_id || ''}</div></div>
        ${'<script>'}window.onload=function(){window.print();window.close()};${'</script>'}</body></html>`)
      win.document.close()
    }
  }, [qrDataUrl, member])

  const handleCopyLink = useCallback(() => {
    navigator.clipboard.writeText(`${window.location.origin}/members/${member?.id}`)
    toast('Link copied', 'success')
  }, [member, toast])

  const status = getSubscriptionStatus(subscription?.end_date)
  const days = calculateDaysRemaining(subscription?.end_date)
  const plan = subscription?.plans
  const sas = subscription?.service_assignments || []

  const totalDuration = plan?.duration_days || 30
  let progressPct = 0
  if (subscription?.start_date && subscription?.end_date) {
    const start = new Date(subscription.start_date).getTime()
    const end = new Date(subscription.end_date).getTime()
    const now = Date.now()
    progressPct = Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100))
  }

  if (loading) return (
    <div className="p-8 space-y-6">
      <div className="skeleton h-10 w-56 rounded-lg" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="skeleton h-56 rounded-2xl" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}
          </div>
          <div className="skeleton h-48 rounded-2xl" />
          <div className="skeleton h-52 rounded-2xl" />
        </div>
        <div className="space-y-6">
          <div className="skeleton h-80 rounded-2xl" />
          <div className="skeleton h-40 rounded-2xl" />
        </div>
      </div>
    </div>
  )

  if (!member) return (
    <div className="p-8 text-center py-20 animate-fade-up">
      <div className="w-20 h-20 mx-auto mb-4 glass rounded-2xl flex items-center justify-center" style={{ background: 'var(--bg-danger)' }}>
        <i className="bi bi-person-x text-3xl" style={{ color: 'var(--danger)' }} />
      </div>
      <h3 className="text-lg font-medium mb-2" style={{ color: 'var(--text-primary)' }}>{t('member.notFound')}</h3>
      <Link to="/members"><Button variant="tertiary">{t('member.back')}</Button></Link>
    </div>
  )

  const ss = getStatusStyle(status)

  return (
    <motion.div
      className="p-6 lg:p-8 space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* ── Header ── */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Link to="/members">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 hover:bg-[var(--bg-hover)] shrink-0" style={{ color: 'var(--text-secondary)' }}>
              <i className={`bi ${isRtl ? 'bi-arrow-left' : 'bi-arrow-right'} text-xl`} />
            </div>
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>{t('member.title')}</h1>
              {subscription && (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-0.5 rounded-full" style={{ background: ss.bg, color: ss.color }}>
                  <i className={`bi ${ss.icon} text-[10px]`} />
                  {status === 'active' ? `${days} ${t('common.days')}` : status === 'expiring_soon' ? `${days} ${t('common.days')}` : t('common.expired')}
                </span>
              )}
            </div>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>#{member.member_id}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="ghost" size="sm" className="h-10 font-medium px-4" onPress={() => setShowRenew(true)}>
            <i className="bi bi-arrow-clockwise" /> Renew
          </Button>
          <Button variant="ghost" size="sm" className="h-10 font-medium px-4" style={{ color: 'var(--danger)' }} onPress={() => setShowDeleteConfirm(true)}>
            <i className="bi bi-trash" /> {t('common.delete')}
          </Button>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left Column ── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Member Hero Card */}
          <motion.div
            variants={itemVariants}
            className="rounded-2xl p-6 relative overflow-hidden"
            style={{ background: 'var(--glass-bg)', backdropFilter: 'var(--glass-blur)', WebkitBackdropFilter: 'var(--glass-blur)', border: '1px solid var(--glass-border)' }}
          >
            <div className="flex items-start gap-5">
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shrink-0 shadow-lg"
                style={{ background: 'var(--gradient-1)' }}
              >
                {member.full_name?.[0] || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between flex-wrap gap-3">
                  <div>
                    <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{member.full_name}</h2>
                    <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>#{member.member_id}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 text-sm">
                  <div>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{t('members.phone')}</p>
                    <p className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>{member.phone || '-'}</p>
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
                {member.notes && (
                  <div className="mt-4 p-3 rounded-xl flex items-start gap-2" style={{ background: 'var(--bg-input)' }}>
                    <i className="bi bi-chat-dots text-xs mt-1" style={{ color: 'var(--text-muted)' }} />
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{member.notes}</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* KPI Stats */}
          <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Days Remaining', value: days, icon: 'bi-calendar-check', gradient: 'linear-gradient(135deg, #4F7CFF, #7C5CFC)' },
              { label: 'Plan Price', value: formatCurrency(subscription?.plan_price), icon: 'bi-currency-dollar', gradient: 'linear-gradient(135deg, #22C55E, #34D965)' },
              { label: 'Services', value: sas.length, icon: 'bi-gear', gradient: 'linear-gradient(135deg, #F59E0B, #F97316)' },
              { label: 'Total Paid', value: formatCurrency(subscription?.total_price), icon: 'bi-receipt', gradient: 'linear-gradient(135deg, #EF4444, #F97316)' },
            ].map((stat, i) => (
              <div
                key={i}
                className="rounded-2xl p-4 transition-all duration-200"
                style={{ background: 'var(--glass-bg)', backdropFilter: 'var(--glass-blur)', WebkitBackdropFilter: 'var(--glass-blur)', border: '1px solid var(--glass-border)' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--glass-border-hover)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--glass-border)'; e.currentTarget.style.transform = 'translateY(0)' }}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm mb-3 shadow-lg"
                  style={{ background: stat.gradient }}
                >
                  <i className={`bi ${stat.icon}`} />
                </div>
                <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{stat.label}</p>
                <p className="text-lg font-bold mt-0.5 tracking-tight" style={{ color: 'var(--text-primary)' }}>{stat.value}</p>
              </div>
            ))}
          </motion.div>

          {/* Subscription Card */}
          {subscription && (
            <motion.div
              variants={itemVariants}
              className="rounded-2xl"
              style={{ background: 'var(--glass-bg)', backdropFilter: 'var(--glass-blur)', WebkitBackdropFilter: 'var(--glass-blur)', border: '1px solid var(--glass-border)' }}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--bg-info)' }}>
                      <i className="bi bi-boxes text-sm" style={{ color: 'var(--info)' }} />
                    </div>
                    <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{t('member.subscription')}</h3>
                  </div>
                  <Button variant="primary" size="sm" className="h-9 font-medium px-4" onPress={() => setShowRenew(true)}>
                    <i className="bi bi-arrow-clockwise" /> Renew
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl mb-5" style={{ background: 'var(--bg-hover)' }}>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{plan?.name || 'Plan'}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{totalDuration} days</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold" style={{ color: 'var(--primary)' }}>{formatCurrency(subscription.plan_price)}</p>
                  </div>
                </div>

                <div className="mb-5">
                  <div className="flex justify-between text-xs mb-1.5">
                    <span style={{ color: 'var(--text-muted)' }}>Progress</span>
                    <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{Math.round(progressPct)}% used</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-input)' }}>
                    <motion.div
                      className="h-full rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(progressPct, 100)}%` }}
                      transition={{ duration: 1, ease: easeOut }}
                      style={{ background: progressPct > 80 ? 'var(--danger)' : progressPct > 50 ? 'var(--warning)' : 'var(--success)' }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{t('member.startDate')}</p>
                    <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{formatDate(subscription.start_date, lang)}</p>
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{t('member.endDate')}</p>
                    <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{formatDate(subscription.end_date, lang)}</p>
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Remaining</p>
                    <p className="font-medium" style={{ color: days <= 3 ? 'var(--danger)' : days <= 7 ? 'var(--warning)' : 'var(--success)' }}>{days} days</p>
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Total Paid</p>
                    <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{formatCurrency(subscription.total_price)}</p>
                  </div>
                </div>

                {sas.length > 0 && (
                  <div className="mt-5 pt-5 border-t" style={{ borderColor: 'var(--border)' }}>
                    <p className="text-sm font-medium mb-2.5" style={{ color: 'var(--text-primary)' }}>{t('member.extraServices')}</p>
                    <div className="flex flex-wrap gap-2">
                      {sas.map(sa => (
                        <span
                          key={sa.id}
                          className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full"
                          style={{ background: 'var(--bg-info)', color: 'var(--info)' }}
                        >
                          {sa.services?.name} ({formatCurrency(sa.price)})
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Payment History */}
          <motion.div
            variants={itemVariants}
            className="rounded-2xl"
            style={{ background: 'var(--glass-bg)', backdropFilter: 'var(--glass-blur)', WebkitBackdropFilter: 'var(--glass-blur)', border: '1px solid var(--glass-border)' }}
          >
            <div className="p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--bg-info)' }}>
                  <i className="bi bi-credit-card text-sm" style={{ color: 'var(--info)' }} />
                </div>
                <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{t('member.paymentHistory')}</h3>
              </div>
              {payments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 rounded-xl" style={{ background: 'var(--bg)' }}>
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3" style={{ background: 'var(--bg-info)' }}>
                    <i className="bi bi-credit-card text-xl" style={{ color: 'var(--info)' }} />
                  </div>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>No payments yet</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Payments will appear here after first subscription.</p>
                </div>
              ) : (
                <div className="table-wrap">
                  <table className="table-base">
                    <thead>
                      <tr>
                        <th>{t('member.date')}</th>
                        <th>{t('member.type')}</th>
                        <th>{t('member.method')}</th>
                        <th style={{ textAlign: 'right' }}>{t('member.amount')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map(p => (
                        <tr key={p.id}>
                          <td style={{ whiteSpace: 'nowrap' }}>{formatDate(p.paid_at, lang)}</td>
                          <td>
                            <span className="badge" style={{ background: 'var(--bg-info)', color: 'var(--info)' }}>
                              {p.payment_type}
                            </span>
                          </td>
                          <td style={{ color: 'var(--text-secondary)' }}>{p.payment_method || '-'}</td>
                          <td style={{ textAlign: 'right' }} className="font-semibold">{formatCurrency(p.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* ── Right Column ── */}
        <div className="space-y-6">

          {/* QR Card */}
          <motion.div
            variants={itemVariants}
            className="rounded-2xl p-6"
            style={{ background: 'var(--glass-bg)', backdropFilter: 'var(--glass-blur)', WebkitBackdropFilter: 'var(--glass-blur)', border: '1px solid var(--glass-border)' }}
          >
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <i className="bi bi-qr-code" /> {t('scan.title')}
            </h3>
            <div
              className="flex justify-center p-6 rounded-xl relative overflow-hidden"
              style={{ background: 'var(--bg-input)' }}
            >
              {qrDataUrl ? (
                <div className="relative group">
                  <img src={qrDataUrl} alt="QR Code" width={200} height={200} className="block rounded-lg relative z-10" />
                  <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ boxShadow: '0 0 40px rgba(79,124,255,0.3), 0 0 80px rgba(79,124,255,0.15)' }} />
                </div>
              ) : qrError ? (
                <div className="text-center py-10">
                  <i className="bi bi-exclamation-triangle text-3xl block mb-2" style={{ color: 'var(--danger)' }} />
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{t('common.error')}</p>
                </div>
              ) : (
                <div className="w-[200px] h-[200px] flex items-center justify-center">
                  <div className="animate-spin w-6 h-6 border-2 border-[var(--primary)] border-t-transparent rounded-full" />
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              <Button variant="ghost" size="sm" className="h-9 text-xs font-medium" isDisabled={!qrDataUrl} onPress={handleDownloadQR}>
                <i className="bi bi-download" /> {t('common.download')}
              </Button>
              <Button variant="ghost" size="sm" className="h-9 text-xs font-medium" isDisabled={!qrDataUrl} onPress={handlePrintQR}>
                <i className="bi bi-printer" /> {t('common.print')}
              </Button>
              <Button variant="ghost" size="sm" className="h-9 text-xs font-medium col-span-2" isDisabled={!member} onPress={handleCopyLink}>
                <i className="bi bi-link-45deg" /> Copy Link
              </Button>
            </div>
          </motion.div>

          {/* Quick Stats */}
          <motion.div
            variants={itemVariants}
            className="rounded-2xl p-6"
            style={{ background: 'var(--glass-bg)', backdropFilter: 'var(--glass-blur)', WebkitBackdropFilter: 'var(--glass-blur)', border: '1px solid var(--glass-border)' }}
          >
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <i className="bi bi-bar-chart" /> Statistics
            </h3>
            <div className="space-y-4">
              {[
                { label: 'Status', value: status.replace('_', ' '), icon: 'bi-shield-check', color: ss.color, bg: ss.bg },
                { label: 'Plan', value: plan?.name || '-', icon: 'bi-box', color: 'var(--info)', bg: 'var(--bg-info)' },
                { label: 'Duration', value: `${totalDuration} days`, icon: 'bi-calendar-range', color: 'var(--success)', bg: 'var(--bg-success)' },
                { label: 'Member Since', value: formatDate(member.created_at, lang), icon: 'bi-clock-history', color: 'var(--warning)', bg: 'var(--bg-warning)' },
              ].map((stat, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm shrink-0" style={{ background: stat.bg, color: stat.color }}>
                    <i className={`bi ${stat.icon}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{stat.label}</p>
                    <p className="text-sm font-medium capitalize truncate" style={{ color: 'var(--text-primary)' }}>{stat.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      <ConfirmModal
        open={showDeleteConfirm}
        title="Delete Member"
        message={`Are you sure you want to delete ${member.full_name}? This cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      <RenewDialog
        open={showRenew}
        onClose={() => setShowRenew(false)}
        memberId={member.id}
        memberName={member.full_name}
        plans={plans}
        services={services}
      />
    </motion.div>
  )
}
