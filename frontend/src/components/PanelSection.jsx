import Icon from './Icon'
import styles from './PanelSection.module.css'

export default function PanelSection({ title, icon, accent = 'var(--cyan)', children }) {
  return (
    <div className={styles.section}>
      <div className={styles.header}>
        <Icon name={icon} size={13} color={accent} />
        <span className={styles.title} style={{ color: accent }}>{title}</span>
      </div>
      <div className={styles.body}>{children}</div>
    </div>
  )
}
