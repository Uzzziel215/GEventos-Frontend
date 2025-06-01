"use client";

import { useState, useEffect } from "react";
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CalendarIcon, MapPinIcon, ClockIcon, SearchIcon } from "lucide-react"
import Image from "next/image"
import { useAuth } from '@/context/AuthContext'; // Import useAuth
import { useRouter } from 'next/navigation'; // Import useRouter
import { useApi } from '@/lib/api'; // Import useApi

interface Evento {
  eventoid: number;
  nombre: string;
  descripcion?: string;
  fecha: string;
  horainicio: string;
  horafin: string;
  lugarid: number;
  organizadorid: number;
  estado: string;
  capacidad: number;
  precio: string; // Assuming price comes as a string or number
  imagen?: string; // Optional image URL
  lugarnombre: string; // Added lugarnombre to match backend
}

export default function EventosPage() {
  console.log("Valor de NEXT_PUBLIC_IMAGE_BASE_URL en Vercel:", process.env.NEXT_PUBLIC_IMAGE_BASE_URL);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated } = useAuth(); // Use the auth context
  const router = useRouter();
  const api = useApi(); // Initialize useApi

  useEffect(() => {
    const fetchEvents = async () => {
      if (!isAuthenticated) { // No need to check token here, useApi handles it
        setError("No autorizado. Por favor, inicia sesión.");
        setLoading(false);
        router.push('/login'); // Redirect to login if not authenticated
        return;
      }

      try {
        const data = await api.get<Evento[]>('/eventos'); // Use api.get

        setEventos(data);
      } catch (err: any) {
        console.error('Error fetching events:', err);
        // useApi already handles 401/403 and redirects/logs out
        setError(err.message || 'Error al cargar los eventos');
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [isAuthenticated, router, api]); // Add api to dependency array

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center">Cargando eventos...</div>;
  }

  if (error) {
    return <div className="flex min-h-screen items-center justify-center text-red-500">Error: {error}</div>;
  }

  if (eventos.length === 0) {
      return <div className="flex min-h-screen items-center justify-center">No se encontraron eventos.</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col items-center space-y-2 text-center">
          <h1 className="text-3xl font-bold text-gray-900">Eventos Disponibles</h1>
          <p className="text-gray-500">Selecciona un evento para comprar boletos</p>
        </div>

        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input placeholder="Buscar eventos..." className="pl-10" />
          </div>
          <div className="flex flex-col gap-4 sm:flex-row">
            <Select>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filtrar por fecha" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hoy">Hoy</SelectItem>
                <SelectItem value="semana">Esta semana</SelectItem>
                <SelectItem value="mes">Este mes</SelectItem>
                <SelectItem value="todos">Todos</SelectItem>
              </SelectContent>
            </Select>
            <Select>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Tipo de evento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="conferencia">Conferencias</SelectItem>
                <SelectItem value="taller">Talleres</SelectItem>
                <SelectItem value="ceremonia">Ceremonias</SelectItem>
                <SelectItem value="todos">Todos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {eventos.map((evento) => (
            <Card key={evento.eventoid} className="overflow-hidden">
              <Link href={`/eventos/${evento.eventoid}`} passHref>
              <div className="w-full overflow-hidden" style={{ aspectRatio: '2 / 1' }}>
                <Image
                  src={evento.imagen ? `${process.env.NEXT_PUBLIC_IMAGE_BASE_URL || 'http://localhost:3001/uploads/events/'}${evento.imagen}` : "/placeholder.svg"}
                  alt={evento.nombre}
                  width={400}
                  height={200}
                  className="h-full w-full object-cover transition-transform hover:scale-105"
                />
              </div>
              <CardHeader>
                <CardTitle className="line-clamp-2">{evento.nombre}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <CalendarIcon className="h-4 w-4" />
                    <span>{new Date(evento.fecha).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <ClockIcon className="h-4 w-4" />
                    <span>{evento.horainicio} - {evento.horafin}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <MapPinIcon className="h-4 w-4" />
                    <span>{evento.lugarnombre || "Lugar no disponible"}</span> {/* Use lugarnombre */}
                </div>
                  <div className="mt-2 font-semibold">Precio: ${parseFloat(evento.precio).toFixed(2)} MXN</div>
              </CardContent>
              </Link>
              <CardFooter>
                <Link href={`/eventos/${evento.eventoid}/asientos`} className="w-full">
                  <Button className="w-full">Comprar Boletos</Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
