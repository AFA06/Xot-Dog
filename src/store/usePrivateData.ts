import { useEffect } from 'react'
import { useApp } from './appStore'
import { useSession } from './sessionStore'

/** Loads catalog/staff for the current session; returns load state for <LoadGate>. */
export function usePrivateData() {
  const token = useSession((s) => s.token)
  const status = useApp((s) => s.privateStatus)
  const error = useApp((s) => s.privateError)
  const ensure = useApp((s) => s.ensurePrivate)
  useEffect(() => {
    void ensure()
  }, [ensure, token])
  const retry = () => {
    useApp.setState({ privateStatus: 'idle', privateKey: null })
    void ensure()
  }
  return { status, error, retry }
}
