import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createUnit, getUnits } from '../api/units';
import { UnitForm } from '../components/UnitForm';
import { UnitsTable } from '../components/UnitsTable';
import { useAuth } from '../context/AuthContext';
import type { CreateUnitRequest, Unit } from '../types/unit';

export function UnitsPage() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { clearToken } = useAuth();

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

  function handleLogout() {
    clearToken();
    navigate('/login', { replace: true });
  }

  useEffect(() => {
    void loadUnits();
  }, []);

  return (
    <main className="page">
      <header className="toolbar">
        <h1>Units Management</h1>
        <button onClick={handleLogout}>Logout</button>
      </header>

      {error ? <p className="error">{error}</p> : null}
      {loading ? <p>Loading units...</p> : <UnitsTable units={units} />}

      <UnitForm loading={saving} onSubmit={handleCreateUnit} />
    </main>
  );
}
