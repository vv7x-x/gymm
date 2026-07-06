import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Button } from '@heroui/react'
import { supabase } from '../lib/supabase'
import { useI18n } from '../contexts/I18nContext'
import { generateMemberId, uploadPhoto, pick } from '../lib/utils'
import type { Plan, Service } from '../types'

export default function AddMember() {
  const { t, dir } = useI18n()
  const isRtl = dir === 'rtl'
  const navigate = useNavigate()
  const [plans, setPlans] = useState<Plan[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [form, setForm] = useState({
    full_name: '', age: '', phone: '', gender: 'male', weight: '', height: '', notes: '',
    plan_id: '', start_date: new Date().toISOString().split('T')[0],
  })
  const [selectedServices, setSelectedServices] = useState<string[]>([])
  const [photo, setPhoto] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const photoUrl = photo ? await uploadPhoto(photo) : null
      const memberId = generateMemberId()
      const { data: member } = await supabase.from('members').insert(pick({
        member_id: memberId, full_name: form.full_name, age: form.age ? +form.age : null,
        phone: form.phone, gender: form.gender, weight: form.weight ? +form.weight : null,
        height: form.height ? +form.height : null, notes: form.notes, photo_url: photoUrl,
      }, ['member_id', 'full_name', 'age', 'phone', 'gender', 'weight', 'height', 'notes', 'photo_url'])).select().single()

      if (member && form.plan_id) {
        const endDate = new Date(form.start_date)
        endDate.setDate(endDate.getDate() + (selectedPlan?.duration_days || 30))
        const { data: sub, error: subErr } = await supabase.from('subscriptions').insert(pick({
          member_id: member.id, plan_id: form.plan_id, start_date: form.start_date,
          end_date: endDate.toISOString().split('T')[0], plan_price: selectedPlan?.price || 0,
          services_price: servicesTotal, total_price: total, status: 'active',
        }, ['member_id', 'plan_id', 'start_date', 'end_date', 'plan_price', 'services_price', 'total_price', 'status'])).select().single()

        if (subErr || !sub) {
          await supabase.from('members').delete().eq('id', member.id)
          throw subErr || new Error('subscription insert failed')
        }

        if (selectedServices.length > 0) {
          const { error: saErr } = await supabase.from('service_assignments').insert(
            selectedServices.map(sId => ({
              subscription_id: sub.id, service_id: sId,
              price: services.find(s => s.id === sId)?.price || 0,
            }))
          )
          if (saErr) {
            await supabase.from('subscriptions').delete().eq('id', sub.id)
            await supabase.from('members').delete().eq('id', member.id)
            throw saErr
          }
        }

        const { error: payErr } = await supabase.from('payments').insert({
          member_id: member.id, subscription_id: sub.id, amount: total,
          payment_type: 'subscription', payment_method: 'cash', notes: 'Initial payment',
        })
        if (payErr) {
          await supabase.from('subscriptions').delete().eq('id', sub.id)
          await supabase.from('members').delete().eq('id', member.id)
          throw payErr
        }
      }
      navigate('/members')
    } catch {
    } finally {
      setSaving(false)
    }
  }

  const toggleService = (id: string) => {
    setSelectedServices(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    )
  }

  return (
    <div className="p-8 space-y-6 animate-fade-up">
      <div className="flex items-center gap-3">
        <Link to="/members"><Button variant="ghost" isIconOnly><i className={`bi ${isRtl ? 'bi-arrow-left' : 'bi-arrow-right'} text-lg`} /></Button></Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>{t('addMember.title')}</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t('addMember.subtitle')}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="rounded-2xl border p-6 space-y-6" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
          <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{t('addMember.personalInfo')}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>{t('addMember.name')}</label>
              <input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} required maxLength={100}
                className="w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                style={{ background: 'var(--bg)', color: 'var(--text-primary)', borderColor: 'var(--border)' }} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>{t('addMember.age')}</label>
              <input type="number" value={form.age} onChange={e => setForm(f => ({ ...f, age: e.target.value }))} min={1} max={150}
                className="w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                style={{ background: 'var(--bg)', color: 'var(--text-primary)', borderColor: 'var(--border)' }} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>{t('addMember.phone')}</label>
              <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} maxLength={20}
                className="w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                style={{ background: 'var(--bg)', color: 'var(--text-primary)', borderColor: 'var(--border)' }} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>{t('addMember.gender')}</label>
              <select value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                style={{ background: 'var(--bg)', color: 'var(--text-primary)', borderColor: 'var(--border)' }}>
                <option value="male">{t('addMember.male')}</option>
                <option value="female">{t('addMember.female')}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>{t('addMember.weight')}</label>
              <input type="number" value={form.weight} onChange={e => setForm(f => ({ ...f, weight: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                style={{ background: 'var(--bg)', color: 'var(--text-primary)', borderColor: 'var(--border)' }} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>{t('addMember.height')}</label>
              <input type="number" value={form.height} onChange={e => setForm(f => ({ ...f, height: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                style={{ background: 'var(--bg)', color: 'var(--text-primary)', borderColor: 'var(--border)' }} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>{t('addMember.notes')}</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} maxLength={500}
                className="w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all resize-none"
                style={{ background: 'var(--bg)', color: 'var(--text-primary)', borderColor: 'var(--border)' }} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>{t('addMember.photo')}</label>
              <input type="file" accept="image/*" onChange={e => setPhoto(e.target.files?.[0] || null)}
                className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:text-white"
                style={{ color: 'var(--text-primary)', '--file-bg': 'var(--primary)' } as React.CSSProperties} />
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{t('addMember.photoHint')}</p>
            </div>
          </div>

          <div className="border-t pt-6" style={{ borderColor: 'var(--border)' }}>
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>{t('addMember.membership')}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>{t('addMember.plan')}</label>
                <select value={form.plan_id} onChange={e => setForm(f => ({ ...f, plan_id: e.target.value }))} required
                  className="w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                  style={{ background: 'var(--bg)', color: 'var(--text-primary)', borderColor: 'var(--border)' }}>
                  <option value="">{t('addMember.selectPlan')}</option>
                  {plans.map(p => <option key={p.id} value={p.id}>{p.name} - EGP {p.price}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>{t('addMember.startDate')}</label>
                <input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} required
                  className="w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                  style={{ background: 'var(--bg)', color: 'var(--text-primary)', borderColor: 'var(--border)' }} />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>{t('addMember.extraServices')}</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {services.map(s => (
                  <label key={s.id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl border text-sm cursor-pointer transition-all"
                    style={{
                      borderColor: selectedServices.includes(s.id) ? 'var(--primary)' : 'var(--border)',
                      background: selectedServices.includes(s.id) ? 'var(--primary-light)' : 'var(--bg)',
                    }}>
                    <input type="checkbox" checked={selectedServices.includes(s.id)} onChange={() => toggleService(s.id)}
                      className="accent-[var(--primary)]" />
                    <span style={{ color: 'var(--text-primary)' }}>{s.name}</span>
                    <span className="mr-auto text-xs" style={{ color: 'var(--text-muted)' }}>EGP {s.price}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="mt-4 p-4 rounded-xl flex justify-between items-center" style={{ background: 'var(--bg)' }}>
              <div className="text-sm space-y-0.5">
                <p style={{ color: 'var(--text-muted)' }}>{t('addMember.planPrice')}: EGP {selectedPlan?.price || 0}</p>
                <p style={{ color: 'var(--text-muted)' }}>{t('addMember.servicesTotal')}: EGP {servicesTotal}</p>
              </div>
              <p className="text-2xl font-bold" style={{ color: 'var(--primary)' }}>EGP {total}</p>
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
            <Button type="submit" variant="primary" size="lg" isPending={saving}>
              {t('addMember.save')}
            </Button>
            <Link to="/members"><Button variant="tertiary" size="lg">{t('common.cancel')}</Button></Link>
          </div>
        </div>
      </form>
    </div>
  )
}
