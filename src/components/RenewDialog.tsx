import { useState, type FormEvent } from 'react'
import { Button } from '@heroui/react'
import { supabase } from '../lib/supabase'
import { useToast } from '../contexts/ToastContext'
import { formatCurrency } from '../lib/utils'
import Dialog from './Dialog'
import type { Plan, Service } from '../types'

interface RenewDialogProps {
  open: boolean
  onClose: () => void
  memberId: string
  memberName: string
  plans: Plan[]
  services: Service[]
}

export default function RenewDialog({ open, onClose, memberId, memberName, plans, services }: RenewDialogProps) {
  const { toast } = useToast()
  const [planId, setPlanId] = useState('')
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedServices, setSelectedServices] = useState<string[]>([])
  const [renewing, setRenewing] = useState(false)

  const selectedPlan = plans.find(p => p.id === planId)
  const servicesTotal = services.filter(s => selectedServices.includes(s.id)).reduce((sum, s) => sum + s.price, 0)
  const total = (selectedPlan?.price || 0) + servicesTotal

  function toggleService(id: string) {
    setSelectedServices(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!planId) return
    setRenewing(true)
    try {
      const endDate = new Date(startDate)
      endDate.setDate(endDate.getDate() + (selectedPlan?.duration_days || 30))

      const { data: sub, error: subErr } = await supabase.from('subscriptions').insert({
        member_id: memberId, plan_id: planId, start_date: startDate,
        end_date: endDate.toISOString().split('T')[0],
        plan_price: selectedPlan?.price || 0,
        services_price: servicesTotal, total_price: total, status: 'active',
      }).select().single()
      if (subErr) throw subErr

      if (selectedServices.length > 0) {
        const { error: saErr } = await supabase.from('service_assignments').insert(
          selectedServices.map(sId => ({
            subscription_id: sub.id, service_id: sId,
            price: services.find(s => s.id === sId)?.price || 0,
          }))
        )
        if (saErr) throw saErr
      }

      const { error: payErr } = await supabase.from('payments').insert({
        member_id: memberId, subscription_id: sub.id, amount: total,
        payment_type: 'renewal', payment_method: 'cash', notes: 'Renewal payment',
      })
      if (payErr) throw payErr

      toast('Subscription renewed', 'success')
      onClose()
      window.location.reload()
    } catch (err: any) {
      toast(err?.message || 'Renewal failed', 'error')
    } finally {
      setRenewing(false)
    }
  }

  function handleClose() {
    if (!renewing) {
      setPlanId('')
      setSelectedServices([])
      setStartDate(new Date().toISOString().split('T')[0])
      onClose()
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} size="lg" className="flex flex-col">
      <form onSubmit={handleSubmit} className="flex flex-col max-h-[90vh]">
        <div className="px-6 pt-6 pb-4 border-b border-[var(--border)] shrink-0">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            Renew Subscription
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            {memberName} — Select a plan to renew.
          </p>
        </div>

        <div className="px-6 py-5 overflow-y-auto space-y-5" style={{ flex: '1 1 auto' }}>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
              Plan <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <select
              value={planId}
              onChange={e => setPlanId(e.target.value)}
              className="form-input"
              style={{ height: 48 }}
            >
              <option value="">Select plan</option>
              {plans.map(p => (
                <option key={p.id} value={p.id}>{p.name} — {formatCurrency(p.price)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="form-input"
              style={{ height: 48 }}
            />
          </div>

          {services.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                Extra Services
              </label>
              <div className="grid grid-cols-1 gap-2">
                {services.map(s => {
                  const active = selectedServices.includes(s.id)
                  return (
                    <label
                      key={s.id}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl border text-sm cursor-pointer transition-all"
                      style={{
                        borderColor: active ? 'var(--primary)' : 'var(--border)',
                        background: active ? 'var(--primary-light)' : 'var(--bg-input)',
                      }}
                      onMouseEnter={e => {
                        if (!active) e.currentTarget.style.borderColor = 'var(--primary)'
                      }}
                      onMouseLeave={e => {
                        if (!active) e.currentTarget.style.borderColor = 'var(--border)'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={active}
                        onChange={() => toggleService(s.id)}
                        className="accent-[var(--primary)]"
                      />
                      <span style={{ color: 'var(--text-primary)' }}>{s.name}</span>
                      <span className="mr-auto text-xs" style={{ color: 'var(--text-muted)' }}>
                        {formatCurrency(s.price)}
                      </span>
                    </label>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        <div className="shrink-0">
          <div className="mx-6 py-4 border-t border-[var(--border)]">
            <div className="flex items-center justify-between px-4 py-3 rounded-xl" style={{ background: 'var(--bg-input)' }}>
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Total</span>
              <span className="text-lg font-bold" style={{ color: 'var(--primary)' }}>
                {formatCurrency(total)}
              </span>
            </div>
          </div>

          <div className="px-6 pb-6 flex items-center justify-end gap-3">
            <Button
              variant="ghost"
              className="h-11 font-medium px-5"
              onPress={handleClose}
              isDisabled={renewing}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              className="h-11 font-medium px-5"
              type="submit"
              isDisabled={!planId}
              isPending={renewing}
            >
              <i className="bi bi-check-lg" /> Renew
            </Button>
          </div>
        </div>
      </form>
    </Dialog>
  )
}
