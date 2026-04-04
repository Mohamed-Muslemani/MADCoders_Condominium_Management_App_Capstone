
import { useEffect, useState } from 'react';
import { createUnitOwner, getUnitOwners } from '../api/unitOwners';
import { UnitOwnersForm } from '../components/UnitOwnersForm';
import { UnitOwnersTable } from '../components/UnitOwnersTable';
import type { CreateUnitOwnerRequest, UnitOwner } from '../types/unit-owner';

export function UnitOwnersPage() {
  const [records, setRecords] = useState<UnitOwner[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function loadRecords() {
    try {
      setLoading(true);
      setError('');
      setRecords(await getUnitOwners());
    } catch {
      setError('Could not load unit owners');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(payload: CreateUnitOwnerRequest) {
    try {
      setSaving(true);
      setError('');
      await createUnitOwner(payload);
      await loadRecords();
    } catch {
      setError('Could not create unit owner');
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    void loadRecords();
  }, []);

  return (
    <section className="page-grid">
      <div>
        <h2>Unit Owners</h2>
        <p className="page-copy">Basic list and create flow for `/unit-owners`.</p>
        {error ? <p className="error">{error}</p> : null}
        {loading ? (
          <p>Loading unit owners...</p>
        ) : (
          <UnitOwnersTable records={records} />
        )}
      </div>

      <UnitOwnersForm loading={saving} onSubmit={handleCreate} />
    </section>
  );
}
