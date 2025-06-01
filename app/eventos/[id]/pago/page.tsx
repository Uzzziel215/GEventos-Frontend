"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useParams, useRouter } from 'next/navigation' // Import useParams, useRouter
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Separator } from "@/components/ui/separator"
import { CreditCardIcon, BanknoteIcon as BankIcon, AlertCircleIcon } from "lucide-react"
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

export default function PagoPage() {
  const params = useParams();
  const eventoId = params.id as string;
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const api = useApi(); // Initialize useApi

  const [paymentMethod, setPaymentMethod] = useState("tarjeta");
  const [isProcessing, setIsProcessing] = useState(false);
  const [evento, setEvento] = useState<EventoDetalle | null>(null);
  const [selectedSeats, setSelectedSeats] = useState<Seat[]>([]); // Store full seat objects
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Define fixed payment method IDs for now, as per backend schema
  // In a real app, these would be fetched from a /api/metodos-pago endpoint
  const METODO_PAGO_TARJETA_ID = 1; // Example ID
  const METODO_PAGO_TRANSFERENCIA_ID = 2; // Example ID

  useEffect(() => {
    if (!isAuthenticated) {
      setError("No autorizado. Por favor, inicia sesión.");
      setLoading(false);
      router.push('/login');
      return;
    }

    // Retrieve data from localStorage
    const storedSeats = localStorage.getItem('selectedSeats');
    const storedTotal = localStorage.getItem('totalAmount');
    const storedEventDetails = localStorage.getItem('eventDetailsForPayment');

    if (storedSeats && storedTotal && storedEventDetails) {
      try {
        setSelectedSeats(JSON.parse(storedSeats));
        setTotalAmount(parseFloat(storedTotal));
        setEvento(JSON.parse(storedEventDetails));
        setLoading(false);
      } catch (e) {
        console.error("Error parsing data from localStorage:", e);
        setError("Error al cargar la información de la compra. Por favor, vuelve a seleccionar tus asientos.");
        setLoading(false);
      }
    } else {
      setError("No se encontraron asientos seleccionados o información del evento. Por favor, vuelve a seleccionar tus asientos.");
      setLoading(false);
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setError(null);

    if (!isAuthenticated || !user || !evento || selectedSeats.length === 0 || totalAmount <= 0) {
      setError("Error: Información de compra incompleta o no autenticado.");
      setIsProcessing(false);
      return;
    }

    const metodoPagoID = paymentMethod === "tarjeta" ? METODO_PAGO_TARJETA_ID : METODO_PAGO_TRANSFERENCIA_ID;

    const paymentData = {
      monto: totalAmount,
      metodoPagoID: metodoPagoID,
      referencia: `REF-${Date.now()}-${user.userId}`, // Simple unique reference
      boletos: selectedSeats.map(seat => ({
        asientoID: seat.asientoID,
        precio: parseFloat(evento.precio), // Use event's price per ticket
        usuarioID: user.userId, // Assign ticket to the paying user
      })),
    };

    try {
      const data: { pagoId: number } = await api.post(`/eventos/${eventoId}/pago`, paymentData); // Correct API endpoint

      console.log('Pago exitoso:', data);
      setIsProcessing(false);
      // Clear localStorage after successful payment
      localStorage.removeItem('selectedSeats');
      localStorage.removeItem('totalAmount');
      localStorage.removeItem('eventDetailsForPayment');

      // Redirect to confirmation page with payment ID
      router.push(`/eventos/${eventoId}/confirmacion?pagoId=${data.pagoId}`);

    } catch (err: any) {
      console.error('Error en el pago:', err);
      setError(err.message || 'Ocurrió un error inesperado durante el pago. Inténtalo de nuevo.');
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold">Cargando información de pago...</h1>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4 text-red-500">
        <h1 className="text-2xl font-bold">Error: {error}</h1>
        <p>{error}</p>
        <Link href={`/eventos/${eventoId}/asientos`}>
          <Button className="mt-4">Volver a selección de asientos</Button>
        </Link>
      </div>
    );
  }

  if (!evento || selectedSeats.length === 0 || totalAmount <= 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold">No hay información de evento o asientos para procesar el pago.</h1>
        <Link href={`/eventos/${eventoId}/asientos`}>
          <Button className="mt-4">Volver a selección de asientos</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex flex-col items-center space-y-2 text-center">
          <h1 className="text-3xl font-bold text-gray-900">Pago de Boletos</h1>
          <p className="text-gray-500">Completa tu información de pago</p>
        </div>

        <div className="grid gap-8 md:grid-cols-5">
          <div className="md:col-span-3">
            <form onSubmit={handleSubmit}>
              <Card>
                <CardHeader>
                  <CardTitle>Método de Pago</CardTitle>
                  <CardDescription>Selecciona cómo deseas pagar</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="space-y-4">
                    <div className="flex items-center space-x-2 rounded-lg border p-4 hover:bg-gray-50">
                      <RadioGroupItem value="tarjeta" id="tarjeta" />
                      <Label htmlFor="tarjeta" className="flex flex-1 cursor-pointer items-center gap-2">
                        <CreditCardIcon className="h-5 w-5" />
                        <span>Tarjeta de Crédito/Débito</span>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 rounded-lg border p-4 hover:bg-gray-50">
                      <RadioGroupItem value="transferencia" id="transferencia" />
                      <Label htmlFor="transferencia" className="flex flex-1 cursor-pointer items-center gap-2">
                        <BankIcon className="h-5 w-5" />
                        <span>Transferencia Bancaria</span>
                      </Label>
                    </div>
                  </RadioGroup>

                  {paymentMethod === "tarjeta" && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="cardName">Nombre en la tarjeta</Label>
                        <Input id="cardName" placeholder="Como aparece en la tarjeta" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cardNumber">Número de tarjeta</Label>
                        <Input id="cardNumber" placeholder="1234 5678 9012 3456" required />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="expiry">Fecha de expiración</Label>
                          <Input id="expiry" placeholder="MM/AA" required />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="cvv">CVV</Label>
                          <Input id="cvv" placeholder="123" required />
                        </div>
                      </div>
                    </div>
                  )}

                  {paymentMethod === "transferencia" && (
                    <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
                      <div className="flex items-start gap-2">
                        <AlertCircleIcon className="mt-0.5 h-5 w-5 text-blue-500" />
                        <div>
                          <h4 className="font-medium text-blue-700">Instrucciones para transferencia</h4>
                          <p className="mt-1 text-sm text-blue-600">
                            Realiza una transferencia a la siguiente cuenta bancaria y envía el comprobante al correo
                            eventos@itminatitlan.edu.mx
                          </p>
                          <div className="mt-3 space-y-1 text-sm">
                            <p>
                              <span className="font-medium">Banco:</span> Banco Nacional de México
                            </p>
                            <p>
                              <span className="font-medium">Cuenta:</span> 0123456789
                            </p>
                            <p>
                              <span className="font-medium">CLABE:</span> 012345678901234567
                            </p>
                            <p>
                              <span className="font-medium">Beneficiario:</span> Instituto Tecnológico de Minatitlán
                            </p>
                            <p>
                              <span className="font-medium">Referencia:</span> EVENTO-{eventoId}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
                <CardFooter>
                  <Button type="submit" className="w-full" disabled={isProcessing}>
                    {isProcessing ? "Procesando..." : `Pagar $${totalAmount.toFixed(2)} MXN`}
                  </Button>
                </CardFooter>
              </Card>
            </form>
          </div>

          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Resumen de compra</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium">Evento</h4>
                  <p className="text-gray-600">{evento?.nombre}</p>
                </div>
                <div>
                  <h4 className="font-medium">Fecha y hora</h4>
                  <p className="text-gray-600">
                    {evento?.fecha}, {evento?.horainicio} - {evento?.horafin}
                  </p>
                </div>
                <div>
                  <h4 className="font-medium">Asientos seleccionados</h4>
                  <ul className="ml-4 list-disc text-gray-600">
                    {selectedSeats.length > 0 ? (
                      selectedSeats.map((seat) => (
                        <li key={seat.asientoID}>{seat.codigo}</li>
                      ))
                    ) : (
                      <li>No hay asientos seleccionados</li>
                    )}
                  </ul>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span>Precio por boleto:</span>
                  <span>${parseFloat(evento?.precio || '0').toFixed(2)} MXN</span>
                </div>
                <div className="flex justify-between">
                  <span>Cantidad:</span>
                  <span>{selectedSeats.length}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span>${totalAmount.toFixed(2)} MXN</span>
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full" asChild>
                  <Link href={`/eventos/${eventoId}/asientos`}>Volver a selección de asientos</Link>
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
