import { redirect } from 'next/navigation';
import { UsersManager } from '@/components/users-manager';
import { fetchProfile } from '@/lib/api/handlers/common';
import { createSessionClient } from '@/lib/supabase/clients';

export default async function UsersPage() {
  const supabase = await createSessionClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect('/login');
  const me = await fetchProfile(supabase, data.user.id);
  if (me.role !== 'admin') redirect('/');
  return <UsersManager currentUserId={me.id} />;
}
