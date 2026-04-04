
import { useEffect, useState } from 'react';
import { createUnitDue, getUnitDues } from '../api/unitDues';
import { UnitDuesForm } from '../components/UnitDuesForm';
import { UnitDuesTable } from '../components/UnitDuesTable';
import type { CreateUnitDueRequest, UnitDue } from '../types/unit-due';

export function UnitDuesPage() {
  const [dues, setDues] = useState<UnitDue[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function loadDues() {
    try {
      setLoading(true);
      setError('');
      setDues(await getUnitDues());
    } catch {
      setError('Could not load unit dues');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(payload: CreateUnitDueRequest) {
    try {
      setSaving(true);
      setError('');
      await createUnitDue(payload);
      await loadDues();
    } catch {
      setError('Could not create unit due');
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    void loadDues();
  }, []);

  return (
    <section className="page-grid">
      <div>
        <h2>Unit Dues</h2>
        <p className="page-copy">Basic list and create flow for `/unit-dues`.</p>
        {error ? <p className="error">{error}</p> : null}
        {loading ? <p>Loading unit dues...</p> : <UnitDuesTable dues={dues} />}
      </div>

      <UnitDuesForm loading={saving} onSubmit={handleCreate} />
    </section>
  );
}
