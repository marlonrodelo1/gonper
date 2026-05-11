-- ============================================================
-- Cambio de modelo de tienda:
-- B2B: Gestori es distribuidor (coste mayorista vs precio al salón)
-- B2C: sin comisión Gestori, pago online o efectivo, envío opcional
-- ============================================================

alter table productos
  add column if not exists coste_mayorista_eur numeric(10,2);

alter table marcas alter column comision_porcentaje set default 0;
update marcas set comision_porcentaje = 0 where comision_porcentaje > 0;

alter table salones
  add column if not exists tienda_acepta_pago_online boolean not null default false,
  add column if not exists tienda_acepta_efectivo boolean not null default true,
  add column if not exists tienda_coste_envio_eur numeric(10,2),
  add column if not exists tienda_zona_envio text;

alter table ventas_b2c
  add column if not exists metodo_pago text not null default 'online',
  add column if not exists metodo_entrega text not null default 'recogida',
  add column if not exists coste_envio_eur numeric(10,2) not null default 0,
  add column if not exists direccion_envio text;

alter table ventas_b2c drop constraint if exists ventas_b2c_estado_check;
alter table ventas_b2c add constraint ventas_b2c_estado_check
  check (estado in ('pendiente_pago','pendiente_pago_efectivo','pagada','lista_recogida','recogida','cancelada','reembolsada'));

alter table ventas_b2c add constraint ventas_b2c_metodo_pago_check
  check (metodo_pago in ('online','efectivo'));

alter table ventas_b2c add constraint ventas_b2c_metodo_entrega_check
  check (metodo_entrega in ('recogida','envio'));
