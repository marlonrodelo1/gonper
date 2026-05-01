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
import { eliminarProfesional } from './actions';

export function EliminarProfesionalButton({
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
            className="rounded-full border border-line bg-paper px-3 py-1.5 text-[12.5px] tight text-[#7C2E2E] hover:bg-[#F1D6D6]/40"
            style={{ borderColor: 'rgba(177,72,72,0.35)' }}
          >
            Eliminar
          </button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminar “{nombre}”</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción no se puede deshacer. Si tiene citas asociadas no podrá
            eliminarse: en ese caso, mejor desactívalo.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <form action={eliminarProfesional}>
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
