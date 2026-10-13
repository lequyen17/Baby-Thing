// Lưu tạm trạng thái giữa bước nhập thông tin và bước nhập OTP,
// để F5 trang OTP không bị mất (sessionStorage tự xoá khi đóng tab).
const LOGIN_KEY = 'loginChallenge';
const REGISTER_KEY = 'pendingRegisterEmail';

export function saveLoginChallenge({ challengeId, email }) {
  sessionStorage.setItem(LOGIN_KEY, JSON.stringify({ challengeId, email }));
}

export function loadLoginChallenge() {
  try {
    return JSON.parse(sessionStorage.getItem(LOGIN_KEY));
  } catch {
    return null;
  }
}

export function clearLoginChallenge() {
  sessionStorage.removeItem(LOGIN_KEY);
}

export function savePendingRegisterEmail(email) {
  sessionStorage.setItem(REGISTER_KEY, email);
}

export function loadPendingRegisterEmail() {
  return sessionStorage.getItem(REGISTER_KEY);
}

export function clearPendingRegisterEmail() {
  sessionStorage.removeItem(REGISTER_KEY);
}
