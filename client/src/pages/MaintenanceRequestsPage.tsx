import { useEffect, useState } from 'react';
import {
  createMaintenanceRequest,
  getMaintenanceRequests,
} from '../api/maintenanceRequests';
import { MaintenanceRequestsForm } from '../components/MaintenanceRequestsForm';
import { MaintenanceRequestsTable } from '../components/MaintenanceRequestsTable';
import type {
  CreateMaintenanceRequestRequest,
  MaintenanceRequest,
} from '../types/maintenance-request';

export function MaintenanceRequestsPage() {
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function loadRequests() {
    try {
      setLoading(true);
      setError('');
      setRequests(await getMaintenanceRequests());
    } catch {
      setError('Could not load maintenance requests');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(payload: CreateMaintenanceRequestRequest) {
    try {
      setSaving(true);
      setError('');
      await createMaintenanceRequest(payload);
      await loadRequests();
    } catch {
      setError('Could not create maintenance request');
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    void loadRequests();
  }, []);

  return (
    <section className="page-grid">
      <div>
        <h2>Maintenance Requests</h2>
        <p className="page-copy">
          Basic list and create flow for `/maintenance-requests`.
        </p>
        {error ? <p className="error">{error}</p> : null}
        {loading ? (
          <p>Loading maintenance requests...</p>
        ) : (
          <MaintenanceRequestsTable requests={requests} />
        )}
      </div>

      <MaintenanceRequestsForm loading={saving} onSubmit={handleCreate} />
    </section>
  );
}