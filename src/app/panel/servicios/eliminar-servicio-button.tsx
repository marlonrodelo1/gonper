'use client';

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
import { eliminarServicio } from './actions';

export function EliminarServicioButton({
  id,
  nombre,
}: {
  id: string;
  nombre: string;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <button
            type="button"
            className="tight inline-flex h-7 items-center justify-center rounded-full border border-line bg-paper px-3 text-[12px] font-medium transition hover:bg-paper/80"
            style={{ color: '#B14848' }}
          >
            Eliminar
          </button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminar “{nombre}”</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción no se puede deshacer. Las citas existentes con este
            servicio se mantienen pero ya no podrá usarse para nuevas citas.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <form action={eliminarServicio}>
            <input type="hidden" name="id" value={id} />
            <AlertDialogAction
              type="submit"
              className="bg-[#B14848] text-white hover:bg-[#7C2E2E]"
            >
              Eliminar
            </AlertDialogAction>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
