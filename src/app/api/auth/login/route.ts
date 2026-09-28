import { publicRoute } from '@/lib/api/route';
import { login } from '@/lib/api/handlers/auth';

export const POST = publicRoute(login);
