import type { Metadata } from 'next';
import './globals.css';

// Import configuration validator
import { logConfigStatus } from '@/lib/trip/config-validator';

// Log configuration status on server startup
if (typeof window === 'undefined') {
  // Server-side only
  logConfigStatus();
}

export const metadata: Metadata = {
  title: 'Trip Itinerary Compiler',
  description:
    'Turn messy notes, spreadsheets, and calendar exports into a reviewed multi-day itinerary.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-slate-900 antialiased">{children}</body>
    </html>
  );
}
