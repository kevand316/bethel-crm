import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Bethel CRM',
  description: 'Contact management, email, and SMS for Bethel Residency',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
