"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useParams, useRouter } from 'next/navigation' // Import useParams and useRouter
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { InfoIcon } from "lucide-react"
import { useAuth } from '@/context/AuthContext'; // Import useAuth
import { useApi } from '@/lib/api'; // Import useApi

interface EventoDetalle {
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
  precio: string;
  imagen?: string;
  lugarnombre: string;
  organizadornombre: string;
}

interface Seat {
  asientoID: number;
  codigo: string;
  fila: string;
  columna: string;
  estado: string; // e.g., 'DISPONIBLE', 'OCUPADO', 'RESERVADO'
  areaID: number;
}

interface LayoutConfig {
  // Define the structure of your layout configuration here
  // This will depend on how you store the croquis JSON
  [key: string]: any;
}

export default function AsientosPage() {
  const [selectedSeats, setSelectedSeats] = useState<Seat[]>([])
  const [evento, setEvento] = useState<EventoDetalle | null>(null)
  const [layoutConfig, setLayoutConfig] = useState<LayoutConfig | null>(null)
  const [allSeats, setAllSeats] = useState<Seat[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const params = useParams()
  const eventoId = params.id as string
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const api = useApi(); // Initialize useApi

  useEffect(() => {
    const fetchEventAndLayoutData = async () => {
      if (!isAuthenticated) {
        setError("No autorizado. Por favor, inicia sesión.");
        setLoading(false);
        router.push('/login');
        return;
      }

      try {
        // Fetch event details
        const eventData = await api.get<EventoDetalle>(`/eventos/${eventoId}`);
        setEvento(eventData);

        // Fetch layout and seats data
        const layoutData = await api.get<{ layoutConfig: LayoutConfig | null; seats: Seat[] }>(`/eventos/${eventoId}/layout`);
        setLayoutConfig(layoutData.layoutConfig);
        setAllSeats(layoutData.seats);

      } catch (err: any) {
        console.error('Error al cargar datos del evento y layout:', err);
        // useApi already handles 401/403 and redirects/logs out
        setError(err.message || 'Error al intentar cargar los datos del evento. Inténtalo de nuevo más tarde.');
      } finally {
        setLoading(false);
      }
    }

    if (eventoId) {
      fetchEventAndLayoutData();
    }
  }, [eventoId, isAuthenticated, router, api]); // Add api to dependency array

  // Manejar la selección de asientos
  const toggleSeat = (seat: Seat) => {
    if (seat.estado === "OCUPADO" || seat.estado === "RESERVADO") return; // Use uppercase for consistency

    if (selectedSeats.some(s => s.asientoID === seat.asientoID)) {
      setSelectedSeats(selectedSeats.filter((s) => s.asientoID !== seat.asientoID));
    } else {
      setSelectedSeats([...selectedSeats, seat]);
    }
  };

  // Determinar el color del asiento según su estado
  const getSeatColor = (seat: Seat) => {
    if (seat.estado === "OCUPADO" || seat.estado === "RESERVADO") return "bg-red-500";
    if (selectedSeats.some(s => s.asientoID === seat.asientoID)) return "bg-blue-500";
    return "bg-green-500";
  };

  // Calcular el total (usando el precio del evento real)
  const total = selectedSeats.length * parseFloat(evento?.precio || '0');

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold">Cargando datos del evento y asientos...</h1>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4 text-red-500">
        <h1 className="text-2xl font-bold">Error al Cargar Datos</h1>
        <p>{error}</p>
      </div>
    )
  }

  // Helper to group seats by areaID
  const seatsByArea = allSeats.reduce((acc, seat) => {
    const areaId = seat.areaID;
    if (!acc[areaId]) {
      acc[areaId] = [];
    }
    acc[areaId].push(seat);
    return acc;
  }, {} as Record<number, Seat[]>);

  // Convert grouped seats object to an array for mapping
  const areasWithSeats = Object.keys(seatsByArea).map(areaId => ({
    id: parseInt(areaId),
    nombre: layoutConfig?.[areaId]?.nombre || `Área ${areaId}`, // Use layoutConfig for area name if available
    seats: seatsByArea[parseInt(areaId)]
  }));

  if (!evento || allSeats.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold">No se encontraron datos de evento o asientos para este evento.</h1>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col items-center space-y-2 text-center">
          <h1 className="text-3xl font-bold text-gray-900">Selección de Asientos</h1>
          <p className="text-gray-500">{evento.nombre}</p>
        </div>

        <div className="mb-6 flex flex-wrap items-center justify-center gap-4">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded-full bg-green-500"></div>
            <span className="text-sm">Disponible</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded-full bg-red-500"></div>
            <span className="text-sm">Ocupado</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded-full bg-blue-500"></div>
            <span className="text-sm">Seleccionado</span>
          </div>
        </div>

        <div className="mb-8 flex flex-col gap-8 lg:flex-row">
          <div className="flex-1 overflow-auto rounded-lg bg-white p-6 shadow-md">
            <div className="mb-4 flex items-center justify-center">
              <Badge variant="outline" className="flex items-center gap-1 px-3 py-1 text-sm">
                <InfoIcon className="h-4 w-4" />
                <span>Escenario</span>
              </Badge>
            </div>

            <div className="mt-8 flex flex-col items-center gap-10">
              {areasWithSeats.map((area) => (
                <div key={area.id} className="relative">
                  <div className="mb-2 text-center text-sm font-medium">{area.nombre}</div>
                  <div className="mt-2 flex flex-wrap justify-center gap-2">
                    {area.seats && area.seats.map((seat) => (
                      <button
                        key={seat.asientoID}
                        className={`h-8 w-8 rounded-full ${getSeatColor(seat)} transition-colors hover:opacity-80`}
                        onClick={() => toggleSeat(seat)}
                        disabled={seat.estado === "OCUPADO" || seat.estado === "RESERVADO"}
                        title={seat.codigo}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Card className="w-full lg:w-80">
            <CardHeader>
              <CardTitle>Resumen de selección</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="mb-2 font-medium">Evento:</div>
                <div>{evento.nombre}</div>
              </div>
              <div>
                <div className="mb-2 font-medium">Fecha y hora:</div>
                <div>
                  {evento.fecha} {evento.horainicio} - {evento.horafin}
                </div>
              </div>
              <div>
                <div className="mb-2 font-medium">Asientos seleccionados ({selectedSeats.length}):</div>
                {selectedSeats.length > 0 ? (
                  <ul className="ml-4 list-disc">
                    {selectedSeats.map((seat) => (
                      <li key={seat.asientoID}>{seat.codigo}</li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-gray-500">Ningún asiento seleccionado</div>
                )}
              </div>
              <div className="pt-4 text-lg font-bold">Total: ${total.toFixed(2)} MXN</div>
            </CardContent>
            <CardFooter className="flex flex-col gap-2">
              <Button
                className="w-full"
                disabled={selectedSeats.length === 0}
                onClick={() => {
                  if (evento) {
                    localStorage.setItem('selectedSeats', JSON.stringify(selectedSeats));
                    localStorage.setItem('totalAmount', total.toFixed(2));
                    localStorage.setItem('eventDetailsForPayment', JSON.stringify({
                      eventoid: evento.eventoid,
                      nombre: evento.nombre,
                      precio: evento.precio,
                      fecha: evento.fecha,
                      horainicio: evento.horainicio,
                      horafin: evento.horafin,
                      lugarnombre: evento.lugarnombre,
                    }));
                    router.push(`/eventos/${eventoId}/pago`);
                  }
                }}
              >
                Confirmar Selección
              </Button>
              <Button variant="outline" className="w-full" asChild>
                <Link href="/eventos">Cancelar</Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  )
}
