import { useEffect, useState } from 'react';
import { createUnit, getUnits } from '../api/units';
import { UnitForm } from '../components/UnitForm';
import { UnitsTable } from '../components/UnitsTable';
import type { CreateUnitRequest, Unit } from '../types/unit';

export function UnitsPage() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function loadUnits() {
    try {
      setLoading(true);
      setError('');
      const data = await getUnits();
      setUnits(data);
    } catch {
      setError('Could not load units');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateUnit(payload: CreateUnitRequest) {
    try {
      setSaving(true);
      setError('');
      await createUnit(payload);
      await loadUnits();
    } catch {
      setError('Could not create unit');
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    void loadUnits();
  }, []);

  return (
    <section className="page-grid">
      <div>
        <h2>Units</h2>
        <p className="page-copy">Basic list and create flow for `/units`.</p>

        {error ? <p className="error">{error}</p> : null}
        {loading ? <p>Loading units...</p> : <UnitsTable units={units} />}
      </div>

      <UnitForm loading={saving} onSubmit={handleCreateUnit} />
    </section>
  );
}