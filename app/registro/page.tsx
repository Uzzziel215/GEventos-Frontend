"use client";

import { useState, useEffect } from "react";
import Link from "next/link"
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import Image from "next/image"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from '@/context/AuthContext'; // Import useAuth
import { useApi } from '@/lib/api'; // Import useApi

export default function RegistroPage() {
  const [nombre, setNombre] = useState("");
  const [correoElectronico, setCorreoElectronico] = useState("");
  const [contraseña, setContraseña] = useState("");
  const [confirmarContraseña, setConfirmarContraseña] = useState("");
  const [telefono, setTelefono] = useState("");
  const [role, setRole] = useState("ASISTENTE");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const router = useRouter();
  const { isAuthenticated } = useAuth(); // Use the auth context
  const api = useApi(); // Initialize useApi

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/eventos'); // Redirect if already authenticated
    }
  }, [isAuthenticated, router]);

  const handleRegistro = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsLoading(true);

    if (contraseña !== confirmarContraseña) {
      setError("Las contraseñas no coinciden.");
      setIsLoading(false);
      return;
    }

    try {
      const data = await api.post('/auth/register', {
        nombre,
        correoElectronico,
        contraseña,
        telefono,
        role: role.toUpperCase(),
      });

      setSuccess("¡Registro exitoso! Ahora puedes iniciar sesión.");
      // Based on authRoutes.js, /register does NOT return a token, so we just show success message.
      setNombre('');
      setCorreoElectronico('');
      setContraseña('');
      setConfirmarContraseña('');
      setTelefono('');
      setRole('ASISTENTE');

    } catch (err: any) {
      console.error('Error durante el registro:', err);
      setError(err.message || 'Error en el registro');
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
            <CardTitle>Registro de Usuario</CardTitle>
            <CardDescription>Crea una nueva cuenta para acceder al sistema</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleRegistro} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre completo</Label>
                <Input id="nombre" placeholder="Juan Pérez" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico</Label>
                <Input id="email" type="email" placeholder="correo@ejemplo.com" value={correoElectronico} onChange={(e) => setCorreoElectronico(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefono">Número de teléfono (opcional)</Label>
                <Input id="telefono" placeholder="123-456-7890" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
            </div>
            <div className="space-y-2">
                <Label htmlFor="rol">Rol</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger id="rol">
                    <SelectValue placeholder="Selecciona un rol" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ASISTENTE">Asistente</SelectItem>
                    <SelectItem value="ORGANIZADOR">Organizador</SelectItem>
                  </SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
                <Input id="password" type="password" value={contraseña} onChange={(e) => setContraseña(e.target.value)} required minLength={8} />
              <p className="text-xs text-gray-500">
                  La contraseña debe tener al menos 8 caracteres.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
                <Input id="confirmPassword" type="password" value={confirmarContraseña} onChange={(e) => setConfirmarContraseña(e.target.value)} required minLength={8} />
            </div>

              {error && <p className="text-red-500 text-sm">{error}</p>}
              {success && <p className="text-green-500 text-sm">{success}</p>}

              <CardFooter className="flex flex-col space-y-4 p-0 pt-4">
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Registrando..." : "Registrarse"}
                </Button>
            <p className="text-center text-sm">
              ¿Ya tienes una cuenta?{" "}
              <Link href="/login" className="text-primary hover:underline">
                Iniciar sesión
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
