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
import { eliminarImagen } from './actions';

export function EliminarImagenButton({
  id,
  titulo,
}: {
  id: string;
  titulo: string;
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
          <AlertDialogTitle>Eliminar imagen</AlertDialogTitle>
          <AlertDialogDescription>
            {titulo
              ? `Se eliminará "${titulo}" de tu galería. Esta acción no se puede deshacer.`
              : 'Esta imagen se eliminará de tu galería. Esta acción no se puede deshacer.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <form action={eliminarImagen}>
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
