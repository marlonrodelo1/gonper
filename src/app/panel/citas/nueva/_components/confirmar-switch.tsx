'use client';

import { useState } from 'react';

import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

export function ConfirmarSwitch() {
  const [checked, setChecked] = useState(false);

  return (
    <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50/50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/40">
      <div className="flex flex-col">
        <Label htmlFor="confirmada" className="cursor-pointer">
          Confirmar la cita ahora
        </Label>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Por defecto se crea como pendiente.
        </p>
      </div>
      <Switch
        id="confirmada"
        checked={checked}
        onCheckedChange={setChecked}
      />
      {/* Input oculto para enviar el valor con el form: 'on' si está activo */}
      {checked ? (
        <input type="hidden" name="confirmada" value="on" />
      ) : null}
    </div>
  );
}
