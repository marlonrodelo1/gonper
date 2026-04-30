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

export function CancelarCitaButton({ citaId }: { citaId: string }) {
  const [motivo, setMotivo] = useState('');
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button variant="ghost" size="sm">
            ✕ Cancelar
          </Button>
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
