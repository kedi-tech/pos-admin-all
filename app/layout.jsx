import './globals.css';

export const metadata = {
  title: 'Kedi-POS',
  description: 'Control tower — Kedi-POS',
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `try{const t=localStorage.getItem('asg-theme');if(t==='dark')document.documentElement.classList.add('dark');}catch(e){}` }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
