import { withBearer } from '@/lib/api/route';
import { me } from '@/lib/api/handlers/auth';

export const GET = withBearer(me);
