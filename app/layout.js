import { Mali, Sarabun } from 'next/font/google';
import './globals.css';

const head = Mali({ subsets: ['thai', 'latin'], weight: ['500', '700'], variable: '--font-head' });
const body = Sarabun({ subsets: ['thai', 'latin'], weight: ['400', '600', '700'], variable: '--font-body' });

export const metadata = {
  title: 'Pawfect Café',
  description: 'ระบบสั่งอาหารด้วย QR Code และจอครัว',
};

export default function RootLayout({ children }) {
  return (
    <html lang="th" className={`${head.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
