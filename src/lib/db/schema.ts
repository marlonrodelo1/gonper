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

    // Configuración del agente
    agenteNombre: text('agente_nombre').notNull().default('Juanita'),
    agenteGenero: text('agente_genero').notNull().default('femenino'),
    agenteTono: text('agente_tono').notNull().default('cercano'),
    agenteBienvenida: text('agente_bienvenida'),

    // Conexiones externas
    telegramBotToken: text('telegram_bot_token'),
    telegramBotUsername: text('telegram_bot_username'),
    telegramBotDuenoToken: text('telegram_bot_dueno_token'),
    telegramChatIdDueno: text('telegram_chat_id_dueno'),
    whatsappPhoneId: text('whatsapp_phone_id'),

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
// TIPOS INFERIDOS
// ============================================
export type Salon = typeof salones.$inferSelect;
export type NewSalon = typeof salones.$inferInsert;

export type Promocion = typeof promociones.$inferSelect;
export type NewPromocion = typeof promociones.$inferInsert;

export type GaleriaImagen = typeof galeriaImagenes.$inferSelect;
export type NewGaleriaImagen = typeof galeriaImagenes.$inferInsert;

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
