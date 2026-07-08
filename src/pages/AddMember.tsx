import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Button } from '@heroui/react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { useI18n } from '../contexts/I18nContext'
import { useToast } from '../contexts/ToastContext'
import { generateMemberId, pick, formatDate } from '../lib/utils'
import type { Plan, Service } from '../types'

const steps = [
  { label: 'Personal Info', icon: 'bi-person-badge' },
  { label: 'Membership', icon: 'bi-boxes' },
  { label: 'Extras', icon: 'bi-gear' },
  { label: 'Review', icon: 'bi-check-circle' },
]

const easeOut = [0.25, 0.1, 0.25, 1] as [number, number, number, number]

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
  center: { x: 0, opacity: 1, transition: { duration: 0.35, ease: easeOut } },
  exit: (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0, transition: { duration: 0.25, ease: easeOut } }),
}

function Input({ label, value, onChange, type = 'text', required, error, maxLength, min, max, ...rest }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean; error?: string; maxLength?: number; min?: number; max?: number; [key: string]: unknown
}) {
  const [focused, setFocused] = useState(false)
  return (
    <div className="relative">
      <label
        className="block text-sm font-medium mb-1.5 transition-colors duration-200"
        style={{ color: focused ? 'var(--primary)' : 'var(--text-primary)' }}
      >
        {label}{required && <span className="ml-1" style={{ color: 'var(--danger)' }}>*</span>}
      </label>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        type={type}
        required={required}
        maxLength={maxLength}
        min={min}
        max={max}
        className="w-full px-4 rounded-xl text-sm outline-none transition-all duration-200"
        style={{
          height: 52,
          background: 'var(--bg-input)',
          border: `1px solid ${error ? 'var(--danger)' : focused ? 'var(--border-focus)' : 'var(--border)'}`,
          color: 'var(--text-primary)',
          boxShadow: focused ? '0 0 0 3px rgba(79,124,255,0.12)' : 'none',
        }}
        {...rest}
      />
      {error && <p className="text-xs mt-1" style={{ color: 'var(--danger)' }}>{error}</p>}
    </div>
  )
}

export default function AddMember() {
  const { t, dir, lang } = useI18n()
  const { toast } = useToast()
  const isRtl = dir === 'rtl'
  const navigate = useNavigate()
  const [plans, setPlans] = useState<Plan[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [currentStep, setCurrentStep] = useState(1)
  const [stepDir, setStepDir] = useState(1)
  const [form, setForm] = useState({
    full_name: '', age: '', phone: '', gender: 'male' as 'male' | 'female',
    weight: '', height: '', notes: '',
    plan_id: '', start_date: new Date().toISOString().split('T')[0],
  })
  const [selectedServices, setSelectedServices] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    Promise.all([
      supabase.from('plans').select('*').eq('is_active', true),
      supabase.from('services').select('*').eq('is_active', true),
    ]).then(([plansRes, servicesRes]) => {
      setPlans(plansRes.data || [])
      setServices(servicesRes.data || [])
    })
  }, [])

  const selectedPlan = plans.find(p => p.id === form.plan_id)
  const servicesTotal = services.filter(s => selectedServices.includes(s.id)).reduce((sum, s) => sum + s.price, 0)
  const total = (selectedPlan?.price || 0) + servicesTotal

  function goToStep(step: number) {
    if (step < 1 || step > 4) return
    setStepDir(step > currentStep ? 1 : -1)
    setCurrentStep(step)
  }

  function nextStep() {
    const errs: Record<string, string> = {}
    if (currentStep === 1) {
      if (!form.full_name.trim()) errs.full_name = 'Required'
      if (!form.age || +form.age < 1) errs.age = 'Required'
    }
    if (currentStep === 2) {
      if (!form.plan_id) errs.plan_id = 'Select a plan'
      if (!form.start_date) errs.start_date = 'Required'
    }
    setErrors(errs)
    if (Object.keys(errs).length > 0) return
    if (currentStep < 4) { setStepDir(1); setCurrentStep(s => s + 1) }
  }

  function prevStep() {
    if (currentStep > 1) { setStepDir(-1); setCurrentStep(s => s - 1) }
  }

  const toggleService = (id: string) => setSelectedServices(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id])

  async function handleSubmit() {
    setSaving(true)
    try {
      const memberId = generateMemberId()
      const { data: member } = await supabase.from('members').insert(pick({
        member_id: memberId, full_name: form.full_name, age: form.age ? +form.age : 0,
        phone: form.phone, gender: form.gender, weight: form.weight ? +form.weight : null,
        height: form.height ? +form.height : null, notes: form.notes, photo_url: null,
      }, ['member_id', 'full_name', 'age', 'phone', 'gender', 'weight', 'height', 'notes', 'photo_url'])).select().single()

      if (member && form.plan_id) {
        const endDate = new Date(form.start_date)
        endDate.setDate(endDate.getDate() + (selectedPlan?.duration_days || 30))
        const { data: sub, error: subErr } = await supabase.from('subscriptions').insert(pick({
          member_id: member.id, plan_id: form.plan_id, start_date: form.start_date,
          end_date: endDate.toISOString().split('T')[0], plan_price: selectedPlan?.price || 0,
          services_price: servicesTotal, total_price: total, status: 'active',
        }, ['member_id', 'plan_id', 'start_date', 'end_date', 'plan_price', 'services_price', 'total_price', 'status'])).select().single()

        if (subErr || !sub) { await supabase.from('members').delete().eq('id', member.id); throw subErr || new Error('subscription insert failed') }

        if (selectedServices.length > 0) {
          const { error: saErr } = await supabase.from('service_assignments').insert(
            selectedServices.map(sId => ({ subscription_id: sub.id, service_id: sId, price: services.find(s => s.id === sId)?.price || 0 }))
          )
          if (saErr) { await supabase.from('subscriptions').delete().eq('id', sub.id); await supabase.from('members').delete().eq('id', member.id); throw saErr }
        }

        const { error: payErr } = await supabase.from('payments').insert({
          member_id: member.id, subscription_id: sub.id, amount: total,
          payment_type: 'subscription', payment_method: 'cash', notes: 'Initial payment',
        })
        if (payErr) { await supabase.from('subscriptions').delete().eq('id', sub.id); await supabase.from('members').delete().eq('id', member.id); throw payErr }
      }
      navigate('/members')
    } catch { toast(t('common.error'), 'error') } finally { setSaving(false) }
  }

  function resetForm() {
    setForm({ full_name: '', age: '', phone: '', gender: 'male', weight: '', height: '', notes: '', plan_id: '', start_date: new Date().toISOString().split('T')[0] })
    setSelectedServices([]); setErrors({}); setCurrentStep(1)
  }

  const endDate = form.plan_id && form.start_date && selectedPlan
    ? new Date(new Date(form.start_date).getTime() + selectedPlan.duration_days * 86400000).toISOString().split('T')[0]
    : null

  return (
    <motion.div
      className="p-6 lg:p-8 space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <Link to="/members">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 hover:bg-[var(--bg-hover)] shrink-0" style={{ color: 'var(--text-secondary)' }}>
              <i className={`bi ${isRtl ? 'bi-arrow-left' : 'bi-arrow-right'} text-xl`} />
            </div>
          </Link>
          <div className="min-w-0">
            <h1 className="text-[32px] lg:text-[42px] font-bold tracking-tight leading-none" style={{ color: 'var(--text-primary)' }}>
              {t('addMember.title')}
            </h1>
            <p className="text-base mt-2" style={{ color: 'var(--text-secondary)' }}>{t('addMember.subtitle')}</p>
          </div>
        </div>
        <div className="hidden lg:flex items-center gap-3 shrink-0">
          <Button variant="ghost" className="h-11 font-medium px-5" onPress={resetForm}>
            <i className="bi bi-arrow-counterclockwise" /> Reset
          </Button>
          <Button variant="primary" className="h-11 font-medium px-5" isDisabled={currentStep < 4} isPending={saving} onPress={handleSubmit}>
            <i className="bi bi-person-plus" /> {t('addMember.save')}
          </Button>
        </div>
      </div>

      {/* ── Steps ── */}
      <div className="flex items-center gap-0 w-full max-w-3xl mx-auto lg:mx-0">
        {steps.map((s, i) => {
          const idx = i + 1
          const done = idx < currentStep
          const active = idx === currentStep
          return (
            <div key={idx} className="flex-1 flex flex-col items-center">
              <button
                type="button"
                onClick={() => idx < currentStep ? goToStep(idx) : null}
                className={`flex items-center justify-center w-10 h-10 rounded-xl text-sm font-semibold transition-all duration-300 ${idx < currentStep ? 'cursor-pointer' : 'cursor-default'}`}
                style={{
                  background: active ? 'var(--gradient-1)' : done ? 'var(--bg-success)' : 'var(--bg-input)',
                  color: active || done ? '#fff' : 'var(--text-muted)',
                  boxShadow: active ? '0 4px 16px rgba(79,124,255,0.3)' : 'none',
                }}
                aria-label={`Step ${idx}: ${s.label}`}
              >
                <i className={`bi ${done ? 'bi-check-lg' : s.icon} ${active ? 'text-lg' : 'text-base'}`} />
              </button>
              <p
                className={`text-[11px] font-medium mt-1.5 text-center whitespace-nowrap transition-colors duration-200 ${active ? '' : ''}`}
                style={{ color: active ? 'var(--text-primary)' : done ? 'var(--success)' : 'var(--text-muted)' }}
              >
                {s.label}
              </p>
              {i < steps.length - 1 && (
                <div className="absolute h-px top-5 left-[calc(50%+20px)] right-[calc(50%+20px)]" style={{ background: 'var(--border)' }}>
                  <motion.div
                    className="h-full"
                    initial={{ width: 0 }}
                    animate={{ width: done ? '100%' : '0%' }}
                    transition={{ duration: 0.4, ease: easeOut }}
                    style={{ background: 'var(--gradient-1)' }}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="relative flex flex-col lg:flex-row gap-6">
        {/* ── Form ── */}
        <div className="flex-1 min-w-0 space-y-6">
          <AnimatePresence mode="wait" custom={stepDir}>
            <motion.div
              key={currentStep}
              custom={stepDir}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
            >
              {/* Step 1: Personal Information */}
              {currentStep === 1 && (
                <div className="rounded-2xl p-6 space-y-5" style={{ background: 'var(--glass-bg)', backdropFilter: 'var(--glass-blur)', WebkitBackdropFilter: 'var(--glass-blur)', border: '1px solid var(--glass-border)' }}>
                  <div className="flex items-center gap-3 mb-1">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--bg-info)' }}>
                      <i className="bi bi-person-badge text-sm" style={{ color: 'var(--info)' }} />
                    </div>
                    <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Personal Information</h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="sm:col-span-2">
                      <Input label="Full Name" value={form.full_name} onChange={v => setForm(f => ({ ...f, full_name: v }))} required error={errors.full_name} maxLength={100} placeholder="Enter member name" />
                    </div>
                    <Input label="Phone" value={form.phone} onChange={v => setForm(f => ({ ...f, phone: v }))} maxLength={20} placeholder="+20 100 000 0000" />
                    <Input label="Age" value={form.age} onChange={v => setForm(f => ({ ...f, age: v }))} type="number" required error={errors.age} min={1} max={150} placeholder="25" />

                    <div>
                      <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Gender</label>
                      <div className="flex gap-3">
                        {(['male', 'female'] as const).map(g => (
                          <button
                            key={g}
                            type="button"
                            onClick={() => setForm(f => ({ ...f, gender: g }))}
                            className="flex-1 flex items-center justify-center gap-2 rounded-xl text-sm font-medium transition-all duration-200"
                            style={{
                              height: 52,
                              background: form.gender === g ? 'var(--primary-light)' : 'var(--bg-input)',
                              border: `1px solid ${form.gender === g ? 'var(--primary)' : 'var(--border)'}`,
                              color: form.gender === g ? 'var(--primary)' : 'var(--text-secondary)',
                            }}
                          >
                            <i className={`bi ${g === 'male' ? 'bi-gender-male' : 'bi-gender-female'} text-lg`} />
                            {g === 'male' ? 'Male' : 'Female'}
                          </button>
                        ))}
                      </div>
                    </div>

                    <Input label="Weight (kg)" value={form.weight} onChange={v => setForm(f => ({ ...f, weight: v }))} type="number" placeholder="75" />
                    <Input label="Height (cm)" value={form.height} onChange={v => setForm(f => ({ ...f, height: v }))} type="number" placeholder="175" />

                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Notes</label>
                      <textarea
                        value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} maxLength={500}
                        className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all duration-200 resize-none"
                        style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                        placeholder="Additional notes..."
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Membership */}
              {currentStep === 2 && (
                <div className="rounded-2xl p-6 space-y-5" style={{ background: 'var(--glass-bg)', backdropFilter: 'var(--glass-blur)', WebkitBackdropFilter: 'var(--glass-blur)', border: '1px solid var(--glass-border)' }}>
                  <div className="flex items-center gap-3 mb-1">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--bg-info)' }}>
                      <i className="bi bi-boxes text-sm" style={{ color: 'var(--info)' }} />
                    </div>
                    <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Membership</h3>
                  </div>

                  {plans.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 rounded-xl" style={{ background: 'var(--bg)' }}>
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3" style={{ background: 'var(--bg-warning)' }}>
                        <i className="bi bi-boxes text-xl" style={{ color: 'var(--warning)' }} />
                      </div>
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>No plans available</p>
                      <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Ask your admin to create a plan first.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {plans.map(p => {
                        const active = form.plan_id === p.id
                        return (
                          <motion.button
                            key={p.id}
                            type="button"
                            onClick={() => setForm(f => ({ ...f, plan_id: p.id }))}
                            className="relative text-left rounded-xl p-5 transition-all duration-200"
                            whileHover={{ y: -2, transition: { duration: 0.15 } }}
                            whileTap={{ scale: 0.98 }}
                            style={{
                              background: active ? 'var(--primary-light)' : 'var(--bg-input)',
                              border: `1px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
                              boxShadow: active ? '0 0 0 2px rgba(79,124,255,0.2)' : 'none',
                            }}
                          >
                            {active && (
                              <div className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'var(--primary)' }}>
                                <i className="bi bi-check text-white text-xs" />
                              </div>
                            )}
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>{p.name}</p>
                                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{p.duration_days} days</p>
                              </div>
                              <p className="text-xl font-bold" style={{ color: active ? 'var(--primary)' : 'var(--text-primary)' }}>
                                EGP {p.price}
                              </p>
                            </div>
                            {p.description && (
                              <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>{p.description}</p>
                            )}
                            {p.color && (
                              <div className="mt-3 flex gap-1">
                                <span className="w-6 h-1.5 rounded-full" style={{ background: p.color }} />
                              </div>
                            )}
                          </motion.button>
                        )
                      })}
                    </div>
                  )}
                  {errors.plan_id && <p className="text-xs" style={{ color: 'var(--danger)' }}>{errors.plan_id}</p>}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <Input label="Start Date" value={form.start_date} onChange={v => setForm(f => ({ ...f, start_date: v }))} type="date" required error={errors.start_date} />
                  </div>

                  {selectedPlan && endDate && (
                    <div className="p-4 rounded-xl" style={{ background: 'var(--bg-info)' }}>
                      <p className="text-xs font-medium" style={{ color: 'var(--info)' }}>Membership Period</p>
                      <p className="text-sm mt-1" style={{ color: 'var(--text-primary)' }}>
                        {formatDate(form.start_date, lang)} → {formatDate(endDate, lang)}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Step 3: Extra Services */}
              {currentStep === 3 && (
                <div className="rounded-2xl p-6 space-y-5" style={{ background: 'var(--glass-bg)', backdropFilter: 'var(--glass-blur)', WebkitBackdropFilter: 'var(--glass-blur)', border: '1px solid var(--glass-border)' }}>
                  <div className="flex items-center gap-3 mb-1">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--bg-info)' }}>
                      <i className="bi bi-gear text-sm" style={{ color: 'var(--info)' }} />
                    </div>
                    <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Extra Services</h3>
                  </div>

                  {services.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 rounded-xl" style={{ background: 'var(--bg)' }}>
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3" style={{ background: 'var(--bg-info)' }}>
                        <i className="bi bi-gear text-xl" style={{ color: 'var(--info)' }} />
                      </div>
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>No extra services available</p>
                      <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>You can skip this step — services are optional.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {services.map(s => {
                        const active = selectedServices.includes(s.id)
                        return (
                          <motion.button
                            key={s.id}
                            type="button"
                            onClick={() => toggleService(s.id)}
                            className="relative text-left rounded-xl p-4 transition-all duration-200"
                            whileHover={{ y: -2, transition: { duration: 0.15 } }}
                            whileTap={{ scale: 0.98 }}
                            style={{
                              background: active ? 'var(--primary-light)' : 'var(--bg-input)',
                              border: `1px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
                              boxShadow: active ? '0 0 0 2px rgba(79,124,255,0.2)' : 'none',
                            }}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className="w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200"
                                style={{ background: active ? 'var(--primary)' : 'var(--bg-info)' }}
                              >
                                <i className={`bi ${active ? 'bi-check-lg text-white' : 'bi-plus-lg'} text-sm`} style={{ color: active ? '#fff' : 'var(--info)' }} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{s.name}</p>
                                {s.description && <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>{s.description}</p>}
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-sm font-semibold" style={{ color: active ? 'var(--primary)' : 'var(--text-primary)' }}>
                                  EGP {s.price}
                                </p>
                              </div>
                            </div>
                          </motion.button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Step 4: Review */}
              {currentStep === 4 && (
                <div className="rounded-2xl p-6 space-y-5" style={{ background: 'var(--glass-bg)', backdropFilter: 'var(--glass-blur)', WebkitBackdropFilter: 'var(--glass-blur)', border: '1px solid var(--glass-border)' }}>
                  <div className="flex items-center gap-3 mb-1">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--bg-success)' }}>
                      <i className="bi bi-check-circle text-sm" style={{ color: 'var(--success)' }} />
                    </div>
                    <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Review & Confirm</h3>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-4 p-4 rounded-xl" style={{ background: 'var(--bg-hover)' }}>
                      <div
                        className="w-14 h-14 rounded-xl flex items-center justify-center text-white text-xl font-bold shrink-0"
                        style={{ background: 'var(--gradient-1)' }}
                      >
                        {form.full_name?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>{form.full_name || 'Unnamed Member'}</p>
                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                          {form.phone || 'No phone'} • {form.age || '?'} yrs
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-3 rounded-xl" style={{ background: 'var(--bg-hover)' }}>
                        <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Plan</p>
                        <p className="text-sm font-semibold mt-0.5" style={{ color: 'var(--text-primary)' }}>{selectedPlan?.name || 'Not selected'}</p>
                      </div>
                      <div className="p-3 rounded-xl" style={{ background: 'var(--bg-hover)' }}>
                        <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Duration</p>
                        <p className="text-sm font-semibold mt-0.5" style={{ color: 'var(--text-primary)' }}>
                          {form.start_date} → {endDate || '—'}
                        </p>
                      </div>
                    </div>

                    {selectedServices.length > 0 && (
                      <div className="p-4 rounded-xl" style={{ background: 'var(--bg-hover)' }}>
                        <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>Extra Services</p>
                        <div className="flex flex-wrap gap-2">
                          {services.filter(s => selectedServices.includes(s.id)).map(s => (
                            <span key={s.id} className="badge" style={{ background: 'var(--bg-info)', color: 'var(--info)' }}>
                              {s.name} (EGP {s.price})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* ── Step Navigation (mobile) ── */}
          <div className="flex items-center justify-between gap-3 lg:hidden">
            <div className="flex gap-2">
              <Button variant="ghost" className="h-11 font-medium px-5" onPress={resetForm}>
                <i className="bi bi-arrow-counterclockwise" /> Reset
              </Button>
            </div>
            <div className="flex gap-2">
              {currentStep > 1 && (
                <Button variant="ghost" className="h-11 font-medium px-5" onPress={prevStep}>
                  <i className="bi bi-chevron-left" /> Back
                </Button>
              )}
              {currentStep < 4 ? (
                <Button variant="primary" className="h-11 font-medium px-5" onPress={nextStep}>
                  Next <i className="bi bi-chevron-right" />
                </Button>
              ) : (
                <Button variant="primary" className="h-11 font-medium px-5" isPending={saving} onPress={handleSubmit}>
                  <i className="bi bi-person-plus" /> {t('addMember.save')}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* ── Live Summary Card ── */}
        <div className="lg:w-[340px] xl:w-[380px] shrink-0">
          <div className="lg:sticky lg:top-24 space-y-6">
            <div className="rounded-2xl p-6 space-y-5" style={{ background: 'var(--glass-bg)', backdropFilter: 'var(--glass-blur)', WebkitBackdropFilter: 'var(--glass-blur)', border: '1px solid var(--glass-border)' }}>
              <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <i className="bi bi-receipt" /> Summary
              </h3>

                <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--bg-hover)' }}>
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-bold shrink-0" style={{ background: 'var(--gradient-1)' }}>
                    {form.full_name?.[0]?.toUpperCase() || <i className="bi bi-person text-white" />}
                  </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{form.full_name || 'New Member'}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{form.gender === 'male' ? 'Male' : 'Female'}{form.age ? `, ${form.age} yrs` : ''}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span style={{ color: 'var(--text-muted)' }}>Plan</span>
                  <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{selectedPlan?.name || '—'}</span>
                </div>
                {endDate && (
                  <div className="flex justify-between text-sm">
                    <span style={{ color: 'var(--text-muted)' }}>End Date</span>
                    <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{formatDate(endDate, lang)}</span>
                  </div>
                )}
                {selectedServices.length > 0 && (
                  <div className="flex justify-between text-sm">
                    <span style={{ color: 'var(--text-muted)' }}>Extras</span>
                    <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{selectedServices.length}</span>
                  </div>
                )}
              </div>

              <div className="border-t pt-4 space-y-2" style={{ borderColor: 'var(--border)' }}>
                <div className="flex justify-between text-sm">
                  <span style={{ color: 'var(--text-muted)' }}>Plan Price</span>
                  <span style={{ color: 'var(--text-primary)' }}>EGP {selectedPlan?.price || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span style={{ color: 'var(--text-muted)' }}>Extras Total</span>
                  <span style={{ color: 'var(--text-primary)' }}>EGP {servicesTotal}</span>
                </div>
                <div className="border-t pt-2 flex justify-between" style={{ borderColor: 'var(--border)' }}>
                  <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>Total</span>
                  <motion.span
                    key={total}
                    initial={{ scale: 1.15, color: '#4F7CFF' }}
                    animate={{ scale: 1, color: 'var(--primary)' }}
                    transition={{ duration: 0.25 }}
                    className="text-lg font-bold"
                    style={{ color: 'var(--primary)' }}
                  >
                    EGP {total}
                  </motion.span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Sticky Bottom Bar (Desktop) ── */}
      <div className="hidden lg:block sticky bottom-0 z-10 pt-2 pb-0 -mx-6 px-6 lg:-mx-8 lg:px-8" style={{ background: 'linear-gradient(to top, var(--bg-body) 60%, transparent)' }}>
        <div className="rounded-2xl p-4 flex items-center justify-between" style={{ background: 'var(--glass-bg)', backdropFilter: 'var(--glass-blur-strong)', WebkitBackdropFilter: 'var(--glass-blur-strong)', border: '1px solid var(--glass-border)' }}>
          <div className="flex items-center gap-2">
            <Link to="/members">
              <Button variant="ghost" className="h-11 font-medium px-5">
                <i className={`bi ${isRtl ? 'bi-arrow-left' : 'bi-arrow-right'}`} /> Cancel
              </Button>
            </Link>
            <Button variant="ghost" className="h-11 font-medium px-5" onPress={resetForm}>
              <i className="bi bi-arrow-counterclockwise" /> Reset
            </Button>
          </div>
          <div className="flex items-center gap-3">
            {currentStep > 1 && (
              <Button variant="ghost" className="h-11 font-medium px-5" onPress={prevStep}>
                <i className="bi bi-chevron-left" /> Back
              </Button>
            )}
            {currentStep < 4 ? (
              <Button variant="primary" className="h-11 font-medium px-6" onPress={nextStep}>
                Continue <i className="bi bi-chevron-right" />
              </Button>
            ) : (
              <Button variant="primary" className="h-11 font-medium px-6" isPending={saving} onPress={handleSubmit}>
                <i className="bi bi-person-plus" /> {t('addMember.save')}
              </Button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
