/**
 * ⚠️ FICTIONAL DEMO STAFF — invented names, fake phone numbers, demo PINs.
 */
import type { Staff } from '@/domain/types'

export const DEMO_STAFF: Staff[] = [
  { id: 'st-owner', name: 'Demo Egasi', role: 'owner', branchId: null, pin: '0000', active: true, phone: '+998 00 000-10-00' },
  { id: 'st-mgr-c', name: 'Kamola (demo)', role: 'manager', branchId: 'chilonzor', pin: '9999', active: true, phone: '+998 00 000-11-01' },
  { id: 'st-c1', name: 'Aziz (demo)', role: 'cashier', branchId: 'chilonzor', pin: '1111', active: true, phone: '+998 00 000-11-02' },
  { id: 'st-c2', name: 'Nilufar (demo)', role: 'cashier', branchId: 'chilonzor', pin: '2222', active: true, phone: '+998 00 000-11-03' },
  { id: 'st-mgr-y', name: 'Rustam (demo)', role: 'manager', branchId: 'yunusobod', pin: '8888', active: true, phone: '+998 00 000-12-01' },
  { id: 'st-y1', name: 'Malika (demo)', role: 'cashier', branchId: 'yunusobod', pin: '3333', active: true, phone: '+998 00 000-12-02' },
  { id: 'st-y2', name: 'Jasur (demo)', role: 'cashier', branchId: 'yunusobod', pin: '4444', active: true, phone: '+998 00 000-12-03' },
]
