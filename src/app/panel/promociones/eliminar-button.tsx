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
import { eliminarPromocion } from './actions';

export function EliminarPromocionButton({
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
          <AlertDialogTitle>Eliminar “{titulo}”</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción no se puede deshacer. La promoción dejará de mostrarse en
            la web del salón.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <form action={eliminarPromocion}>
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
