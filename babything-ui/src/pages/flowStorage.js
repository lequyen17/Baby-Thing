// Lưu tạm trạng thái giữa bước nhập thông tin và bước nhập OTP,
// để F5 trang OTP không bị mất (sessionStorage tự xoá khi đóng tab).
const LOGIN_KEY = 'loginChallenge';
const REGISTER_KEY = 'pendingRegisterEmail';
const RETURN_KEY = 'returnTo';

/**
 * Trang khách đang xem trước khi bị yêu cầu đăng nhập (vd. bấm "Mua ngay" ở link từ Facebook),
 * để đăng nhập / đăng ký xong quay lại đúng chỗ. Chỉ nhận đường dẫn nội bộ, tránh chuyển hướng ra trang ngoài.
 */
export function saveReturnTo(path) {
  if (typeof path === 'string' && path.startsWith('/') && !path.startsWith('//')) {
    sessionStorage.setItem(RETURN_KEY, path);
  }
}

/** Xem mà không xoá (GuestRoute chuyển hướng ngay khi user vừa có, trước khi trang đăng nhập tự điều hướng). */
export function loadReturnTo() {
  return sessionStorage.getItem(RETURN_KEY) || '/';
}

/** Lấy rồi xoá: gọi đúng một lần sau khi đăng nhập xong. */
export function takeReturnTo() {
  const path = loadReturnTo();
  sessionStorage.removeItem(RETURN_KEY);
  return path;
}

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
