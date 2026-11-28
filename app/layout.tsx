import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/components/auth-provider';
import { ThemeProvider } from '@/components/theme-provider';
import { ProfileBanner } from '@/components/profile-banner';
import { Navbar } from '@/components/navbar';
import { WorkspaceStrip } from '@/components/workspace-strip';
import { Footer } from '@/components/footer';
import { Toaster } from '@/components/ui/toaster';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: {
    default: 'Forge — Find your people. Build something real.',
    template: '%s — Forge',
  },
  description:
    'Forge helps students discover project teams, find collaborators who share their interests, and build something real together.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          <AuthProvider>
            <div className="flex min-h-screen flex-col">
              <a href="#main-content" className="sr-only focus:not-sr-only focus:p-3">Skip to content</a>
              <Navbar />
              <ProfileBanner />
              <WorkspaceStrip />
              <main id="main-content" className="flex-1">{children}</main>
              <Footer />
            </div>
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
