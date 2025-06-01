"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import {
  ArrowLeftIcon,
  ZoomInIcon,
  ZoomOutIcon,
  SaveIcon,
  DownloadIcon,
  PlusIcon,
  Trash2Icon,
  InfoIcon,
  Loader2Icon,
} from "lucide-react"
import { useApi } from "@/lib/api"
import { useAuth } from "@/context/AuthContext"

interface Seat {
  asientoid: number; 
  codigo: string;
  fila: number;
  columna: number;
  estado: 'DISPONIBLE' | 'OCUPADO' | 'RESERVADO' | 'BLOQUEADO';
  areaid: number;    
  isNew?: boolean; 
}

interface TableLayout {
  id: string; 
  x: number;
  y: number;
  areaid: number; 
  nombre?: string;
  isDeleting?: boolean; // Nueva propiedad para marcar para eliminación
}

interface CroquisConfig {
  tables: TableLayout[];
}

interface EventoData {
  eventoID: number;
  nombre: string;
  fecha: string;
  lugarnombre: string;
  capacidad: number;
  boletosVendidos: number;
}

interface CroquisClientComponentProps {
  eventoID: string;
}

interface LayoutSaveResponse {
  message: string;
  layoutConfig: CroquisConfig | null;
  seats: Seat[];
}

export default function CroquisClientComponent({ eventoID }: CroquisClientComponentProps) {
  const { toast } = useToast();
  const api = useApi();
  const { token } = useAuth();

  const [zoom, setZoom] = useState(100);
  const [showLabels, setShowLabels] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState("todos");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [layoutConfig, setLayoutConfig] = useState<CroquisConfig | null>(null);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [evento, setEvento] = useState<EventoData | null>(null);

  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [selectedSeatInfo, setSelectedSeatInfo] = useState<{ asientoId: number; areaId: number; isNew?: boolean } | null>(null);
  const [draggingTableId, setDraggingTableId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchLayoutData = useCallback(async () => {
    console.log("[CroquisClient] Iniciando fetchLayoutData para eventoID:", eventoID);
    setLoading(true);
    setError(null);
    try {
      const eventData = await api.get<EventoData>(`/eventos/${eventoID}`);
      setEvento(eventData);

      const layoutResponse = await api.get<LayoutSaveResponse>(`/eventos/${eventoID}/layout`);
      console.log("[CroquisClient] Datos recibidos de GET /layout:", layoutResponse);

      if (layoutResponse.layoutConfig && layoutResponse.layoutConfig.tables) {
        const normalizedTables = layoutResponse.layoutConfig.tables.map(table => {
          let newTable = { ...table } as TableLayout;
          if (newTable.areaid === undefined && (table as any).areaID !== undefined) {
            newTable.areaid = (table as any).areaID;
            delete (newTable as any).areaID; 
          }
          if (newTable.id === "area-undefined" && newTable.areaid !== undefined) {
            newTable.id = `area-${newTable.areaid}`;
          }
          return newTable;
        });
        setLayoutConfig({ ...layoutResponse.layoutConfig, tables: normalizedTables });
      } else if (layoutResponse.seats && layoutResponse.seats.length > 0) {
        const areasFromSeats = new Map<number, TableLayout>();
        let areaCount = 0;
        layoutResponse.seats.forEach(seat => {
          if (seat.areaid !== undefined && !areasFromSeats.has(seat.areaid)) {
            areasFromSeats.set(seat.areaid, {
              id: `area-${seat.areaid}`,
              areaid: seat.areaid,
              x: 50 + (areaCount % 4) * 150,
              y: 50 + Math.floor(areaCount / 4) * 150,
              nombre: `Área ${seat.areaid}`
            });
            areaCount++;
          }
        });
        setLayoutConfig({ tables: Array.from(areasFromSeats.values()) });
      } else {
        setLayoutConfig({ tables: [] });
      }
      setSeats((layoutResponse.seats || []).map(s => ({...s, isNew: false })));
    } catch (err: any) {
      console.error("[CroquisClient] Error detallado al cargar datos del croquis:", err);
      setError(err.message || "Error al cargar datos del croquis.");
      toast({ title: "Error de Carga", description: err.message || "Error al cargar datos del croquis.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [eventoID, api, toast]);

  useEffect(() => {
    if (token) {
      fetchLayoutData();
    }
  }, [fetchLayoutData, token]);

  const saveLayout = async () => {
    if (!layoutConfig || !evento) return;
    setLoading(true);
    setError(null);

    try {
      let currentLayoutConfig = layoutConfig;
      let currentSeats = seats;

      // 1. Procesar eliminaciones de áreas marcadas que son persistidas
      const persistedAreasToDelete = currentLayoutConfig.tables.filter(
        table => table.isDeleting && table.id.startsWith('area-') && typeof table.areaid === 'number' && table.areaid < 1000000000
      );

      if (persistedAreasToDelete.length > 0) {
        toast({ title: "Procesando eliminaciones...", description: `Eliminando ${persistedAreasToDelete.length} área(s) guardada(s).`});
        for (const area of persistedAreasToDelete) {
          try {
            console.log(`[CroquisClient] saveLayout: Eliminando área persistida con areaid: ${area.areaid}`);
            await api.delete(`/eventos/${eventoID}/areas/${area.areaid}`); // El backend ya actualiza el croquis y devuelve el estado
          } catch (deleteErr: any) {
            console.error(`Error al eliminar área ${area.areaid} durante el guardado:`, deleteErr);
            toast({ title: "Error Parcial", description: `No se pudo eliminar el área ${area.nombre || area.id}.`, variant: "destructive" });
            // Si falla una eliminación, podríamos optar por no continuar con el guardado o marcar el área para que no se intente de nuevo.
            // Por ahora, la quitamos de la lista de "a eliminar" para no reintentar en este guardado.
            currentLayoutConfig = {
              ...currentLayoutConfig,
              tables: currentLayoutConfig.tables.map(t => t.id === area.id ? { ...t, isDeleting: false } : t)
            };
          }
        }
        // Después de los deletes, es mejor refetchear para asegurar la consistencia total del estado,
        // ya que el backend es la fuente de verdad para el layoutConfig y seats después de un delete.
        // O, si el DELETE devolviera el estado actualizado, podríamos usarlo.
        // Por ahora, vamos a filtrar localmente y luego el PUT sincronizará.
        currentLayoutConfig = {
            ...currentLayoutConfig,
            tables: currentLayoutConfig.tables.filter(table => !table.isDeleting || !table.id.startsWith('area-')),
        };
        const deletedAreaIds = persistedAreasToDelete.map(a => a.areaid);
        currentSeats = currentSeats.filter(seat => !deletedAreaIds.includes(seat.areaid));
      }

      // Filtrar áreas nuevas marcadas para eliminación (que nunca se guardaron)
      currentLayoutConfig = {
        ...currentLayoutConfig,
        tables: currentLayoutConfig.tables.filter(table => !(table.id.startsWith('new-table-') && table.isDeleting))
      };
      // Asegurarse de que la propiedad isDeleting no se envíe al backend para las tablas que se quedan
      const finalTablesForPayload = currentLayoutConfig.tables.map(({ isDeleting, ...table }) => table);


      const payload = {
        configuracionCroquis: { ...currentLayoutConfig, tables: finalTablesForPayload },
        asientos: currentSeats.filter(seat => { // Filtrar asientos de áreas que pudieron ser marcadas como isDeleting pero no eran persistidas
          const parentTable = finalTablesForPayload.find(t => t.areaid === seat.areaid);
          return parentTable !== undefined;
        }).map(seat => ({
          asientoID: seat.asientoid,
          codigo: seat.codigo,
          fila: seat.fila,
          columna: seat.columna,
          estado: seat.estado,
          areaID: seat.areaid, 
          isNew: seat.isNew 
        }))
      };
      
      console.log("[CroquisClient] Enviando payload final a PUT /layout:", JSON.stringify(payload, null, 2));
      const response = await api.put<LayoutSaveResponse>(`/eventos/${eventoID}/layout`, payload);
      console.log("[CroquisClient] Respuesta de PUT /layout:", response);

      if (response.layoutConfig && response.seats) {
        const normalizedTables = response.layoutConfig.tables.map(table => {
          let newTable = { ...table } as TableLayout;
          if (newTable.areaid === undefined && (table as any).areaID !== undefined) {
            newTable.areaid = (table as any).areaID;
            delete (newTable as any).areaID;
          }
          if (newTable.id === "area-undefined" && newTable.areaid !== undefined) {
            newTable.id = `area-${newTable.areaid}`;
          }
          return newTable;
        });
        setLayoutConfig({ ...response.layoutConfig, tables: normalizedTables });
        setSeats(response.seats.map(s => ({ ...s, isNew: false }))); 
        toast({
          title: "Éxito",
          description: response.message || "Croquis y asientos guardados correctamente.",
        });
      } else {
        toast({
          title: "Advertencia",
          description: response.message || "Respuesta inesperada del servidor. Recargando datos.",
          variant: "default"
        });
        fetchLayoutData(); 
      }
    } catch (err: any) {
      console.error("Error al guardar croquis:", err);
      setError(err.message || "Error al guardar croquis.");
      toast({
        title: "Error al Guardar",
        description: err.message || "No se pudieron guardar los cambios del croquis.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddTable = () => {
    if (!editMode) return;
    const newAreaIdValue = Date.now(); 
    const newTable: TableLayout = {
      id: `new-table-${newAreaIdValue}`, 
      x: 50,
      y: 50,
      areaid: newAreaIdValue, 
      nombre: `Nueva Área ${ (layoutConfig?.tables.length || 0) + 1}`
    };
    setLayoutConfig(prevConfig => ({
      ...prevConfig,
      tables: [...(prevConfig?.tables || []), newTable],
    }));
    toast({ title: "Área Añadida", description: "Una nueva área ha sido añadida visualmente. Se guardará al presionar 'Guardar Cambios'." });
  };

  const handleAddSeat = () => {
    if (!editMode || !selectedTableId || !layoutConfig) {
      toast({ title: "Acción requerida", description: "Selecciona un área primero para añadir una silla.", variant: "default" });
      return;
    }
    const targetTable = layoutConfig.tables.find(table => table.id === selectedTableId);
    if (!targetTable || targetTable.areaid === undefined) { 
      toast({ title: "Error", description: "El área seleccionada no es válida o no tiene ID de área.", variant: "destructive" });
      return;
    }
    const newSeatId = Date.now(); 
    const newSeat: Seat = {
      asientoid: newSeatId, 
      codigo: `N${String(newSeatId).slice(-3)}`, 
      fila: 0, 
      columna: 0, 
      estado: 'DISPONIBLE',
      areaid: targetTable.areaid, 
      isNew: true, 
    };
    setSeats(prevSeats => [...prevSeats, newSeat]);
    toast({ title: "Silla Añadida (Visualmente)", description: `Nueva silla en ${targetTable.nombre || `Área ${targetTable.areaid}`}. Se guardará al presionar "Guardar Cambios".` });
  };

  const handleDeleteSelectedArea = async () => {
    if (!editMode || !selectedTableId || !layoutConfig || !evento) {
      toast({ title: "Acción no permitida", description: "Debe estar en modo edición y seleccionar un área para eliminar.", variant: "default" });
      return;
    }

    const areaToDelete = layoutConfig.tables.find(table => table.id === selectedTableId);
    if (!areaToDelete) {
      toast({ title: "Error", description: "El área seleccionada para eliminar no se encontró.", variant: "destructive" });
      return;
    }

    const confirmDelete = window.confirm(`¿Estás seguro de que quieres eliminar el área "${areaToDelete.nombre || areaToDelete.id}" y todos sus asientos? Esta acción no se puede deshacer.`);
    if (!confirmDelete) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const isPersistedArea = areaToDelete.id.startsWith('area-') && typeof areaToDelete.areaid === 'number' && areaToDelete.areaid < 1000000000;

      if (!isPersistedArea) { // Área nueva no guardada en BD
        setLayoutConfig(prevConfig => {
          if (!prevConfig) return null;
          return {
            ...prevConfig,
            tables: prevConfig.tables.filter(table => table.id !== selectedTableId),
          };
        });
        setSeats(prevSeats => prevSeats.filter(seat => seat.areaid !== areaToDelete.areaid));
        toast({ title: "Área no guardada eliminada", description: `El área "${areaToDelete.nombre || areaToDelete.id}" se ha quitado de la vista.` });
      } else { // Área existente en BD: marcar para eliminación diferida
        setLayoutConfig(prevConfig => {
          if (!prevConfig) return null;
          return {
            ...prevConfig,
            tables: prevConfig.tables.map(table =>
              table.id === selectedTableId ? { ...table, isDeleting: !table.isDeleting } : table
            ),
          };
        });
        const currentAreaState = layoutConfig.tables.find(t => t.id === selectedTableId);
        if (currentAreaState?.isDeleting) {
            toast({ title: "Área restaurada", description: `El área "${areaToDelete.nombre || areaToDelete.id}" ya no está marcada para eliminación. Guarda los cambios.` });
        } else {
            toast({ title: "Área marcada para eliminar", description: `El área "${areaToDelete.nombre || areaToDelete.id}" se eliminará al guardar los cambios.` });
        }
      }
      setSelectedTableId(null); // Deseleccionar después de la acción
    } catch (err: any) { // Aunque la operación es local, mantenemos el bloque por si acaso
      console.error("Error al marcar/desmarcar área para eliminar:", err);
      setError(err.message || "Error al eliminar el área.");
      toast({
        title: "Error al Eliminar",
        description: err.response?.data?.message || err.message || "No se pudo eliminar el área.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Placeholder para la futura función de eliminar silla
  const handleDeleteSelectedSeat = async () => {
    if (!editMode || !selectedSeatInfo || !evento) {
      toast({ title: "Acción no permitida", description: "Debe estar en modo edición y seleccionar una silla para eliminar.", variant: "default" });
      return;
    }
    // Lógica de eliminación de silla aquí...
    toast({ title: "Función Pendiente", description: "La eliminación de sillas individuales aún no está implementada."});
  };

  const handleGeneralDelete = () => {
    if (selectedTableId) {
      handleDeleteSelectedArea();
    } else if (selectedSeatInfo) {
      handleDeleteSelectedSeat();
    } else {
      toast({ title: "Nada seleccionado", description: "Por favor, selecciona un área o una silla para eliminar.", variant: "default"});
    }
  };


  const getSeatColor = (status: string) => {
    if (selectedFilter !== "todos" && selectedFilter.toLowerCase() !== status.toLowerCase()) {
      return "bg-gray-300 opacity-40"
    }
    switch (status.toUpperCase()) {
      case "OCUPADO": return "bg-red-500";
      case "RESERVADO": return "bg-yellow-500";
      case "BLOQUEADO": return "bg-gray-500"; 
      default: return "bg-green-500"; 
    }
  };

  const handleMouseDown = useCallback((e: React.MouseEvent, tableId: string) => {
    if (!editMode) return;
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    setDraggingTableId(tableId);
    setDragOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, [editMode]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!draggingTableId || !containerRef.current || !layoutConfig) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const newX = e.clientX - containerRect.left - dragOffset.x;
    const newY = e.clientY - containerRect.top - dragOffset.y;
    setLayoutConfig(prevConfig => {
      if (!prevConfig) return null;
      const updatedTables = prevConfig.tables.map(table =>
        table.id === draggingTableId ? { ...table, x: newX, y: newY } : table
      );
      return { ...prevConfig, tables: updatedTables };
    });
  }, [draggingTableId, dragOffset, layoutConfig]);

  const handleMouseUp = useCallback(() => {
    setDraggingTableId(null);
  }, []);

  useEffect(() => {
    if (draggingTableId) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingTableId, handleMouseMove, handleMouseUp]);

  const totalCapacidad = evento?.capacidad || 0;
  const boletosVendidos = evento?.boletosVendidos || 0;
  const disponibles = totalCapacidad - boletosVendidos;
  const porcentajeVendidos = totalCapacidad > 0 ? Math.round((boletosVendidos / totalCapacidad) * 100) : 0;

  const seatCounts = seats.reduce((acc, seat) => {
    const status = seat.estado.toLowerCase();
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (loading && !evento) { 
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2Icon className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg text-gray-700">Cargando croquis...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
        <p className="text-lg font-semibold text-red-600">Error: {error}</p>
        <Button onClick={fetchLayoutData} className="mt-4">Reintentar</Button>
      </div>
    );
  }

  if (!evento) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-lg text-gray-700">No se encontró información del evento.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
          <div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" asChild>
                <Link href="/admin/eventos">
                  <ArrowLeftIcon className="h-4 w-4" />
                </Link>
              </Button>
              <h1 className="text-2xl font-bold text-gray-900">Croquis del Evento</h1>
            </div>
            <p className="mt-1 text-gray-500">
              {evento.nombre} - {new Date(evento.fecha).toLocaleDateString()}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled={!editMode || loading} onClick={saveLayout}>
              {loading && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />}
              <SaveIcon className="mr-2 h-4 w-4" />
              Guardar Cambios
            </Button>
            <Button variant="outline">
              <DownloadIcon className="mr-2 h-4 w-4" />
              Descargar PDF
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
                <CardTitle>Vista del Croquis</CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={() => setZoom(Math.max(50, zoom - 10))}> <ZoomOutIcon className="h-4 w-4" /> </Button>
                  <Slider value={[zoom]} min={50} max={150} step={10} onValueChange={(value: number[]) => setZoom(value[0])} className="w-[100px]" />
                  <Button variant="outline" size="icon" onClick={() => setZoom(Math.min(150, zoom + 10))}> <ZoomInIcon className="h-4 w-4" /> </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex items-center justify-between">
                <Select value={selectedFilter} onValueChange={setSelectedFilter}>
                  <SelectTrigger className="w-[180px]"> <SelectValue placeholder="Filtrar por estado" /> </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos los asientos</SelectItem>
                    <SelectItem value="disponible">Disponibles ({seatCounts['disponible'] || 0})</SelectItem>
                    <SelectItem value="ocupado">Ocupados ({seatCounts['ocupado'] || 0})</SelectItem>
                    <SelectItem value="reservado">Reservados ({seatCounts['reservado'] || 0})</SelectItem>
                    <SelectItem value="bloqueado">Bloqueados ({seatCounts['bloqueado'] || 0})</SelectItem> 
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-2">
                  <Switch id="labels" checked={showLabels} onCheckedChange={setShowLabels} />
                  <Label htmlFor="labels">Mostrar etiquetas</Label>
                </div>
              </div>

              <div ref={containerRef} className="relative overflow-auto rounded-lg border bg-white p-4" style={{ height: "500px" }}>
                {loading && !layoutConfig && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-10">
                    <Loader2Icon className="h-8 w-8 animate-spin text-primary" />
                  </div>
                )}
                <div className="mb-4 flex items-center justify-center">
                  <Badge variant="outline" className="flex items-center gap-1 px-3 py-1 text-sm">
                    <InfoIcon className="h-4 w-4" /> <span>Escenario</span>
                  </Badge>
                </div>
                <div
                  className="relative mx-auto transition-transform"
                  style={{
                    transform: `scale(${zoom / 100})`,
                    transformOrigin: "center center",
                    width: "800px", 
                    height: "400px", 
                  }}
                >
                  {layoutConfig?.tables.map((table: TableLayout) => (
                    <div
                      key={table.id}
                      className={`absolute p-2 border border-dashed rounded 
                                  ${draggingTableId === table.id ? 'cursor-grabbing border-blue-500 ring-2 ring-blue-500' : editMode ? 'cursor-grab border-gray-400 hover:border-blue-400' : 'cursor-default border-gray-400'}
                                  ${selectedTableId === table.id && editMode ? 'border-blue-600 ring-2 ring-blue-600 shadow-lg' : ''}
                                  ${table.isDeleting ? 'opacity-50 border-red-500' : ''} 
                                  `}
                      style={{
                        left: `${table.x}px`,
                        top: `${table.y}px`,
                        minWidth: '100px', 
                      }}
                      onMouseDown={(e) => {
                        if (editMode && !table.isDeleting) { // No permitir mover si está marcada para eliminar
                          handleMouseDown(e, table.id);
                          setSelectedSeatInfo(null); 
                        }
                      }}
                      onClick={() => { 
                        if (editMode) {
                          setSelectedTableId(table.id);
                          setSelectedSeatInfo(null); 
                        }
                      }} 
                    >
                      {showLabels && <div className={`mb-1 text-center text-xs font-semibold ${table.isDeleting ? 'text-red-700 line-through' : 'text-gray-700'}`}>{table.id.startsWith('area-') ? `Área ${table.areaid}` : (table.nombre || table.id)}</div>}
                      <div className={`h-12 w-32 rounded flex items-center justify-center text-sm ${table.isDeleting ? 'bg-red-100 text-red-700 line-through' : 'bg-blue-100 text-blue-700'}`}>
                        {table.id.startsWith('new-') ? (table.nombre || 'Nueva Área') : (table.id.startsWith('area-') ? `Área ${table.areaid}` : (table.nombre || table.id))}
                      </div>
                      <div className="mt-2 grid grid-cols-5 gap-1"> 
                        {seats
                          .filter(seat => seat.areaid === table.areaid && seat.asientoid !== undefined && !table.isDeleting) // No mostrar asientos de áreas marcadas para eliminar
                          .map((seat: Seat) => {
                            const isSelectedSeat = selectedSeatInfo?.asientoId === seat.asientoid;
                            return (
                              <div 
                                key={seat.asientoid} 
                                className="relative group"
                                onClick={(e) => {
                                  e.stopPropagation(); 
                                  if (editMode && !table.isDeleting) { // No permitir seleccionar asientos de áreas marcadas para eliminar
                                    setSelectedSeatInfo({ asientoId: seat.asientoid, areaId: seat.areaid, isNew: seat.isNew });
                                    setSelectedTableId(null); 
                                  }
                                }}
                              > 
                                <div
                                  className={`h-6 w-6 rounded ${getSeatColor(seat.estado)} 
                                              ${isSelectedSeat && editMode ? 'ring-2 ring-offset-1 ring-purple-500' : 'hover:ring-2 hover:ring-offset-1 hover:ring-indigo-500'}
                                              transition-all flex items-center justify-center text-white text-xs`}
                                  title={seat.codigo}
                                >
                                  {showLabels ? seat.codigo.slice(-2) : ''}
                                </div>
                              </div>
                            ); 
                          })} 
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Estadísticas</CardTitle>
                <CardDescription>Información sobre la ocupación del evento</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between"> <span className="text-sm text-gray-500">Capacidad total:</span> <span className="font-medium">{totalCapacidad} asientos</span> </div>
                  <div className="flex items-center justify-between"> <span className="text-sm text-gray-500">Boletos vendidos:</span> <span className="font-medium"> {boletosVendidos} ({porcentajeVendidos}%) </span> </div>
                  <div className="flex items-center justify-between"> <span className="text-sm text-gray-500">Disponibles:</span> <span className="font-medium">{disponibles} asientos</span> </div>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200"> <div className="h-full bg-primary" style={{ width: `${porcentajeVendidos}%` }} ></div> </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <div className="flex items-center gap-1.5"> <div className="h-2.5 w-2.5 rounded-full bg-green-500"></div> Disponible ({seatCounts['disponible'] || 0}) </div>
                  <div className="flex items-center gap-1.5"> <div className="h-2.5 w-2.5 rounded-full bg-red-500"></div> Ocupado ({seatCounts['ocupado'] || 0}) </div>
                  <div className="flex items-center gap-1.5"> <div className="h-2.5 w-2.5 rounded-full bg-yellow-500"></div> Reservado ({seatCounts['reservado'] || 0})</div>
                  <div className="flex items-center gap-1.5"> <div className="h-2.5 w-2.5 rounded-full bg-gray-500"></div> Bloqueado ({seatCounts['bloqueado'] || 0})</div> 
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Modo de Edición</CardTitle>
                <CardDescription>Configura el croquis del evento</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch id="edit-mode" checked={editMode} onCheckedChange={setEditMode} />
                  <Label htmlFor="edit-mode">Activar modo de edición</Label>
                </div>
                {editMode && (
                  <div className="space-y-3 rounded-lg border p-3">
                    <h4 className="text-sm font-medium">Herramientas de edición</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" size="sm" onClick={handleAddTable} disabled={loading}>
                        <PlusIcon className="mr-1.5 h-3.5 w-3.5" /> Añadir Mesa/Área
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleAddSeat} disabled={loading || !editMode || !selectedTableId}>
                        <PlusIcon className="mr-1.5 h-3.5 w-3.5" /> Añadir Silla
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-red-500 hover:text-red-600 col-span-2" 
                        onClick={handleGeneralDelete} 
                        disabled={loading || !editMode || (!selectedTableId && !selectedSeatInfo)} 
                      > 
                        <Trash2Icon className="mr-1.5 h-3.5 w-3.5" /> 
                        {selectedTableId && layoutConfig?.tables.find(t=>t.id === selectedTableId)?.isDeleting ? "Restaurar Área" : selectedTableId ? "Eliminar Área Sel." : selectedSeatInfo ? "Eliminar Silla Sel." : "Eliminar Seleccionado"}
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500">Selecciona un área o silla. La eliminación se aplicará al "Guardar Cambios".</p>
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <p className="text-xs text-gray-500"> Las creaciones, movimientos y eliminaciones se guardarán al presionar "Guardar Cambios". </p>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
