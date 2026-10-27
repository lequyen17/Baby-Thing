import { Navigate, Route, Routes } from 'react-router-dom';
import AccountLayout from './account/AccountLayout';
import ContentPage from './content/ContentPage';
import { CONTENT } from './content/pages';
import MessagesPage from './messages/MessagesPage';
import NotificationPrefsPage from './notifications/NotificationPrefsPage';
import NotificationsPage from './notifications/NotificationsPage';
import SellerProfilePage from './seller/SellerProfilePage';
import AddressesPage from './pages/AddressesPage';
import PayoutPage from './pages/PayoutPage';
import { GuestRoute, ProtectedRoute } from './auth/RouteGuards';
import AppLayout from './layouts/AppLayout';
import ComingSoonPage, { COMING_SOON } from './pages/ComingSoonPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import LoginVerifyPage from './pages/LoginVerifyPage';
import ProductDetailPage from './pages/ProductDetailPage';
import ProductFormPage from './pages/ProductFormPage';
import ProductListPage from './pages/ProductListPage';
import ProfilePage from './pages/ProfilePage';
import RegisterPage from './pages/RegisterPage';
import RegisterVerifyPage from './pages/RegisterVerifyPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import SettingsPage from './pages/SettingsPage';
import ViewHistoryPage from './pages/ViewHistoryPage';

export default function App() {
  return (
    <Routes>
      <Route element={<GuestRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/login/verify" element={<LoginVerifyPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/register/verify" element={<RegisterVerifyPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      </Route>
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      {Object.entries(CONTENT).map(([key, page]) => (
        <Route key={key} path={page.path} element={<ContentPage page={page} />} />
      ))}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route element={<AccountLayout />}>
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/profile/addresses" element={<AddressesPage />} />
            <Route path="/profile/payout" element={<PayoutPage />} />
            <Route path="/profile/notifications" element={<NotificationPrefsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
          <Route path="/sellers/:id" element={<SellerProfilePage />} />
          <Route path="/messages" element={<MessagesPage />} />
          <Route path="/messages/:conversationId" element={<MessagesPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/products" element={<ProductListPage />} />
          <Route path="/products/:id" element={<ProductDetailPage />} />
          {/* Mọi thành viên đăng bán được; sửa tin của người khác thì server trả 403 */}
          <Route path="/products/new" element={<ProductFormPage />} />
          <Route path="/products/:id/edit" element={<ProductFormPage />} />
          <Route path="/sell" element={<Navigate to="/products/new" replace />} />
          <Route path="/history" element={<ViewHistoryPage />} />
          {Object.keys(COMING_SOON).map((feature) => (
            <Route key={feature} path={`/${feature}`} element={<ComingSoonPage feature={feature} />} />
          ))}
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
