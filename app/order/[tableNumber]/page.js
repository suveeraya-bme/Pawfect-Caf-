'use client';

import { use, useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';

export default function OrderPage({ params }) {
  // Next.js 15+: params เป็น Promise ต้อง unwrap ด้วย use()
  const { tableNumber } = use(params);
  const table = parseInt(tableNumber, 10);

  const [session, setSession] = useState(undefined); // undefined = กำลังโหลด, null = โต๊ะไม่เปิด
  const [cats, setCats] = useState([]);
  const [menu, setMenu] = useState([]);
  const [active, setActive] = useState(null);
  const [cart, setCart] = useState({}); // { menuId: quantity }
  const [msg, setMsg] = useState({ text: '', ok: false });
  const [sending, setSending] = useState(false);
  const [bill, setBill] = useState(null); // { total, count }
  const [paidTotal, setPaidTotal] = useState(null); // ไม่ null = ปิดโต๊ะแล้ว

  useEffect(() => {
    async function load() {
      const { data: s } = await supabase
        .from('sessions').select('*')
        .eq('table_number', table).eq('status', 'open')
        .order('created_at', { ascending: false }).limit(1);
      const found = s && s.length > 0 ? s[0] : null;
      setSession(found);
      if (!found) return;
      const { data: c } = await supabase.from('menu_categories').select('*').order('sort_order');
      const { data: m } = await supabase.from('menu_items').select('*').order('id');
      setCats(c || []);
      setMenu(m || []);
      if (c && c.length > 0) setActive(c[0].id);
    }
    load();
  }, [table]);

  function add(id) {
    const q = cart[id] || 0;
    if (q >= 5) return;
    if (!q && Object.keys(cart).length >= 10) return setMsg({ text: 'เลือกได้สูงสุด 10 รายการต่อการส่ง', ok: false });
    setMsg({ text: '', ok: false });
    setCart({ ...cart, [id]: q + 1 });
  }

  function sub(id) {
    const q = cart[id] || 0;
    if (!q) return;
    const next = { ...cart };
    if (q === 1) delete next[id]; else next[id] = q - 1;
    setCart(next);
  }

  async function send() {
    setSending(true);
    const lines = menu.filter((i) => cart[i.id]).map((i) => ({ name: i.name, quantity: cart[i.id], price: i.price }));
    const { error } = await supabase.from('orders').insert({
      session_id: session.id, table_number: table, items: lines, status: 'received',
    });
    setSending(false);
    if (error) return setMsg({ text: 'ส่งไม่สำเร็จ: ' + error.message, ok: false });
    setCart({});
    setMsg({ text: 'ส่งออเดอร์แล้ว', ok: true });
  }

  async function askBill() {
    const { data, error } = await supabase.from('orders').select('items').eq('session_id', session.id);
    if (error) return setMsg({ text: 'ดึงยอดไม่สำเร็จ: ' + error.message, ok: false });
    let total = 0, count = 0;
    for (const o of data) for (const it of o.items) { total += it.price * it.quantity; count += it.quantity; }
    setBill({ total, count });
  }

  async function confirmBill() {
    const { error } = await supabase.from('sessions').update({ status: 'closed' }).eq('id', session.id).eq('status', 'open');
    if (error) { setBill(null); return setMsg({ text: 'ปิดโต๊ะไม่สำเร็จ: ' + error.message, ok: false }); }
    setPaidTotal(bill.total);
    setBill(null);
  }

  if (paidTotal !== null) {
    return (
      <main className="full">
        <h1>ขอบคุณที่ใช้บริการ</h1>
        <p>ยอดที่ต้องชำระ {paidTotal} บาท กรุณาชำระที่พนักงานหน้าร้าน</p>
      </main>
    );
  }
  if (session === undefined) return <main className="full"><p>กำลังโหลด...</p></main>;
  if (session === null) {
    return (
      <main className="full">
        <h1>โต๊ะนี้ยังไม่เปิดใช้งาน กรุณาแจ้งพนักงาน</h1>
      </main>
    );
  }

  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0);
  const cartTotal = menu.reduce((sum, i) => sum + (cart[i.id] || 0) * i.price, 0);
  const shown = menu.filter((i) => i.category_id === active);

  return (
    <main className="wrap">
      <div className="row">
        <h1>โต๊ะ {table}</h1>
        <button className="btn small ghost" onClick={askBill}>เรียกเก็บเงิน</button>
      </div>

      <div className="tabs">
        {cats.map((c) => (
          <button key={c.id} className={`btn ${c.id === active ? '' : 'ghost'}`} onClick={() => setActive(c.id)}>{c.name}</button>
        ))}
      </div>

      {shown.map((i) => (
        <div className="card row" key={i.id}>
          <div>
            <strong>{i.name}</strong> <span className="muted">{i.price} บาท</span>
            <div className="muted">{i.description}</div>
          </div>
          <div className="qty">
            {cart[i.id] ? <button className="btn small ghost" onClick={() => sub(i.id)} aria-label="ลดจำนวน">−</button> : null}
            {cart[i.id] || null}
            <button className="btn small sage" onClick={() => add(i.id)} aria-label={`เพิ่ม ${i.name}`}>+</button>
          </div>
        </div>
      ))}

      {msg.text && <p className={msg.ok ? 'ok' : 'error'}>{msg.text}</p>}

      {cartCount > 0 && (
        <div className="cartbar">
          <span>{Object.keys(cart).length} รายการ · {cartTotal} บาท</span>
          <button className="btn" onClick={send} disabled={sending}>{sending ? 'กำลังส่ง...' : 'ส่งออเดอร์'}</button>
        </div>
      )}

      {bill && (
        <div className="backdrop">
          <div className="modal" role="dialog" aria-modal="true">
            <h2>เรียกเก็บเงิน</h2>
            <p>สั่งไปทั้งหมด {bill.count} ชิ้น ยอดที่ต้องชำระ <strong>{bill.total} บาท</strong></p>
            <div className="row">
              <button className="btn ghost" onClick={() => setBill(null)}>ยกเลิก</button>
              <button className="btn sage" onClick={confirmBill}>ยืนยันเรียกเก็บเงิน</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
