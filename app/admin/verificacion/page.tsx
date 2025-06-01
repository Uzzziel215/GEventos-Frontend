"use client"

import { useState, useEffect } from "react"
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CheckCircleIcon, XCircleIcon, ScanIcon, SearchIcon, UserIcon, CalendarIcon, MapPinIcon, Loader2 as LoaderIcon, AlertCircleIcon } from "lucide-react"
import { useAuth } from '@/context/AuthContext';
import { useApi } from '@/lib/api'; // Import useApi

interface TicketVerificationResult {
  valid: boolean;
  message: string;
  ticket?: {
    boletid: number;
    codigoqr: string;
    asientoid: number; // Added asientoID
    asientocodigo: string;
    estado: string; // e.g., 'VALIDO', 'USADO', 'INVALIDO'
    eventonombre: string;
    eventofecha: string;
    eventohorainicio: string;
    eventohorafin: string;
    lugarnombre: string;
    usuario_nombre: string; // Name of the ticket holder
  };
}

export default function VerificacionPage() {
  const router = useRouter();
  const { isAuthenticated, isAdmin, isOrganizer } = useAuth();
  const api = useApi();

  const [scanMode, setScanMode] = useState<"camera" | "manual">("camera");
  const [searchQuery, setSearchQuery] = useState("");
  const [scanResult, setScanResult] = useState<TicketVerificationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    if (!isAdmin && !isOrganizer) {
      setError("No autorizado. Debes ser administrador u organizador para acceder a esta página.");
      // Optionally redirect to a non-admin page or show a specific access denied message
      // For now, just show error and prevent further loading
    }
  }, [isAuthenticated, isAdmin, isOrganizer, router]);

  const verifyTicket = async (qrCodeOrTicketId: string) => { // Removed isQrScan parameter
    setIsLoading(true);
    setError(null);
    setScanResult(null);

    if (!isAuthenticated || (!isAdmin && !isOrganizer)) {
      setError("No autorizado. Debes ser administrador u organizador para verificar boletos.");
      setIsLoading(false);
      return;
    }

    try {
      // Use the /api/tickets/:qrCode endpoint for both QR scan and manual search by QR code
      const data: { ticket: TicketVerificationResult['ticket'] } = await api.get(`/tickets/${qrCodeOrTicketId}`);

      // If ticket is valid and not used, mark it as used
      if (data.ticket && data.ticket.estado.toUpperCase() === 'ACTIVO') { // Assuming 'ACTIVO' is the initial state
        const markUsedData = await api.put(`/tickets/${data.ticket.boletid}/verify`, { estado: 'USADO' }); // Mark as used
        setScanResult({ valid: true, message: 'Boleto válido y marcado como usado.', ticket: { ...data.ticket, estado: 'USADO' } });
      } else if (data.ticket && data.ticket.estado.toUpperCase() === 'USADO') {
        setScanResult({ valid: false, message: 'Boleto ya ha sido utilizado.', ticket: data.ticket });
      } else if (data.ticket && data.ticket.estado.toUpperCase() === 'CANCELADO') {
        setScanResult({ valid: false, message: 'Boleto ha sido cancelado.', ticket: data.ticket });
      } else {
        // This case might be for other valid states not explicitly handled, or if the ticket is just valid
        setScanResult({ valid: true, message: 'Boleto válido.', ticket: data.ticket });
      }

    } catch (err: any) {
      console.error('Error during ticket verification:', err);
      setError(err.message || 'Ocurrió un error inesperado durante la verificación.');
      setScanResult({ valid: false, message: err.message || 'Error inesperado.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleScanSubmit = () => {
    // In a real app, this would trigger a camera scan or file upload
    // For now, simulate with a fixed QR code or prompt user for input
    const simulatedQrCode = "QR-123456789"; // Replace with actual QR code from camera/file
    verifyTicket(simulatedQrCode); // Removed second argument
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      verifyTicket(searchQuery.trim()); // Removed second argument
    } else {
      setError("Por favor, ingresa un ID de boleto o nombre para buscar.");
    }
  };

  const resetScan = () => {
    setScanResult(null);
    setSearchQuery("");
    setError(null);
  };

  if (!isAuthenticated || (!isAdmin && !isOrganizer)) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <div className="text-center text-red-600">
          <AlertCircleIcon className="mx-auto h-12 w-12 mb-4" />
          <h1 className="text-2xl font-bold">Acceso Denegado</h1>
          <p>{error}</p>
          <Button variant="outline" className="mt-4" onClick={() => router.push('/login')}>
            Volver a Iniciar Sesión
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto max-w-md">
        <div className="mb-8 flex flex-col items-center space-y-2 text-center">
          <h1 className="text-3xl font-bold text-gray-900">Verificación de Asistencia</h1>
          <p className="text-gray-500">Escanea códigos QR o busca boletos manualmente</p>
        </div>

        <Tabs defaultValue="scan" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="scan">Escanear QR</TabsTrigger>
            <TabsTrigger value="search">Buscar Boleto</TabsTrigger>
          </TabsList>

          <TabsContent value="scan">
            <Card>
              <CardHeader>
                <CardTitle>Escanear Código QR</CardTitle>
                <CardDescription>Escanea el código QR del boleto para verificar su validez</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center h-40">
                    <LoaderIcon className="h-8 w-8 animate-spin text-gray-500" />
                    <span className="ml-2 text-gray-500">Verificando boleto...</span>
                  </div>
                ) : scanResult ? (
                  <div className="rounded-lg border p-4">
                    {scanResult.valid ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-center">
                          <div className="rounded-full bg-green-100 p-2">
                            <CheckCircleIcon className="h-8 w-8 text-green-600" />
                          </div>
                        </div>
                        <div className="text-center text-lg font-medium text-green-600">
                          {scanResult.message}
                        </div>
                        {scanResult.ticket && (
                          <div className="space-y-2 rounded-lg bg-gray-50 p-3">
                            <div className="flex items-center gap-2">
                              <UserIcon className="h-4 w-4 text-gray-500" />
                              <span>{scanResult.ticket.usuario_nombre}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <CalendarIcon className="h-4 w-4 text-gray-500" />
                              <span>{scanResult.ticket.eventonombre}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <MapPinIcon className="h-4 w-4 text-gray-500" />
                              <span>{scanResult.ticket.asientocodigo || `ID: ${scanResult.ticket.asientoid}`}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <CalendarIcon className="h-4 w-4 text-gray-500" />
                              <span>{new Date(scanResult.ticket.eventofecha).toLocaleDateString()}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center justify-center">
                          <div className="rounded-full bg-red-100 p-2">
                            <XCircleIcon className="h-8 w-8 text-red-600" />
                          </div>
                        </div>
                        <div className="text-center text-lg font-medium text-red-600">Boleto inválido</div>
                        <div className="text-center text-sm text-gray-500">
                          {scanResult.message}
                        </div>
                        {scanResult.ticket && ( // Show details even if invalid, e.g., if already used
                          <div className="space-y-2 rounded-lg bg-gray-50 p-3">
                            <div className="flex items-center gap-2">
                              <UserIcon className="h-4 w-4 text-gray-500" />
                              <span>{scanResult.ticket.usuario_nombre}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <CalendarIcon className="h-4 w-4 text-gray-500" />
                              <span>{scanResult.ticket.eventonombre}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <MapPinIcon className="h-4 w-4 text-gray-500" />
                              <span>{scanResult.ticket.asientocodigo || `ID: ${scanResult.ticket.asientoid}`}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <CalendarIcon className="h-4 w-4 text-gray-500" />
                              <span>{new Date(scanResult.ticket.eventofecha).toLocaleDateString()}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="aspect-square w-full overflow-hidden rounded-lg bg-gray-100">
                      <div className="flex h-full w-full items-center justify-center">
                        <ScanIcon className="h-16 w-16 text-gray-400" />
                      </div>
                    </div>
                    <div className="text-center text-sm text-gray-500">
                      {scanMode === "camera"
                        ? "Apunta la cámara al código QR del boleto"
                        : "Sube una imagen del código QR"}
                    </div>
                  </>
                )}
                {error && <p className="text-red-500 text-sm text-center">{error}</p>}
              </CardContent>
              <CardFooter className="flex flex-col space-y-2">
                {!scanResult ? (
                  <Button className="w-full" onClick={handleScanSubmit} disabled={isLoading}>
                    <ScanIcon className="mr-2 h-4 w-4" />
                    Escanear
                  </Button>
                ) : (
                  <Button className="w-full" onClick={resetScan} disabled={isLoading}>
                    Escanear otro boleto
                  </Button>
                )}
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="search">
            <Card>
              <CardHeader>
                <CardTitle>Buscar Boleto</CardTitle>
                <CardDescription>Busca un boleto por su ID o nombre del asistente</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center h-40">
                    <LoaderIcon className="h-8 w-8 animate-spin text-gray-500" />
                    <span className="ml-2 text-gray-500">Buscando boleto...</span>
                  </div>
                ) : scanResult ? (
                  <div className="rounded-lg border p-4">
                    {scanResult.valid ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-center">
                          <div className="rounded-full bg-green-100 p-2">
                            <CheckCircleIcon className="h-8 w-8 text-green-600" />
                          </div>
                        </div>
                        <div className="text-center text-lg font-medium text-green-600">
                          {scanResult.message}
                        </div>
                        {scanResult.ticket && (
                          <div className="space-y-2 rounded-lg bg-gray-50 p-3">
                            <div className="flex items-center gap-2">
                              <UserIcon className="h-4 w-4 text-gray-500" />
                              <span>{scanResult.ticket.usuario_nombre}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <CalendarIcon className="h-4 w-4 text-gray-500" />
                              <span>{scanResult.ticket.eventonombre}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <MapPinIcon className="h-4 w-4 text-gray-500" />
                              <span>{scanResult.ticket.asientocodigo || `ID: ${scanResult.ticket.asientoid}`}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <CalendarIcon className="h-4 w-4 text-gray-500" />
                              <span>{new Date(scanResult.ticket.eventofecha).toLocaleDateString()}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center justify-center">
                          <div className="rounded-full bg-red-100 p-2">
                            <XCircleIcon className="h-8 w-8 text-red-600" />
                          </div>
                        </div>
                        <div className="text-center text-lg font-medium text-red-600">Boleto inválido</div>
                        <div className="text-center text-sm text-gray-500">
                          {scanResult.message}
                        </div>
                        {scanResult.ticket && (
                          <div className="space-y-2 rounded-lg bg-gray-50 p-3">
                            <div className="flex items-center gap-2">
                              <UserIcon className="h-4 w-4 text-gray-500" />
                              <span>{scanResult.ticket.usuario_nombre}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <CalendarIcon className="h-4 w-4 text-gray-500" />
                              <span>{scanResult.ticket.eventonombre}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <MapPinIcon className="h-4 w-4 text-gray-500" />
                              <span>{scanResult.ticket.asientocodigo || `ID: ${scanResult.ticket.asientoid}`}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <CalendarIcon className="h-4 w-4 text-gray-500" />
                              <span>{new Date(scanResult.ticket.eventofecha).toLocaleDateString()}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <form onSubmit={handleSearchSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="search">ID de boleto o nombre</Label>
                      <div className="relative">
                        <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <Input
                          id="search"
                          placeholder="TICKET-1234 o nombre del asistente"
                          className="pl-10"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          disabled={isLoading}
                        />
                      </div>
                    </div>
                    {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                  </form>
                )}
              </CardContent>
              <CardFooter className="flex flex-col space-y-2">
                {!scanResult ? (
                  <Button className="w-full" onClick={handleSearchSubmit} disabled={isLoading || !searchQuery.trim()}>
                    <SearchIcon className="mr-2 h-4 w-4" />
                    Buscar
                  </Button>
                ) : (
                  <Button className="w-full" onClick={resetScan} disabled={isLoading}>
                    Buscar otro boleto
                  </Button>
                )}
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
