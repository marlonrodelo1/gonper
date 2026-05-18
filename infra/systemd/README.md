# Crons de Gonper (systemd timers)

Sustituyen los workflows de n8n que disparaban los endpoints de cron.
Corren en el mismo VPS que la app (junto a Dokploy). Cero dependencias
externas, logs en `journalctl`.

## Qué dispara cada timer

| Timer | Cadencia | Endpoint |
|---|---|---|
| `gonper-cron-recordatorios.timer` | cada 5 min | `POST /api/v1/cron/recordatorios` — marca citas y avisa al dueño por Telegram con botón WhatsApp |
| `gonper-cron-trial.timer` | diario a las 09:00 hora local | `POST /api/cron/trial-recordatorios` — emails de fin de trial |

Ambos endpoints son idempotentes (UPDATE atómico + flags / UNIQUE constraint),
así que si el timer se dispara dos veces seguidas no pasa nada.

## Instalación (one-time, en el VPS)

1. Asegúrate de que el VPS está en zona horaria correcta:
   ```bash
   sudo timedatectl set-timezone Europe/Madrid
   timedatectl
   ```

2. Crea el archivo de entorno con permisos restrictivos:
   ```bash
   sudo install -m 600 -o root -g root /dev/null /etc/gonper.env
   sudo tee /etc/gonper.env <<'EOF'
   INTERNAL_API_TOKEN=<pega-aquí-el-mismo-valor-que-en-Dokploy>
   CRON_BASE_URL=https://gonperstudio.shop
   EOF
   ```

3. Copia las unidades a `/etc/systemd/system/`:
   ```bash
   # Desde la raíz del repo en el VPS:
   sudo cp infra/systemd/gonper-cron-*.{service,timer} /etc/systemd/system/
   sudo systemctl daemon-reload
   ```

4. Activa y arranca los timers:
   ```bash
   sudo systemctl enable --now gonper-cron-recordatorios.timer
   sudo systemctl enable --now gonper-cron-trial.timer
   ```

5. Comprueba que están programados:
   ```bash
   systemctl list-timers --all | grep gonper
   ```

   Debería mostrar el próximo disparo (~5 min para recordatorios, mañana 09:00 para trial).

## Verificación

Forzar un disparo inmediato (sin esperar al timer):
```bash
sudo systemctl start gonper-cron-recordatorios.service
sudo systemctl start gonper-cron-trial.service
```

Ver logs del último disparo:
```bash
journalctl -u gonper-cron-recordatorios.service -n 50 --no-pager
journalctl -u gonper-cron-trial.service -n 50 --no-pager
```

Seguir logs en vivo:
```bash
journalctl -u gonper-cron-recordatorios.service -f
```

Estado del timer (próximo disparo + último disparo):
```bash
systemctl status gonper-cron-recordatorios.timer
```

## Apagar (si necesitas revertir a n8n temporalmente)

```bash
sudo systemctl disable --now gonper-cron-recordatorios.timer
sudo systemctl disable --now gonper-cron-trial.timer
```

## Una vez que estés conforme — apagar n8n

Apaga el workflow correspondiente en n8n:
- `Gonper Studio - Recordatorios cron`
- (Si existe) cron diario de trial-recordatorios

Si los timers han funcionado 24 h sin errores en Sentry, puedes apagar el
workflow n8n con tranquilidad.

## Troubleshooting

**Curl devuelve 401 Unauthorized**
El `INTERNAL_API_TOKEN` en `/etc/gonper.env` no coincide con el de Dokploy.
Cópialo desde el panel Dokploy de la app.

**Curl devuelve 500 con `INTERNAL_API_TOKEN not configured`**
La app no tiene la variable cargada. Reinicia el contenedor desde Dokploy.

**`systemctl status` muestra el timer en `failed`**
Revisa `journalctl -u <unit> -n 100`. Lo más típico: red caída justo en el
disparo o app reiniciando. El siguiente tick (5 min después) lo retomará
solo — no hace falta intervención manual.

**El cron de trial se dispara a otra hora**
Comprueba `timedatectl`. Si el VPS está en UTC, las 09:00 UTC son 10:00
hora Madrid en invierno y 11:00 en verano. Cambia el TZ del VPS o ajusta
`OnCalendar` en `gonper-cron-trial.timer`.
