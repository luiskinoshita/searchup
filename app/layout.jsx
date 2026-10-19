import './globals.css';

export const metadata = {
  title: 'SnagMap — Ache ofertas. Compartilhe achados. Revenda melhor.',
  description: 'Comunidade de revendedores no Japão: ofertas perto de você, achados dos alunos e parcerias.',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [{ url: '/favicon-48.png', sizes: '48x48' }, { url: '/icon-192.png', sizes: '192x192' }],
    apple: '/apple-touch-icon.png',
  },
  appleWebApp: { capable: true, title: 'SnagMap', statusBarStyle: 'default' },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#FAFBFC',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&family=Noto+Sans+JP:wght@400;500;700&family=Roboto:wght@400&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
