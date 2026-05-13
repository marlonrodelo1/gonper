/**
 * Datos por defecto para crear un salón nuevo: servicios típicos según
 * tipo de negocio y horarios semanales L-V + sábado mañana.
 *
 * Compartido entre el signup público y la tool `crear_salon` de Royce.
 */

export interface ServicioSeed {
  nombre: string;
  duracion_min: number;
  precio_eur: number;
  orden: number;
}

export const SERVICIOS_POR_TIPO: Record<string, ServicioSeed[]> = {
  barberia: [
    { nombre: 'Corte de pelo', duracion_min: 30, precio_eur: 15, orden: 0 },
    { nombre: 'Corte + Barba', duracion_min: 45, precio_eur: 22, orden: 1 },
    { nombre: 'Arreglo de barba', duracion_min: 20, precio_eur: 10, orden: 2 },
  ],
  peluqueria: [
    { nombre: 'Corte mujer', duracion_min: 60, precio_eur: 30, orden: 0 },
    { nombre: 'Tinte', duracion_min: 90, precio_eur: 45, orden: 1 },
    { nombre: 'Mechas', duracion_min: 120, precio_eur: 60, orden: 2 },
  ],
  estetica: [
    { nombre: 'Limpieza facial', duracion_min: 60, precio_eur: 40, orden: 0 },
    { nombre: 'Masaje relajante', duracion_min: 60, precio_eur: 45, orden: 1 },
    { nombre: 'Depilación piernas', duracion_min: 45, precio_eur: 25, orden: 2 },
  ],
  manicura: [
    { nombre: 'Manicura básica', duracion_min: 45, precio_eur: 18, orden: 0 },
    { nombre: 'Manicura semipermanente', duracion_min: 60, precio_eur: 28, orden: 1 },
    { nombre: 'Pedicura', duracion_min: 60, precio_eur: 25, orden: 2 },
  ],
  otro: [
    { nombre: 'Servicio 1', duracion_min: 30, precio_eur: 20, orden: 0 },
  ],
};

export interface HorarioSeed {
  dia_semana: number;
  inicio: string;
  fin: string;
}

// L-V mañana y tarde, sábado solo mañana
export const HORARIOS_DEFAULT: HorarioSeed[] = [
  { dia_semana: 1, inicio: '09:00', fin: '13:00' },
  { dia_semana: 1, inicio: '16:00', fin: '20:00' },
  { dia_semana: 2, inicio: '09:00', fin: '13:00' },
  { dia_semana: 2, inicio: '16:00', fin: '20:00' },
  { dia_semana: 3, inicio: '09:00', fin: '13:00' },
  { dia_semana: 3, inicio: '16:00', fin: '20:00' },
  { dia_semana: 4, inicio: '09:00', fin: '13:00' },
  { dia_semana: 4, inicio: '16:00', fin: '20:00' },
  { dia_semana: 5, inicio: '09:00', fin: '13:00' },
  { dia_semana: 5, inicio: '16:00', fin: '20:00' },
  { dia_semana: 6, inicio: '09:00', fin: '14:00' },
];

export const TIPOS_NEGOCIO = ['barberia', 'peluqueria', 'estetica', 'manicura', 'otro'] as const;
export type TipoNegocio = (typeof TIPOS_NEGOCIO)[number];
