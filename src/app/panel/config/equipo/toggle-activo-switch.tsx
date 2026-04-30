'use client';

import { useTransition } from 'react';
import { Switch } from '@/components/ui/switch';
import { toggleProfesionalActivo } from './actions';

export function ToggleActivoSwitch({
  id,
  activo,
}: {
  id: string;
  activo: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Switch
      checked={activo}
      disabled={pending}
      onCheckedChange={() => {
        const fd = new FormData();
        fd.append('id', id);
        startTransition(async () => {
          await toggleProfesionalActivo(fd);
        });
      }}
    />
  );
}
