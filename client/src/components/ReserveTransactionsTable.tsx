
import type { ReserveTransaction } from '../types/reserve-transaction';

interface ReserveTransactionsTableProps {
  transactions: ReserveTransaction[];
}

export function ReserveTransactionsTable({
  transactions,
}: ReserveTransactionsTableProps) {
  return (
    <div className="panel">
      <h2>Reserve Transactions</h2>
      <table>
        <thead>
          <tr>
            <th>Title</th>
            <th>Type</th>
            <th>Status</th>
            <th>Amount</th>
            <th>Date</th>
            <th>Category</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((transaction) => (
            <tr key={transaction.transactionId}>
              <td>{transaction.title}</td>
              <td>{transaction.type}</td>
              <td>{transaction.status}</td>
              <td>{transaction.amount}</td>
              <td>
                {transaction.transactionDate?.slice(0, 10) ??
                  transaction.expectedDate?.slice(0, 10) ??
                  '-'}
              </td>
              <td>{transaction.category?.name ?? '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {transactions.length === 0 ? <p>No reserve transactions yet.</p> : null}
    </div>
  );
}
