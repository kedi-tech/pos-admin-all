'use client';
import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import Icon from '@/components/Icon';

export default function CategoriesPage() {
  const { state, actions, toast } = useApp();
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(false);

  const addCat = async () => {
    if (!newName.trim() || loading) return;
    setLoading(true);
    try {
      await actions.createCategory(newName.trim());
      toast(`Category "${newName.trim()}" created`);
      setNewName('');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Categories</h1>
          <p className="page-sub">{state.categories.length} categories organizing {state.products.length} products</p>
        </div>
      </div>

      <div className="card mb-4">
        <div className="card-body">
          <div className="row gap-2">
            <input className="input" placeholder="New category name…" value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCat()} disabled={loading} />
            <button className={`btn primary${loading ? ' loading' : ''}`} onClick={addCat} disabled={loading || !newName.trim()}>
              <Icon name="plus" />{loading ? 'Adding…' : 'Add category'}
            </button>
          </div>
        </div>
      </div>

      <div className="grid-3">
        {state.categories.map(c => {
          const count = state.products.filter(p => p.cat === c.id).length;
          const total = state.products.filter(p => p.cat === c.id).reduce((a, b) => a + b.stock, 0);
          return (
            <div key={c.id} className="card">
              <div className="card-body">
                <div className="row gap-3">
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--accent-subtle)', color: 'var(--accent-text)', display: 'grid', placeItems: 'center' }}>
                    <Icon name="tag" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="font-semibold">{c.name}</div>
                    <div className="text-xs text-muted">{count} products · {total} units in stock</div>
                  </div>
                  <button className="icon-btn"><Icon name="more" /></button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
