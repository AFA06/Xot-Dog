import { describe, expect, it, beforeAll } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import App from '@/App'
import { useSession } from '@/store/sessionStore'

beforeAll(() => {
  // jsdom lacks these; Radix + Recharts expect them
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
  Element.prototype.scrollIntoView ??= () => {}
  Element.prototype.hasPointerCapture ??= () => false
})

describe('cashier flow (UI)', () => {
  it('adds products, pays by cash with change, shows non-fiscal ticket and simulates print', async () => {
    localStorage.clear()
    useSession.setState({ locale: 'uz', posBranchId: 'chilonzor', posCashierId: 'st-c1' })
    window.history.pushState({}, '', '/pos')
    render(<App />)

    // Drinks without modifiers go straight to the cart
    fireEvent.click(await screen.findByRole('button', { name: /Ichimliklar/ }))
    fireEvent.click(screen.getByRole('button', { name: /Ayron/ }))
    fireEvent.click(screen.getByRole('button', { name: /Ayron/ }))

    // Hot dog opens modifier dialog with required spice preselected
    fireEvent.click(screen.getByRole('button', { name: /Hot-doglar/ }))
    fireEvent.click(screen.getByRole('button', { name: /Klassik hot-dog/ }))
    const modDialog = await screen.findByRole('dialog')
    fireEvent.click(within(modDialog).getByRole('button', { name: /Pishloq\b/ }))
    fireEvent.click(within(modDialog).getByRole('button', { name: /Qo'shish/ }))

    // 2×8 000 + 18 000 + 4 000 = 38 000
    const cart = screen.getByText('Buyurtma').closest('aside')!
    expect(within(cart).getByText(/38\s000\sso'm/)).toBeInTheDocument()

    fireEvent.click(within(cart).getByRole('button', { name: 'Buyurtmani tasdiqlash' }))
    const pay = await screen.findByRole('dialog')
    fireEvent.click(within(pay).getByRole('button', { name: /^50\s000$/ }))
    expect(within(pay).getByText(/12\s000\sso'm/)).toBeInTheDocument()
    fireEvent.click(within(pay).getByRole('button', { name: 'Buyurtmani tasdiqlash' }))

    const ticket = await screen.findByText(/FISKAL CHEK EMAS/)
    expect(ticket).toBeInTheDocument()
    expect(screen.getByText(/DEMO — HAQIQIY CHEK EMAS/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Chop etish \(simulyatsiya\)/ }))
    expect(await screen.findByText(/NUSXA/)).toBeInTheDocument()
  })
})
