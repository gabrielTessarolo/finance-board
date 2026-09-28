import { withSession } from '@/lib/api/route';
import * as h from '@/lib/api/handlers/classes';

export const GET = withSession(h.list);
export const POST = withSession(h.create);
