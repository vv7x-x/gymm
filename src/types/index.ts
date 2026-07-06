export interface Member {
  id: string
  member_id: string
  full_name: string
  age: number | null
  phone: string | null
  weight: number | null
  height: number | null
  gender: string | null
  notes: string | null
  photo_url: string | null
  branch_id: string | null
  created_at: string
  end_date?: string | null
  subscriptions?: Subscription[]
}

export interface Plan {
  id: string
  name: string
  duration_days: number
  price: number
  description: string | null
  color: string | null
  is_active: boolean
  branch_id: string | null
}

export interface Service {
  id: string
  name: string
  price: number
  description: string | null
  is_active: boolean
  branch_id: string | null
}

export interface Subscription {
  id: string
  member_id: string
  plan_id: string
  start_date: string
  end_date: string
  plan_price: number
  services_price: number
  total_price: number
  status: 'active' | 'expiring_soon' | 'expired' | 'frozen'
  branch_id: string | null
  plans?: Plan
  service_assignments?: ServiceAssignment[]
}

export interface ServiceAssignment {
  id: string
  subscription_id: string
  service_id: string
  price: number
  services?: Service
}

export interface Payment {
  id: string
  member_id: string
  subscription_id: string | null
  amount: number
  payment_type: 'subscription' | 'service' | 'renewal' | 'expense' | 'other'
  payment_method: string | null
  notes: string | null
  branch_id: string | null
  paid_at: string
  members?: { full_name: string }
}

export interface Expense {
  id: string
  category_id: string
  amount: number
  description: string | null
  expense_date: string
  payment_method: string | null
  branch_id: string | null
  expense_categories?: { name: string; color: string }
}

export interface ExpenseCategory {
  id: string
  name: string
  description: string | null
  color: string | null
  is_active: boolean
}

export interface Branch {
  id: string
  name: string
  address: string | null
  phone: string | null
  is_active: boolean
}

export interface Settings {
  id: string
  gym_name: string
  gym_logo: string | null
  gym_phone: string | null
  gym_address: string | null
  currency: string
  theme: string
  freeze_fee: number
  freeze_max_days: number
  freeze_fee_enabled: boolean
}

export interface FreezeLog {
  id: string
  subscription_id: string
  frozen_at: string
  unfrozen_at: string | null
  reason: string | null
  frozen_days: number | null
  fee_paid: number | null
  auto_unfreeze_date: string | null
  subscriptions?: Subscription & { members?: Member }
}

export type SubscriptionStatus = 'active' | 'expiring_soon' | 'expired'
