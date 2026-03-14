import type { Unit } from '../types/unit';

interface UnitsTableProps {
  units: Unit[];
}

export function UnitsTable({ units }: UnitsTableProps) {
  return (
    <div className="panel">
      <h2>Units</h2>
      <table>
        <thead>
          <tr>
            <th>Unit</th>
            <th>Status</th>
            <th>Monthly Fee</th>
            <th>Floor</th>
            <th>Bedrooms</th>
          </tr>
        </thead>
        <tbody>
          {units.map((unit) => (
            <tr key={unit.unitId}>
              <td>{unit.unitNumber}</td>
              <td>{unit.status}</td>
              <td>{unit.monthlyFee}</td>
              <td>{unit.floor ?? '-'}</td>
              <td>{unit.bedrooms ?? '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {units.length === 0 ? <p>No units yet.</p> : null}
    </div>
  );
}
