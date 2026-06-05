'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import Icon from '@/components/Icon';
import Modal from '@/components/Modal';
import Switch from '@/components/Switch';

export default function UsersPage() {
  const { state, actions, toast, currentUser } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (currentUser?.role?.name === 'Manager') {
      router.replace('/dashboard');
    }
  }, [currentUser, router]);

  const [tab, setTab] = useState('users');
  const [editing, setEditing] = useState(null);

  const openNew = () => setEditing({
    name: '', email: '', phone: '',
    roleId: state.roles[0]?.id || '',
    branchId: state.branches[0]?.id || null,
    active: true, password: '',
  });

  const save = async (u) => {
    if (!u.name || !u.email) return;
    if (!u.id && !u.password) return toast('Password is required for new users', 'error');
    try {
      await actions.saveUser(u);
      toast(u.id ? `Updated ${u.name}` : `Created ${u.name}`);
      setEditing(null);
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const remove = async (u) => {
    if (!confirm(`Delete ${u.name}? This cannot be undone.`)) return;
    try {
      await actions.deleteUser(u.id);
      toast(`Deleted ${u.name}`);
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const roleName = (roleId) => state.roles.find(r => r.id === roleId)?.name || '—';
  const roleColor = (name) => name === 'Admin' ? 'accent' : name === 'Manager' ? 'info' : name === 'Cashier' ? 'success' : 'warning';

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Users & Roles</h1>
          <p className="page-sub">{state.users.length} users · {state.roles.length} roles</p>
        </div>
        <div className="page-actions">
          <button className="btn primary" onClick={openNew}>
            <Icon name="plus" />Invite user
          </button>
        </div>
      </div>

      <div className="tabs">
        {[['users','Users'],['roles','Roles & permissions']].map(([k,v]) => (
          <div key={k} className={`tab${tab===k?' active':''}`} onClick={() => setTab(k)}>{v}</div>
        ))}
      </div>

      {tab === 'users' && (
        <div className="card">
          <div className="card-body flush">
            <table className="table">
              <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Branch</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {state.users.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div className="row gap-2">
                        <div className="avatar">{u.name.split(' ').map(x => x[0]).join('').slice(0, 2)}</div>
                        <div className="font-semibold">{u.name}</div>
                      </div>
                    </td>
                    <td className="mono text-xs">{u.email}</td>
                    <td><span className={`badge ${roleColor(u.role)}`}>{u.role}</span></td>
                    <td>{u.branch}</td>
                    <td>{u.active ? <span className="badge success"><span className="badge-dot" />Active</span> : <span className="badge">Disabled</span>}</td>
                    <td>
                      <div className="row gap-1">
                        <button className="icon-btn" onClick={() => setEditing(u)}><Icon name="edit" /></button>
                        <button className="icon-btn hover-danger" onClick={() => remove(u)}><Icon name="trash" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {state.users.length === 0 && (
                  <tr><td colSpan={6}><div className="empty"><Icon name="users" size={40} className="empty-icon" /><div className="empty-title">No users yet</div></div></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'roles' && (
        <div className="grid-2">
          {state.roles.map(r => (
            <div key={r.id} className="card">
              <div className="card-header">
                <div><div className="card-title">{r.name}</div><div className="card-sub">{r.description}</div></div>
                <span className={`badge ${roleColor(r.name)}`} style={{ marginLeft: 'auto' }}>{r.name}</span>
              </div>
              <div className="card-body">
                <div className="text-sm text-muted">{r.perms || 'No permissions assigned'}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <Modal
          title={editing.id ? `Edit ${editing.name}` : 'Create user'}
          onClose={() => setEditing(null)}
          footer={
            <>
              <button className="btn" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn primary" onClick={() => save(editing)} disabled={!editing.name || !editing.email || (!editing.id && !editing.password)}>
                {editing.id ? 'Save changes' : 'Create user'}
              </button>
            </>
          }
        >
          <div className="input-group mb-3">
            <label className="label">Full name</label>
            <input className="input" value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} autoFocus />
          </div>
          <div className="input-group mb-3">
            <label className="label">Email</label>
            <input className="input" type="email" value={editing.email} onChange={e => setEditing({ ...editing, email: e.target.value })} />
          </div>
          <div className="input-group mb-3">
            <label className="label">Phone (optional)</label>
            <input className="input" value={editing.phone || ''} onChange={e => setEditing({ ...editing, phone: e.target.value })} />
          </div>
          {!editing.id && (
            <div className="input-group mb-3">
              <label className="label">Password</label>
              <input className="input" type="password" value={editing.password || ''} onChange={e => setEditing({ ...editing, password: e.target.value })} placeholder="Min. 8 characters" />
            </div>
          )}
          <div className="row gap-3 mb-3">
            <div className="input-group" style={{ flex: 1 }}>
              <label className="label">Role</label>
              <select className="select" value={editing.roleId || ''} onChange={e => setEditing({ ...editing, roleId: e.target.value })}>
                {state.roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <div className="input-group" style={{ flex: 1 }}>
              <label className="label">Branch</label>
              <select className="select" value={editing.branchId || ''} onChange={e => setEditing({ ...editing, branchId: e.target.value || null })}>
                <option value="">All branches</option>
                {state.branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          </div>
          <div className="row gap-3">
            <Switch on={editing.active} onChange={v => setEditing({ ...editing, active: v })} />
            <div><div className="font-semibold text-sm">Account active</div><div className="text-xs text-muted">Disabled users can't log in</div></div>
          </div>
        </Modal>
      )}
    </div>
  );
}
