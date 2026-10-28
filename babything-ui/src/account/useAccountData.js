import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useUserStore } from '../api/localStore';

/** Phần hồ sơ chưa có cột trong DB (FR-USER-06): khu vực và giới thiệu ngắn. */
export const useExtraProfile = (userId) => useUserStore(userId, 'profile', { district: '', bio: '' });
export const useAddresses = (userId) => useUserStore(userId, 'addresses', []);

/** PayoutPage phát sự kiện này sau khi lưu để các chỗ khác (mức hoàn thiện hồ sơ) đọc lại. */
export const PAYOUT_CHANGED_EVENT = 'payout-account-changed';

/** Tài khoản nhận tiền lưu ở server (GET /api/payout-account); null = chưa khai báo. */
export function usePayoutAccount(userId) {
  const [payout, setPayout] = useState(null);
  useEffect(() => {
    const load = () =>
      api('/payout-account')
        .then(setPayout)
        .catch(() => setPayout(null));
    load();
    window.addEventListener(PAYOUT_CHANGED_EVENT, load);
    return () => window.removeEventListener(PAYOUT_CHANGED_EVENT, load);
  }, [userId]);
  return [payout];
}

export const maskAccount = (no = '') => (no.length <= 4 ? no : `${'•'.repeat(Math.max(no.length - 4, 4))}${no.slice(-4)}`);
