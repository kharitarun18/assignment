export function getStoredUser() {
  try {
    const raw = localStorage.getItem('user')
    if (!raw || raw === 'undefined' || raw === 'null') return {}
    return JSON.parse(raw)
  } catch {
    localStorage.removeItem('user')
    return {}
  }
}

export function setStoredUser(user) {
  if (user && typeof user === 'object') {
    localStorage.setItem('user', JSON.stringify(user))
  }
}

export function clearAuth() {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
}
