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
import { Textarea } from '@/components/ui/textarea';

import { cancelarCita } from '../actions';

export function CancelarCitaButton({
  citaId,
  className,
}: {
  citaId: string;
  className?: string;
}) {
  const [motivo, setMotivo] = useState('');
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
            Cancelar cita
          </button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Cancelar esta cita?</AlertDialogTitle>
          <AlertDialogDescription>
            El cliente recibirá la notificación si tiene canal activo.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Textarea
          placeholder="Motivo (opcional)"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
        />
        <AlertDialogFooter>
          <AlertDialogCancel render={<Button variant="ghost">Volver</Button>} />
          <AlertDialogAction
            render={
              <Button
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    await cancelarCita(citaId, motivo);
                    setOpen(false);
                    setMotivo('');
                  })
                }
                className="bg-[#B14848] text-white hover:bg-[#7C2E2E]"
              >
                Cancelar cita
              </Button>
            }
          />
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
