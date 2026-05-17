import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ProblemMarket',
  description: 'A marketplace for the world\'s most valuable unsolved problems.',
};

// This layout wraps the dynamic Next.js routes (/admin, /dashboard, /login,
// /pledge/confirm, /cases). The marketing landing at `/` is served as a static
// HTML file from public/ via next.config.js rewrite — it carries its own
// <html>/<head> and does not use this layout.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,400;9..144,600&family=JetBrains+Mono:wght@400;500&family=Newsreader:opsz,wght@6..72,300;6..72,400;6..72,500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
