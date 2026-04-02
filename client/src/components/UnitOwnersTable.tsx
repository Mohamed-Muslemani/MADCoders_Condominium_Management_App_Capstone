import type { UnitOwner } from '../types/unit-owner';

interface UnitOwnersTableProps {
  records: UnitOwner[];
}

export function UnitOwnersTable({ records }: UnitOwnersTableProps) {
  return (
    <div className="panel">
      <h2>Unit Owners</h2>
      <table>
        <thead>
          <tr>
            <th>Unit</th>
            <th>Owner</th>
            <th>Email</th>
            <th>Start Date</th>
            <th>End Date</th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => (
            <tr key={record.unitOwnerId}>
              <td>{record.unit.unitNumber}</td>
              <td>{`${record.user.firstName} ${record.user.lastName}`}</td>
              <td>{record.user.email}</td>
              <td>{record.startDate.slice(0, 10)}</td>
              <td>{record.endDate ? record.endDate.slice(0, 10) : '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {records.length === 0 ? <p>No unit owner records yet.</p> : null}
    </div>
  );
}