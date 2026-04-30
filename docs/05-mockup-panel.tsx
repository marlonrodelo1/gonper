// Mockup de referencia visual de la pantalla "Hoy" del panel del dueño.
// USO: este archivo es REFERENCIA para Claude Code.
// El código real del panel adapta esto a Server Components + datos reales de Supabase,
// manteniendo el sistema visual (colores, layout, componentes).
//
// Stack visual a replicar:
// - Tailwind CSS (clases utility)
// - lucide-react (iconos)
// - shadcn/ui (cuando se construya el real)
// - Mobile-first: sidebar colapsable, modal como bottom sheet en móvil
//
// Paleta principal:
// - Marca: gradient from-purple-600 to-pink-600
// - Estados: emerald (ok), amber (warn), red (error), blue (info)
// - Fondo app: bg-gray-50, cards bg-white
//
// Componentes clave a portar al panel real:
// 1. Sidebar con navegación (Hoy, Agenda, Clientes, Servicios, Stats, Config)
// 2. Top bar con fecha y CTA "Nueva cita"
// 3. Banner de alerta cuando hay citas sin confirmar próximas
// 4. Grid 4 stats: Facturado, Completadas, No-shows, Estado de Juanita
// 5. Lista de citas del día con badges de estado
// 6. Bloque "Juanita resume tu día" con sugerencias accionables
// 7. Modal lateral/bottom-sheet con detalle de cita

import React, { useState } from 'react';
import {
  Calendar, Clock, Users, TrendingUp, AlertCircle,
  CheckCircle2, XCircle, Phone, MessageCircle, Settings,
  LogOut, Home, Scissors, BarChart3, Bell, Menu, X,
  ChevronRight, Plus
} from 'lucide-react';

export default function PanelMockup() {
  const [activeTab, setActiveTab] = useState('hoy');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedCita, setSelectedCita] = useState(null);

  // Datos mock — en el panel real vienen de Supabase
  const citasHoy = [
    { id: 1, hora: '10:00', cliente: 'María García', servicio: 'Corte', profesional: 'Roberto', precio: 15, estado: 'completada', telefono: '+34 612 345 678' },
    { id: 2, hora: '10:45', cliente: 'Roberto Pérez', servicio: 'Corte + Barba', profesional: 'Roberto', precio: 22, estado: 'completada', telefono: '+34 623 456 789' },
    { id: 3, hora: '11:30', cliente: 'Luis Sánchez', servicio: 'Afeitado', profesional: 'Carlos', precio: 18, estado: 'completada', telefono: '+34 634 567 890' },
    { id: 4, hora: '12:15', cliente: 'Pedro Gómez', servicio: 'Corte', profesional: 'Roberto', precio: 15, estado: 'no_show', telefono: '+34 645 678 901', noShows: 3 },
    { id: 5, hora: '16:30', cliente: 'Ana Martín', servicio: 'Corte', profesional: 'Carlos', precio: 15, estado: 'pendiente', telefono: '+34 656 789 012', alerta: true },
    { id: 6, hora: '17:30', cliente: 'Pablo Ruiz', servicio: 'Corte + Barba', profesional: 'Roberto', precio: 22, estado: 'confirmada', telefono: '+34 667 890 123' },
    { id: 7, hora: '19:00', cliente: 'Diego López', servicio: 'Corte', profesional: 'Carlos', precio: 15, estado: 'confirmada', telefono: '+34 678 901 234' },
  ];

  // (resto del componente igual al mockup mostrado en la conversación —
  //  Claude Code lo recreará completo con datos reales)

  return null; // placeholder — el código completo está en la conversación de diseño
}

/*
NOTAS PARA CLAUDE CODE:

1. RUTAS:
   - /app/(panel)/hoy/page.tsx → esta pantalla
   - /app/(panel)/agenda/page.tsx → vista semanal
   - /app/(panel)/clientes/page.tsx → lista clientes
   - /app/(panel)/servicios/page.tsx → catálogo
   - /app/(panel)/stats/page.tsx → métricas
   - /app/(panel)/config/page.tsx → configuración (incluye personalización agente)

2. DATOS:
   - Usar Server Components con queries Drizzle
   - El componente cliente solo para interactividad (modal, sidebar móvil)
   - Suspense boundaries para carga progresiva

3. AUTH:
   - Middleware verifica sesión Supabase
   - Layout (panel) obtiene salon_id del usuario autenticado
   - Todas las queries filtran por salon_id (RLS lo refuerza)

4. RESPONSIVE:
   - Mobile-first siempre
   - Sidebar fija en desktop, drawer en móvil
   - Modal de detalle: dialog en desktop, bottom sheet en móvil
*/
