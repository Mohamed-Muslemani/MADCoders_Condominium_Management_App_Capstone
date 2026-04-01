import { useEffect, useState } from 'react';
import {
  createReserveTransaction,
  getReserveTransactions,
} from '../api/reserveTransactions';
import { ReserveTransactionsForm } from '../components/ReserveTransactionsForm';
import { ReserveTransactionsTable } from '../components/ReserveTransactionsTable';
import type {
  CreateReserveTransactionRequest,
  ReserveTransaction,
} from '../types/reserve-transaction';

export function ReserveTransactionsPage() {
  const [transactions, setTransactions] = useState<ReserveTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function loadTransactions() {
    try {
      setLoading(true);
      setError('');
      setTransactions(await getReserveTransactions());
    } catch {
      setError('Could not load reserve transactions');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(payload: CreateReserveTransactionRequest) {
    try {
      setSaving(true);
      setError('');
      await createReserveTransaction(payload);
      await loadTransactions();
    } catch {
      setError('Could not create reserve transaction');
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    void loadTransactions();
  }, []);

  return (
    <section className="page-grid">
      <div>
        <h2>Reserve Transactions</h2>
        <p className="page-copy">
          Basic list and create flow for `/reserve-transactions`.
        </p>
        {error ? <p className="error">{error}</p> : null}
        {loading ? (
          <p>Loading reserve transactions...</p>
        ) : (
          <ReserveTransactionsTable transactions={transactions} />
        )}
      </div>

      <ReserveTransactionsForm loading={saving} onSubmit={handleCreate} />
    </section>
  );
}