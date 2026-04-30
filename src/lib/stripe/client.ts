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
  id: 'solo' | 'studio' | 'pro';
  nombre: string;
  precio: number;
  priceId: string | undefined;
  features: string[];
}

export const PLANES: Record<'solo' | 'studio' | 'pro', PlanConfig> = {
  solo: {
    id: 'solo',
    nombre: 'Solo',
    precio: 19.9,
    priceId: process.env.STRIPE_PRICE_SOLO,
    features: [
      '1 profesional',
      'Reservas Telegram',
      'Recordatorios',
      'Panel básico',
    ],
  },
  studio: {
    id: 'studio',
    nombre: 'Studio',
    precio: 29.9,
    priceId: process.env.STRIPE_PRICE_STUDIO,
    features: [
      'Hasta 4 profesionales',
      'Lista de espera',
      'Depósitos',
      'Juanita Pro',
    ],
  },
  pro: {
    id: 'pro',
    nombre: 'Pro',
    precio: 79.9,
    priceId: process.env.STRIPE_PRICE_PRO,
    features: [
      'Profesionales ilimitados',
      'Multi-local',
      'WhatsApp',
      'API',
    ],
  },
};
