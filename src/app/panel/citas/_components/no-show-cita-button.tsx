'use client';

import { useState, useTransition } from 'react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

import { marcarNoShow } from '../actions';

export function NoShowCitaButton({ citaId }: { citaId: string }) {
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button variant="ghost" size="sm">
            ⊘ No-show
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Marcar como no-show?</AlertDialogTitle>
          <AlertDialogDescription>
            Sumará un no-show al historial del cliente y la cita quedará cerrada.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel render={<Button variant="ghost">Volver</Button>} />
          <AlertDialogAction
            render={
              <Button
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    await marcarNoShow(citaId);
                    setOpen(false);
                  })
                }
              >
                Confirmar no-show
              </Button>
            }
          />
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
