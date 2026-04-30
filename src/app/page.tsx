import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-zinc-50 px-6 dark:bg-zinc-950">
      <main className="flex w-full max-w-xl flex-col items-center gap-8 text-center">
        <div className="flex flex-col items-center gap-3">
          <h1 className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-6xl font-bold tracking-tight text-transparent">
            Gomper
          </h1>
          <p className="text-lg text-zinc-600 dark:text-zinc-400">
            El asistente virtual para tu salón
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/login"
            className="inline-flex h-11 items-center justify-center rounded-lg bg-zinc-950 px-6 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
          >
            Iniciar sesión
          </Link>
          <Link
            href="/panel/hoy"
            className="inline-flex h-11 items-center justify-center rounded-lg border border-zinc-300 bg-white px-6 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:bg-zinc-800"
          >
            Ver demo del panel
          </Link>
        </div>
      </main>
    </div>
  );
}
