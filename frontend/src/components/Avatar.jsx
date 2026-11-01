import { useEffect, useState } from 'react'

// Shows the Google profile photo; falls back to the first letter if there is no photo or it fails to load.
export default function Avatar({ user, size = 42, className = 'acct-avatar' }) {
  const [bad, setBad] = useState(false)
  useEffect(() => { setBad(false) }, [user?.picture])

  const initial = ((user?.name || user?.email || '?')[0] || '?').toUpperCase()
  const style = { width: size, height: size, fontSize: Math.round(size * 0.43) }

  if (user?.picture && !bad) {
    return (
      <img
        className={`${className} has-photo`}
        style={style}
        src={user.picture}
        alt=""
        referrerPolicy="no-referrer"
        onError={() => setBad(true)}
      />
    )
  }
  return <span className={className} style={style}>{initial}</span>
}