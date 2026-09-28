import { withSession } from '@/lib/api/route';
import * as h from '@/lib/api/handlers/transactions';

export const GET = withSession(h.summary);
