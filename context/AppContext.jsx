'use client';
import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { setActiveCurrency } from '@/lib/fmt';
import * as api from '@/lib/api';

const AppContext = createContext(null);

const EMPTY = { products: [], categories: [], users: [], roles: [], sales: [], movements: [], branches: [] };

export function AppProvider({ children }) {
  const [state, setState] = useState(EMPTY);
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [theme, setThemeState] = useState('light');
  const [currency, setCurrencyState] = useState('GNF');
  const [toasts, setToasts] = useState([]);
  const initialized = useRef(false);

  // ── theme ──────────────────────────────────────────────────
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    const saved = localStorage.getItem('asg-theme') || 'light';
    setThemeState(saved);
    document.documentElement.classList.toggle('dark', saved === 'dark');
  }, []);

  const setTheme = useCallback((t) => {
    setThemeState(t);
    document.documentElement.classList.toggle('dark', t === 'dark');
    localStorage.setItem('asg-theme', t);
  }, []);

  const setCurrency = useCallback((code) => {
    setCurrencyState(code);
    setActiveCurrency(code);
  }, []);

  // ── toasts ────────────────────────────────────────────────
  const toast = useCallback((msg, kind = 'success') => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t, { id, msg, kind }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  }, []);

  // ── load all data ─────────────────────────────────────────
  const loadData = useCallback(async () => {
    setDataLoading(true);
    try {
      const [products, categories, users, roles, sales, movements, branches] = await Promise.allSettled([
        api.getProducts(),
        api.getCategories(),
        api.getUsers(),
        api.getRoles(),
        api.getSales({ limit: 100 }),
        api.getMovements({ limit: 50 }),
        api.getBranches(),
      ]);

      setState({
        products:   products.status   === 'fulfilled' ? products.value   : [],
        categories: categories.status === 'fulfilled' ? categories.value : [],
        users:      users.status      === 'fulfilled' ? users.value      : [],
        roles:      roles.status      === 'fulfilled' ? roles.value      : [],
        sales:      sales.status      === 'fulfilled' ? sales.value      : [],
        movements:  movements.status  === 'fulfilled' ? movements.value  : [],
        branches:   branches.status   === 'fulfilled' ? branches.value   : [],
      });
    } finally {
      setDataLoading(false);
    }
  }, []);

  // ── auth bootstrap ────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const token = api.getToken();
      if (!token) { setAuthLoading(false); return; }
      try {
        const { user } = await api.getMe();
        setCurrentUser(user);
        await loadData();
      } catch {
        api.clearToken();
      } finally {
        setAuthLoading(false);
      }
    })();
  }, [loadData]);

  // ── API-backed actions ────────────────────────────────────
  const actions = {
    async saveProduct(p) {
      const branchId = currentUser?.branch?.id || state.branches[0]?.id;
      const saved = (p.__new || !p.id)
        ? await api.createProduct(p, branchId)
        : await api.updateProduct(p);
      setState(s => ({
        ...s,
        products: p.__new
          ? [saved, ...s.products]
          : s.products.map(x => x.id === saved.id ? saved : x),
      }));
      return saved;
    },
    
    async deleteProduct(id) {
      await api.deleteProduct(id);
      setState(s => ({
        ...s,
        products: s.products.filter(x => x.id !== id),
      }));
    },

    async createCategory(name) {
      const cat = await api.createCategory(name);
      setState(s => ({ ...s, categories: [...s.categories, cat] }));
      return cat;
    },

    async saveUser(u) {
      const saved = u.id
        ? await api.updateUser(u)
        : await api.createUser(u);
      setState(s => ({
        ...s,
        users: u.id
          ? s.users.map(x => x.id === saved.id ? saved : x)
          : [...s.users, saved],
      }));
      return saved;
    },

    async deleteUser(id) {
      await api.deleteUser(id);
      setState(s => ({
        ...s,
        users: s.users.filter(x => x.id !== id),
      }));
    },

    async adjustInventory({ productId, branchId, quantity, movementType, reason }) {
      const branchToUse = branchId || currentUser?.branch?.id || state.branches[0]?.id;
      await api.adjustInventory({ productId, branchId: branchToUse, quantity, movementType, reason });
      // Refresh products (stock) + movements
      const [products, movements] = await Promise.all([
        api.getProducts(),
        api.getMovements({ limit: 50 }),
      ]);
      setState(s => ({ ...s, products, movements }));
    },

    refresh: loadData,
  };

  return (
    <AppContext.Provider value={{
      state, setState,
      currentUser, setCurrentUser,
      authLoading, dataLoading,
      actions,
      theme, setTheme,
      currency, setCurrency,
      toast, toasts,
    }}>
      {children}
      <Toasts items={toasts} />
    </AppContext.Provider>
  );
}

function Toasts({ items }) {
  if (!items.length) return null;
  return (
    <div className="toast-container">
      {items.map(t => (
        <div key={t.id} className={`toast ${t.kind}`}>
          <ToastIcon kind={t.kind} />
          <div className="toast-msg">{t.msg}</div>
        </div>
      ))}
    </div>
  );
}

function ToastIcon({ kind }) {
  if (kind === 'success') return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>;
  if (kind === 'error')   return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--danger)"  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01"/></svg>;
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--info)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/></svg>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
