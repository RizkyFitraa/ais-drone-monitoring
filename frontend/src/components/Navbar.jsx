import { useState, useEffect } from 'react'
import styles from './Navbar.module.css'

export default function Navbar({ onLogin }) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', handler)
    return () => window.removeEventListener('scroll', handler)
  }, [])

  return (
    <nav className={`${styles.nav} ${scrolled ? styles.scrolled : ''}`}>
      {/* Logo */}
      <div className={styles.logo}>
        <div className={styles.logoIcon}>
          <img src="/images/logo.svg" alt="AIS Drone" className={styles.logoImg} />
        </div>
        <span className={styles.logoText}>
          AIS<span style={{ color: 'var(--cyan)' }}>Drone</span>
        </span>
      </div>

      {/* Links */}
      <div className={styles.links}>
        {['Fitur', 'Teknologi', 'Arsitektur'].map(item => (
          <a key={item} href="#" className={styles.link}>{item}</a>
        ))}
        <button className={styles.loginBtn} onClick={onLogin}>LOGIN</button>
      </div>
    </nav>
  )
}
