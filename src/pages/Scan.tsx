import { useState, useRef, useEffect } from 'react'
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

interface AttendanceRecord {
  id: string
  member_id: string
  check_in_time: string
  created_at: string
  members: { full_name: string; member_id: string; photo_url: string | null }
}

export default function Scan() {
  const { t, dir } = useI18n()
  const { toast } = useToast()
  const isRtl = dir === 'rtl'
  const readerRef = useRef<HTMLDivElement>(null)
  const qrRef = useRef<Html5Qrcode | null>(null)
  const [scanning, setScanning] = useState(false)
  const [camReady, setCamReady] = useState(false)
  const [result, setResult] = useState<{ type: 'success' | 'warning' | 'error'; member?: MemberInfo; msg: string } | null>(null)
  const canScan = useRef(true)

  const [allMembers, setAllMembers] = useState<MemberInfo[]>([])
  const [selectedMember, setSelectedMember] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const filteredMembers = allMembers.filter(m =>
    m.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.member_id.toLowerCase().includes(searchQuery.toLowerCase())
  )

  useEffect(() => {
    loadMembers()
    loadTodayAttendance()
  }, [])

  async function loadMembers() {
    const { data } = await supabase.from('members').select('id, full_name, photo_url, member_id').order('full_name')
    if (data) setAllMembers(data as MemberInfo[])
  }

  async function loadTodayAttendance() {
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase
      .from('attendance')
      .select('*, members(full_name, member_id, photo_url)')
      .eq('check_in_date', today)
      .order('check_in_time', { ascending: false })
    if (data) setAttendance(data as unknown as AttendanceRecord[])
  }

  function extractMemberId(text: string): string | null {
    const path = text.split('?')[0]
    const match = path.match(/\/members\/([a-f0-9-]+)/i)
    if (match) return match[1]
    const params = new URLSearchParams(text.split('?')[1] || '')
    return params.get('id') || null
  }

  function extractUUID(text: string): string | null {
    const m = text.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)
    return m ? m[0] : null
  }

  async function doCheckIn(memberId: string): Promise<{ alreadyCheckedIn: boolean; error?: string }> {
    if (!memberId || memberId.trim() === '') {
      return { alreadyCheckedIn: false, error: 'Member ID is empty' }
    }

    const today = new Date().toISOString().split('T')[0]

    const { data: existing } = await supabase
      .from('attendance')
      .select('id')
      .eq('member_id', memberId)
      .eq('check_in_date', today)
      .maybeSingle()

    if (existing) return { alreadyCheckedIn: true }

    const now = new Date()
    const timeStr = now.toTimeString().split(' ')[0]

    const { error: insertErr } = await supabase.from('attendance').insert({
      member_id: memberId,
      check_in_date: today,
      check_in_time: timeStr,
    })

    if (insertErr) {
      if (insertErr.code === '23505') return { alreadyCheckedIn: true }
      if (insertErr.code === '23503') return { alreadyCheckedIn: false, error: 'Selected member does not exist.' }
      if (insertErr.code === '42501' || (insertErr as any).code === 'PGRST301') return { alreadyCheckedIn: false, error: 'Permission denied. Check your user role in user_roles table.' }
      return { alreadyCheckedIn: false, error: insertErr.message || 'Check-in failed' }
    }

    return { alreadyCheckedIn: false }
  }

  async function processCheckIn(memberId: string) {
    if (!memberId || memberId.trim() === '') {
      setResult({ type: 'error', msg: 'Invalid member ID' })
      return
    }

    try {
      const { data: member, error: lookupErr } = await supabase
        .from('members')
        .select('id, full_name, photo_url, member_id')
        .eq('id', memberId)
        .single()

      if (lookupErr) {
        setResult({ type: 'error', msg: t('scan.error') })
        return
      }

      if (!member) {
        setResult({ type: 'error', msg: t('scan.notFound') })
        return
      }

      const checkin = await doCheckIn(member.id)

      if (checkin.error) {
        setResult({ type: 'error', msg: checkin.error })
        return
      }

      if (checkin.alreadyCheckedIn) {
        setResult({ type: 'warning', member: member as MemberInfo, msg: `${member.full_name} — ${t('scan.alreadyCheckedIn')}` })
      } else {
        setResult({ type: 'success', member: member as MemberInfo, msg: `${member.full_name} — ${t('scan.success')}` })
        toast(t('scan.success'), 'success')
        loadTodayAttendance()
      }
    } catch {
      setResult({ type: 'error', msg: t('scan.error') })
    }
  }

  async function handleScan(decodedText: string) {
    if (!canScan.current) return
    canScan.current = false

    await stopScanner()

    const memberId = extractMemberId(decodedText) || extractUUID(decodedText)

    if (!memberId) {
      setResult({ type: 'error', msg: t('scan.invalid') })
      setTimeout(() => { setResult(null); canScan.current = true; startScan() }, 2500)
      return
    }

    await processCheckIn(memberId)
    setTimeout(() => { setResult(null); canScan.current = true; startScan() }, 3000)
  }

  async function stopScanner() {
    if (!qrRef.current) return
    try { await qrRef.current.stop() } catch {}
    try { qrRef.current.clear() } catch {}
  }

  useEffect(() => {
    return () => { stopScanner(); qrRef.current = null }
  }, [])

  async function startScan() {
    setResult(null)
    try {
      await stopScanner()
      qrRef.current = new Html5Qrcode('qr-reader')
      setCamReady(true)
      await new Promise(r => setTimeout(r, 50))
      await qrRef.current.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        handleScan,
        () => {}
      )
      setScanning(true)
    } catch {
      setResult({ type: 'error', msg: t('scan.cameraError') })
      setCamReady(false)
    }
  }

  async function handleStartScan() {
    setCamReady(true)
    await new Promise(r => setTimeout(r, 50))
    await startScan()
  }

  async function handleStopScan() {
    canScan.current = false
    await stopScanner()
    qrRef.current = null
    setScanning(false)
    setCamReady(false)
    setResult(null)
    canScan.current = true
  }

  async function handleManualCheckIn() {
    if (!selectedMember) return
    await processCheckIn(selectedMember)
    setSelectedMember('')
    setSearchQuery('')
  }

  return (
    <div className="p-8 space-y-6 animate-fade-up">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>{t('scan.title')}</h1>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t('scan.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Scanner column */}
        <div className="glass rounded-2xl p-6 text-center space-y-5">
          <div className="w-64 h-64 mx-auto rounded-2xl overflow-hidden flex items-center justify-center relative" style={{ background: 'var(--bg-input)' }}>
            <div id="qr-reader" ref={readerRef} className={`w-full h-full ${camReady ? '' : 'hidden'}`} />
            {!camReady && (
              <div className="text-center p-6">
                <i className="bi bi-qr-code-scan text-7xl" style={{ color: 'var(--text-muted)' }} />
                <p className="text-sm mt-3" style={{ color: 'var(--text-muted)' }}>{t('scan.placeholder')}</p>
              </div>
            )}
          </div>

          {result && (
            <div
              className="p-4 rounded-xl text-sm flex items-center gap-3"
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
                  <div className={`flex-1 min-w-0 ${isRtl ? 'text-right' : 'text-left'}`}>
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

        {/* Manual check-in + Attendance */}
        <div className="space-y-6">
          {/* Manual check-in */}
          <div className="glass rounded-2xl p-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                <i className="bi bi-person-check" /> {t('scan.manualTitle')}
              </h2>
              <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{t('scan.manualSubtitle')}</p>
            </div>
            <div className="relative">
              <i className="bi bi-search absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--text-muted)' }} />
              <input
                type="text" value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setShowDropdown(true) }}
                placeholder={t('scan.selectMember')} maxLength={100}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', borderColor: 'var(--border)' }}
                onFocus={() => setShowDropdown(true)}
                onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
              />
              {showDropdown && filteredMembers.length > 0 && (
                <div
                  className="absolute z-50 left-0 right-0 mt-1 rounded-xl border shadow-lg overflow-y-auto max-h-60"
                  style={{ background: 'var(--bg-input)', borderColor: 'var(--border)' }}
                >
                  {filteredMembers.map(m => (
                    <button
                      key={m.id} type="button"
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-all hover:opacity-80 ${selectedMember === m.id ? 'font-semibold' : ''}`}
                      style={{ color: 'var(--text-primary)', background: selectedMember === m.id ? 'var(--primary-light)' : 'transparent' }}
                      onMouseDown={() => { setSelectedMember(m.id); setSearchQuery(m.full_name); setShowDropdown(false) }}
                    >
                      {m.photo_url ? (
                        <img src={m.photo_url} alt="" className="w-7 h-7 rounded-full object-cover" />
                      ) : (
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0" style={{ background: 'var(--gradient-1)' }}>
                          {m.full_name[0]}
                        </div>
                      )}
                      <div className="flex-1 text-left min-w-0">
                        <span className="block truncate">{m.full_name}</span>
                        <span className="text-xs block truncate" style={{ color: 'var(--text-muted)' }}>#{m.member_id}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Button variant="primary" fullWidth isDisabled={!selectedMember} onPress={handleManualCheckIn}>
              <i className="bi bi-check-lg" /> {t('scan.manualCheckIn')}
            </Button>
          </div>

          {/* Today's attendance */}
          <div className="glass rounded-2xl p-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                <i className="bi bi-calendar-check" /> {t('scan.todayAttendance')}
              </h2>
              <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                {attendance.length} {t('members.total')}
              </p>
            </div>
            {attendance.length === 0 ? (
              <p className="text-sm text-center py-6" style={{ color: 'var(--text-muted)' }}>
                <i className="bi bi-inbox text-2xl block mb-2" />
                {t('scan.noAttendance')}
              </p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {attendance.map(a => (
                  <div
                    key={a.id}
                    className="flex items-center gap-3 p-3 rounded-xl text-sm"
                    style={{ background: 'var(--bg-input)' }}
                  >
                    {a.members?.photo_url ? (
                      <img src={a.members.photo_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: 'var(--gradient-1)' }}>
                        {a.members?.full_name?.[0] || '?'}
                      </div>
                    )}
                    <div className={`flex-1 min-w-0 ${isRtl ? 'text-right' : 'text-left'}`}>
                      <strong className="block truncate" style={{ color: 'var(--text-primary)' }}>{a.members?.full_name}</strong>
                      <small style={{ color: 'var(--text-muted)' }}>#{a.members?.member_id}</small>
                    </div>
                    <span className="text-xs font-medium shrink-0" style={{ color: 'var(--success)' }}>
                      <i className="bi bi-clock" /> {a.check_in_time}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
