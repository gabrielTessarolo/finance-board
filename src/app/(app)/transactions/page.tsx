import { Suspense } from 'react';
import { Transactions } from '@/components/transactions';

export default function TransactionsPage() {
  return (
    <Suspense>
      <Transactions />
    </Suspense>
  );
}
