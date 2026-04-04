import { useState, type FormEvent } from 'react';
import type {
  CreateMaintenanceRequestRequest,
  MaintenancePriority,
  MaintenanceScope,
  MaintenanceStatus,
} from '../types/maintenance-request';

interface MaintenanceRequestsFormProps {
  loading?: boolean;
  onSubmit: (payload: CreateMaintenanceRequestRequest) => Promise<void>;
}

export function MaintenanceRequestsForm({
  loading,
  onSubmit,
}: MaintenanceRequestsFormProps) {
  const [scope, setScope] = useState<MaintenanceScope>('BUILDING');
  const [unitId, setUnitId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<MaintenanceStatus>('OPEN');
  const [priority, setPriority] = useState<MaintenancePriority>('MEDIUM');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    await onSubmit({
      scope,
      unitId: scope === 'UNIT' ? unitId : undefined,
      title,
      description,
      status,
      priority,
    });

    setScope('BUILDING');
    setUnitId('');
    setTitle('');
    setDescription('');
    setStatus('OPEN');
    setPriority('MEDIUM');
  }

  return (
    <form className="panel form" onSubmit={handleSubmit}>
      <h2>Create Maintenance Request</h2>

      <label>
        Scope
        <select
          value={scope}
          onChange={(event) => setScope(event.target.value as MaintenanceScope)}
        >
          <option value="BUILDING">BUILDING</option>
          <option value="UNIT">UNIT</option>
        </select>
      </label>

      <label>
        Unit ID
        <input
          type="text"
          value={unitId}
          onChange={(event) => setUnitId(event.target.value)}
          disabled={scope !== 'UNIT'}
          required={scope === 'UNIT'}
        />
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
          rows={5}
          required
        />
      </label>

      <label>
        Status
        <select
          value={status}
          onChange={(event) =>
            setStatus(event.target.value as MaintenanceStatus)
          }
        >
          <option value="OPEN">OPEN</option>
          <option value="IN_PROGRESS">IN_PROGRESS</option>
          <option value="COMPLETED">COMPLETED</option>
          <option value="CLOSED">CLOSED</option>
        </select>
      </label>

      <label>
        Priority
        <select
          value={priority}
          onChange={(event) =>
            setPriority(event.target.value as MaintenancePriority)
          }
        >
          <option value="LOW">LOW</option>
          <option value="MEDIUM">MEDIUM</option>
          <option value="HIGH">HIGH</option>
        </select>
      </label>

      <button type="submit" disabled={loading}>
        {loading ? 'Saving...' : 'Add Request'}
      </button>
    </form>
  );
}