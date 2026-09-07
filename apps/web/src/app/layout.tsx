import { AuthProvider } from '@/context/AuthContext';
import './globals.css';

export const metadata = {
  title: 'SkillSync',
  description: 'Intelligent platform for skills discovery and career development',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}