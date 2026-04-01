import type { UnitDue } from '../types/unit-due';

interface UnitDuesTableProps {
  dues: UnitDue[];
}

export function UnitDuesTable({ dues }: UnitDuesTableProps) {
  return (
    <div className="panel">
      <h2>Unit Dues</h2>
      <table>
        <thead>
          <tr>
            <th>Unit</th>
            <th>Period</th>
            <th>Due Date</th>
            <th>Status</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          {dues.map((due) => (
            <tr key={due.dueId}>
              <td>{due.unit.unitNumber}</td>
              <td>{due.periodMonth.slice(0, 10)}</td>
              <td>{due.dueDate.slice(0, 10)}</td>
              <td>{due.status}</td>
              <td>{due.amount}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {dues.length === 0 ? <p>No unit dues yet.</p> : null}
    </div>
  );
}