import { publicRoute } from '@/lib/api/route';
import { refreshToken } from '@/lib/api/handlers/auth';

export const POST = publicRoute(refreshToken);
