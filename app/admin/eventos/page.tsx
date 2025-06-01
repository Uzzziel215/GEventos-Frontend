"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  PlusIcon,
  EditIcon,
  TrashIcon,
  DownloadIcon,
  LayoutIcon,
  CalendarIcon,
  ClockIcon,
  MapPinIcon,
  Loader2 as LoaderIcon,
  AlertCircleIcon,
} from "lucide-react"
import { useAuth } from '@/context/AuthContext';
import { useApi } from '@/lib/api'; // Import useApi

// Define Event interface to match backend data
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
  precio: string;
  imagen?: string;
  lugarnombre: string;
  tipo: string; // Added new field for event type
  // Add any other fields returned by the backend for events, e.g., total_sold_tickets
  total_sold_tickets?: number; // Assuming backend might provide this
}

// Define Lugar interface (assuming this structure from backend /api/lugares)
interface Lugar {
  lugarid: number;
  nombre: string;
  direccion: string;
  capacidad?: number;
}

export default function GestionEventosPage() {
  const router = useRouter();
  const { isAuthenticated, isAdmin, user } = useAuth(); // Removed token and logout as useApi handles them
  const api = useApi(); // Initialize useApi

  const [hasCheckedAuth, setHasCheckedAuth] = useState(false); // New state to track auth check completion

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [createEventError, setCreateEventError] = useState<string | null>(null);

  // State for form inputs
  const [nombre, setNombre] = useState('');
  const [fecha, setFecha] = useState('');
  const [horaInicio, setHoraInicio] = useState('');
  const [horaFin, setHoraFin] = useState('');
  const [lugarID, setLugarID] = useState('');
  const [precio, setPrecio] = useState('');
  const [capacidad, setCapacidad] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [imagen, setImagen] = useState<File | null>(null);
  const [estado, setEstado] = useState('BORRADOR'); // Default to BORRADOR
  const [tipo, setTipo] = useState(''); // New state for event type

  // State for fetched events
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loadingEventos, setLoadingEventos] = useState(true);
  const [errorEventos, setErrorEventos] = useState<string | null>(null);

  // State for locations (Lugares)
  const [lugares, setLugares] = useState<Lugar[]>([]);
  const [loadingLugares, setLoadingLugares] = useState(true);
  const [errorLugares, setErrorLugares] = useState<string | null>(null);

  // Function to fetch events
  const fetchEvents = async () => {
    setLoadingEventos(true);
    setErrorEventos(null);
    try {
      const data: Evento[] = await api.get('/eventos'); // Use api.get
      setEventos(data);
    } catch (err: any) {
      console.error('Error fetching events:', err);
      // useApi already handles 401/403 and redirects/logs out
      setErrorEventos(err.message);
    } finally {
      setLoadingEventos(false);
    }
  };

  // Function to fetch locations
  const fetchLugares = async () => {
    setLoadingLugares(true);
    setErrorLugares(null);
    try {
      const data: Lugar[] = await api.get('/lugares'); // Use api.get
      setLugares(data);
    } catch (err: any) {
      console.error('Error fetching lugares:', err);
      // useApi already handles 401/403 and redirects/logs out
      setErrorLugares(err.message);
    } finally {
      setLoadingLugares(false);
    }
  };

  useEffect(() => {
    console.log("User object in admin/eventos:", user);
    console.log("Is Admin:", isAdmin);
    console.log("Is Authenticated:", isAuthenticated);

    // Only proceed if authentication state is known (user is not null initially)
    if (user !== null) { // Check if user object has been loaded from AuthContext
      if (isAuthenticated && (isAdmin || user?.role?.toUpperCase() === 'ORGANIZADOR')) {
        fetchEvents();
        fetchLugares();
        setHasCheckedAuth(true);
      } else if (isAuthenticated && !isAdmin && user?.role?.toUpperCase() !== 'ORGANIZADOR') {
        // User is authenticated but not admin/organizer, redirect to regular events page
        router.replace('/eventos');
      } else if (!isAuthenticated) {
        // Not authenticated at all, redirect to login
        router.replace('/login');
      }
    }
  }, [isAuthenticated, isAdmin, user, router, api]); // Re-run when auth state changes, removed token and logout

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingEvent(true);
    setCreateEventError(null);

    if (!isAuthenticated || !user) { // Removed token check
      setCreateEventError("Error de autenticación. Por favor, inicia sesión.");
      setIsCreatingEvent(false);
      return;
    }

    if (!nombre || !fecha || !horaInicio || !horaFin || !lugarID || !precio || !capacidad || !estado || !tipo) {
      setCreateEventError("Por favor, completa todos los campos obligatorios.");
      setIsCreatingEvent(false);
      return;
    }

    console.log("Form Data before submission:");
    console.log("nombre:", nombre);
    console.log("fecha:", fecha);
    console.log("horaInicio:", horaInicio);
    console.log("horaFin:", horaFin);
    console.log("lugarID:", lugarID);
    console.log("precio:", precio);
    console.log("capacidad:", capacidad);
    console.log("estado:", estado);
    console.log("tipo:", tipo);
    console.log("organizadorID:", user?.userId); // Log user.userId directly

    try {
      const formData = new FormData();
      formData.append('nombre', nombre);
      formData.append('fecha', fecha);
      formData.append('horaInicio', horaInicio + ':00');
      formData.append('horaFin', horaFin + ':00');
      formData.append('precio', precio);
      formData.append('capacidad', capacidad);
      formData.append('estado', estado.toUpperCase());
      formData.append('tipo', tipo.toUpperCase());
      formData.append('lugarID', lugarID);
      formData.append('organizadorID', user.userId.toString()); // Convert number to string for FormData

      if (descripcion) {
        formData.append('descripcion', descripcion);
      }
      if (imagen) {
        formData.append('imagen', imagen); // Append the File object
      }

      const data = await api.post('/eventos', formData, true); // Use api.post with isFormData = true

      alert("Evento creado exitosamente!");
      setIsDialogOpen(false); // Close dialog on success
      // Reset form fields
      setNombre('');
      setFecha('');
      setHoraInicio('');
      setHoraFin('');
      setLugarID('');
      setPrecio('');
      setCapacidad('');
      setDescripcion('');
      setImagen(null); // Reset imagen to null
      setEstado('BORRADOR');
      setTipo(''); // Reset tipo
      fetchEvents(); // Refresh event list
    } catch (err: any) {
      console.error('Error creating event:', err);
      setCreateEventError(err.message || 'Ocurrió un error inesperado al crear el evento.');
    } finally {
      setIsCreatingEvent(false);
    }
  };

  // Show loading state until authentication check is complete
  if (!hasCheckedAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoaderIcon className="h-8 w-8 animate-spin text-gray-500" />
        <span className="ml-2 text-gray-500">Cargando datos de autenticación y eventos...</span>
      </div>
    );
  }

  // If authentication check is complete but user is not authorized, show error or redirect
  // This handles cases where hasCheckedAuth is true but the user was redirected by the useEffect
  // (e.g., if they were authenticated but not admin/organizer, they would have been replaced to /eventos)
  // So, if we reach here and errorEventos/errorLugares is set, it means the fetch failed due to auth
  if (errorEventos || errorLugares) {
    return (
      <div className="flex min-h-screen items-center justify-center text-red-500">
        <AlertCircleIcon className="h-8 w-8 mr-2" />
        <span>Error: {errorEventos || errorLugares}</span>
      </div>
    );
  }

  // If we reach here, it means hasCheckedAuth is true and the user is authorized.
  // The previous loading/error checks are now handled by the new logic.
  // The original `if (loadingEventos || loadingLugares)` and `if (errorEventos || errorLugares)`
  // are replaced by the new `if (!hasCheckedAuth || loadingEventos || loadingLugares)` and the
  // subsequent `if (errorEventos || errorLugares)` after `hasCheckedAuth` is true.
  // This ensures a consistent loading/error display based on auth state.

  // The original `if (eventos.length === 0)` block should now only be reached if
  // the user is authorized and there are genuinely no events.
  if (eventos.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 flex flex-col space-y-2 md:flex-row md:items-center md:justify-between md:space-y-0">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Gestión de Eventos</h1>
              <p className="text-gray-500">Administra los eventos del instituto</p>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <PlusIcon className="mr-2 h-4 w-4" />
                  Crear Evento
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>Crear Nuevo Evento</DialogTitle>
                  <DialogDescription>Completa la información para crear un nuevo evento</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateEvent}>
                  <div className="grid gap-4 py-4 overflow-y-auto max-h-[calc(100vh-200px)]">
                    {createEventError && <p className="text-red-500 text-sm">{createEventError}</p>}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="nombre">Nombre del evento</Label>
                        <Input id="nombre" placeholder="Nombre del evento" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lugar">Lugar</Label>
                        {loadingLugares ? (
                          <Input id="lugar" placeholder="Cargando lugares..." disabled />
                        ) : errorLugares ? (
                          <Input id="lugar" placeholder={`Error: ${errorLugares}`} disabled className="text-red-500" />
                        ) : (
                          <Select value={lugarID} onValueChange={setLugarID} disabled={lugares.length === 0} required>
                            <SelectTrigger id="lugar">
                              <SelectValue placeholder="Selecciona un lugar" />
                            </SelectTrigger>
                            <SelectContent>
                              {lugares.map((lugar: Lugar) => (
                                <SelectItem key={lugar.lugarid} value={lugar.lugarid.toString()}>
                                  {lugar.nombre}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="fecha">Fecha</Label>
                        <Input id="fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="horaInicio">Hora Inicio</Label>
                        <Input id="horaInicio" type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="horaFin">Hora Fin</Label>
                        <Input id="horaFin" type="time" value={horaFin} onChange={(e) => setHoraFin(e.target.value)} required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="estado">Estado</Label>
                        <Select value={estado} onValueChange={setEstado} required>
                          <SelectTrigger id="estado">
                            <SelectValue placeholder="Selecciona un estado" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="BORRADOR">Borrador</SelectItem>
                            <SelectItem value="ACTIVO">Activo</SelectItem>
                            <SelectItem value="COMPLETADO">Completado</SelectItem>
                            <SelectItem value="CANCELADO">Cancelado</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="precio">Precio (MXN)</Label>
                        <Input id="precio" type="number" min="0" placeholder="0.00" value={precio} onChange={(e) => setPrecio(e.target.value)} required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="capacidad">Capacidad</Label>
                        <Input id="capacidad" type="number" min="1" placeholder="100" value={capacidad} onChange={(e) => setCapacidad(e.target.value)} required />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="tipo">Tipo de Evento</Label>
                        <Select value={tipo} onValueChange={setTipo} required>
                          <SelectTrigger id="tipo">
                            <SelectValue placeholder="Selecciona un tipo" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="CONFERENCIA">Conferencia</SelectItem>
                            <SelectItem value="TALLER">Taller</SelectItem>
                            <SelectItem value="CEREMONIA">Ceremonia</SelectItem>
                            <SelectItem value="SEMINARIO">Seminario</SelectItem>
                            <SelectItem value="OTRO">Otro</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="imagen">Subir Imagen (opcional)</Label>
                      <Input id="imagen" type="file" onChange={(e) => setImagen(e.target.files ? e.target.files[0] : null)} />
                      <p className="text-xs text-gray-500">Dimensiones recomendadas: 800x400 píxeles (relación de aspecto 2:1)</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="descripcion">Descripción</Label>
                      <Textarea id="descripcion" placeholder="Describe el evento..." value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)} type="button">
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={isCreatingEvent}>
                      {isCreatingEvent ? "Guardando..." : "Guardar Evento"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col space-y-2 md:flex-row md:items-center md:justify-between md:space-y-0">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gestión de Eventos</h1>
            <p className="text-gray-500">Administra los eventos del instituto</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusIcon className="mr-2 h-4 w-4" />
                Crear Evento
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Crear Nuevo Evento</DialogTitle>
                <DialogDescription>Completa la información para crear un nuevo evento</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateEvent}>
                <div className="grid gap-4 py-4 overflow-y-auto max-h-[calc(100vh-200px)]">
                  {createEventError && <p className="text-red-500 text-sm">{createEventError}</p>}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="nombre">Nombre del evento</Label>
                      <Input id="nombre" placeholder="Nombre del evento" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lugar">Lugar</Label>
                      {loadingLugares ? (
                        <Input id="lugar" placeholder="Cargando lugares..." disabled />
                      ) : errorLugares ? (
                        <Input id="lugar" placeholder={`Error: ${errorLugares}`} disabled className="text-red-500" />
                      ) : (
                        <Select value={lugarID} onValueChange={setLugarID} disabled={lugares.length === 0} required>
                          <SelectTrigger id="lugar">
                            <SelectValue placeholder="Selecciona un lugar" />
                          </SelectTrigger>
                          <SelectContent>
                            {lugares.map((lugar: Lugar) => (
                              <SelectItem key={lugar.lugarid} value={lugar.lugarid.toString()}>
                                {lugar.nombre}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fecha">Fecha</Label>
                      <Input id="fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="horaInicio">Hora Inicio</Label>
                      <Input id="horaInicio" type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="horaFin">Hora Fin</Label>
                      <Input id="horaFin" type="time" value={horaFin} onChange={(e) => setHoraFin(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="estado">Estado</Label>
                      <Select value={estado} onValueChange={setEstado} required>
                        <SelectTrigger id="estado">
                          <SelectValue placeholder="Selecciona un estado" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="BORRADOR">Borrador</SelectItem>
                          <SelectItem value="ACTIVO">Activo</SelectItem>
                          <SelectItem value="COMPLETADO">Completado</SelectItem>
                          <SelectItem value="CANCELADO">Cancelado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="precio">Precio (MXN)</Label>
                      <Input id="precio" type="number" min="0" placeholder="0.00" value={precio} onChange={(e) => setPrecio(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="capacidad">Capacidad</Label>
                      <Input id="capacidad" type="number" min="1" placeholder="100" value={capacidad} onChange={(e) => setCapacidad(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tipo">Tipo de Evento</Label>
                      <Select value={tipo} onValueChange={setTipo} required>
                        <SelectTrigger id="tipo">
                          <SelectValue placeholder="Selecciona un tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CONFERENCIA">Conferencia</SelectItem>
                          <SelectItem value="TALLER">Taller</SelectItem>
                          <SelectItem value="CEREMONIA">Ceremonia</SelectItem>
                          <SelectItem value="SEMINARIO">Seminario</SelectItem>
                          <SelectItem value="OTRO">Otro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="imagen">Subir Imagen (opcional)</Label>
                    <Input id="imagen" type="file" onChange={(e) => setImagen(e.target.files ? e.target.files[0] : null)} />
                    <p className="text-xs text-gray-500">Dimensiones recomendadas: 800x400 píxeles (relación de aspecto 2:1)</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="descripcion">Descripción</Label>
                    <Textarea id="descripcion" placeholder="Describe el evento..." value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)} type="button">
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isCreatingEvent}>
                    {isCreatingEvent ? "Guardando..." : "Guardar Evento"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="lista" className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:w-[400px]">
            <TabsTrigger value="lista">Lista de Eventos</TabsTrigger>
            <TabsTrigger value="estadisticas">Estadísticas</TabsTrigger>
          </TabsList>

          <TabsContent value="lista" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
                  <div>
                    <CardTitle>Eventos</CardTitle>
                    <CardDescription>Gestiona los eventos existentes o crea nuevos</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select defaultValue="todos">
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filtrar por estado" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos los eventos</SelectItem>
                        <SelectItem value="activo">Activos</SelectItem>
                        <SelectItem value="completado">Completados</SelectItem>
                        <SelectItem value="cancelado">Cancelados</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Lugar</TableHead>
                      <TableHead className="text-right">Precio</TableHead>
                      <TableHead className="text-center">Vendidos</TableHead>
                      <TableHead className="text-center">Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {eventos.map((evento) => (
                      <TableRow key={evento.eventoid}>
                        <TableCell className="font-medium">{evento.nombre}</TableCell>
                        <TableCell>{new Date(evento.fecha).toLocaleDateString()}</TableCell>
                        <TableCell>
                          {evento.lugarnombre || "N/A"}
                        </TableCell>
                        <TableCell className="text-right">${parseFloat(evento.precio).toFixed(2)}</TableCell>
                        <TableCell className="text-center">
                          {/* Need actual sold/capacity data from backend or calculate */}
                          {/* Placeholder: Display actual sold/capacity here later */}
                          {evento.total_sold_tickets !== undefined ? `${evento.total_sold_tickets}/${evento.capacidad}` : 'N/A'}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={evento.estado.toLowerCase() === "activo" ? "default" : evento.estado.toLowerCase() === "completado" ? "secondary" : "destructive"}>
                            {evento.estado.charAt(0).toUpperCase() + evento.estado.slice(1).toLowerCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="icon" asChild>
                              <Link href={`/admin/eventos/${evento.eventoid}/croquis`}>
                                <LayoutIcon className="h-4 w-4" />
                                <span className="sr-only">Croquis</span>
                              </Link>
                            </Button>
                            <Button variant="outline" size="icon">
                              <EditIcon className="h-4 w-4" />
                              <span className="sr-only">Editar</span>
                            </Button>
                            <Button variant="outline" size="icon">
                              <TrashIcon className="h-4 w-4" />
                              <span className="sr-only">Eliminar</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="estadisticas" className="mt-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total de Eventos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{eventos.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Boletos Vendidos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {/* Calculate total sold tickets from all events */}
                    {eventos.reduce((sum, event) => sum + (event.total_sold_tickets || 0), 0)}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {/* Calculate total revenue from all events */}
                    ${eventos.reduce((sum, event) => sum + (event.total_sold_tickets || 0) * parseFloat(event.precio), 0).toFixed(2)}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Tasa de Ocupación</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {/* Calculate overall occupancy rate */}
                    {(() => {
                      const totalCapacityAllEvents = eventos.reduce((sum, event) => sum + event.capacidad, 0);
                      const totalSoldAllEvents = eventos.reduce((sum, event) => sum + (event.total_sold_tickets || 0), 0);
                      return totalCapacityAllEvents > 0 ? `${Math.round((totalSoldAllEvents / totalCapacityAllEvents) * 100)}%` : 'N/A';
                    })()}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Eventos Próximos</CardTitle>
                  <CardDescription>Los eventos que se realizarán en los próximos días</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {eventos.filter(event => new Date(event.fecha) > new Date() && event.estado.toUpperCase() === 'ACTIVO')
                            .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
                            .slice(0, 3) // Show top 3 upcoming events
                            .map(event => (
                      <div key={event.eventoid} className="flex items-center gap-4 rounded-lg border p-3">
                          <div className="rounded-full bg-primary/10 p-2">
                            <CalendarIcon className="h-5 w-5" />
                          </div>
                          <div className="flex-1">
                        <h4 className="font-medium">{event.nombre}</h4>
                            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                              <div className="flex items-center gap-1">
                                <ClockIcon className="h-3 w-3" />
                            <span>{new Date(event.fecha).toLocaleDateString()}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <MapPinIcon className="h-3 w-3" />
                            <span>{event.lugarnombre || "N/A"}</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">
                          {event.total_sold_tickets !== undefined ? `${event.total_sold_tickets}/${event.capacidad}` : 'N/A'}
                            </div>
                            <div className="text-xs text-gray-500">boletos</div>
                          </div>
                        </div>
                    ))}
                    {eventos.filter(event => new Date(event.fecha) > new Date() && event.estado.toUpperCase() === 'ACTIVO').length === 0 && (
                      <div className="text-center text-gray-500">No hay eventos próximos.</div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Reporte de Ventas</CardTitle>
                  <CardDescription>Descarga reportes detallados de ventas y asistencia</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="rounded-lg border p-4">
                      <div className="mb-4 flex items-center justify-between">
                        <div className="font-medium">Reporte de ventas por evento</div>
                        <Button variant="outline" size="sm">
                          <DownloadIcon className="mr-2 h-4 w-4" />
                          CSV
                        </Button>
                      </div>
                      <p className="text-sm text-gray-500">
                        Detalle de boletos vendidos, ingresos y ocupación por evento
                      </p>
                    </div>

                    <div className="rounded-lg border p-4">
                      <div className="mb-4 flex items-center justify-between">
                        <div className="font-medium">Reporte de asistentes</div>
                        <Button variant="outline" size="sm">
                          <DownloadIcon className="mr-2 h-4 w-4" />
                          CSV
                        </Button>
                      </div>
                      <p className="text-sm text-gray-500">
                        Lista de asistentes registrados con información de contacto
                      </p>
                    </div>

                    <div className="rounded-lg border p-4">
                      <div className="mb-4 flex items-center justify-between">
                        <div className="font-medium">Reporte de verificación</div>
                        <Button variant="outline" size="sm">
                          <DownloadIcon className="mr-2 h-4 w-4" />
                          CSV
                        </Button>
                      </div>
                      <p className="text-sm text-gray-500">Registro de asistencia y verificación de boletos</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
