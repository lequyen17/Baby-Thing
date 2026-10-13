function initials(name = '') {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0].toUpperCase())
    .join('');
}

export function Avatar({ user, size = 36 }) {
  const style = { width: size, height: size, fontSize: Math.round(size * 0.4) };
  if (user.avatarUrl) {
    return <img className="avatar" style={style} src={user.avatarUrl} alt={user.displayName} referrerPolicy="no-referrer" />;
  }
  return (
    <span className="avatar avatar-fallback" style={style} aria-hidden="true">
      {initials(user.displayName)}
    </span>
  );
}
