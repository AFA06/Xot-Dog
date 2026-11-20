import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/common/Toaster'
import { useApp } from '@/store/appStore'
import { useSession } from '@/store/sessionStore'
import { LauncherPage } from '@/features/launcher/LauncherPage'
import { CashierPage } from '@/features/cashier/CashierPage'
import { AdminLayout } from '@/features/admin/AdminLayout'
import { OrdersPage } from '@/features/admin/orders/OrdersPage'
import { ProductsPage } from '@/features/admin/products/ProductsPage'
import { StaffPage } from '@/features/admin/staff/StaffPage'

const DashboardPage = lazy(() => import('@/features/admin/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })))

const Spinner = () => (
  <div className="grid h-full min-h-40 place-items-center text-muted-foreground">
    <Loader2 className="size-8 animate-spin" />
  </div>
)

export default function App() {
  const status = useApp((s) => s.status)
  const error = useApp((s) => s.error)
  const init = useApp((s) => s.init)
  const locale = useSession((s) => s.locale)

  useEffect(() => {
    void init()
  }, [init])

  useEffect(() => {
    document.documentElement.lang = locale === 'uz' ? 'uz-Latn' : 'ru'
  }, [locale])

  if (status === 'error') {
    return <div className="grid h-full place-items-center p-6 text-destructive">Error: {error}</div>
  }
  if (status !== 'ready') {
    return (
      <div className="grid h-full place-items-center text-muted-foreground">
        <Loader2 className="size-8 animate-spin" />
      </div>
    )
  }

  return (
    <TooltipProvider delayDuration={300}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LauncherPage />} />
          <Route path="/pos" element={<CashierPage />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Suspense fallback={<Spinner />}><DashboardPage /></Suspense>} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="products" element={<ProductsPage />} />
            <Route path="staff" element={<StaffPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster />
    </TooltipProvider>
  )
}
