import { publicRoute } from '@/lib/api/route';
import { logout } from '@/lib/api/handlers/auth';

export const POST = publicRoute(logout);
