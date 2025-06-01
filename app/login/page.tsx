"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import Image from "next/image"
import { useAuth } from '@/context/AuthContext'; // Import useAuth
import { useApi } from '@/lib/api'; // Import useApi

export default function LoginPage() {
  const [correoElectronico, setCorreoElectronico] = useState("");
  const [contraseña, setContraseña] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const router = useRouter();
  const { login, isAuthenticated } = useAuth(); // Use the auth context
  const api = useApi(); // Initialize useApi

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/eventos'); // Redirect if already authenticated
    }
  }, [isAuthenticated, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const data: { token: string } = await api.post('/auth/login', {
        correoElectronico,
        contraseña,
      });

      const { token } = data;

      login(token); // Use the login function from AuthContext
      // Redirection is now handled by the useEffect in AuthContext or by the component that uses useAuth

    } catch (err: any) {
      console.error('Error during login:', err);
      setError(err.message || 'Error en el inicio de sesión'); // Use err.message for API errors
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center space-y-2 text-center">
          <Image
            src="/placeholder.svg?height=80&width=80"
            alt="Instituto Tecnológico de Minatitlán"
            width={80}
            height={80}
            className="mb-2"
          />
          <h1 className="text-2xl font-bold text-gray-900">Sistema de Gestión de Eventos</h1>
          <p className="text-sm text-gray-500">Instituto Tecnológico de Minatitlán</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Iniciar Sesión</CardTitle>
            <CardDescription>Ingresa tus credenciales para acceder al sistema</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="email">Correo electrónico</Label>
                <Input id="email" type="email" placeholder="correo@ejemplo.com" value={correoElectronico} onChange={(e) => setCorreoElectronico(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Contraseña</Label>
                <Link href="/recuperar-contrasena" className="text-xs text-primary hover:underline">
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
                <Input id="password" type="password" value={contraseña} onChange={(e) => setContraseña(e.target.value)} required />
            </div>

              {error && <p className="text-red-500 text-sm">{error}</p>}

              <CardFooter className="flex flex-col space-y-4 p-0 pt-4">
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Iniciando Sesión..." : "Iniciar Sesión"}
                </Button>
            <p className="text-center text-sm">
              ¿No tienes una cuenta?{" "}
              <Link href="/registro" className="text-primary hover:underline">
                Regístrate aquí
              </Link>
            </p>
          </CardFooter>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
