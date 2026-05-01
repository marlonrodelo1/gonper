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

export function NoShowCitaButton({
  citaId,
  className,
}: {
  citaId: string;
  className?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const triggerClass =
    className ??
    'card-tight tight px-4 py-2.5 text-[13px] text-[#7C2E2E] hover:bg-[#F1D6D6]/40';

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <button
            type="button"
            className={triggerClass}
            style={{ borderColor: 'rgba(177,72,72,0.35)' }}
          >
            No-show
          </button>
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
                className="bg-[#B14848] text-white hover:bg-[#7C2E2E]"
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
