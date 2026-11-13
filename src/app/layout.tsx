import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Alpha - Smart Mess & Kitchen Management System',
  description: 'Predictive meal demand forecasting, kitchen preparation planning, and food waste reduction platform',
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased bg-[#F4F7FE] text-slate-800">{children}</body>
    </html>
  );
}
