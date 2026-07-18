import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext.jsx'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'

function Ic({ d, size = 14, c = 'currentColor' }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d={d}/></svg>
}

const Ico = {
  plus:     d => <Ic d="M12 5v14M5 12h14" {...d}/>,
  edit:     d => <Ic d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" {...d}/>,
  trash:    d => <Ic d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" {...d}/>,
  arrowLeft:d => <Ic d="M19 12H5M12 19l-7-7 7-7" {...d}/>,
  users:    d => <Ic d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm7 6a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" {...d}/>,
}

export default function UserManagementPage({ onBack }) {
  const { token } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [modal, setModal] = useState(null) // null | 'add' | { type:'edit', user }
  const [confirmDelete, setConfirmDelete] = useState(null)

  const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }

  async function fetchUsers() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API}/api/users`, { headers })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Gagal memuat') }
      setUsers(await res.json())
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchUsers() }, [])

  async function handleSave(data) {
    try {
      if (modal === 'add') {
        const res = await fetch(`${API}/api/users`, {
          method: 'POST', headers,
          body: JSON.stringify(data),
        })
        if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Gagal menambah') }
      } else {
        const res = await fetch(`${API}/api/users/${modal.user.id}`, {
          method: 'PUT', headers,
          body: JSON.stringify(data),
        })
        if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Gagal menyimpan') }
      }
      setModal(null)
      await fetchUsers()
    } catch (e) {
      alert(e.message)
    }
  }

  async function handleDelete(id) {
    try {
      const res = await fetch(`${API}/api/users/${id}`, {
        method: 'DELETE', headers,
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Gagal menghapus') }
      setConfirmDelete(null)
      await fetchUsers()
    } catch (e) {
      alert(e.message)
      setConfirmDelete(null)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      <header style={{
        height: 52, flexShrink: 0, display: 'flex', alignItems: 'center',
        padding: '0 16px', gap: 10, background: 'var(--bg2)',
        borderBottom: '1px solid var(--br)', boxShadow: '0 1px 3px rgba(0,0,0,.05)',
      }}>
        <button onClick={onBack} style={{
          display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px',
          background: 'var(--bg3)', border: '1px solid var(--br)', borderRadius: 8,
          color: 'var(--t2)', fontFamily: 'var(--fm)', fontSize: 12,
          cursor: 'pointer', transition: 'all .15s',
        }}>
          <Ico.arrowLeft size={14} c="var(--t2)"/>
          Kembali
        </button>
        <div style={{
          width: 30, height: 30, borderRadius: 8, flexShrink: 0,
          background: 'linear-gradient(135deg, #87ccfe, #0082de)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 3px 10px rgba(84,138,255,.28)',
        }}>
          <Ico.users size={16} c="white"/>
        </div>
        <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--t1)' }}>Kelola Pengguna</span>
        <div style={{ flex: 1 }}/>
        <button onClick={() => setModal('add')} style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '6px 14px', background: 'var(--blue2)', border: 'none',
          borderRadius: 8, color: 'white', fontFamily: 'var(--fm)',
          fontWeight: 600, fontSize: 12, cursor: 'pointer',
          boxShadow: '0 3px 10px rgba(29,78,216,.3)',
        }}>
          <Ico.plus size={14} c="white"/>
          Tambah User
        </button>
      </header>

      <div style={{ flex: 1, padding: 20, overflow: 'auto' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--t3)', fontSize: 14 }}>
            Memuat data...
          </div>
        )}
        {error && (
          <div style={{
            background: 'rgba(220,38,38,.08)', border: '1px solid rgba(220,38,38,.15)',
            borderRadius: 10, padding: '14px 18px', color: 'var(--red)',
            fontFamily: 'var(--fm)', fontSize: 12, marginBottom: 16,
          }}>
            {error}
          </div>
        )}
        {!loading && !error && users.length === 0 && (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--t3)', fontSize: 14 }}>
            Belum ada pengguna
          </div>
        )}
        {!loading && users.length > 0 && (
          <div style={{
            background: 'white', borderRadius: 12, border: '1px solid var(--br)',
            overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,.04)',
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--fm)' }}>
              <thead>
                <tr style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--br)' }}>
                  {['Username', 'Nama', 'Role', 'Dibuat'].map(h => (
                    <th key={h} style={{
                      padding: '10px 16px', textAlign: 'left', fontSize: 10,
                      color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.8px',
                      fontWeight: 600,
                    }}>{h}</th>
                  ))}
                  <th style={{ width: 80, padding: '10px 16px' }}/>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--br)', transition: 'background .12s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg2)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: 'var(--t1)' }}>
                      {u.username}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--t2)' }}>
                      {u.display_name || '—'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        display: 'inline-block', padding: '2px 10px', borderRadius: 20,
                        fontSize: 10, fontWeight: 600,
                        background: u.role === 'admin' ? 'rgba(29,78,216,.1)' : 'rgba(13,148,136,.1)',
                        color: u.role === 'admin' ? 'var(--blue2)' : 'var(--teal)',
                      }}>
                        {u.role === 'admin' ? 'Admin' : 'Operator'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 11, color: 'var(--t3)' }}>
                      {new Date(u.created_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button onClick={() => setModal({ type: 'edit', user: u })}
                          style={{
                            padding: '5px 10px', background: 'var(--blue-bg)',
                            border: '1px solid var(--blue-br)', borderRadius: 6,
                            color: 'var(--blue2)', cursor: 'pointer', fontSize: 11,
                            fontFamily: 'var(--fm)', fontWeight: 500,
                            display: 'flex', alignItems: 'center', gap: 4,
                          }}>
                          <Ico.edit size={11} c="var(--blue2)"/>
                          Edit
                        </button>
                        <button onClick={() => setConfirmDelete(u)}
                          style={{
                            padding: '5px 10px', background: 'rgba(220,38,38,.08)',
                            border: '1px solid rgba(220,38,38,.15)', borderRadius: 6,
                            color: 'var(--red)', cursor: 'pointer', fontSize: 11,
                            fontFamily: 'var(--fm)', fontWeight: 500,
                            display: 'flex', alignItems: 'center', gap: 4,
                          }}>
                          <Ico.trash size={11} c="var(--red)"/>
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Tambah / Edit */}
      {modal && <UserFormModal mode={modal} onSave={handleSave} onClose={() => setModal(null)}/>}

      {/* Confirm Delete */}
      {confirmDelete && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,.35)', backdropFilter: 'blur(4px)',
        }}>
          <div style={{
            background: 'white', borderRadius: 14, padding: '24px 28px',
            width: 360, maxWidth: '90vw', boxShadow: '0 20px 60px rgba(0,0,0,.2)',
          }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--t1)', marginBottom: 8 }}>
              Hapus Pengguna
            </h2>
            <p style={{ fontSize: 13, color: 'var(--t2)', lineHeight: 1.6, marginBottom: 20 }}>
              Yakin ingin menghapus <strong>{confirmDelete.username}</strong>? Tindakan ini tidak bisa dibatalkan.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirmDelete(null)} style={{
                padding: '8px 18px', borderRadius: 8, border: '1px solid var(--br)',
                background: 'white', color: 'var(--t2)', fontFamily: 'var(--fm)',
                fontSize: 12, fontWeight: 500, cursor: 'pointer',
              }}>
                Batal
              </button>
              <button onClick={() => handleDelete(confirmDelete.id)} style={{
                padding: '8px 18px', borderRadius: 8, border: 'none',
                background: 'var(--red)', color: 'white', fontFamily: 'var(--fm)',
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}>
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function UserFormModal({ mode, onSave, onClose }) {
  const isEdit = mode && mode.type === 'edit'
  const [username, setUsername] = useState(isEdit ? mode.user.username : '')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState(isEdit ? mode.user.display_name || '' : '')
  const [role, setRole] = useState(isEdit ? mode.user.role : 'operator')
  const [saving, setSaving] = useState(false)

  async function submit(e) {
    e.preventDefault()
    if (!isEdit && !password) { alert('Password harus diisi'); return }
    if (!username) { alert('Username harus diisi'); return }
    setSaving(true)
    const data = { username, display_name: displayName, role }
    if (password) data.password = password
    await onSave(data)
    setSaving(false)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,.35)', backdropFilter: 'blur(4px)',
    }}>
      <form onSubmit={submit} style={{
        background: 'white', borderRadius: 14, padding: '24px 28px',
        width: 400, maxWidth: '90vw', boxShadow: '0 20px 60px rgba(0,0,0,.2)',
      }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--t1)', marginBottom: 20 }}>
          {isEdit ? 'Edit Pengguna' : 'Tambah Pengguna Baru'}
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[
            { label: 'Username', value: username, set: setUsername, type: 'text', required: true, disabled: isEdit },
            { label: 'Password', value: password, set: setPassword, type: 'password', required: !isEdit,
              hint: isEdit ? 'Kosongkan jika tidak diubah' : null },
            { label: 'Nama Tampilan', value: displayName, set: setDisplayName, type: 'text' },
          ].map(f => (
            <div key={f.label}>
              <label style={{
                fontFamily: 'var(--fm)', fontSize: 9, color: 'var(--t2)',
                letterSpacing: '.8px', display: 'block', marginBottom: 5,
                textTransform: 'uppercase',
              }}>{f.label}</label>
              <input type={f.type} value={f.value}
                disabled={f.disabled}
                onChange={e => f.set(e.target.value)}
                style={{
                  width: '100%', padding: '9px 12px', background: 'var(--bg)',
                  border: '1.5px solid var(--br2)', borderRadius: 8,
                  color: 'var(--t1)', fontSize: 13, fontFamily: 'var(--ff)',
                  transition: 'border-color .15s',
                }}
                onFocus={e => e.target.style.borderColor = 'var(--blue2)'}
                onBlur={e => e.target.style.borderColor = 'var(--br2)'}/>
              {f.hint && <div style={{ fontSize: 9, color: 'var(--t3)', marginTop: 3 }}>{f.hint}</div>}
            </div>
          ))}
          <div>
            <label style={{
              fontFamily: 'var(--fm)', fontSize: 9, color: 'var(--t2)',
              letterSpacing: '.8px', display: 'block', marginBottom: 5,
              textTransform: 'uppercase',
            }}>Role</label>
            <select value={role} onChange={e => setRole(e.target.value)} style={{
              width: '100%', padding: '9px 12px', background: 'var(--bg)',
              border: '1.5px solid var(--br2)', borderRadius: 8,
              color: 'var(--t1)', fontSize: 13, fontFamily: 'var(--ff)',
              cursor: 'pointer',
            }}>
              <option value="operator">Operator</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24 }}>
          <button type="button" onClick={onClose} disabled={saving} style={{
            padding: '9px 18px', borderRadius: 8, border: '1px solid var(--br)',
            background: 'white', color: 'var(--t2)', fontFamily: 'var(--fm)',
            fontSize: 12, fontWeight: 500, cursor: 'pointer',
          }}>
            Batal
          </button>
          <button type="submit" disabled={saving} style={{
            padding: '9px 20px', borderRadius: 8, border: 'none',
            background: saving ? 'var(--t4)' : 'var(--blue2)',
            color: 'white', fontFamily: 'var(--fm)', fontSize: 12,
            fontWeight: 600, cursor: saving ? 'default' : 'pointer',
            boxShadow: saving ? 'none' : '0 3px 10px rgba(29,78,216,.3)',
          }}>
            {saving ? 'Menyimpan...' : (isEdit ? 'Simpan' : 'Tambah')}
          </button>
        </div>
      </form>
    </div>
  )
}
