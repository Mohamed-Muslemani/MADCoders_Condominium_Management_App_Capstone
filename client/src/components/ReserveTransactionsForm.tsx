import { useState, type FormEvent } from 'react';
import type {
  CreateReserveTransactionRequest,
  ReserveTransactionStatus,
  ReserveTransactionType,
} from '../types/reserve-transaction';

interface ReserveTransactionsFormProps {
  loading?: boolean;
  onSubmit: (payload: CreateReserveTransactionRequest) => Promise<void>;
}

export function ReserveTransactionsForm({
  loading,
  onSubmit,
}: ReserveTransactionsFormProps) {
  const [categoryId, setCategoryId] = useState('');
  const [type, setType] = useState<ReserveTransactionType>('EXPENSE');
  const [status, setStatus] = useState<ReserveTransactionStatus>('POSTED');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [transactionDate, setTransactionDate] = useState('');
  const [expectedDate, setExpectedDate] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    await onSubmit({
      categoryId: categoryId || undefined,
      type,
      status,
      title,
      description: description || undefined,
      amount: Number(amount),
      transactionDate: transactionDate || undefined,
      expectedDate: expectedDate || undefined,
    });

    setCategoryId('');
    setType('EXPENSE');
    setStatus('POSTED');
    setTitle('');
    setDescription('');
    setAmount('');
    setTransactionDate('');
    setExpectedDate('');
  }

  return (
    <form className="panel form" onSubmit={handleSubmit}>
      <h2>Create Reserve Transaction</h2>

      <label>
        Category ID
        <input
          type="text"
          value={categoryId}
          onChange={(event) => setCategoryId(event.target.value)}
        />
      </label>

      <label>
        Type
        <select
          value={type}
          onChange={(event) =>
            setType(event.target.value as ReserveTransactionType)
          }
        >
          <option value="EXPENSE">EXPENSE</option>
          <option value="PROJECTION">PROJECTION</option>
        </select>
      </label>

      <label>
        Status
        <select
          value={status}
          onChange={(event) =>
            setStatus(event.target.value as ReserveTransactionStatus)
          }
        >
          <option value="POSTED">POSTED</option>
          <option value="PLANNED">PLANNED</option>
          <option value="CANCELLED">CANCELLED</option>
        </select>
      </label>

      <label>
        Title
        <input
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
        />
      </label>

      <label>
        Description
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={4}
        />
      </label>

      <label>
        Amount
        <input
          type="number"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          min="0.01"
          step="0.01"
          required
        />
      </label>

      <label>
        Transaction Date
        <input
          type="date"
          value={transactionDate}
          onChange={(event) => setTransactionDate(event.target.value)}
        />
      </label>

      <label>
        Expected Date
        <input
          type="date"
          value={expectedDate}
          onChange={(event) => setExpectedDate(event.target.value)}
        />
      </label>

      <button type="submit" disabled={loading}>
        {loading ? 'Saving...' : 'Add Transaction'}
      </button>
    </form>
  );
}