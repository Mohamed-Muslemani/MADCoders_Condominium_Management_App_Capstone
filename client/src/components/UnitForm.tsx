import { useState, type FormEvent } from 'react';
import type { CreateUnitRequest, UnitStatus } from '../types/unit';

interface UnitFormProps {
  loading?: boolean;
  onSubmit: (payload: CreateUnitRequest) => Promise<void>;
}

export function UnitForm({ loading, onSubmit }: UnitFormProps) {
  const [unitNumber, setUnitNumber] = useState('');
  const [monthlyFee, setMonthlyFee] = useState('');
  const [status, setStatus] = useState<UnitStatus>('ACTIVE');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    await onSubmit({
      unitNumber,
      monthlyFee: Number(monthlyFee),
      status,
    });

    setUnitNumber('');
    setMonthlyFee('');
    setStatus('ACTIVE');
  }

  return (
    <form className="panel form" onSubmit={handleSubmit}>
      <h2>Create Unit</h2>

      <label>
        Unit Number
        <input
          type="text"
          value={unitNumber}
          onChange={(e) => setUnitNumber(e.target.value)}
          required
        />
      </label>

      <label>
        Monthly Fee
        <input
          type="number"
          value={monthlyFee}
          onChange={(e) => setMonthlyFee(e.target.value)}
          min="0"
          step="0.01"
          required
        />
      </label>

      <label>
        Status
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as UnitStatus)}
        >
          <option value="ACTIVE">ACTIVE</option>
          <option value="INACTIVE">INACTIVE</option>
        </select>
      </label>

      <button type="submit" disabled={loading}>
        {loading ? 'Saving...' : 'Add Unit'}
      </button>
    </form>
  );
}