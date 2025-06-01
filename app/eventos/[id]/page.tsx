"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface Evento {
  eventoid: number;
  nombre: string;
  descripcion?: string;
  fecha: string;
  horainicio: string; // Changed from hora to horainicio
  horafin: string; // Added horafin
  lugarid: number;
  organizadorid: number;
  estado: string;
  capacidad: number;
  precio: string; // Assuming price comes as a string or number
  imagen?: string; // Optional image URL
  lugarnombre: string; // Added lugarnombre
  organizadornombre: string; // Added organizadornombre
}

export default function EventDetailsPage() {
  const params = useParams();
  const eventoid = params.id; // Changed to eventoid to match interface

  const [evento, setEvento] = useState<Evento | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!eventoid) return;

    const fetchEvent = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem("jwtToken");
        if (!token) {
          setError("Authentication token not found. Please log in.");
          setIsLoading(false);
          return;
        }

        const response = await fetch(`http://localhost:3001/api/eventos/${eventoid}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          let errorMsg = 'Failed to fetch event';
           try {
            // Try to parse JSON error response
            const errorData = await response.json();
            errorMsg = errorData.message || errorMsg;
          } catch (e) {
            // If JSON parsing fails, read response as text
            try {
              const errorText = await response.text();
               errorMsg = `Error ${response.status}: ${errorText || errorMsg}`; // Include status and text
            } catch (eText) {
               errorMsg = `Error ${response.status}: ${errorMsg}`; // Just include status if text reading fails
            }
          }
          throw new Error(errorMsg);
        }

        const data = await response.json();
        console.log("Datos del evento recibidos:", data); // Add console.log here
        setEvento(data);
      } catch (err: any) {
        console.error("Error fetching event:", err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvent();
  }, [eventoid]);

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center">Loading event...</div>;
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <p className="text-red-500">Error: {error}</p>
        <Link href="/eventos">
          <Button className="mt-4">Back to Events</Button>
        </Link>
      </div>
    );
  }

  if (!evento) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <p>Event not found.</p>
        <Link href="/eventos">
          <Button className="mt-4">Back to Events</Button>
        </Link>
      </div>
    );
  }

  // Format date and time
  const eventDate = new Date(evento.fecha).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
  const eventTime = `${evento.horainicio.substring(0, 5)} - ${evento.horafin.substring(0, 5)}`;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>{evento.nombre}</CardTitle>
            <CardDescription>Detalles para {evento.nombre}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold">Descripción:</h3>
              <p>{evento.descripcion || 'No se proporcionó descripción.'}</p>
            </div>
            <div>
              <h3 className="font-semibold">Fecha:</h3>
              <p>{eventDate}</p>
            </div>
            <div>
              <h3 className="font-semibold">Hora:</h3>
              <p>{eventTime}</p>
            </div>
            <div>
              <h3 className="font-semibold">Lugar:</h3>
              <p>
                {(evento.lugarnombre && evento.lugarnombre.trim() !== '') ? evento.lugarnombre : 'Lugar no disponible'}
              </p>
            </div>
            <div>
              <h3 className="font-semibold">Organizador:</h3>
              <p>
                {(evento.organizadornombre && evento.organizadornombre.trim() !== '') ? evento.organizadornombre : 'Organizador no disponible'}
              </p>
            </div>
            <div>
              <h3 className="font-semibold">Estado:</h3>
              <p>{evento.estado}</p>
            </div>
            <div>
              <h3 className="font-semibold">Capacidad:</h3>
              <p>{evento.capacidad}</p>
            </div>
            <div>
              <h3 className="font-semibold">Precio:</h3>
              <p>${parseFloat(evento.precio).toFixed(2)} MXN</p>
            </div>
            
            {/* Add a link to the layout page */}
            <Link href={`/eventos/${evento.eventoid}/layout`} passHref>
              <Button className="mt-4">Ver Layout de Asientos</Button>
            </Link>

            <div className="pt-4">
              <Link href="/eventos">
                <Button variant="outline">Volver a Eventos</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
