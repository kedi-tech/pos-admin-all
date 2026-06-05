'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AppProvider, useApp } from '@/context/AppContext';
import Icon from '@/components/Icon';
import { logout } from '@/lib/api';

const NAV = [
  { id: 'dashboard',  label: 'Dashboard',       icon: 'dashboard', href: '/dashboard' },
  { id: 'products',   label: 'Products',         icon: 'box',       href: '/products'  },
  { id: 'categories', label: 'Categories',       icon: 'layers',    href: '/categories'},
  { id: 'barcode',    label: 'Barcode Center',   icon: 'barcode',   href: '/barcode'   },
  { id: 'inventory',  label: 'Inventory',        icon: 'warehouse', href: '/inventory' },
  { id: 'sales',      label: 'Sales Oversight',  icon: 'receipt',   href: '/sales'     },
  { id: 'users',      label: 'Users & Roles',    icon: 'users',     href: '/users'     },
  { id: 'reports',    label: 'Reports',          icon: 'chart',     href: '/reports'   },
  { id: 'settings',   label: 'Settings',         icon: 'settings',  href: '/settings'  },
];

const NAV_GROUPS = [
  { label: 'Main',       items: NAV.slice(0, 3) },
  { label: 'Operations', items: NAV.slice(3, 6) },
  { label: 'Management', items: NAV.slice(6)    },
];

function Shell({ children }) {
  const { state, currentUser, authLoading, theme, setTheme } = useApp();
  const pathname = usePathname();
  const router = useRouter();
  const [branch, setBranch] = useState('');
  const [branchOpen, setBranchOpen] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (!currentUser) {
        router.replace('/login');
      } else if (currentUser.mustChangePassword) {
        router.replace('/change-password');
      } else {
        const roleName = currentUser.role?.name || currentUser.role;
        if (roleName !== 'Admin' && roleName !== 'Manager') {
          logout(); // Clear token and redirect
        }
      }
    }
  }, [authLoading, currentUser, router]);

  useEffect(() => {
    if (currentUser?.branch?.name) setBranch(currentUser.branch.name);
    else if (state.branches.length) setBranch(state.branches[0].name);
  }, [currentUser, state.branches]);

  const lowStockCount = state.products.filter(p => p.stock < p.min).length;
  const currentLabel = NAV.find(n => pathname.startsWith(n.href))?.label || '';
  const initials = currentUser?.fullName?.split(' ').map(x => x[0]).join('').slice(0, 2) || 'AD';

  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading…</div>
      </div>
    );
  }

  if (!currentUser) return null;

  return (
    <div className="app">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">K</div>
          <div className="brand-text">
            <div className="brand-title">Kedi-POS</div>
            <div className="brand-sub">Control tower</div>
          </div>
        </div>

        {NAV_GROUPS.map(g => {
          const filteredItems = g.items.filter(n => {
            const roleName = currentUser?.role?.name || currentUser?.role;
            if (n.id === 'users' && roleName === 'Manager') return false;
            return true;
          });
          if (filteredItems.length === 0) return null;

          return (
            <div key={g.label} className="nav-section">
              <div className="nav-label">{g.label}</div>
              {filteredItems.map(n => (
                <Link key={n.id} href={n.href} className={`nav-item${pathname.startsWith(n.href) ? ' active' : ''}`}>
                  <Icon name={n.icon} />
                  {n.label}
                  {n.id === 'inventory' && lowStockCount > 0 && (
                    <span className="badge" style={{ marginLeft: 'auto', background: 'var(--danger)', color: 'white', border: 'none' }}>{lowStockCount}</span>
                  )}
                </Link>
              ))}
            </div>
          );
        })}

        <div className="sidebar-footer">
          <div className="user-card" style={{ cursor: 'pointer' }} onClick={logout}>
            <div className="avatar">{initials}</div>
            <div className="user-info">
              <div className="user-name truncate">{currentUser?.fullName || 'User'}</div>
              <div className="user-role truncate">{currentUser?.role?.name || 'Staff'} · Sign out</div>
            </div>
            <Icon name="chevronRight" size={14} className="text-subtle" />
          </div>
        </div>
      </aside>

      {/* HEADER */}
      <header className="header">
        <div className="header-crumbs">
          <span>Kedi-POS</span>
          <span className="sep">/</span>
          <span style={{ fontWeight: 600, color: 'var(--text)' }}>{currentLabel}</span>
        </div>

        <div className="header-right">
          {state.branches.length > 0 && (
            <div style={{ position: 'relative' }}>
              <button className="branch-switch" onClick={() => setBranchOpen(!branchOpen)}>
                <span className="branch-dot" />
                <Icon name="store" size={12} />
                <span>{branch || 'All branches'}</span>
                <Icon name="chevronDown" size={12} />
              </button>
              {branchOpen && (
                <>
                  <div style={{ position: 'fixed', inset: 0, zIndex: 50 }} onClick={() => setBranchOpen(false)} />
                  <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 4, background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 8, boxShadow: 'var(--shadow-lg)', zIndex: 51, minWidth: 200, padding: 4 }}>
                    {state.branches.map(b => (
                      <button key={b.id} className={`nav-item${branch === b.name ? ' active' : ''}`} onClick={() => { setBranch(b.name); setBranchOpen(false); }}>
                        <span className="branch-dot" style={{ background: b.isActive ? 'var(--success)' : 'var(--warning)' }} />
                        {b.name}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          <button className="icon-btn" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
            <Icon name={theme === 'light' ? 'moon' : 'sun'} />
          </button>
          <button className="icon-btn">
            <Icon name="bell" />
            {lowStockCount > 0 && <span className="dot" />}
          </button>
        </div>
      </header>

      {/* MAIN */}
      <main className="main">{children}</main>
    </div>
  );
}

export default function DashboardLayout({ children }) {
  return (
    <AppProvider>
      <Shell>{children}</Shell>
    </AppProvider>
  );
}
