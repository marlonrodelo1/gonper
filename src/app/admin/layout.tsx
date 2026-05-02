import { Toaster } from '@/components/ui/sonner';

import { requireSuperAdmin } from '@/lib/auth/super-admin';

import { AdminSidebar } from './_components/admin-sidebar';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await requireSuperAdmin();

  return (
    <div className="flex min-h-screen w-full bg-cream text-ink">
      <AdminSidebar userEmail={ctx.email} />
      <main className="min-w-0 flex-1 pt-12 md:pt-0">{children}</main>
      <Toaster position="top-right" theme="system" />
    </div>
  );
}
