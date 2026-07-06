import { useState, useRef } from 'react'
import { Button } from '@heroui/react'
import { supabase } from '../lib/supabase'
import { Html5Qrcode } from 'html5-qrcode'
import { useI18n } from '../contexts/I18nContext'
import { useToast } from '../contexts/ToastContext'

interface MemberInfo {
  id: string
  full_name: string
  photo_url: string | null
  member_id: string
}

export default function Scan() {
  const { t } = useI18n()
  const { toast } = useToast()
  const readerRef = useRef<HTMLDivElement>(null)
  const qrRef = useRef<Html5Qrcode | null>(null)
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState<{ type: 'success' | 'warning' | 'error'; member?: MemberInfo; msg: string } | null>(null)
  const canScan = useRef(true)

  function extractMemberId(text: string): string | null {
    const params = new URLSearchParams(text.split('?')[1] || '')
    return params.get('id') || null
  }

  function extractUUID(text: string): string | null {
    const m = text.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)
    return m ? m[0] : null
  }

  async function doCheckIn(memberId: string) {
    const today = new Date().toISOString().split('T')[0]
    const now = new Date()
    const timeStr = now.toTimeString().split(' ')[0]
    const { error: insertErr } = await supabase.from('attendance').insert({
      member_id: memberId,
      check_in_date: today,
      check_in_time: timeStr,
    })
    if (insertErr) {
      if (insertErr.code === '23505') return { alreadyCheckedIn: true }
      throw insertErr
    }
    return { alreadyCheckedIn: false }
  }

  async function handleScan(decodedText: string) {
    if (!canScan.current) return
    canScan.current = false

    await qrRef.current?.stop()

    const memberId = extractMemberId(decodedText) || extractUUID(decodedText)

    if (!memberId) {
      setResult({ type: 'error', msg: t('scan.invalid') })
      setTimeout(() => { setResult(null); canScan.current = true; startScan() }, 2500)
      return
    }

    try {
      const { data: member } = await supabase
        .from('members')
        .select('id, full_name, photo_url, member_id')
        .eq('id', memberId)
        .single()

      if (!member) {
        setResult({ type: 'error', msg: t('scan.notFound') })
        setTimeout(() => { setResult(null); canScan.current = true; startScan() }, 2500)
        return
      }

      const checkin = await doCheckIn(member.id)
      if (checkin.alreadyCheckedIn) {
        setResult({ type: 'warning', member: member as MemberInfo, msg: `${member.full_name} — ${t('scan.alreadyCheckedIn')}` })
      } else {
        setResult({ type: 'success', member: member as MemberInfo, msg: `${member.full_name} — ${t('scan.success')}` })
        toast(t('scan.success'), 'success')
      }
    } catch {
      setResult({ type: 'error', msg: t('scan.error') })
    }

    setTimeout(() => { setResult(null); canScan.current = true; startScan() }, 3000)
  }

  async function startScan() {
    if (!readerRef.current) return
    setResult(null)
    try {
      qrRef.current = new Html5Qrcode('qr-reader')
      await qrRef.current.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        handleScan,
        () => {}
      )
      setScanning(true)
    } catch {
      setResult({ type: 'error', msg: t('scan.cameraError') })
    }
  }

  async function handleStartScan() {
    await startScan()
  }

  async function handleStopScan() {
    canScan.current = false
    await qrRef.current?.stop()
    setScanning(false)
    setResult(null)
    canScan.current = true
  }

  return (
    <div className="p-8 space-y-6 animate-fade-up">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>{t('scan.title')}</h1>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t('scan.subtitle')}</p>
      </div>

      <div className="max-w-md mx-auto rounded-2xl border p-6 text-center space-y-5" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
        <div className="w-64 h-64 mx-auto rounded-2xl overflow-hidden flex items-center justify-center relative" style={{ background: 'var(--bg)' }}>
          {scanning ? (
            <div id="qr-reader" ref={readerRef} className="w-full h-full" />
          ) : (
            <div className="text-center p-6">
              <i className="bi bi-qr-code-scan text-7xl" style={{ color: 'var(--text-muted)' }} />
              <p className="text-sm mt-3" style={{ color: 'var(--text-muted)' }}>{t('scan.placeholder')}</p>
            </div>
          )}
        </div>

        {result && (
          <div
            className={`p-4 rounded-xl text-sm flex items-center gap-3 ${
              result.type === 'success' ? '' : result.type === 'warning' ? '' : ''
            }`}
            style={{
              background: result.type === 'success' ? 'var(--bg-success)' : result.type === 'warning' ? 'var(--bg-warning)' : 'var(--bg-danger)',
              color: result.type === 'success' ? 'var(--success)' : result.type === 'warning' ? 'var(--warning)' : 'var(--danger)',
            }}
          >
            {result.member ? (
              <>
                {result.member.photo_url ? (
                  <img src={result.member.photo_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: 'var(--gradient-1)' }}>
                    {result.member.full_name[0]}
                  </div>
                )}
                <div className="text-left flex-1 min-w-0">
                  <strong className="block truncate">{result.member.full_name}</strong>
                  <small>#{result.member.member_id}</small>
                </div>
              </>
            ) : (
              <i className="bi bi-info-circle text-lg" />
            )}
            <span className="font-medium">{result.msg}</span>
          </div>
        )}

        {!scanning ? (
          <Button variant="primary" size="lg" fullWidth onPress={handleStartScan}>
            <i className="bi bi-camera" /> {t('scan.start')}
          </Button>
        ) : (
          <Button variant="ghost" size="lg" fullWidth onPress={handleStopScan} style={{ color: 'var(--danger)' }}>
            <i className="bi bi-stop-circle" /> {t('scan.stop')}
          </Button>
        )}
      </div>
    </div>
  )
}
