"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InfoIcon } from "lucide-react";

interface Seat {
  asientoid: number;
  areaid: number;
  fila: string;
  columna: number;
  estado: string; // e.g., 'Disponible', 'Ocupado', 'Reservado'
  precio?: string; // Price specific to this seat if any
}

interface LayoutConfig {
  // Define properties based on your backend layoutConfig structure
  // Example: rows, columns, sections, etc.
  [key: string]: any; // Use a more specific type if you know the structure
}

interface EventLayoutData {
  layoutConfig: LayoutConfig | null;
  seats: Seat[];
}

export default function EventLayoutPage() {
  const params = useParams();
  const eventoId = params.id;

  const [layoutData, setLayoutData] = useState<EventLayoutData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!eventoId) return;

    const fetchLayout = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem("jwtToken");
        if (!token) {
          setError("Authentication token not found. Please log in.");
          setIsLoading(false);
          return;
        }

        const response = await fetch(`http://localhost:3001/api/eventos/${eventoId}/layout`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          let errorMsg = 'Failed to fetch event layout';
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

        const data: EventLayoutData = await response.json();
        setLayoutData(data);
      } catch (err: any) {
        console.error("Error fetching event layout:", err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLayout();
  }, [eventoId]);

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center">Cargando layout...</div>;
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <p className="text-red-500">Error: {error}</p>
        <Link href={`/eventos/${eventoId}`}>
          <Button className="mt-4">Volver a Detalles del Evento</Button>
        </Link>
      </div>
    );
  }

  if (!layoutData || !layoutData.seats || layoutData.seats.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <p>No se encontraron datos de layout o asientos para este evento.</p>
        <Link href={`/eventos/${eventoId}`}>
          <Button className="mt-4">Volver a Detalles del Evento</Button>
        </Link>
      </div>
    );
  }

  // Determinar el color del asiento según su estado
  const getSeatColor = (estado: string) => {
    switch (estado) {
      case 'DISPONIBLE':
        return 'bg-green-500';
      case 'OCUPADO':
        return 'bg-red-500';
      case 'RESERVADO':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500'; // Default color for unknown states
    }
  };

  // Group seats by area for rendering
  const seatsByArea = layoutData.seats.reduce((acc, seat) => {
    if (!acc[seat.areaid]) {
      acc[seat.areaid] = [];
    }
    acc[seat.areaid].push(seat);
    return acc;
  }, {} as Record<number, Seat[]>);

  // Basic sorting within areas (optional, adjust as needed)
  // Iterate over the values (arrays of seats) directly instead of keys
  Object.values(seatsByArea).forEach(areaSeats => {
    areaSeats.sort((a, b) => {
      if (a.fila < b.fila) return -1;
      if (a.fila > b.fila) return 1;
      return a.columna - b.columna;
    });
  });

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-col items-center space-y-2 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Layout del Evento</h1>
          <p className="text-sm text-gray-500">Visualización de la disposición y estado de los asientos</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Configuración del Layout</CardTitle>
            <CardDescription>Detalles sobre la configuración de áreas y asientos.</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Render layoutConfig details here */}
            {layoutData.layoutConfig ? (
              <pre className="overflow-auto rounded border bg-gray-100 p-4 text-sm">
                {JSON.stringify(layoutData.layoutConfig, null, 2)}
              </pre>
            ) : (
              <p>No hay configuración de layout específica disponible.</p>
            )}
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Asientos</CardTitle>
            <CardDescription>Selecciona tus asientos deseados.</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Color legend */}
            <div className="mb-4 flex flex-wrap items-center justify-center gap-4">
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded-full bg-green-500"></div>
                <span className="text-sm">Disponible</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded-full bg-red-500"></div>
                <span className="text-sm">Ocupado</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded-full bg-yellow-500"></div>
                <span className="text-sm">Reservado</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded-full bg-gray-500"></div>
                <span className="text-sm">Desconocido</span>
              </div>
            </div>

            {/* Render Areas and Seats */}
            <div className="space-y-8">
              {/* Iterate over the keys for rendering area cards */}
              {Object.keys(seatsByArea).map(areaIdString => {
                const areaId = Number(areaIdString); // Convert key string back to number
                const areaSeats = seatsByArea[areaId]; // Get the array of seats for this area
                
                // Ensure areaSeats is not undefined before rendering (though the sort fix should prevent this error)
                if (!areaSeats || areaSeats.length === 0) return null; 

                return (
                  <div key={areaId} className="rounded-lg border p-4">
                    <h3 className="mb-4 text-center text-lg font-semibold">Area {areaId}</h3>
                    {/* Simple grid for seats within an area - adjust styling as needed */}
                    {/* You might need more complex positioning based on your layoutConfig */}
                    <div className="flex flex-wrap justify-center gap-x-2 gap-y-3">
                      {/* --- START: Add rendering for individual seats --- */}
                      {areaSeats.map(seat => (
                        <div 
                          key={seat.asientoid}
                          className={`h-8 w-8 rounded-sm border text-xs flex items-center justify-center 
                            ${getSeatColor(seat.estado)}
                            ${seat.estado !== 'Ocupado' ? 'cursor-pointer hover:opacity-80' : 'opacity-50 cursor-not-allowed'}
                          `}
                          title={`Asiento ${seat.fila}${seat.columna} - Estado: ${seat.estado}`}
                          // Add onClick handler for selection if needed here or in a separate 'asientos' page
                        >
                          {/* Display seat identifier */}
                          <span className="text-white font-bold text-center text-[10px]">{seat.fila}{seat.columna}</span> {/* Display row+column */}
                        </div>
                      ))}
                       {/* --- END: Add rendering for individual seats --- */}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Example: Stage representation */}
            <div className="mt-8 flex items-center justify-center">
              <Badge variant="outline" className="flex items-center gap-1 px-3 py-1 text-sm">
                <InfoIcon className="h-4 w-4" />
                <span>Escenario</span>
              </Badge>
            </div>

          </CardContent>
        </Card>

        <div className="pt-6 text-center">
          <Link href={`/eventos/${eventoId}`} passHref>
            <Button variant="outline">Volver a Detalles del Evento</Button>
          </Link>
        </div>

      </div>
    </div>
  );
}
