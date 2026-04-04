
import { useState, type FormEvent } from 'react';
import type { CreateUnitDueRequest, UnitDueStatus } from '../types/unit-due';

interface UnitDuesFormProps {
  loading?: boolean;
  onSubmit: (payload: CreateUnitDueRequest) => Promise<void>;
}

export function UnitDuesForm({ loading, onSubmit }: UnitDuesFormProps) {
  const [unitId, setUnitId] = useState('');
  const [periodMonth, setPeriodMonth] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState<UnitDueStatus>('UNPAID');
  const [note, setNote] = useState('');
  const [paidDate, setPaidDate] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    await onSubmit({
      unitId,
      periodMonth,
      dueDate,
      amount: Number(amount),
      status,
      note: note || undefined,
      paidDate: paidDate || undefined,
    });

    setUnitId('');
    setPeriodMonth('');
    setDueDate('');
    setAmount('');
    setStatus('UNPAID');
    setNote('');
    setPaidDate('');
  }

  return (
    <form className="panel form" onSubmit={handleSubmit}>
      <h2>Create Unit Due</h2>

      <label>
        Unit ID
        <input
          type="text"
          value={unitId}
          onChange={(event) => setUnitId(event.target.value)}
          required
        />
      </label>

      <label>
        Period Month
        <input
          type="date"
          value={periodMonth}
          onChange={(event) => setPeriodMonth(event.target.value)}
          required
        />
      </label>

      <label>
        Due Date
        <input
          type="date"
          value={dueDate}
          onChange={(event) => setDueDate(event.target.value)}
          required
        />
      </label>

      <label>
        Amount
        <input
          type="number"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          step="0.01"
          min="0.01"
          required
        />
      </label>

      <label>
        Status
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value as UnitDueStatus)}
        >
          <option value="UNPAID">UNPAID</option>
          <option value="PAID">PAID</option>
          <option value="WAIVED">WAIVED</option>
        </select>
      </label>

      <label>
        Paid Date
        <input
          type="date"
          value={paidDate}
          onChange={(event) => setPaidDate(event.target.value)}
        />
      </label>

      <label>
        Note
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={3}
        />
      </label>

      <button type="submit" disabled={loading}>
        {loading ? 'Saving...' : 'Add Unit Due'}
      </button>
    </form>
  );
}
