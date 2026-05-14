import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  boolean,
  numeric,
  jsonb,
  date,
  time,
  bigint,
  inet,
  index,
  uniqueIndex,
  check,
  unique,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// ============================================
// ENUMS (declarados como pgEnum para reutilizar)
// ============================================
export const tipoNegocioEnum = pgEnum('tipo_negocio_enum', [
  'barberia',
  'peluqueria',
  'estetica',
  'manicura',
  'otro',
]);

export const agenteGeneroEnum = pgEnum('agente_genero_enum', [
  'femenino',
  'masculino',
  'neutro',
]);

export const agenteTonoEnum = pgEnum('agente_tono_enum', [
  'profesional',
  'cercano',
  'desenfadado',
]);

export const planEnum = pgEnum('plan_enum', [
  'trial',
  'basico',
  'solo',
  'studio',
  'pro',
  'cancelado',
]);

export const rolUsuarioEnum = pgEnum('rol_usuario_enum', [
  'dueno',
  'admin',
  'empleado',
]);

export const estadoCitaEnum = pgEnum('estado_cita_enum', [
  'pendiente',
  'confirmada',
  'cancelada',
  'no_show',
  'completada',
]);

export const origenCitaEnum = pgEnum('origen_cita_enum', [
  'telegram',
  'whatsapp',
  'web',
  'manual',
  'dueno',
]);

export const canceladaPorEnum = pgEnum('cancelada_por_enum', [
  'cliente',
  'dueno',
  'sistema',
]);

export const canalMensajeEnum = pgEnum('canal_mensaje_enum', [
  'telegram',
  'whatsapp',
  'sms',
  'web',
]);

export const direccionMensajeEnum = pgEnum('direccion_mensaje_enum', [
  'in',
  'out',
]);

export const scopeRateLimitEnum = pgEnum('scope_rate_limit_enum', [
  'cliente',
  'dueno',
  'ip',
  'salon',
]);

// NOTA: el SQL original usa columnas TEXT con CHECK para varios de estos valores.
// Mantenemos las columnas como TEXT (igual que el SQL) para no romper la compatibilidad,
// pero dejamos los enums declarados arriba por si en el futuro se migran.

// ============================================
// TABLA: salones
// ============================================
export const salones = pgTable(
  'salones',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull().unique(),
    nombre: text('nombre').notNull(),
    tipoNegocio: text('tipo_negocio').notNull(),
    direccion: text('direccion'),
    telefono: text('telefono'),
    email: text('email'),
    timezone: text('timezone').notNull().default('Europe/Madrid'),

    // Configuración de reservas
    slotIntervalMin: integer('slot_interval_min'),
    leadTimeMin: integer('lead_time_min').notNull().default(5),
    maxAdvanceDays: integer('max_advance_days').notNull().default(90),
    bufferMin: integer('buffer_min').notNull().default(0),

    // Configuración del agente
    agenteNombre: text('agente_nombre').notNull().default('Juanita'),
    agenteGenero: text('agente_genero').notNull().default('femenino'),
    agenteTono: text('agente_tono').notNull().default('cercano'),
    agenteBienvenida: text('agente_bienvenida'),
    agenteInstrucciones: text('agente_instrucciones'),
    agenteAvatarUrl: text('agente_avatar_url'),

    // Conexiones externas
    telegramBotToken: text('telegram_bot_token'),
    telegramBotUsername: text('telegram_bot_username'),
    telegramBotDuenoToken: text('telegram_bot_dueno_token'),
    telegramChatIdDueno: text('telegram_chat_id_dueno'),
    whatsappPhoneId: text('whatsapp_phone_id'),

    // Branding (web pública + Open Graph al compartir)
    logoUrl: text('logo_url'),
    bannerUrl: text('banner_url'),

    // Marketplace público
    marketplaceVisible: boolean('marketplace_visible').notNull().default(true),
    marketplaceDestacado: boolean('marketplace_destacado').notNull().default(false),
    marketplaceDestacadoOrden: integer('marketplace_destacado_orden'),
    ciudad: text('ciudad'),
    provincia: text('provincia'),
    descripcionCorta: text('descripcion_corta'),
    /** Geocoding (OpenStreetMap / Nominatim) */
    lat: numeric('lat', { precision: 10, scale: 7 }),
    lng: numeric('lng', { precision: 10, scale: 7 }),
    direccionFormateada: text('direccion_formateada'),
    osmPlaceId: text('osm_place_id'),
    /** Stripe Connect Express (para cobrar ventas B2C de productos) */
    stripeConnectAccountId: text('stripe_connect_account_id'),
    stripeConnectOnboarded: boolean('stripe_connect_onboarded').notNull().default(false),
    /** Config de la tienda pública del salón */
    tiendaAceptaPagoOnline: boolean('tienda_acepta_pago_online')
      .notNull()
      .default(false),
    tiendaAceptaEfectivo: boolean('tienda_acepta_efectivo')
      .notNull()
      .default(true),
    /** Coste fijo de envío en €. Si null o 0, no se ofrece envío (solo recogida). */
    tiendaCosteEnvioEur: numeric('tienda_coste_envio_eur', {
      precision: 10,
      scale: 2,
    }),
    tiendaZonaEnvio: text('tienda_zona_envio'),

    // Plan
    plan: text('plan').notNull().default('trial'),
    trialUntil: timestamp('trial_until', { withTimezone: true }),
    stripeCustomerId: text('stripe_customer_id'),
    stripeSubscriptionId: text('stripe_subscription_id'),

    // Metadata
    configJson: jsonb('config_json').notNull().default(sql`'{}'::jsonb`),
    activo: boolean('activo').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    idxSlug: index('idx_salones_slug').on(t.slug),
    idxActivo: index('idx_salones_activo')
      .on(t.activo)
      .where(sql`${t.activo} = true`),
    chkTipoNegocio: check(
      'salones_tipo_negocio_check',
      sql`${t.tipoNegocio} in ('barberia','peluqueria','estetica','manicura','otro')`,
    ),
    chkAgenteGenero: check(
      'salones_agente_genero_check',
      sql`${t.agenteGenero} in ('femenino','masculino','neutro')`,
    ),
    chkAgenteTono: check(
      'salones_agente_tono_check',
      sql`${t.agenteTono} in ('profesional','cercano','desenfadado')`,
    ),
    chkPlan: check(
      'salones_plan_check',
      sql`${t.plan} in ('trial','basico','solo','studio','pro','cancelado')`,
    ),
  }),
);

// ============================================
// TABLA: usuarios_salon
// ============================================
export const usuariosSalon = pgTable(
  'usuarios_salon',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    salonId: uuid('salon_id')
      .notNull()
      .references(() => salones.id, { onDelete: 'cascade' }),
    authUserId: uuid('auth_user_id').notNull(),
    rol: text('rol').notNull().default('dueno'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    uqSalonAuth: unique('usuarios_salon_salon_auth_unique').on(
      t.salonId,
      t.authUserId,
    ),
    idxAuth: index('idx_usuarios_salon_auth').on(t.authUserId),
    chkRol: check(
      'usuarios_salon_rol_check',
      sql`${t.rol} in ('dueno','admin','empleado')`,
    ),
  }),
);

// ============================================
// TABLA: profesionales
// ============================================
export const profesionales = pgTable(
  'profesionales',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    salonId: uuid('salon_id')
      .notNull()
      .references(() => salones.id, { onDelete: 'cascade' }),
    nombre: text('nombre').notNull(),
    colorHex: text('color_hex').default('#3b82f6'),
    fotoUrl: text('foto_url'),
    activo: boolean('activo').notNull().default(true),
    orden: integer('orden').notNull().default(0),
    /** True si lo creó el seed automático de signup. Cualquier edición o
     * creación posterior por parte del dueño debe ponerlo a false. */
    esDefault: boolean('es_default').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    idxSalon: index('idx_profesionales_salon').on(t.salonId),
  }),
);

// ============================================
// TABLA: servicios
// ============================================
export const servicios = pgTable(
  'servicios',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    salonId: uuid('salon_id')
      .notNull()
      .references(() => salones.id, { onDelete: 'cascade' }),
    nombre: text('nombre').notNull(),
    descripcion: text('descripcion'),
    duracionMin: integer('duracion_min').notNull(),
    precioEur: numeric('precio_eur', { precision: 10, scale: 2 }).notNull(),
    activo: boolean('activo').notNull().default(true),
    orden: integer('orden').notNull().default(0),
    /** True si lo creó el seed automático de signup. Edición/creación
     * posterior por parte del dueño debe ponerlo a false. */
    esDefault: boolean('es_default').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    idxSalon: index('idx_servicios_salon')
      .on(t.salonId)
      .where(sql`${t.activo} = true`),
    chkDuracion: check(
      'servicios_duracion_min_check',
      sql`${t.duracionMin} > 0 and ${t.duracionMin} <= 480`,
    ),
    chkPrecio: check(
      'servicios_precio_eur_check',
      sql`${t.precioEur} >= 0`,
    ),
  }),
);

// ============================================
// TABLA: horarios
// ============================================
export const horarios = pgTable(
  'horarios',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    salonId: uuid('salon_id')
      .notNull()
      .references(() => salones.id, { onDelete: 'cascade' }),
    diaSemana: integer('dia_semana').notNull(),
    inicio: time('inicio').notNull(),
    fin: time('fin').notNull(),
    /** True si lo creó el seed automático de signup. Edición/creación
     * posterior por parte del dueño debe ponerlo a false. */
    esDefault: boolean('es_default').notNull().default(false),
  },
  (t) => ({
    idxSalon: index('idx_horarios_salon').on(t.salonId),
    chkDiaSemana: check(
      'horarios_dia_semana_check',
      sql`${t.diaSemana} between 0 and 6`,
    ),
    chkRango: check('horarios_rango_check', sql`${t.fin} > ${t.inicio}`),
  }),
);

// ============================================
// TABLA: cierres
// ============================================
export const cierres = pgTable(
  'cierres',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    salonId: uuid('salon_id')
      .notNull()
      .references(() => salones.id, { onDelete: 'cascade' }),
    fechaInicio: timestamp('fecha_inicio', { withTimezone: true }).notNull(),
    fechaFin: timestamp('fecha_fin', { withTimezone: true }).notNull(),
    motivo: text('motivo'),
  },
  (t) => ({
    idxSalon: index('idx_cierres_salon').on(t.salonId),
    chkRango: check(
      'cierres_rango_check',
      sql`${t.fechaFin} > ${t.fechaInicio}`,
    ),
  }),
);

// ============================================
// TABLA: clientes
// ============================================
export const clientes = pgTable(
  'clientes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    salonId: uuid('salon_id')
      .notNull()
      .references(() => salones.id, { onDelete: 'cascade' }),
    nombre: text('nombre').notNull(),
    telefono: text('telefono'),
    email: text('email'),
    telegramId: bigint('telegram_id', { mode: 'bigint' }),
    telegramUsername: text('telegram_username'),
    whatsappPhone: text('whatsapp_phone'),

    totalCitas: integer('total_citas').notNull().default(0),
    totalNoShows: integer('total_no_shows').notNull().default(0),
    totalFacturado: numeric('total_facturado', { precision: 10, scale: 2 })
      .notNull()
      .default('0'),
    ultimaVisita: timestamp('ultima_visita', { withTimezone: true }),

    requiereDeposito: boolean('requiere_deposito').notNull().default(false),
    notasPrivadas: text('notas_privadas'),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    uqSalonTelegram: unique('clientes_salon_telegram_unique').on(
      t.salonId,
      t.telegramId,
    ),
    uqSalonTelefono: unique('clientes_salon_telefono_unique').on(
      t.salonId,
      t.telefono,
    ),
    idxSalon: index('idx_clientes_salon').on(t.salonId),
    idxTelegram: index('idx_clientes_telegram').on(t.telegramId),
  }),
);

// ============================================
// TABLA: citas
// ============================================
export const citas = pgTable(
  'citas',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    salonId: uuid('salon_id')
      .notNull()
      .references(() => salones.id, { onDelete: 'cascade' }),
    clienteId: uuid('cliente_id')
      .notNull()
      .references(() => clientes.id, { onDelete: 'restrict' }),
    profesionalId: uuid('profesional_id')
      .notNull()
      .references(() => profesionales.id, { onDelete: 'restrict' }),
    servicioId: uuid('servicio_id')
      .notNull()
      .references(() => servicios.id, { onDelete: 'restrict' }),

    inicio: timestamp('inicio', { withTimezone: true }).notNull(),
    fin: timestamp('fin', { withTimezone: true }).notNull(),
    precioEur: numeric('precio_eur', { precision: 10, scale: 2 }).notNull(),

    estado: text('estado').notNull().default('pendiente'),
    origen: text('origen').notNull().default('telegram'),

    recordatorioEnviadoAt: timestamp('recordatorio_enviado_at', {
      withTimezone: true,
    }),
    confirmadaAt: timestamp('confirmada_at', { withTimezone: true }),
    canceladaAt: timestamp('cancelada_at', { withTimezone: true }),
    canceladaPor: text('cancelada_por'),
    motivoCancelacion: text('motivo_cancelacion'),

    depositoRequerido: boolean('deposito_requerido').notNull().default(false),
    depositoPagadoAt: timestamp('deposito_pagado_at', { withTimezone: true }),
    depositoStripeId: text('deposito_stripe_id'),

    notas: text('notas'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    idxSalonInicio: index('idx_citas_salon_inicio').on(t.salonId, t.inicio),
    idxCliente: index('idx_citas_cliente').on(t.clienteId),
    idxProfesionalInicio: index('idx_citas_profesional_inicio').on(
      t.profesionalId,
      t.inicio,
    ),
    idxEstado: index('idx_citas_estado').on(t.salonId, t.estado),
    idxPendienteRecordatorio: index('idx_citas_pendiente_recordatorio')
      .on(t.inicio)
      .where(
        sql`${t.estado} = 'pendiente' and ${t.recordatorioEnviadoAt} is null`,
      ),
    uqNoSolape: uniqueIndex('idx_citas_no_solape')
      .on(t.profesionalId, t.inicio)
      .where(sql`${t.estado} in ('pendiente','confirmada')`),
    chkEstado: check(
      'citas_estado_check',
      sql`${t.estado} in ('pendiente','confirmada','cancelada','no_show','completada')`,
    ),
    chkOrigen: check(
      'citas_origen_check',
      sql`${t.origen} in ('telegram','whatsapp','web','manual','dueno')`,
    ),
    chkCanceladaPor: check(
      'citas_cancelada_por_check',
      sql`${t.canceladaPor} in ('cliente','dueno','sistema')`,
    ),
    chkRango: check('citas_rango_check', sql`${t.fin} > ${t.inicio}`),
  }),
);

// ============================================
// TABLA: lista_espera
// ============================================
export const listaEspera = pgTable(
  'lista_espera',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    salonId: uuid('salon_id')
      .notNull()
      .references(() => salones.id, { onDelete: 'cascade' }),
    clienteId: uuid('cliente_id')
      .notNull()
      .references(() => clientes.id, { onDelete: 'cascade' }),
    servicioId: uuid('servicio_id')
      .notNull()
      .references(() => servicios.id, { onDelete: 'restrict' }),
    profesionalId: uuid('profesional_id').references(() => profesionales.id, {
      onDelete: 'cascade',
    }),
    preferenciasJson: jsonb('preferencias_json')
      .notNull()
      .default(sql`'{}'::jsonb`),
    activa: boolean('activa').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiraAt: timestamp('expira_at', { withTimezone: true }),
  },
  (t) => ({
    idxSalon: index('idx_lista_espera_salon')
      .on(t.salonId)
      .where(sql`${t.activa} = true`),
  }),
);

// ============================================
// TABLA: mensajes
// ============================================
export const mensajes = pgTable(
  'mensajes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    salonId: uuid('salon_id')
      .notNull()
      .references(() => salones.id, { onDelete: 'cascade' }),
    clienteId: uuid('cliente_id').references(() => clientes.id, {
      onDelete: 'set null',
    }),
    citaId: uuid('cita_id').references(() => citas.id, {
      onDelete: 'set null',
    }),

    canal: text('canal').notNull(),
    direccion: text('direccion').notNull(),
    contenido: text('contenido').notNull(),
    payloadRaw: jsonb('payload_raw'),

    // Chat web (sin telegram_id) — agrupa mensajes por sesión y guarda
    // datos del visitante hasta que se convierte en cliente.
    sessionId: text('session_id'),
    webVisitorNombre: text('web_visitor_nombre'),
    webVisitorTelefono: text('web_visitor_telefono'),

    llmModelo: text('llm_modelo'),
    llmTokensIn: integer('llm_tokens_in'),
    llmTokensOut: integer('llm_tokens_out'),
    llmCosteEur: numeric('llm_coste_eur', { precision: 10, scale: 6 }),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    idxSalonCreated: index('idx_mensajes_salon_created').on(
      t.salonId,
      t.createdAt.desc(),
    ),
    idxClienteCreated: index('idx_mensajes_cliente').on(
      t.clienteId,
      t.createdAt.desc(),
    ),
    idxSession: index('idx_mensajes_session').on(t.sessionId, t.createdAt),
    chkCanal: check(
      'mensajes_canal_check',
      sql`${t.canal} in ('telegram','whatsapp','sms','web')`,
    ),
    chkDireccion: check(
      'mensajes_direccion_check',
      sql`${t.direccion} in ('in','out')`,
    ),
  }),
);

// ============================================
// TABLA: promociones (web pública del salón)
// ============================================
export const promociones = pgTable(
  'promociones',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    salonId: uuid('salon_id')
      .notNull()
      .references(() => salones.id, { onDelete: 'cascade' }),
    tag: text('tag'),
    titulo: text('titulo').notNull(),
    descripcion: text('descripcion'),
    descuentoLabel: text('descuento_label'),
    precioEur: numeric('precio_eur', { precision: 10, scale: 2 }),
    precioAnteriorEur: numeric('precio_anterior_eur', { precision: 10, scale: 2 }),
    validaHasta: date('valida_hasta'),
    activa: boolean('activa').notNull().default(true),
    orden: integer('orden').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    idxSalonActiva: index('idx_promociones_salon_activa')
      .on(t.salonId)
      .where(sql`${t.activa} = true`),
  }),
);

// ============================================
// TABLA: galeria_imagenes
// ============================================
export const galeriaImagenes = pgTable(
  'galeria_imagenes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    salonId: uuid('salon_id')
      .notNull()
      .references(() => salones.id, { onDelete: 'cascade' }),
    url: text('url').notNull(),
    alt: text('alt'),
    tag: text('tag'),
    titulo: text('titulo'),
    orden: integer('orden').notNull().default(0),
    activa: boolean('activa').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    idxSalonActiva: index('idx_galeria_salon_activa')
      .on(t.salonId)
      .where(sql`${t.activa} = true`),
  }),
);

// ============================================
// TABLA: comparativas_antes_despues
// (pares de fotos antes/después que se muestran como slider en la web pública)
// ============================================
export const comparativasAntesDespues = pgTable(
  'comparativas_antes_despues',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    salonId: uuid('salon_id')
      .notNull()
      .references(() => salones.id, { onDelete: 'cascade' }),
    antesUrl: text('antes_url').notNull(),
    despuesUrl: text('despues_url').notNull(),
    descripcion: text('descripcion'),
    orden: integer('orden').notNull().default(0),
    activa: boolean('activa').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    idxSalonActiva: index('idx_comparativas_salon_activa')
      .on(t.salonId, t.orden)
      .where(sql`${t.activa} = true`),
  }),
);

// ============================================
// TABLA: resenas
// ============================================
export const resenas = pgTable(
  'resenas',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    salonId: uuid('salon_id')
      .notNull()
      .references(() => salones.id, { onDelete: 'cascade' }),
    clienteId: uuid('cliente_id').references(() => clientes.id, {
      onDelete: 'set null',
    }),
    autorNombre: text('autor_nombre').notNull(),
    rating: integer('rating').notNull(),
    texto: text('texto'),
    fecha: date('fecha').notNull().defaultNow(),
    fuente: text('fuente').notNull().default('manual'),
    aprobada: boolean('aprobada').notNull().default(true),
    destacada: boolean('destacada').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    idxSalonAprobada: index('idx_resenas_salon_aprobada')
      .on(t.salonId, t.fecha.desc())
      .where(sql`${t.aprobada} = true`),
    chkRating: check('resenas_rating_check', sql`${t.rating} between 1 and 5`),
    chkFuente: check(
      'resenas_fuente_check',
      sql`${t.fuente} in ('manual','google','telegram','web')`,
    ),
  }),
);

// ============================================
// TABLA: leads
// ============================================
export const leads = pgTable(
  'leads',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull(),
    nombre: text('nombre'),
    tipoNegocio: text('tipo_negocio'),
    dolorPrincipal: text('dolor_principal'),
    origen: text('origen').default('landing_chat'),
    ip: inet('ip'),
    userAgent: text('user_agent'),
    convertido: boolean('convertido').notNull().default(false),
    convertidoSalonId: uuid('convertido_salon_id').references(() => salones.id),
    conversacionJson: jsonb('conversacion_json'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    idxEmail: index('idx_leads_email').on(t.email),
    idxNoConvertidos: index('idx_leads_no_convertidos')
      .on(t.createdAt.desc())
      .where(sql`${t.convertido} = false`),
  }),
);

// ============================================
// TABLA: rate_limits
// ============================================
export const rateLimits = pgTable(
  'rate_limits',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    scopeType: text('scope_type').notNull(),
    scopeKey: text('scope_key').notNull(),
    fecha: date('fecha').notNull().defaultNow(),
    llamadasIa: integer('llamadas_ia').notNull().default(0),
    mensajesTotal: integer('mensajes_total').notNull().default(0),
  },
  (t) => ({
    uqScope: unique('rate_limits_scope_unique').on(
      t.scopeType,
      t.scopeKey,
      t.fecha,
    ),
    idxLookup: index('idx_rate_limits_lookup').on(
      t.scopeType,
      t.scopeKey,
      t.fecha,
    ),
    chkScopeType: check(
      'rate_limits_scope_type_check',
      sql`${t.scopeType} in ('cliente','dueno','ip','salon')`,
    ),
  }),
);

// ============================================
// TABLA: admin_users (super admins de la plataforma)
// ============================================
export const adminUsers = pgTable(
  'admin_users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    authUserId: uuid('auth_user_id').notNull().unique(),
    notas: text('notas'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    idxAuth: index('idx_admin_users_auth').on(t.authUserId),
  }),
);

// ============================================
// TABLA: stripe_events_processed (idempotencia webhooks)
// ============================================
export const stripeEventsProcessed = pgTable(
  'stripe_events_processed',
  {
    eventId: text('event_id').primaryKey(),
    eventType: text('event_type').notNull(),
    processedAt: timestamp('processed_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    idxProcessedAt: index('idx_stripe_events_processed_at').on(t.processedAt),
  }),
);

// ============================================
// TABLA: trial_avisos_enviados (idempotencia avisos email del trial)
// ============================================
export const trialAvisosEnviados = pgTable(
  'trial_avisos_enviados',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    salonId: uuid('salon_id')
      .notNull()
      .references(() => salones.id, { onDelete: 'cascade' }),
    // 2d = 2 días antes del fin; vispera = día del fin; vencido = trial expirado.
    tipo: text('tipo').notNull(),
    enviadoAt: timestamp('enviado_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    uniqSalonTipo: unique('trial_avisos_salon_tipo_unique').on(
      t.salonId,
      t.tipo,
    ),
  }),
);

// ============================================
// TABLA: salones_rating_cache (marketplace)
// ============================================
export const salonesRatingCache = pgTable('salones_rating_cache', {
  salonId: uuid('salon_id')
    .primaryKey()
    .references(() => salones.id, { onDelete: 'cascade' }),
  ratingAvg: numeric('rating_avg', { precision: 3, scale: 2 }),
  totalResenas: integer('total_resenas').notNull().default(0),
  actualizadoAt: timestamp('actualizado_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ============================================
// TABLA: agentes (Royce + futuros agentes)
// ============================================
export const agentes = pgTable(
  'agentes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull().unique(),
    nombre: text('nombre').notNull(),
    descripcion: text('descripcion'),
    systemPrompt: text('system_prompt').notNull(),
    modelo: text('modelo').notNull().default('deepseek-chat'),
    temperatura: numeric('temperatura', { precision: 3, scale: 2 })
      .notNull()
      .default('0.40'),
    maxTokens: integer('max_tokens').notNull().default(600),
    bienvenida: text('bienvenida'),
    avatarUrl: text('avatar_url'),
    /** NULL = agente global (Royce). UUID = agente futuro por tenant. */
    salonId: uuid('salon_id').references(() => salones.id, {
      onDelete: 'cascade',
    }),
    activo: boolean('activo').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    idxSlug: index('idx_agentes_slug').on(t.slug),
    idxSalon: index('idx_agentes_salon')
      .on(t.salonId)
      .where(sql`${t.salonId} is not null`),
    idxActivos: index('idx_agentes_activos')
      .on(t.activo)
      .where(sql`${t.activo} = true`),
    chkTemp: check(
      'agentes_temperatura_check',
      sql`${t.temperatura} >= 0 and ${t.temperatura} <= 2`,
    ),
    chkMaxTokens: check(
      'agentes_max_tokens_check',
      sql`${t.maxTokens} > 0 and ${t.maxTokens} <= 4000`,
    ),
  }),
);

// ============================================
// TABLA: agentes_versiones (audit / rollback)
// ============================================
export const agentesVersiones = pgTable(
  'agentes_versiones',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    agenteId: uuid('agente_id')
      .notNull()
      .references(() => agentes.id, { onDelete: 'cascade' }),
    systemPrompt: text('system_prompt').notNull(),
    modelo: text('modelo').notNull(),
    temperatura: numeric('temperatura', { precision: 3, scale: 2 }).notNull(),
    maxTokens: integer('max_tokens').notNull(),
    bienvenida: text('bienvenida'),
    /** auth.users.id, nullable para versiones generadas por seed. */
    editadoPor: uuid('editado_por'),
    comentario: text('comentario'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    idxAgenteCreated: index('idx_agentes_versiones_agente').on(
      t.agenteId,
      t.createdAt.desc(),
    ),
  }),
);

// ============================================
// TABLA: agente_sesiones
// ============================================
export const agenteSesiones = pgTable(
  'agente_sesiones',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    agenteId: uuid('agente_id')
      .notNull()
      .references(() => agentes.id, { onDelete: 'cascade' }),
    sessionId: text('session_id').notNull(),
    surface: text('surface').notNull().default('landing'),
    visitorEmail: text('visitor_email'),
    visitorNombre: text('visitor_nombre'),
    metadata: jsonb('metadata').notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    uqAgenteSession: unique('agente_sesiones_agente_session_unique').on(
      t.agenteId,
      t.sessionId,
    ),
    idxAgenteCreated: index('idx_agente_sesiones_agente_created').on(
      t.agenteId,
      t.createdAt.desc(),
    ),
    idxSession: index('idx_agente_sesiones_session').on(t.sessionId),
    chkSurface: check(
      'agente_sesiones_surface_check',
      sql`${t.surface} in ('landing','marketplace','admin_test')`,
    ),
  }),
);

// ============================================
// TABLA: agente_mensajes
// ============================================
export const agenteMensajes = pgTable(
  'agente_mensajes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sesionId: uuid('sesion_id')
      .notNull()
      .references(() => agenteSesiones.id, { onDelete: 'cascade' }),
    direccion: text('direccion').notNull(),
    contenido: text('contenido').notNull(),
    metadata: jsonb('metadata'),
    llmModelo: text('llm_modelo'),
    llmTokensIn: integer('llm_tokens_in'),
    llmTokensOut: integer('llm_tokens_out'),
    llmCosteEur: numeric('llm_coste_eur', { precision: 10, scale: 6 }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    idxSesionCreated: index('idx_agente_mensajes_sesion_created').on(
      t.sesionId,
      t.createdAt,
    ),
    chkDireccion: check(
      'agente_mensajes_direccion_check',
      sql`${t.direccion} in ('in','out')`,
    ),
  }),
);

// ============================================
// TABLA: agente_tools_catalogo (catálogo global de tools)
// ============================================
export const agenteToolsCatalogo = pgTable(
  'agente_tools_catalogo',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    nombre: text('nombre').notNull().unique(),
    categoria: text('categoria').notNull(),
    descripcion: text('descripcion').notNull(),
    schemaJson: jsonb('schema_json').notNull(),
    requiereCredenciales: boolean('requiere_credenciales')
      .notNull()
      .default(false),
    activo: boolean('activo').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    idxActivo: index('idx_agente_tools_catalogo_activo')
      .on(t.activo)
      .where(sql`${t.activo} = true`),
    chkCategoria: check(
      'agente_tools_catalogo_categoria_check',
      sql`${t.categoria} in ('lead','crm','email','mensajeria','automatizacion')`,
    ),
  }),
);

// ============================================
// TABLA: agente_tools_asignaciones
// ============================================
export const agenteToolsAsignaciones = pgTable(
  'agente_tools_asignaciones',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    agenteId: uuid('agente_id')
      .notNull()
      .references(() => agentes.id, { onDelete: 'cascade' }),
    toolNombre: text('tool_nombre')
      .notNull()
      .references(() => agenteToolsCatalogo.nombre, {
        onUpdate: 'cascade',
        onDelete: 'restrict',
      }),
    activo: boolean('activo').notNull().default(true),
    configJson: jsonb('config_json').notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    uqAgenteTool: unique('agente_tools_asignaciones_agente_tool_unique').on(
      t.agenteId,
      t.toolNombre,
    ),
    idxAgenteActivo: index('idx_agente_tools_asignaciones_agente')
      .on(t.agenteId)
      .where(sql`${t.activo} = true`),
  }),
);

// ============================================
// TIENDA — Catálogo central + B2B + B2C
// ============================================

// marcas: catálogo central, gestionado desde super-admin
export const marcas = pgTable(
  'marcas',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull().unique(),
    nombre: text('nombre').notNull(),
    descripcion: text('descripcion'),
    logoUrl: text('logo_url'),
    /** Imagen de ejemplo a usar como fallback cuando un producto de esta
     * marca no tiene foto propia. La consume la tienda pública. */
    imagenDefaultProductoUrl: text('imagen_default_producto_url'),
    webUrl: text('web_url'),
    contactoEmail: text('contacto_email'),
    contactoTelefono: text('contacto_telefono'),
    /** Legacy del modelo viejo de stock con comisión a Gonper Studio — ya no se usa. */
    comisionPorcentaje: numeric('comision_porcentaje', { precision: 5, scale: 2 })
      .notNull()
      .default('15.00'),
    /** Lo que recibe el salón sobre cada venta B2C (% del total). */
    comisionSalonPorcentaje: numeric('comision_salon_porcentaje', {
      precision: 5,
      scale: 2,
    })
      .notNull()
      .default('0'),
    /** Legacy del modelo viejo B2B con pedidos — ya no se usa. */
    condicionesB2bMinimoEur: numeric('condiciones_b2b_minimo_eur', {
      precision: 10,
      scale: 2,
    })
      .notNull()
      .default('0'),
    activa: boolean('activa').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    idxSlug: index('idx_marcas_slug').on(t.slug),
    idxActiva: index('idx_marcas_activa')
      .on(t.activa)
      .where(sql`${t.activa} = true`),
    chkComision: check(
      'marcas_comision_check',
      sql`${t.comisionPorcentaje} >= 0 and ${t.comisionPorcentaje} <= 100`,
    ),
    chkMinimo: check(
      'marcas_minimo_check',
      sql`${t.condicionesB2bMinimoEur} >= 0`,
    ),
  }),
);

// categorias_marca: categorías propias de cada marca (Wella: 'Champús',
// 'Tratamientos', etc.). Convive con productos.categoria (enum hardcoded
// global) — un producto puede tener categoría global y/o categoría propia.
export const categoriasMarca = pgTable(
  'categorias_marca',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    marcaId: uuid('marca_id')
      .notNull()
      .references(() => marcas.id, { onDelete: 'cascade' }),
    slug: text('slug').notNull(),
    nombre: text('nombre').notNull(),
    orden: integer('orden').notNull().default(0),
    activa: boolean('activa').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    uqMarcaSlug: unique('categorias_marca_slug_unique').on(t.marcaId, t.slug),
    idxMarca: index('idx_categorias_marca_marca').on(t.marcaId, t.orden),
  }),
);

// productos: catálogo central por marca
export const productos = pgTable(
  'productos',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    marcaId: uuid('marca_id')
      .notNull()
      .references(() => marcas.id, { onDelete: 'cascade' }),
    slug: text('slug').notNull(),
    sku: text('sku'),
    nombre: text('nombre').notNull(),
    descripcion: text('descripcion'),
    categoria: text('categoria').notNull(),
    /** Categoría propia de la marca (opcional, convive con categoria global). */
    categoriaMarcaId: uuid('categoria_marca_id').references(
      () => categoriasMarca.id,
      { onDelete: 'set null' },
    ),
    /** 'stock' (modelo distribuidor actual) | 'dropshipping' (Wella, marca envía directo). */
    tipoDistribucion: text('tipo_distribucion').notNull().default('stock'),
    tipoNegocioTarget: text('tipo_negocio_target')
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    imagenes: jsonb('imagenes').notNull().default(sql`'[]'::jsonb`),
    /** Lo que paga Gonper Studio a la marca (coste de compra del distribuidor) — interno. */
    costeMayoristaEur: numeric('coste_mayorista_eur', {
      precision: 10,
      scale: 2,
    }),
    /** Lo que paga el salón a Gonper Studio (precio de reventa). */
    precioMayoristaEur: numeric('precio_mayorista_eur', {
      precision: 10,
      scale: 2,
    }).notNull(),
    precioPublicoRecomendadoEur: numeric('precio_publico_recomendado_eur', {
      precision: 10,
      scale: 2,
    }).notNull(),
    unidadMedida: text('unidad_medida').notNull().default('unidad'),
    pesoG: integer('peso_g'),
    stockDisponibleMarca: integer('stock_disponible_marca'),
    activo: boolean('activo').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    uqMarcaSlug: unique('productos_marca_slug_unique').on(t.marcaId, t.slug),
    idxMarca: index('idx_productos_marca').on(t.marcaId),
    idxCategoria: index('idx_productos_categoria')
      .on(t.categoria)
      .where(sql`${t.activo} = true`),
    idxCategoriaMarca: index('idx_productos_categoria_marca').on(
      t.categoriaMarcaId,
    ),
    idxTipoDistribucion: index('idx_productos_tipo_distribucion').on(
      t.tipoDistribucion,
    ),
    idxActivo: index('idx_productos_activo')
      .on(t.activo)
      .where(sql`${t.activo} = true`),
    chkCategoria: check(
      'productos_categoria_check',
      sql`${t.categoria} in ('capilar','barba','unas','estetica','accesorio','otro')`,
    ),
    chkTipoDistribucion: check(
      'productos_tipo_distribucion_check',
      sql`${t.tipoDistribucion} in ('stock', 'dropshipping')`,
    ),
    chkPrecioMayorista: check(
      'productos_precio_mayorista_check',
      sql`${t.precioMayoristaEur} >= 0`,
    ),
    chkPrecioPublico: check(
      'productos_precio_publico_check',
      sql`${t.precioPublicoRecomendadoEur} >= 0`,
    ),
  }),
);

// productos_salon: qué productos tiene activos cada salón en su tienda
// pública (modelo dropshipping, sesión 2026-05-12). Reemplaza el uso
// operativo de `stock_salon` para el flujo nuevo.
export const productosSalon = pgTable(
  'productos_salon',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    salonId: uuid('salon_id')
      .notNull()
      .references(() => salones.id, { onDelete: 'cascade' }),
    productoId: uuid('producto_id')
      .notNull()
      .references(() => productos.id, { onDelete: 'cascade' }),
    activo: boolean('activo').notNull().default(true),
    activadoAt: timestamp('activado_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    desactivadoAt: timestamp('desactivado_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    uq: unique('productos_salon_unique').on(t.salonId, t.productoId),
    idxSalonActivo: index('idx_productos_salon_salon_activo')
      .on(t.salonId)
      .where(sql`${t.activo} = true`),
    idxProducto: index('idx_productos_salon_producto').on(t.productoId),
  }),
);

// stock_salon: DEPRECATED. Reemplazada por `productos_salon` para el
// modelo dropshipping (sesión 2026-05-12). Se mantiene en el schema
// solo para no romper datos históricos.
export const stockSalon = pgTable(
  'stock_salon',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    salonId: uuid('salon_id')
      .notNull()
      .references(() => salones.id, { onDelete: 'cascade' }),
    productoId: uuid('producto_id')
      .notNull()
      .references(() => productos.id, { onDelete: 'restrict' }),
    cantidadDisponible: integer('cantidad_disponible').notNull().default(0),
    precioPublicoEur: numeric('precio_publico_eur', {
      precision: 10,
      scale: 2,
    }),
    activoEnTiendaPublica: boolean('activo_en_tienda_publica')
      .notNull()
      .default(false),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    uq: unique('stock_salon_unique').on(t.salonId, t.productoId),
    idxDisponible: index('idx_stock_salon_disponible')
      .on(t.salonId)
      .where(
        sql`${t.activoEnTiendaPublica} = true and ${t.cantidadDisponible} > 0`,
      ),
    idxProducto: index('idx_stock_salon_producto').on(t.productoId),
    chkCantidad: check(
      'stock_salon_cantidad_check',
      sql`${t.cantidadDisponible} >= 0`,
    ),
    chkPrecio: check(
      'stock_salon_precio_check',
      sql`${t.precioPublicoEur} is null or ${t.precioPublicoEur} >= 0`,
    ),
  }),
);

// pedidos_b2b: salón pide stock a marca (notificación, sin pago en plataforma)
export const pedidosB2b = pgTable(
  'pedidos_b2b',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    salonId: uuid('salon_id')
      .notNull()
      .references(() => salones.id, { onDelete: 'cascade' }),
    marcaId: uuid('marca_id')
      .notNull()
      .references(() => marcas.id, { onDelete: 'restrict' }),
    /** Generado por trigger BEFORE INSERT si viene NULL (formato PED-YYYY-NNNN). */
    numero: text('numero').notNull().unique(),
    estado: text('estado').notNull().default('pendiente'),
    totalEur: numeric('total_eur', { precision: 10, scale: 2 })
      .notNull()
      .default('0'),
    notasSalon: text('notas_salon'),
    notasMarca: text('notas_marca'),
    aceptadoAt: timestamp('aceptado_at', { withTimezone: true }),
    enviadoAt: timestamp('enviado_at', { withTimezone: true }),
    entregadoAt: timestamp('entregado_at', { withTimezone: true }),
    canceladoAt: timestamp('cancelado_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    idxSalon: index('idx_pedidos_b2b_salon').on(t.salonId, t.createdAt.desc()),
    idxMarca: index('idx_pedidos_b2b_marca').on(t.marcaId, t.estado),
    chkEstado: check(
      'pedidos_b2b_estado_check',
      sql`${t.estado} in ('borrador','pendiente','aceptado','enviado','entregado','cancelado')`,
    ),
  }),
);

export const pedidosB2bItems = pgTable(
  'pedidos_b2b_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    pedidoId: uuid('pedido_id')
      .notNull()
      .references(() => pedidosB2b.id, { onDelete: 'cascade' }),
    productoId: uuid('producto_id')
      .notNull()
      .references(() => productos.id, { onDelete: 'restrict' }),
    nombreSnapshot: text('nombre_snapshot').notNull(),
    skuSnapshot: text('sku_snapshot'),
    cantidad: integer('cantidad').notNull(),
    precioUnitMayoristaEur: numeric('precio_unit_mayorista_eur', {
      precision: 10,
      scale: 2,
    }).notNull(),
    subtotalEur: numeric('subtotal_eur', { precision: 10, scale: 2 }).notNull(),
  },
  (t) => ({
    idxPedido: index('idx_pedidos_b2b_items_pedido').on(t.pedidoId),
    chkCantidad: check(
      'pedidos_b2b_items_cantidad_check',
      sql`${t.cantidad} > 0`,
    ),
    chkSubtotal: check(
      'pedidos_b2b_items_subtotal_check',
      sql`${t.subtotalEur} >= 0`,
    ),
  }),
);

// ventas_b2c: cliente compra al salón vía Stripe Connect
export const ventasB2c = pgTable(
  'ventas_b2c',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    salonId: uuid('salon_id')
      .notNull()
      .references(() => salones.id, { onDelete: 'cascade' }),
    /** Generado por trigger BEFORE INSERT (formato VEN-YYYY-NNNN). */
    numero: text('numero').notNull().unique(),
    clienteEmail: text('cliente_email').notNull(),
    clienteNombre: text('cliente_nombre'),
    clienteTelefono: text('cliente_telefono'),
    totalEur: numeric('total_eur', { precision: 10, scale: 2 }).notNull(),
    /** Legacy modelo viejo: lo que se restaba al salón. Hoy siempre 0. */
    comisionGestoriEur: numeric('comision_gestori_eur', {
      precision: 10,
      scale: 2,
    })
      .notNull()
      .default('0'),
    /** Modelo dropshipping: lo que recibe el salón via Stripe transfer. */
    comisionSalonEur: numeric('comision_salon_eur', {
      precision: 10,
      scale: 2,
    })
      .notNull()
      .default('0'),
    /** Modelo dropshipping: lo que Gonper Studio paga a la marca (info contable). */
    costeMarcaEur: numeric('coste_marca_eur', { precision: 10, scale: 2 })
      .notNull()
      .default('0'),
    stripePaymentIntentId: text('stripe_payment_intent_id').unique(),
    stripeChargeId: text('stripe_charge_id'),
    estado: text('estado').notNull().default('pendiente_pago'),
    metodoPago: text('metodo_pago').notNull().default('online'),
    metodoEntrega: text('metodo_entrega').notNull().default('recogida'),
    costeEnvioEur: numeric('coste_envio_eur', { precision: 10, scale: 2 })
      .notNull()
      .default('0'),
    direccionEnvio: text('direccion_envio'),
    pagadoAt: timestamp('pagado_at', { withTimezone: true }),
    listaRecogidaAt: timestamp('lista_recogida_at', { withTimezone: true }),
    recogidaAt: timestamp('recogida_at', { withTimezone: true }),
    canceladaAt: timestamp('cancelada_at', { withTimezone: true }),
    reembolsadaAt: timestamp('reembolsada_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    idxSalon: index('idx_ventas_b2c_salon').on(t.salonId, t.createdAt.desc()),
    idxEstado: index('idx_ventas_b2c_estado').on(t.estado),
    idxClienteEmail: index('idx_ventas_b2c_cliente_email').on(t.clienteEmail),
    chkEstado: check(
      'ventas_b2c_estado_check',
      sql`${t.estado} in ('pendiente_pago','pendiente_pago_efectivo','pagada','lista_recogida','recogida','cancelada','reembolsada')`,
    ),
    chkTotal: check('ventas_b2c_total_check', sql`${t.totalEur} >= 0`),
    chkComision: check(
      'ventas_b2c_comision_check',
      sql`${t.comisionGestoriEur} >= 0 and ${t.comisionGestoriEur} <= ${t.totalEur}`,
    ),
    chkMetodoPago: check(
      'ventas_b2c_metodo_pago_check',
      sql`${t.metodoPago} in ('online','efectivo')`,
    ),
    chkMetodoEntrega: check(
      'ventas_b2c_metodo_entrega_check',
      sql`${t.metodoEntrega} in ('recogida','envio')`,
    ),
  }),
);

export const ventasB2cItems = pgTable(
  'ventas_b2c_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ventaId: uuid('venta_id')
      .notNull()
      .references(() => ventasB2c.id, { onDelete: 'cascade' }),
    productoId: uuid('producto_id')
      .notNull()
      .references(() => productos.id, { onDelete: 'restrict' }),
    nombreSnapshot: text('nombre_snapshot').notNull(),
    imagenSnapshot: text('imagen_snapshot'),
    cantidad: integer('cantidad').notNull(),
    precioUnitEur: numeric('precio_unit_eur', {
      precision: 10,
      scale: 2,
    }).notNull(),
    subtotalEur: numeric('subtotal_eur', { precision: 10, scale: 2 }).notNull(),
  },
  (t) => ({
    idxVenta: index('idx_ventas_b2c_items_venta').on(t.ventaId),
    chkCantidad: check(
      'ventas_b2c_items_cantidad_check',
      sql`${t.cantidad} > 0`,
    ),
    chkSubtotal: check(
      'ventas_b2c_items_subtotal_check',
      sql`${t.subtotalEur} >= 0`,
    ),
  }),
);

// ============================================
// TIPOS INFERIDOS
// ============================================
export type Salon = typeof salones.$inferSelect;
export type NewSalon = typeof salones.$inferInsert;

export type Promocion = typeof promociones.$inferSelect;
export type NewPromocion = typeof promociones.$inferInsert;

export type GaleriaImagen = typeof galeriaImagenes.$inferSelect;
export type NewGaleriaImagen = typeof galeriaImagenes.$inferInsert;

export type ComparativaAntesDespues = typeof comparativasAntesDespues.$inferSelect;
export type NewComparativaAntesDespues = typeof comparativasAntesDespues.$inferInsert;

export type Resena = typeof resenas.$inferSelect;
export type NewResena = typeof resenas.$inferInsert;

export type UsuarioSalon = typeof usuariosSalon.$inferSelect;
export type NewUsuarioSalon = typeof usuariosSalon.$inferInsert;

export type Profesional = typeof profesionales.$inferSelect;
export type NewProfesional = typeof profesionales.$inferInsert;

export type Servicio = typeof servicios.$inferSelect;
export type NewServicio = typeof servicios.$inferInsert;

export type Horario = typeof horarios.$inferSelect;
export type NewHorario = typeof horarios.$inferInsert;

export type Cierre = typeof cierres.$inferSelect;
export type NewCierre = typeof cierres.$inferInsert;

export type Cliente = typeof clientes.$inferSelect;
export type NewCliente = typeof clientes.$inferInsert;

export type Cita = typeof citas.$inferSelect;
export type NewCita = typeof citas.$inferInsert;

export type ListaEspera = typeof listaEspera.$inferSelect;
export type NewListaEspera = typeof listaEspera.$inferInsert;

export type Mensaje = typeof mensajes.$inferSelect;
export type NewMensaje = typeof mensajes.$inferInsert;

export type Lead = typeof leads.$inferSelect;
export type NewLead = typeof leads.$inferInsert;

export type RateLimit = typeof rateLimits.$inferSelect;
export type NewRateLimit = typeof rateLimits.$inferInsert;

export type AdminUser = typeof adminUsers.$inferSelect;
export type NewAdminUser = typeof adminUsers.$inferInsert;

export type Agente = typeof agentes.$inferSelect;
export type NewAgente = typeof agentes.$inferInsert;

export type AgenteVersion = typeof agentesVersiones.$inferSelect;
export type NewAgenteVersion = typeof agentesVersiones.$inferInsert;

export type AgenteSesion = typeof agenteSesiones.$inferSelect;
export type NewAgenteSesion = typeof agenteSesiones.$inferInsert;

export type AgenteMensaje = typeof agenteMensajes.$inferSelect;
export type NewAgenteMensaje = typeof agenteMensajes.$inferInsert;

export type AgenteToolCatalogo = typeof agenteToolsCatalogo.$inferSelect;
export type NewAgenteToolCatalogo = typeof agenteToolsCatalogo.$inferInsert;

export type AgenteToolAsignacion = typeof agenteToolsAsignaciones.$inferSelect;
export type NewAgenteToolAsignacion = typeof agenteToolsAsignaciones.$inferInsert;

export type SalonRatingCache = typeof salonesRatingCache.$inferSelect;
export type NewSalonRatingCache = typeof salonesRatingCache.$inferInsert;

export type Marca = typeof marcas.$inferSelect;
export type NewMarca = typeof marcas.$inferInsert;

export type CategoriaMarca = typeof categoriasMarca.$inferSelect;
export type NewCategoriaMarca = typeof categoriasMarca.$inferInsert;

export type Producto = typeof productos.$inferSelect;
export type NewProducto = typeof productos.$inferInsert;

export type StockSalon = typeof stockSalon.$inferSelect;
export type NewStockSalon = typeof stockSalon.$inferInsert;

export type ProductoSalon = typeof productosSalon.$inferSelect;
export type NewProductoSalon = typeof productosSalon.$inferInsert;

export type PedidoB2b = typeof pedidosB2b.$inferSelect;
export type NewPedidoB2b = typeof pedidosB2b.$inferInsert;

export type PedidoB2bItem = typeof pedidosB2bItems.$inferSelect;
export type NewPedidoB2bItem = typeof pedidosB2bItems.$inferInsert;

export type VentaB2c = typeof ventasB2c.$inferSelect;
export type NewVentaB2c = typeof ventasB2c.$inferInsert;

export type VentaB2cItem = typeof ventasB2cItems.$inferSelect;
export type NewVentaB2cItem = typeof ventasB2cItems.$inferInsert;
