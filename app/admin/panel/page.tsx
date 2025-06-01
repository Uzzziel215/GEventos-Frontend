"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { KeyIcon, CalendarIcon, SearchIcon, PlusIcon, EditIcon, TrashIcon, LogOutIcon, Loader2 as LoaderIcon, AlertCircleIcon } from "lucide-react"
import { useAuth } from '@/context/AuthContext';
import { useApi } from '@/lib/api'; // Import useApi

// Define interfaces for data fetched from backend
interface User {
  usuarioid: number;
  nombre: string;
  correoElectronico: string;
  telefono?: string;
  role: string; // 'ASISTENTE', 'ORGANIZADOR', 'ADMINISTRADOR'
  nivelPermiso?: string; // Only for ORGANIZADOR/ADMINISTRADOR
  estado: string; // 'ACTIVO', 'INACTIVO', 'BLOQUEADO', 'PENDIENTE'
  ultimoAcceso: string;
  fechaCreacion: string;
  fechaModificacion: string;
  departamento?: string; // Add departamento to User interface
}

interface Activity {
  actividadid: number;
  usuarioid?: number; // Can be null for system activities
  usuario?: string; // Joined user name
  tipo: string;
  descripcion: string;
  detalles?: string;
  fecha: string;
  direccionip?: string;
}

interface Config {
  configid: number;
  nombreAplicacion: string;
  contactoEmail: string;
  version: string;
  // Add other config fields as needed
  fechaCreacion: string;
  fechaModificacion: string;
}

export default function PanelAdminPage() {
  const router = useRouter();
  const { isAuthenticated, isAdmin, user, logout } = useAuth();
  const api = useApi();

  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [userFormError, setUserFormError] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // User form states
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [userRole, setUserRole] = useState('ASISTENTE');
  const [userNivelPermiso, setUserNivelPermiso] = useState(''); // For Organizador/Admin
  const [userDepartamento, setUserDepartamento] = useState(''); // For Organizador
  const [userEstado, setUserEstado] = useState('ACTIVO');

  // Data states
  const [users, setUsers] = useState<User[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [config, setConfig] = useState<Config | null>(null);

  // Loading/Error states
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [errorUsers, setErrorUsers] = useState<string | null>(null);
  const [loadingActivities, setLoadingActivities] = useState(true);
  const [errorActivities, setErrorActivities] = useState<string | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [errorConfig, setErrorConfig] = useState<string | null>(null);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [saveConfigError, setSaveConfigError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    if (!isAdmin) {
      setErrorUsers("No autorizado. Debes ser administrador para acceder a esta página.");
      setErrorActivities("No autorizado. Debes ser administrador para acceder a esta página.");
      setErrorConfig("No autorizado. Debes ser administrador para acceder a esta página.");
      setLoadingUsers(false);
      setLoadingActivities(false);
      setLoadingConfig(false);
      return;
    }

    fetchUsers();
    fetchActivities();
    fetchConfig();
  }, [isAuthenticated, isAdmin, router, api]);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    setErrorUsers(null);
    try {
      const data: User[] = await api.get('/users');
      setUsers(data);
    } catch (err: any) {
      console.error('Error fetching users:', err);
      setErrorUsers(err.message || 'Error al cargar usuarios.');
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchActivities = async () => {
    setLoadingActivities(true);
    setErrorActivities(null);
    try {
      const data: Activity[] = await api.get('/activities');
      setActivities(data);
    } catch (err: any) {
      console.error('Error fetching activities:', err);
      setErrorActivities(err.message || 'Error al cargar actividades.');
    } finally {
      setLoadingActivities(false);
    }
  };

  const fetchConfig = async () => {
    setLoadingConfig(true);
    setErrorConfig(null);
    try {
      const data: Config = await api.get('/config');
      setConfig(data);
    } catch (err: any) {
      console.error('Error fetching config:', err);
      setErrorConfig(err.message || 'Error al cargar configuración.');
    } finally {
      setLoadingConfig(false);
    }
  };

  const handleOpenUserDialog = (userToEdit: User | null = null) => {
    setEditingUser(userToEdit);
    setUserFormError(null);
    if (userToEdit) {
      setUserName(userToEdit.nombre);
      setUserEmail(userToEdit.correoElectronico);
      setUserPhone(userToEdit.telefono || '');
      setUserRole(userToEdit.role);
      setUserNivelPermiso(userToEdit.nivelPermiso || '');
      setUserDepartamento(userToEdit.departamento || ''); // Assuming 'departamento' exists on User interface if it's an organizer
      setUserEstado(userToEdit.estado);
      setUserPassword(''); // Passwords are not pre-filled for security
    } else {
      setUserName('');
      setUserEmail('');
      setUserPassword('');
      setUserPhone('');
      setUserRole('ASISTENTE');
      setUserNivelPermiso('');
      setUserDepartamento('');
      setUserEstado('ACTIVO');
    }
    setIsUserDialogOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingUser(true); // Reusing for both create/edit
    setUserFormError(null);

    if (!userName || !userEmail || !userRole || (!editingUser && !userPassword)) {
      setUserFormError("Por favor, completa todos los campos obligatorios.");
      setIsCreatingUser(false);
      return;
    }

    const userData = {
      nombre: userName,
      correoElectronico: userEmail,
      telefono: userPhone || null,
      role: userRole.toUpperCase(),
      estado: userEstado.toUpperCase(),
      contraseña: userPassword || undefined, // Only send if creating or changing password
      nivelPermiso: (userRole.toUpperCase() === 'ORGANIZADOR' || userRole.toUpperCase() === 'ADMINISTRADOR') ? userNivelPermiso.toUpperCase() : undefined,
      departamento: (userRole.toUpperCase() === 'ORGANIZADOR' || userRole.toUpperCase() === 'ADMINISTRADOR') ? userDepartamento : undefined,
    };

    try {
      if (editingUser) {
        await api.put(`/users/${editingUser.usuarioid}`, userData);
        alert("Usuario actualizado exitosamente!");
      } else {
        await api.post('/users', userData);
        alert("Usuario creado exitosamente!");
      }
      setIsUserDialogOpen(false);
      fetchUsers(); // Refresh user list
    } catch (err: any) {
      console.error('Error saving user:', err);
      setUserFormError(err.message || 'Ocurrió un error al guardar el usuario.');
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!confirm("¿Estás seguro de que quieres eliminar este usuario? Esta acción es irreversible.")) {
      return;
    }
    try {
      await api.delete(`/users/${userId}`);
      alert("Usuario eliminado exitosamente!");
      fetchUsers(); // Refresh user list
    } catch (err: any) {
      console.error('Error deleting user:', err);
      alert(err.message || 'Ocurrió un error al eliminar el usuario.');
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingConfig(true);
    setSaveConfigError(null);

    if (!config) {
      setSaveConfigError("No hay configuración para guardar.");
      setIsSavingConfig(false);
      return;
    }

    try {
      // This is a simplified example. In a real app, you'd collect form data for config.
      // For now, we'll just send the current config state (assuming it's updated via UI controls)
      await api.put('/config', {
        nombreAplicacion: config.nombreAplicacion,
        contactoEmail: config.contactoEmail,
        version: config.version,
        // Add other configurable fields here
      });
      alert("Configuración guardada exitosamente!");
    } catch (err: any) {
      console.error('Error saving config:', err);
      setSaveConfigError(err.message || 'Ocurrió un error al guardar la configuración.');
    } finally {
      setIsSavingConfig(false);
    }
  };

  if (!isAuthenticated || !isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <div className="text-center text-red-600">
          <AlertCircleIcon className="mx-auto h-12 w-12 mb-4" />
          <h1 className="text-2xl font-bold">Acceso Denegado</h1>
          <p>Debes ser administrador para acceder a esta página.</p>
          <Button variant="outline" className="mt-4" onClick={() => router.push('/login')}>
            Volver a Iniciar Sesión
          </Button>
        </div>
      </div>
    );
  }

  if (loadingUsers || loadingActivities || loadingConfig) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <LoaderIcon className="h-8 w-8 animate-spin text-gray-500" />
        <span className="ml-2 text-gray-500">Cargando panel de administración...</span>
      </div>
    );
  }

  if (errorUsers || errorActivities || errorConfig) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <div className="text-center text-red-600">
          <AlertCircleIcon className="mx-auto h-12 w-12 mb-4" />
          <h1 className="text-2xl font-bold">Error al Cargar Datos</h1>
          <p>{errorUsers || errorActivities || errorConfig}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col space-y-2 md:flex-row md:items-center md:justify-between md:space-y-0">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Panel de Administración</h1>
            <p className="text-gray-500">Gestiona usuarios y configuraciones del sistema</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link href="/admin/eventos">
                <CalendarIcon className="mr-2 h-4 w-4" />
                Gestión de Eventos
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/admin/verificacion">
                <KeyIcon className="mr-2 h-4 w-4" />
                Verificación
              </Link>
            </Button>
          </div>
        </div>

        <Tabs defaultValue="usuarios" className="w-full">
          <TabsList className="grid w-full grid-cols-3 md:w-[400px]">
            <TabsTrigger value="usuarios">Usuarios</TabsTrigger>
            <TabsTrigger value="actividad">Actividad</TabsTrigger>
            <TabsTrigger value="configuracion">Configuración</TabsTrigger>
          </TabsList>

          <TabsContent value="usuarios" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
                  <div>
                    <CardTitle>Gestión de Usuarios</CardTitle>
                    <CardDescription>Administra los usuarios del sistema</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1 md:w-64">
                      <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <Input placeholder="Buscar usuarios..." className="pl-10" />
                    </div>
                    <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
                      <DialogTrigger asChild>
                        <Button onClick={() => handleOpenUserDialog()}>
                          <PlusIcon className="mr-2 h-4 w-4" />
                          Nuevo Usuario
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                          <DialogTitle>{editingUser ? "Editar Usuario" : "Crear Nuevo Usuario"}</DialogTitle>
                          <DialogDescription>
                            {editingUser ? "Edita la información del usuario" : "Completa la información para crear un nuevo usuario"}
                          </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSaveUser}>
                          <div className="grid gap-4 py-4">
                            {userFormError && <p className="text-red-500 text-sm">{userFormError}</p>}
                            <div className="space-y-2">
                              <Label htmlFor="nombre">Nombre completo</Label>
                              <Input id="nombre" placeholder="Nombre del usuario" value={userName} onChange={(e) => setUserName(e.target.value)} required />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="email">Correo electrónico</Label>
                              <Input id="email" type="email" placeholder="correo@ejemplo.com" value={userEmail} onChange={(e) => setUserEmail(e.target.value)} required />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="telefono">Teléfono (opcional)</Label>
                              <Input id="telefono" placeholder="123-456-7890" value={userPhone} onChange={(e) => setUserPhone(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="rol">Rol</Label>
                              <Select value={userRole} onValueChange={setUserRole} required>
                                <SelectTrigger id="rol">
                                  <SelectValue placeholder="Selecciona un rol" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="ASISTENTE">Asistente</SelectItem>
                                  <SelectItem value="ORGANIZADOR">Organizador</SelectItem>
                                  <SelectItem value="ADMINISTRADOR">Administrador</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            {(userRole === 'ORGANIZADOR' || userRole === 'ADMINISTRADOR') && (
                              <>
                                <div className="space-y-2">
                                  <Label htmlFor="nivelPermiso">Nivel de Permiso</Label>
                                  <Select value={userNivelPermiso} onValueChange={setUserNivelPermiso} required>
                                    <SelectTrigger id="nivelPermiso">
                                      <SelectValue placeholder="Selecciona nivel de permiso" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="ORGANIZADOR">Organizador</SelectItem>
                                      <SelectItem value="ADMINISTRADOR">Administrador</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="departamento">Departamento (opcional)</Label>
                                  <Input id="departamento" placeholder="Departamento" value={userDepartamento} onChange={(e) => setUserDepartamento(e.target.value)} />
                                </div>
                              </>
                            )}
                            <div className="space-y-2">
                              <Label htmlFor="estado">Estado</Label>
                              <Select value={userEstado} onValueChange={setUserEstado} required>
                                <SelectTrigger id="estado">
                                  <SelectValue placeholder="Selecciona un estado" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="ACTIVO">Activo</SelectItem>
                                  <SelectItem value="INACTIVO">Inactivo</SelectItem>
                                  <SelectItem value="BLOQUEADO">Bloqueado</SelectItem>
                                  <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="password">{editingUser ? "Nueva Contraseña (opcional)" : "Contraseña"}</Label>
                              <Input id="password" type="password" value={userPassword} onChange={(e) => setUserPassword(e.target.value)} required={!editingUser} />
                              {!editingUser && <p className="text-xs text-gray-500">La contraseña debe tener al menos 8 caracteres.</p>}
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setIsUserDialogOpen(false)} type="button">
                              Cancelar
                            </Button>
                            <Button type="submit" disabled={isCreatingUser}>
                              {isCreatingUser ? "Guardando..." : "Guardar Usuario"}
                            </Button>
                          </DialogFooter>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Correo</TableHead>
                      <TableHead>Rol</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Último Acceso</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.usuarioid}>
                        <TableCell className="font-medium">{user.nombre}</TableCell>
                        <TableCell>{user.correoElectronico}</TableCell>
                        <TableCell>
                          <Badge variant={user.role.toLowerCase() === "organizador" || user.role.toLowerCase() === "administrador" ? "default" : "secondary"}>
                            {user.role.charAt(0).toUpperCase() + user.role.slice(1).toLowerCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={user.estado.toLowerCase() === "activo" ? "outline" : "destructive"}
                            className={user.estado.toLowerCase() === "activo" ? "bg-green-50 text-green-700" : ""}
                          >
                            {user.estado.charAt(0).toUpperCase() + user.estado.slice(1).toLowerCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(user.ultimoAcceso).toLocaleString()}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="icon" onClick={() => handleOpenUserDialog(user)}>
                              <EditIcon className="h-4 w-4" />
                              <span className="sr-only">Editar</span>
                            </Button>
                            <Button variant="outline" size="icon" onClick={() => handleDeleteUser(user.usuarioid)}>
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
              <CardFooter className="flex items-center justify-between">
                <div className="text-sm text-gray-500">Mostrando {users.length} usuarios</div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled>
                    Anterior
                  </Button>
                  <Button variant="outline" size="sm">
                    Siguiente
                  </Button>
                </div>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="actividad" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Registro de Actividad</CardTitle>
                <CardDescription>Historial de acciones realizadas en el sistema</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Acción</TableHead>
                      <TableHead>Detalles</TableHead>
                      <TableHead>Fecha</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activities.map((activity) => (
                      <TableRow key={activity.actividadid}>
                        <TableCell className="font-medium">{activity.usuario || 'Sistema'}</TableCell>
                        <TableCell>{activity.descripcion}</TableCell>
                        <TableCell className="max-w-xs truncate">{activity.detalles}</TableCell>
                        <TableCell>{new Date(activity.fecha).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
              <CardFooter className="flex items-center justify-between">
                <div className="text-sm text-gray-500">Mostrando {activities.length} actividades recientes</div>
                <Button variant="outline" size="sm">
                  Ver historial completo
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="configuracion" className="mt-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Configuración General</CardTitle>
                  <CardDescription>Ajustes generales del sistema</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <form onSubmit={handleSaveConfig}>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="nombreAplicacion">Nombre de la Aplicación</Label>
                        <Input id="nombreAplicacion" value={config?.nombreAplicacion || ''} onChange={(e) => setConfig(prev => prev ? { ...prev, nombreAplicacion: e.target.value } : null)} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="contactoEmail">Email de Contacto</Label>
                        <Input id="contactoEmail" type="email" value={config?.contactoEmail || ''} onChange={(e) => setConfig(prev => prev ? { ...prev, contactoEmail: e.target.value } : null)} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="version">Versión</Label>
                        <Input id="version" value={config?.version || ''} onChange={(e) => setConfig(prev => prev ? { ...prev, version: e.target.value } : null)} />
                      </div>
                    </div>
                    {saveConfigError && <p className="text-red-500 text-sm">{saveConfigError}</p>}
                    <CardFooter className="flex justify-end p-0 pt-4">
                      <Button type="submit" disabled={isSavingConfig}>
                        {isSavingConfig ? "Guardando..." : "Guardar Configuración"}
                      </Button>
                    </CardFooter>
                  </form>

                  <div className="space-y-4">
                    <h4 className="font-medium">Métodos de pago (Próximamente)</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Switch id="tarjeta" defaultChecked disabled />
                          <Label htmlFor="tarjeta">Tarjeta de crédito/débito</Label>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Switch id="transferencia" defaultChecked disabled />
                          <Label htmlFor="transferencia">Transferencia bancaria</Label>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Switch id="efectivo" disabled />
                          <Label htmlFor="efectivo">Pago en efectivo</Label>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium">Límites y restricciones (Próximamente)</h4>
                    <div className="grid gap-2">
                      <div className="space-y-2">
                        <Label htmlFor="max-boletos">Máximo de boletos por usuario</Label>
                        <Select defaultValue="5" disabled>
                          <SelectTrigger id="max-boletos">
                            <SelectValue placeholder="Selecciona un límite" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="3">3 boletos</SelectItem>
                            <SelectItem value="5">5 boletos</SelectItem>
                            <SelectItem value="10">10 boletos</SelectItem>
                            <SelectItem value="0">Sin límite</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="tiempo-reserva">Tiempo de reserva</Label>
                        <Select defaultValue="15" disabled>
                          <SelectTrigger id="tiempo-reserva">
                            <SelectValue placeholder="Selecciona un tiempo" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="5">5 minutos</SelectItem>
                            <SelectItem value="10">10 minutos</SelectItem>
                            <SelectItem value="15">15 minutos</SelectItem>
                            <SelectItem value="30">30 minutos</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="hidden">
                  {/* This footer is now part of the form above */}
                </CardFooter>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Configuración de Notificaciones (Próximamente)</CardTitle>
                  <CardDescription>Configura las notificaciones del sistema</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <h4 className="font-medium">Notificaciones por correo</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Switch id="confirmacion" defaultChecked disabled />
                          <Label htmlFor="confirmacion">Confirmación de compra</Label>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Switch id="recordatorio" defaultChecked disabled />
                          <Label htmlFor="recordatorio">Recordatorio de eventos</Label>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Switch id="cambios" defaultChecked disabled />
                          <Label htmlFor="cambios">Cambios en eventos</Label>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Switch id="marketing" disabled />
                          <Label htmlFor="marketing">Promociones y marketing</Label>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium">Plantillas de correo</h4>
                    <div className="space-y-2">
                      <Button variant="outline" className="w-full justify-start text-left" disabled>
                        <EditIcon className="mr-2 h-4 w-4" />
                        Editar plantilla de confirmación (Próximamente)
                      </Button>
                      <Button variant="outline" className="w-full justify-start text-left" disabled>
                        <EditIcon className="mr-2 h-4 w-4" />
                        Editar plantilla de recordatorio (Próximamente)
                      </Button>
                      <Button variant="outline" className="w-full justify-start text-left" disabled>
                        <EditIcon className="mr-2 h-4 w-4" />
                        Editar plantilla de cambios (Próximamente)
                      </Button>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="hidden">
                  {/* This footer is now part of the form above */}
                </CardFooter>
              </Card>

              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Seguridad y Acceso (Próximamente)</CardTitle>
                  <CardDescription>Configura opciones de seguridad y acceso al sistema</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-4">
                      <h4 className="font-medium">Políticas de contraseña</h4>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Switch id="longitud" defaultChecked disabled />
                            <Label htmlFor="longitud">Mínimo 8 caracteres</Label>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Switch id="mayusculas" defaultChecked disabled />
                            <Label htmlFor="mayusculas">Requerir mayúsculas</Label>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Switch id="numeros" defaultChecked disabled />
                            <Label htmlFor="numeros">Requerir números</Label>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Switch id="especiales" disabled />
                            <Label htmlFor="especiales">Requerir caracteres especiales</Label>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-medium">Sesiones y acceso</h4>
                      <div className="space-y-2">
                        <div className="space-y-2">
                          <Label htmlFor="tiempo-sesion">Tiempo de sesión</Label>
                          <Select defaultValue="60" disabled>
                            <SelectTrigger id="tiempo-sesion">
                              <SelectValue placeholder="Selecciona un tiempo" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="30">30 minutos</SelectItem>
                              <SelectItem value="60">1 hora</SelectItem>
                              <SelectItem value="120">2 horas</SelectItem>
                              <SelectItem value="240">4 horas</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Switch id="bloqueo" defaultChecked disabled />
                            <Label htmlFor="bloqueo">Bloquear cuenta después de 5 intentos fallidos</Label>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Switch id="registro-abierto" defaultChecked disabled />
                            <Label htmlFor="registro-abierto">Permitir registro de nuevos usuarios</Label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button variant="outline" className="text-red-500" disabled>
                    <LogOutIcon className="mr-2 h-4 w-4" />
                    Cerrar todas las sesiones (Próximamente)
                  </Button>
                  <Button disabled>Guardar Configuración (Próximamente)</Button>
                </CardFooter>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
