
import type { MaintenanceRequest } from '../types/maintenance-request';

interface MaintenanceRequestsTableProps {
  requests: MaintenanceRequest[];
}

export function MaintenanceRequestsTable({
  requests,
}: MaintenanceRequestsTableProps) {
  return (
    <div className="panel">
      <h2>Maintenance Requests</h2>
      <table>
        <thead>
          <tr>
            <th>Title</th>
            <th>Scope</th>
            <th>Unit</th>
            <th>Status</th>
            <th>Priority</th>
            <th>Submitted By</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((request) => (
            <tr key={request.requestId}>
              <td>{request.title}</td>
              <td>{request.scope}</td>
              <td>{request.unit?.unitNumber ?? '-'}</td>
              <td>{request.status}</td>
              <td>{request.priority}</td>
              <td>{`${request.submittedBy.firstName} ${request.submittedBy.lastName}`}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {requests.length === 0 ? <p>No maintenance requests yet.</p> : null}
    </div>
  );
}
