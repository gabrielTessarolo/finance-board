import { withBearer } from '@/lib/api/route';
import * as h from '@/lib/api/handlers/transactions';

export const GET = withBearer(h.summary);
