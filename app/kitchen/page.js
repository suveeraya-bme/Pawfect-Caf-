'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

const ACTIVE = ['received', 'cooking'];
const byTime = (a, b) => new Date(a.created_at) - new Date(b.created_at); // เก่า -> ใหม่

export default function Kitchen() {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    supabase.from('orders').select('*').in('status', ACTIVE).order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (error) setError(error.message); else setOrders(data);
      });

    const channel = supabase
      .channel('kitchen-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
        const row = payload.new;
        setOrders((cur) => {
          const rest = cur.filter((o) => o.id !== row.id);
          return ACTIVE.includes(row.status) ? [...rest, row].sort(byTime) : rest;
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  async function setStatus(id, status) {
    const { error } = await supabase.from('orders').update({ status }).eq('id', id);
    if (error) return setError(error.message);
    setOrders((cur) => status === 'served'
      ? cur.filter((o) => o.id !== id)
      : cur.map((o) => (o.id === id ? { ...o, status } : o)));
  }

  return (
    <main>
      <div className="row" style={{ padding: '16px 16px 0' }}>
        <h1>จอครัว · {orders.length} ออเดอร์</h1>
      </div>
      {error && <p className="error" style={{ padding: '0 16px' }}>{error}</p>}
      {orders.length === 0 && <p className="muted" style={{ padding: 16 }}>ยังไม่มีออเดอร์ค้าง ออเดอร์ใหม่จะขึ้นที่นี่อัตโนมัติ</p>}
      <div className="kgrid">
        {orders.map((o) => (
          <div key={o.id} className={`kcard ${o.status === 'cooking' ? 'cooking' : ''}`}>
            <div className="row">
              <span className="table">โต๊ะ {o.table_number}</span>
              <span className="muted">{new Date(o.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <ul>
              {o.items.map((it, idx) => <li key={idx}>{it.quantity} × {it.name}</li>)}
            </ul>
            <div className="row">
              {o.status === 'received' && <button className="btn" onClick={() => setStatus(o.id, 'cooking')}>เริ่มทำ</button>}
              <button className="btn sage" onClick={() => setStatus(o.id, 'served')}>จัดเสิร์ฟแล้ว</button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
