import { withBearer } from '@/lib/api/route';
import * as h from '@/lib/api/handlers/classes';

export const GET = withBearer(h.list);
export const POST = withBearer(h.create);
