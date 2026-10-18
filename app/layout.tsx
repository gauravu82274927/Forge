import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/components/auth-provider';
import { ThemeProvider } from '@/components/theme-provider';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { Toaster } from '@/components/ui/toaster';
import { ForgeAssistant } from '@/components/forge-assistant';
import { PostHogProvider } from '@/components/posthog-provider';

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
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
            <PostHogProvider>
              <AuthProvider>
                <div className="flex min-h-screen flex-col">
                  <Navbar />
                  <main className="flex-1">{children}</main>
                  <Footer />
                </div>
                <Toaster />
                <ForgeAssistant />
              </AuthProvider>
            </PostHogProvider>
          </ThemeProvider>
      </body>
    </html>
  );
}
