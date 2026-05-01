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
import { eliminarResena } from './actions';

export function EliminarResenaButton({
  id,
  autor,
}: {
  id: string;
  autor: string;
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
          <AlertDialogTitle>Eliminar reseña de “{autor}”</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción no se puede deshacer. La reseña dejará de mostrarse en la
            web del salón.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <form action={eliminarResena}>
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
