import { publicRoute } from '@/lib/api/route';
import { issueToken } from '@/lib/api/handlers/auth';

export const POST = publicRoute(issueToken);
