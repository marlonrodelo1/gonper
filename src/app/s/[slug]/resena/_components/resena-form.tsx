'use client';

import { useState } from 'react';
import { crearResenaPublica } from '../../actions';

type Props = {
  slug: string;
  ratingInicial: number;
  nombreInicial: string;
  textoInicial: string;
};

export function ResenaForm({
  slug,
  ratingInicial,
  nombreInicial,
  textoInicial,
}: Props) {
  const [rating, setRating] = useState<number>(
    ratingInicial >= 1 && ratingInicial <= 5 ? ratingInicial : 0,
  );
  const [hover, setHover] = useState<number>(0);

  const display = hover || rating;

  return (
    <form
      action={crearResenaPublica}
      className="flex flex-col gap-4 rounded-3xl border border-line bg-paper p-5 sm:p-7"
    >
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="rating" value={rating} />
      {/* Honeypot anti-spam — campo invisible que solo rellenan bots. */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute -left-[10000px] -top-[10000px] h-0 w-0 opacity-0"
      />

      <div>
        <label className="text-[12px] uppercase tracking-[0.2em] text-stone/80">
          Tu valoración
        </label>
        <div className="mt-2 flex items-center gap-1.5">
          {[1, 2, 3, 4, 5].map((n) => {
            const active = n <= display;
            return (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                onMouseEnter={() => setHover(n)}
                onMouseLeave={() => setHover(0)}
                aria-label={`${n} de 5`}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full transition"
                style={{
                  color: active
                    ? 'var(--gestori-accent)'
                    : 'rgba(107,99,86,0.35)',
                }}
              >
                <svg
                  viewBox="0 0 24 24"
                  width="26"
                  height="26"
                  fill={active ? 'currentColor' : 'none'}
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M12 3.5l2.7 5.6 6.2.9-4.5 4.3 1.1 6.1L12 17.6l-5.5 2.9 1.1-6.1L3.1 10l6.2-.9L12 3.5z" />
                </svg>
              </button>
            );
          })}
          <span className="ml-2 text-[12.5px] tabular-nums text-stone">
            {rating ? `${rating} / 5` : 'Sin valoración'}
          </span>
        </div>
      </div>

      <div>
        <label
          htmlFor="resena-nombre"
          className="text-[12px] uppercase tracking-[0.2em] text-stone/80"
        >
          Tu nombre
        </label>
        <input
          id="resena-nombre"
          name="nombre"
          type="text"
          required
          maxLength={120}
          defaultValue={nombreInicial}
          autoComplete="name"
          placeholder="Nombre o apodo"
          className="mt-2 w-full rounded-2xl border border-line bg-cream px-5 py-3.5 text-[14.5px] text-ink placeholder:text-stone/50 focus:border-gestori-accent focus:outline-none"
        />
      </div>

      <div>
        <label
          htmlFor="resena-texto"
          className="text-[12px] uppercase tracking-[0.2em] text-stone/80"
        >
          Tu experiencia <span className="normal-case text-stone/50">(opcional)</span>
        </label>
        <textarea
          id="resena-texto"
          name="texto"
          rows={5}
          maxLength={2000}
          defaultValue={textoInicial}
          placeholder="¿Cómo fue tu visita? ¿Qué destacarías?"
          className="mt-2 w-full resize-none rounded-2xl border border-line bg-cream px-5 py-3.5 text-[14.5px] text-ink placeholder:text-stone/50 focus:border-gestori-accent focus:outline-none"
        />
      </div>

      <button
        type="submit"
        disabled={!rating}
        className="accent-btn tight mt-1 inline-flex h-12 items-center justify-center rounded-full px-5 text-[15px] font-medium disabled:cursor-not-allowed disabled:opacity-50"
      >
        Enviar reseña
      </button>

      <p className="text-center text-[11.5px] text-stone/70">
        Revisaremos tu reseña antes de publicarla. Sin pago ni registro.
      </p>
    </form>
  );
}
