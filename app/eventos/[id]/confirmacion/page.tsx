"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useSearchParams, useRouter } from 'next/navigation' // Import useSearchParams and useRouter
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { CheckCircleIcon, DownloadIcon, MailIcon, HomeIcon, Loader2 as LoaderIcon, AlertCircleIcon } from "lucide-react"
import Image from "next/image"
import { useAuth } from '@/context/AuthContext'; // Import useAuth
import { useApi } from '@/lib/api'; // Import useApi

interface BoletoDetalle {
  boletid: number;
  codigoqr: string;
  asientoid: number;
  asientocodigo?: string; // Assuming this might come from a join
  precio: string;
  estado: string;
}

interface PaymentDetails {
  pagoid: number;
  eventoid: number;
  eventonombre: string; // Renamed from eventname for consistency
  fechapago: string;
  montototal: string; // Renamed from monto for consistency
  metodopago: string;
  referenciatransaccion: string;
  lugarnombre: string; // Renamed from locationname for consistency
  eventofecha: string; // Added event date
  eventohorainicio: string; // Added event start time
  eventohorafin: string; // Added event end time
  boletos: BoletoDetalle[];
}

export default function ConfirmacionPage() {
  const searchParams = useSearchParams();
  const pagoId = searchParams.get('pagoId');
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const api = useApi(); // Initialize useApi

  const [email, setEmail] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!pagoId) {
      setError("No se encontró el ID de pago en la URL.");
      setIsLoading(false);
      return;
    }

    const fetchPaymentDetails = async () => {
      if (!isAuthenticated) {
        setError("No autorizado. Por favor, inicia sesión.");
        setIsLoading(false);
        router.push('/login');
        return;
      }

      try {
        const data = await api.get<PaymentDetails>(`/pagos/${pagoId}`); // Use api.get
        setPaymentDetails(data);
      } catch (err: any) {
        console.error("Error fetching payment details:", err);
        // useApi already handles 401/403 and redirects/logs out
        setError(err.message || "Ocurrió un error al cargar los detalles del pago.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPaymentDetails();
  }, [pagoId, isAuthenticated, router, api]); // Add api to dependency array

  const handleSendEmail = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);

    // TODO: Implement actual email sending logic via backend API
    console.log("Simulando envío de correo a:", email);

    // Simulación de envío de correo
    setTimeout(() => {
      setIsSending(false);
      setEmailSent(true);
    }, 1500);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <LoaderIcon className="h-8 w-8 animate-spin text-gray-500" />
        <span className="ml-2 text-gray-500">Cargando detalles del pago...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <div className="text-center text-red-600">
          <AlertCircleIcon className="mx-auto h-12 w-12 mb-4" />
          <h1 className="text-2xl font-bold">Error</h1>
          <p>{error}</p>
          <Button variant="outline" className="mt-4" asChild>
            <Link href="/eventos">
              <HomeIcon className="mr-2 h-4 w-4" />
              Volver a eventos
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!paymentDetails) {
     return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <div className="text-center text-gray-600">
          <AlertCircleIcon className="mx-auto h-12 w-12 mb-4" />
          <h1 className="text-2xl font-bold">Detalles no disponibles</h1>
          <p>No se pudieron cargar los detalles del pago.</p>
           <Button variant="outline" className="mt-4" asChild>
            <Link href="/eventos">
              <HomeIcon className="mr-2 h-4 w-4" />
              Volver a eventos
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  // Use paymentDetails to display information
  const { eventonombre, fechapago, montototal, boletos, lugarnombre, eventofecha, eventohorainicio, eventohorafin } = paymentDetails;
  const paymentDate = new Date(fechapago).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
  const paymentTime = new Date(fechapago).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  const eventFullDate = new Date(eventofecha).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex flex-col items-center space-y-4 text-center">
          <div className="rounded-full bg-green-100 p-3">
            <CheckCircleIcon className="h-12 w-12 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">¡Compra Exitosa!</h1>
          <p className="text-gray-500">Tu compra ha sido procesada correctamente</p>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Detalles de la compra</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-gray-50 p-4">
              <div className="text-center">
                <div className="mb-2 text-sm font-medium text-gray-500">Número de confirmación (Pago ID)</div>
                <div className="text-lg font-bold">{pagoId}</div>
              </div>
            </div>

            <div>
              <h4 className="font-medium">Evento</h4>
              <p className="text-gray-600">{eventonombre}</p>
            </div>
            <div>
              <h4 className="font-medium">Fecha y hora del evento</h4>
              <p className="text-gray-600">
                {eventFullDate}, {eventohorainicio} - {eventohorafin}
              </p>
            </div>
            <div>
              <h4 className="font-medium">Lugar</h4>
              <p className="text-gray-600">{lugarnombre}</p>
            </div>
            <div>
              <h4 className="font-medium">Asientos</h4>
              <ul className="ml-4 list-disc text-gray-600">
                {boletos?.map((boleto) => (
                  <li key={boleto.boletid}>{boleto.asientocodigo || `Asiento ID: ${boleto.asientoid}`}</li>
                ))}
              </ul>
            </div>
            <Separator />
            <div className="flex justify-between text-lg font-bold">
              <span>Total pagado:</span>
              <span>${parseFloat(montototal).toFixed(2)} MXN</span>
            </div>
          </CardContent>
        </Card>

        <div className="mb-8 grid gap-6 md:grid-cols-2">
          {boletos?.map((boleto, index: number) => (
            <Card key={boleto.boletid} className="overflow-hidden">
              <CardHeader className="bg-primary pb-2 pt-2 text-primary-foreground">
                <CardTitle className="text-center text-sm">Boleto #{index + 1}</CardTitle>
              </CardHeader>
              <CardContent className="p-4 text-center">
                <div className="mb-4 space-y-1">
                  <div className="text-sm font-medium text-gray-500">Escanea este código para acceder al evento</div>
                </div>
                <div className="mx-auto mb-4 h-40 w-40 bg-gray-100">
                  <Image
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${boleto.codigoqr}`}
                    alt={`Código QR para boleto ${boleto.boletid}`}
                    width={160}
                    height={160}
                    className="h-full w-full"
                  />
                </div>
                <div className="space-y-1 text-sm">
                  <div>
                    <span className="font-medium">Evento:</span> {eventonombre}
                  </div>
                  <div>
                    <span className="font-medium">Asiento:</span> {boleto.asientocodigo || `ID: ${boleto.asientoid}`}
                  </div>
                  <div>
                    <span className="font-medium">Fecha:</span> {eventFullDate}
                  </div>
                   <div>
                    <span className="font-medium">Hora:</span> {eventohorainicio} - {eventohorafin}
                  </div>
                   <div>
                    <span className="font-medium">Boleto ID:</span> {boleto.boletid}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Descargar boletos</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">
                Descarga tus boletos en formato PDF para imprimirlos o guardarlos en tu dispositivo.
              </p>
            </CardContent>
            <CardFooter>
              <Button className="w-full" variant="outline" disabled>
                <DownloadIcon className="mr-2 h-4 w-4" />
                Descargar PDF (Próximamente)
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Enviar por correo</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSendEmail} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Correo electrónico</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="tu@correo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                {emailSent && <div className="text-sm text-green-600">¡Boletos enviados correctamente!</div>}
              </form>
            </CardContent>
            <CardFooter>
              <Button
                type="submit"
                className="w-full"
                onClick={handleSendEmail}
                disabled={isSending || emailSent || !email}
              >
                <MailIcon className="mr-2 h-4 w-4" />
                {isSending ? "Enviando..." : "Enviar boletos (Próximamente)"}
              </Button>
            </CardFooter>
          </Card>
        </div>

        <div className="mt-8 text-center">
          <Button variant="outline" asChild>
            <Link href="/eventos">
              <HomeIcon className="mr-2 h-4 w-4" />
              Volver a eventos
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
