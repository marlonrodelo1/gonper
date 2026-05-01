'use client';

import { useState } from 'react';

import { Switch } from '@/components/ui/switch';

export function ConfirmarSwitch() {
  const [checked, setChecked] = useState(false);

  return (
    <div className="card-tight flex items-center justify-between gap-4 px-5 py-4">
      <div className="flex flex-col gap-0.5">
        <label
          htmlFor="confirmada"
          className="tight cursor-pointer text-[14px] font-medium text-ink"
        >
          Confirmar la cita ahora
        </label>
        <p className="text-[12.5px] text-stone">
          Por defecto se crea como pendiente.
        </p>
      </div>
      <Switch
        id="confirmada"
        checked={checked}
        onCheckedChange={setChecked}
      />
      {checked ? <input type="hidden" name="confirmada" value="on" /> : null}
    </div>
  );
}
