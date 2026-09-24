import Link from 'next/link';

export default function Home() {
  return (
    <main className="full">
      <h1 style={{ fontSize: 40 }}>Pawfect Café</h1>
      <p className="muted">คาเฟ่สัตว์เลี้ยงสุดอบอุ่น — ระบบสั่งอาหารด้วย QR Code</p>
      <div style={{ display: 'flex', gap: 12, marginTop: 20, flexWrap: 'wrap', justifyContent: 'center' }}>
        <Link href="/generate-qr" className="btn sage" style={{ textDecoration: 'none', color: '#fff' }}>สร้าง QR เปิดโต๊ะ</Link>
        <Link href="/kitchen" className="btn" style={{ textDecoration: 'none', color: '#fff' }}>จอครัว</Link>
      </div>
    </main>
  );
}
