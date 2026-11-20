import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { LoadGate } from '@/components/common/LoadGate'
import type { Order, Product } from '@/domain/types'
import { presetRange } from '@/lib/dates'
import { dataSource } from '@/services'
import { useApp } from '@/store/appStore'
import { currentToken, useSession } from '@/store/sessionStore'
import { usePrivateData } from '@/store/usePrivateData'
import { PosHeader } from './PosHeader'
import { CategoryRail } from './CategoryRail'
import { ProductGrid } from './ProductGrid'
import { CartPanel } from './CartPanel'
import { ModifierDialog } from './ModifierDialog'
import { PaymentDialog } from './PaymentDialog'
import { TicketDialog } from './TicketDialog'
import { HistorySheet } from './HistorySheet'
import { usePos } from './posStore'

export function CashierPage() {
  const branchId = useSession((s) => s.posBranchId)
  const cashierId = useSession((s) => s.posCashierId)
  const signedIn = !!branchId && !!cashierId && (!dataSource.requiresAuth || !!currentToken())
  const data = usePrivateData()
  if (!signedIn) return <Navigate to="/" replace />
  return (
    <div className="h-dvh">
      <LoadGate {...data} onRetry={data.retry}>
        <CashierScreen branchId={branchId} cashierId={cashierId} />
      </LoadGate>
    </div>
  )
}

function CashierScreen({ branchId, cashierId }: { branchId: string; cashierId: string }) {
  const branches = useApp((s) => s.branches)
  const staff = useApp((s) => s.staff)
  const catalog = useApp((s) => s.catalog)
  const add = usePos((s) => s.add)
  const loadOrders = useApp((s) => s.loadOrders)

  const [modProduct, setModProduct] = useState<Product | null>(null)
  const [paying, setPaying] = useState(false)
  const [ticketOrderId, setTicketOrderId] = useState<string | null>(null)
  const [ticketIsNew, setTicketIsNew] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)

  const branch = branches.find((b) => b.id === branchId)
  const cashier = staff.find((s) => s.id === cashierId)

  const products = useMemo(
    () => catalog.products.filter((p) => p.active && branch && p.branchIds.includes(branch.id)),
    [catalog.products, branch],
  )

  // Today's orders for this branch (history sheet), refreshed whenever it is opened.
  const loadToday = useCallback(() => {
    const r = presetRange('today')
    void loadOrders({ branchIds: [branchId], from: r.from, to: r.to }).catch(() => {})
  }, [branchId, loadOrders])
  useEffect(() => {
    if (historyOpen) loadToday()
  }, [historyOpen, loadToday])
  useEffect(loadToday, [loadToday])

  if (!branch || !cashier) return <Navigate to="/" replace />

  const onProduct = (p: Product) => {
    if (p.modifierGroupIds.length) setModProduct(p)
    else add(p)
  }

  const onOrderCreated = (o: Order) => {
    setPaying(false)
    setTicketIsNew(true)
    setTicketOrderId(o.id)
  }

  return (
    <div className="pos-root flex h-dvh flex-col overflow-hidden bg-background select-none">
      <PosHeader branch={branch} cashier={cashier} onHistory={() => setHistoryOpen(true)} />
      <div className="flex min-h-0 flex-1">
        <CategoryRail categories={catalog.categories} products={products} />
        <ProductGrid products={products} onSelect={onProduct} />
        <CartPanel onCheckout={() => setPaying(true)} />
      </div>

      <ModifierDialog product={modProduct} groups={catalog.modifierGroups} onClose={() => setModProduct(null)} />
      <PaymentDialog
        open={paying}
        onClose={() => setPaying(false)}
        branchId={branch.id}
        cashierId={cashier.id}
        onCreated={onOrderCreated}
      />
      <TicketDialog
        orderId={ticketOrderId}
        isNew={ticketIsNew}
        onClose={() => {
          setTicketOrderId(null)
          setTicketIsNew(false)
        }}
      />
      <HistorySheet
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        branchId={branch.id}
        onOpenOrder={(id) => {
          setTicketIsNew(false)
          setTicketOrderId(id)
        }}
      />
    </div>
  )
}
