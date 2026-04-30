import Link from "next/link";
import { CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signup } from "../actions";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <>
      <CardHeader>
        <CardTitle className="text-xl">Crea tu cuenta</CardTitle>
        <CardDescription>Configura tu salón en 1 minuto</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={signup} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
            />
            <p className="text-xs text-muted-foreground">Mínimo 8 caracteres</p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="salon_nombre">Nombre del salón</Label>
            <Input
              id="salon_nombre"
              name="salon_nombre"
              type="text"
              placeholder="Revolution Barbershop"
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="salon_slug">Slug del salón</Label>
            <Input
              id="salon_slug"
              name="salon_slug"
              type="text"
              placeholder="ej: revolution-bcn"
              pattern="[a-z0-9\-]+"
              required
            />
            <p className="text-xs text-muted-foreground">
              Solo a-z, 0-9 y guiones. Será parte de tu URL pública.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="tipo_negocio">Tipo de negocio</Label>
            <select
              id="tipo_negocio"
              name="tipo_negocio"
              defaultValue="otro"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="barberia">Barbería</option>
              <option value="peluqueria">Peluquería</option>
              <option value="estetica">Estética</option>
              <option value="manicura">Manicura</option>
              <option value="otro">Otro</option>
            </select>
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          <Button type="submit" className="w-full">
            Crear cuenta y salón
          </Button>

          <p className="text-sm text-center text-muted-foreground">
            ¿Ya tienes cuenta?{" "}
            <Link
              href="/login"
              className="text-purple-600 hover:underline font-medium"
            >
              Entra
            </Link>
          </p>
        </form>
      </CardContent>
    </>
  );
}
