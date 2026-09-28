import { withSession } from '@/lib/api/route';
import * as h from '@/lib/api/handlers/transactions';

export const GET = withSession(h.get);
export const PATCH = withSession(h.update);
export const DELETE = withSession(h.remove);
