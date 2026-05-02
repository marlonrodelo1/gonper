'use client';

type ConfirmFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  salonId: string;
  confirmMessage: string;
  label: string;
};

export function ConfirmForm({
  action,
  salonId,
  confirmMessage,
  label,
}: ConfirmFormProps) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(confirmMessage)) e.preventDefault();
      }}
    >
      <input type="hidden" name="salonId" value={salonId} />
      <button
        type="submit"
        className="tight w-full rounded-full border border-terracotta/40 bg-terracotta-soft/30 px-4 py-2 text-[13px] text-terracotta-2 transition hover:bg-terracotta-soft/60"
      >
        {label}
      </button>
    </form>
  );
}
