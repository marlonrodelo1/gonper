# Stripe — Setup de suscripciones

Guía para configurar los 3 planes de Gomper en Stripe y conectarlos al panel.

## 1. Crear los productos en Stripe

En el [Stripe Dashboard](https://dashboard.stripe.com/products) (asegúrate de estar en modo **Test** la primera vez):

Crear **3 productos**, uno por plan, cada uno con un precio recurrente mensual:

| Producto | Precio | Recurrencia | Moneda |
|---|---|---|---|
| Gomper Solo | 19,90 € | Mensual | EUR |
| Gomper Studio | 29,90 € | Mensual | EUR |
| Gomper Pro | 79,90 € | Mensual | EUR |

Después de crear cada precio, copia su **Price ID** (`price_xxx...`) — no el Product ID.

## 2. Variables de entorno

Pega los IDs y la API key en `.env`:

```
STRIPE_SECRET_KEY=sk_test_...           # de Developers → API keys
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

STRIPE_PRICE_SOLO=price_xxx
STRIPE_PRICE_STUDIO=price_xxx
STRIPE_PRICE_PRO=price_xxx
```

Si una variable `STRIPE_PRICE_*` falta, el botón "Suscribirme" del plan correspondiente avisa pero no rompe la página.

## 3. Webhook

En [Developers → Webhooks → Add endpoint](https://dashboard.stripe.com/webhooks):

- **Endpoint URL:** `https://gestori.es/api/stripe/webhook`
  (en local: usar `stripe listen --forward-to localhost:3000/api/stripe/webhook` y Stripe te imprime el secret a usar)
- **Eventos a escuchar:**
  - `checkout.session.completed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`

Tras crearlo, copia el **signing secret** (`whsec_...`) y pégalo en:

```
STRIPE_WEBHOOK_SECRET=whsec_...
```

## 4. Customer Portal

Activa el portal de cliente en [Settings → Billing → Customer portal](https://dashboard.stripe.com/settings/billing/portal). Marca al menos:

- Permitir a clientes actualizar el método de pago
- Permitir cancelar suscripciones
- Permitir cambiar de plan (selecciona los 3 productos creados)

El botón "Gestionar suscripción" del panel redirige aquí.

## 5. Probar en modo test

Tarjeta de prueba: `4242 4242 4242 4242`, cualquier fecha futura, cualquier CVC y cualquier CP.

Flujo:

1. Login en el panel → tab **Suscripción**.
2. Click "Suscribirme" en cualquier plan → redirige a Stripe Checkout.
3. Completa el pago con la tarjeta de test.
4. Vuelves a `/panel/config/suscripcion?success=1`.
5. El webhook actualiza `salones.plan`, `stripe_customer_id`, `stripe_subscription_id` y limpia `trial_until`.

## 6. Producción

Repite los pasos 1–3 en modo **Live**, usando claves `sk_live_...` y un nuevo `whsec_...`. Los Price IDs cambian entre test y live: hay que crear los productos también en Live.
