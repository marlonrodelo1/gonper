import Stripe from 'stripe';

const apiKey = process.env.STRIPE_SECRET_KEY;
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!apiKey) throw new Error('STRIPE_SECRET_KEY no configurada');
  if (!_stripe) {
    _stripe = new Stripe(apiKey, { apiVersion: '2024-12-18.acacia' as any });
  }
  return _stripe;
}

export interface PlanConfig {
  id: 'basico';
  nombre: string;
  precio: number;
  priceId: string | undefined;
  features: string[];
}

export const PLANES: Record<'basico', PlanConfig> = {
  basico: {
    id: 'basico',
    nombre: 'Básico',
    precio: 30,
    priceId: process.env.STRIPE_PRICE_BASIC,
    features: [
      'Reservas por Telegram + chat web',
      'Recordatorios automáticos 1h antes',
      'Confirmación + liberación de huecos',
      'Lista de espera',
      'Personalización del agente (nombre, género, tono)',
      'Personalización de la web pública (promociones, galería, reseñas)',
      'Profesionales y servicios ilimitados',
      'Estadísticas y métricas',
    ],
  },
};

export type PlanId = keyof typeof PLANES;
