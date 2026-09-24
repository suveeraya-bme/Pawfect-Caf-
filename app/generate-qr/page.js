'use client';

import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function GenerateQR() {
  const [table, setTable] = useState('');
  const [guests, setGuests] = useState(2);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [existing, setExisting] = useState(null); // session เก่าที่เปิดค้างอยู่
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  // แปลงเป็นตัวเลขล้วน ("07" -> 7) ให้ตรงกับ URL /order/7 เสมอ
  const tableNum = parseInt(table, 10);

  async function openTable() {
    setError('');
    if (!Number.isInteger(tableNum) || tableNum < 1) return setError('กรอกเลขโต๊ะเป็นตัวเลข เช่น 7');
    if (!Number.isInteger(guests) || guests < 1) return setError('จำนวนลูกค้าต้องอย่างน้อย 1 ท่าน');
    setBusy(true);

    const { data: open, error: e1 } = await supabase
      .from('sessions')
      .select('id, guest_count, created_at')
      .eq('table_number', tableNum)
      .eq('status', 'open')
      .limit(1);
    if (e1) { setBusy(false); return setError('เช็คโต๊ะไม่สำเร็จ: ' + e1.message); }
    if (open.length > 0) { setBusy(false); return setExisting(open[0]); }

    const { error: e2 } = await supabase
      .from('sessions')
      .insert({ table_number: tableNum, guest_count: guests, status: 'open' });
    setBusy(false);
    if (e2) return setError('เปิดโต๊ะไม่สำเร็จ: ' + e2.message);

    setResult({ table: tableNum, guests, url: `${window.location.origin}/order/${tableNum}` });
  }

  async function closeOld() {
    setBusy(true);
    const { error: e } = await supabase
      .from('sessions')
      .update({ status: 'closed' })
      .eq('id', existing.id)
      .eq('status', 'open'); // กันกดซ้ำ
    setBusy(false);
    if (e) { setConfirming(false); return setError('ปิดโต๊ะไม่สำเร็จ: ' + e.message); }
    setConfirming(false);
    setExisting(null); // กลับไปที่ฟอร์ม ค่าที่กรอกยังอยู่
  }

  async function copyLink() {
    await navigator.clipboard.writeText(result.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function reset() {
    setResult(null); setTable(''); setGuests(2); setError(''); setExisting(null);
  }

  const minutes = existing ? Math.max(0, Math.round((Date.now() - new Date(existing.created_at).getTime()) / 60000)) : 0;

  if (result) {
    const qr = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(result.url)}`;
    return (
      <main className="wrap" style={{ textAlign: 'center' }}>
        <h1>เปิดโต๊ะแล้ว</h1>
        <div className="card">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt={`QR Code โต๊ะ ${result.table}`} width={300} height={300} />
          <h2 style={{ marginTop: 12 }}>โต๊ะ {result.table} · {result.guests} ท่าน</h2>
          <p style={{ wordBreak: 'break-all' }}>{result.url}</p>
          <button className="btn small ghost" onClick={copyLink}>{copied ? 'คัดลอกแล้ว' : 'คัดลอกลิงก์'}</button>
        </div>
        <button className="btn sage" onClick={reset}>เปิดโต๊ะใหม่</button>
      </main>
    );
  }

  return (
    <main className="wrap">
      <h1>เปิดโต๊ะ</h1>
      <div className="card">
        <label htmlFor="table">เลขโต๊ะ</label>
        <input id="table" className="input" type="number" min="1" inputMode="numeric" value={table} onChange={(e) => setTable(e.target.value)} />
        <label htmlFor="guests">จำนวนลูกค้า (ท่าน)</label>
        <input id="guests" className="input" type="number" min="1" inputMode="numeric" value={guests} onChange={(e) => setGuests(parseInt(e.target.value, 10) || 0)} />
        {error && <p className="error">{error}</p>}
        <button className="btn sage" style={{ width: '100%', marginTop: 16 }} onClick={openTable} disabled={busy}>
          {busy ? 'กำลังทำงาน...' : 'เปิดโต๊ะ'}
        </button>
      </div>

      {existing && (
        <div className="warn" role="alert">
          <strong>โต๊ะนี้มีลูกค้าอยู่ระหว่างทานอาหาร กรุณาปิดออเดอร์เดิมก่อน</strong>
          <div style={{ marginTop: 12 }}>
            <button className="btn danger" onClick={() => setConfirming(true)}>ปิดออเดอร์เดิม</button>
          </div>
        </div>
      )}

      {confirming && existing && (
        <div className="backdrop">
          <div className="modal" role="dialog" aria-modal="true">
            <h2>ปิดโต๊ะเดิมใช่ไหม</h2>
            <p>โต๊ะ {tableNum} · {existing.guest_count} ท่าน · เปิดมาแล้ว {minutes} นาที</p>
            <div className="row">
              <button className="btn ghost" onClick={() => setConfirming(false)} disabled={busy}>ยกเลิก</button>
              <button className="btn danger" onClick={closeOld} disabled={busy}>ยืนยันปิดโต๊ะเดิม</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
