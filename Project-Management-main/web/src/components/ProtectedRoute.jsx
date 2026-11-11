import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { ChangePasswordPage } from '../pages/ChangePasswordPage'

export function ProtectedRoute() {
  const { session, profile, loading } = useAuth()
  const isEmbedded = typeof window !== 'undefined' && window.self !== window.top

  if (loading && !isEmbedded) {
    return <p className="boot">Đang kiểm tra phiên đăng nhập…</p>
  }

  // Khi được nhúng trong Shell ngoài, bỏ qua màn hình login bên trong
  if (!session && !profile && !isEmbedded) {
    return <Navigate to="/login" replace />
  }

  if (profile?.must_change_password) {
    return <ChangePasswordPage />
  }

  return <Outlet />
}
