import { redirect } from 'next/navigation';
import { Nav } from '@/components/nav';
import { fetchProfile } from '@/lib/api/handlers/common';
import { createSessionClient } from '@/lib/supabase/clients';
import { ApiError } from '@/lib/api/errors';

export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSessionClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect('/login');

  let profile;
  try {
    profile = await fetchProfile(supabase, data.user.id);
  } catch (e) {
    if (e instanceof ApiError) redirect('/login');
    throw e;
  }

  return (
    <>
      <Nav name={profile.name} isAdmin={profile.role === 'admin'} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
    </>
  );
}
