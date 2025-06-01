"use client";

import './globals.css'
import { AuthProvider, useAuth } from '../context/AuthContext';
import { Button } from "@/components/ui/button";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <LayoutContent>{children}</LayoutContent>
        </AuthProvider>
      </body>
    </html>
  )
}

function LayoutContent({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, logout } = useAuth();

  return (
    <>
      {isAuthenticated && (
        <header className="bg-gray-800 text-white p-4 flex justify-end">
          <Button onClick={logout} variant="destructive">Cerrar Sesión</Button>
        </header>
      )}
      {children}
    </>
  );
}
