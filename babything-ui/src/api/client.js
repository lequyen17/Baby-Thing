/**
 * Access token chỉ trong RAM tab; refresh nằm HttpOnly cookie (path /api/auth).
 * Ngoại lệ: frontend khác domain với API (GitHub Pages) thì Safari/iPhone chặn cookie, server bật
 * REFRESH_TOKEN_IN_BODY và trả refresh token trong body; khi đó lưu vào localStorage, gửi qua header.
 */
let accessToken = null;

/** Rỗng = API chung domain (nginx / proxy của Vite dev). */
const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export const apiUrl = (path) => `${API_BASE}/api${path}`;

const REFRESH_KEY = 'babything.refreshToken';
const REFRESH_HEADER = 'X-Refresh-Token';

const refreshStore = {
  get() {
    try {
      return localStorage.getItem(REFRESH_KEY);
    } catch {
      return null;
    }
  },
  set(token) {
    try {
      if (token) localStorage.setItem(REFRESH_KEY, token);
      else localStorage.removeItem(REFRESH_KEY);
    } catch {
      // Chế độ riêng tư chặn localStorage: chỉ mất khả năng giữ đăng nhập sau F5
    }
  },
};

const authChannel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('babything-auth') : null;

// Dọn token cũ trong localStorage (migration).
localStorage.removeItem('accessToken');
localStorage.removeItem('refreshToken');

export const tokenStore = {
  get access() {
    return accessToken;
  },
  set(tokens) {
    accessToken = tokens?.accessToken ?? null;
    if (tokens?.refreshToken) refreshStore.set(tokens.refreshToken);
    if (accessToken) broadcastSessionUpdated(accessToken);
  },
  clear() {
    accessToken = null;
    refreshStore.set(null);
    broadcastSignedOut();
  },
};

function broadcastSessionUpdated(token) {
  authChannel?.postMessage({ type: 'session-updated', accessToken: token });
}

function broadcastSignedOut() {
  authChannel?.postMessage({ type: 'signed-out' });
}

authChannel?.addEventListener('message', (event) => {
  const msg = event.data;
  if (msg?.type === 'session-updated') {
    accessToken = msg.accessToken;
  } else if (msg?.type === 'signed-out') {
    accessToken = null;
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
  }
});

export class ApiError extends Error {
  constructor(status, body) {
    super(body?.message || 'Đã có lỗi xảy ra, vui lòng thử lại');
    this.status = status;
    this.code = body?.code;
    this.fields = body?.fields || {};
  }
}

/** Phát ra khi phiên đăng nhập không thể khôi phục (refresh thất bại). */
export const SESSION_EXPIRED_EVENT = 'auth:session-expired';

function send(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth && tokenStore.access) headers.Authorization = `Bearer ${tokenStore.access}`;
  // Logout cần refresh token để thu hồi; chỉ gửi cho /auth/*, không rải ra mọi request
  const refresh = path.startsWith('/auth/') && refreshStore.get();
  if (refresh) headers[REFRESH_HEADER] = refresh;
  return fetch(apiUrl(path), {
    method,
    headers,
    credentials: 'include',
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function parse(res) {
  if (res.status === 204) return null;
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!res.ok) throw new ApiError(res.status, data);
  return data;
}

/**
 * Refresh rotate cookie; navigator.locks tránh hai tab refresh cùng lúc.
 * Tab vào sau thấy access đã đổi (BroadcastChannel) thì bỏ qua.
 */
async function refreshTokens(failedAccessToken) {
  const run = async () => {
    if (failedAccessToken && tokenStore.access && tokenStore.access !== failedAccessToken) {
      return true;
    }
    const headers = { Accept: 'application/json' };
    const refresh = refreshStore.get();
    if (refresh) headers[REFRESH_HEADER] = refresh;
    const res = await fetch(apiUrl('/auth/refresh'), {
      method: 'POST',
      headers,
      credentials: 'include',
    });
    if (!res.ok) {
      tokenStore.clear();
      return false;
    }
    tokenStore.set(await res.json());
    return true;
  };
  return navigator.locks ? navigator.locks.request('babything-auth-refresh', run) : run();
}

/** Khôi phục phiên sau F5 khi cookie refresh còn hợp lệ. */
export async function tryRestoreSession() {
  if (tokenStore.access) return true;
  return refreshTokens(null);
}

export async function api(path, options = {}) {
  const auth = options.auth !== false;
  const usedAccessToken = tokenStore.access;
  let res = await send(path, options);

  if (res.status === 401 && auth) {
    if (await refreshTokens(usedAccessToken)) {
      res = await send(path, options);
    } else if (usedAccessToken) {
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    }
  }
  return parse(res);
}

/** Multipart upload (không set Content-Type để browser gắn boundary). */
export async function apiUpload(path, formData) {
  const usedAccessToken = tokenStore.access;
  const headers = { Accept: 'application/json' };
  if (tokenStore.access) headers.Authorization = `Bearer ${tokenStore.access}`;

  let res = await fetch(apiUrl(path), {
    method: 'POST',
    headers,
    credentials: 'include',
    body: formData,
  });

  if (res.status === 401 && usedAccessToken) {
    if (await refreshTokens(usedAccessToken)) {
      if (tokenStore.access) headers.Authorization = `Bearer ${tokenStore.access}`;
      res = await fetch(apiUrl(path), { method: 'POST', headers, credentials: 'include', body: formData });
    } else {
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    }
  }
  return parse(res);
}
