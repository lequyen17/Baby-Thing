import { useUserStore } from '../api/localStore';

/** Phần hồ sơ chưa có cột trong DB (FR-USER-06): khu vực và giới thiệu ngắn. */
export const useExtraProfile = (userId) => useUserStore(userId, 'profile', { district: '', bio: '' });
export const useAddresses = (userId) => useUserStore(userId, 'addresses', []);
export const usePayoutAccount = (userId) => useUserStore(userId, 'payout', null);

export const maskAccount = (no = '') => (no.length <= 4 ? no : `${'•'.repeat(Math.max(no.length - 4, 4))}${no.slice(-4)}`);
