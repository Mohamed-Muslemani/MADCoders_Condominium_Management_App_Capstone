import { useState, type FormEvent } from 'react';
import type { CreateUnitOwnerRequest } from '../types/unit-owner';

interface UnitOwnersFormProps {
  loading?: boolean;
  onSubmit: (payload: CreateUnitOwnerRequest) => Promise<void>;
}

export function UnitOwnersForm({ loading, onSubmit }: UnitOwnersFormProps) {
  const [unitId, setUnitId] = useState('');
  const [userId, setUserId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    await onSubmit({
      unitId,
      userId,
      startDate,
      endDate: endDate || undefined,
    });

    setUnitId('');
    setUserId('');
    setStartDate('');
    setEndDate('');
  }

  return (
    <form className="panel form" onSubmit={handleSubmit}>
      <h2>Create Unit Owner</h2>

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
        User ID
        <input
          type="text"
          value={userId}
          onChange={(event) => setUserId(event.target.value)}
          required
        />
      </label>

      <label>
        Start Date
        <input
          type="date"
          value={startDate}
          onChange={(event) => setStartDate(event.target.value)}
          required
        />
      </label>

      <label>
        End Date
        <input
          type="date"
          value={endDate}
          onChange={(event) => setEndDate(event.target.value)}
        />
      </label>

      <button type="submit" disabled={loading}>
        {loading ? 'Saving...' : 'Add Unit Owner'}
      </button>
    </form>
  );
}