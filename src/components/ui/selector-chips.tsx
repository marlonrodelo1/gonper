'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'motion/react';

export type SelectorChipOption = {
  /** Etiqueta visible. */
  label: string;
  /** Identificador único (lo que recibe `onChange`). */
  value: string;
};

export type SelectorChipsProps = {
  options: SelectorChipOption[];
  /** Componente controlado: el padre maneja qué valores están activos. */
  value: string[];
  onChange: (selected: string[]) => void;
  className?: string;
};

/**
 * Chips multi-select con animación. Cada chip alterna entre selected
 * (fondo terracotta accent del salón) y unselected (paper + borde line).
 * Aparece un tick animado cuando está seleccionado.
 */
export function SelectorChips({
  options,
  value,
  onChange,
  className,
}: SelectorChipsProps) {
  const toggle = (val: string) => {
    const next = value.includes(val)
      ? value.filter((v) => v !== val)
      : [...value, val];
    onChange(next);
  };

  return (
    <div className={`flex flex-wrap gap-2 ${className ?? ''}`}>
      {options.map((opt) => {
        const isSelected = value.includes(opt.value);
        return (
          <motion.button
            key={opt.value}
            type="button"
            onClick={() => toggle(opt.value)}
            initial={false}
            animate={{
              backgroundColor: isSelected
                ? 'var(--gestori-accent)'
                : 'var(--paper)',
              borderColor: isSelected
                ? 'var(--gestori-accent)'
                : 'var(--line)',
              color: isSelected ? 'var(--paper)' : 'var(--ink)',
              transition: {
                backgroundColor: { duration: 0.18 },
                borderColor: { duration: 0.18 },
                color: { duration: 0.18 },
              },
            }}
            className="inline-flex items-center justify-center px-4 py-2 rounded-full text-[13px] font-medium tight border overflow-hidden cursor-pointer select-none"
          >
            <div className="flex items-center relative whitespace-nowrap">
              <span>{opt.label}</span>
              <motion.span
                animate={{
                  width: isSelected ? 18 : 0,
                  marginLeft: isSelected ? 6 : 0,
                }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  overflow: 'hidden',
                }}
              >
                <AnimatePresence>
                  {isSelected && (
                    <motion.span
                      key="tick"
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1.1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{
                        type: 'spring',
                        stiffness: 500,
                        damping: 20,
                      }}
                      style={{ pointerEvents: 'none', display: 'flex' }}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 20 20"
                        fill="none"
                        aria-hidden="true"
                      >
                        <motion.path
                          d="M5 10.5L9 14.5L15 7.5"
                          stroke="currentColor"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{ duration: 0.25 }}
                        />
                      </svg>
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.span>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
