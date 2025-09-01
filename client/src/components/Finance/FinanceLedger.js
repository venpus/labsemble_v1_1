import React, { useState } from 'react';
import { Calendar, DollarSign, FileText, Eye, Edit, Trash2 } from 'lucide-react';

const FinanceLedger = ({ transactions, loading }) => {
  const [sortField, setSortField] = useState('date');
  const [sortDirection, setSortDirection] = useState('desc');

  // 정렬된 거래내역
  const sortedTransactions = [...transactions].sort((a, b) => {
    let aValue, bValue;
    
    switch (sortField) {
      case 'date':
        aValue = new Date(a.date);
        bValue = new Date(b.date);
        break;
      case 'amount':
        aValue = Math.abs(Number(a.amount)) || 0;
        bValue = Math.abs(Number(b.amount)) || 0;
        break;
      case 'description':
        aValue = a.description.toLowerCase();
        bValue = b.description.toLowerCase();
        break;
      case 'category':
        aValue = a.category.toLowerCase();
        bValue = b.category.toLowerCase();
        break;
      default:
        aValue = a[sortField];
        bValue = b[sortField];
    }

    if (sortDirection === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return null;
    return (
      <span className="ml-1">
        {sortDirection === 'asc' ? '↑' : '↓'}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">장부 보기</h3>
        <p className="text-sm text-gray-600">
          총 {transactions.length}건의 거래내역이 있습니다.
        </p>
      </div>

      {/* 장부 테이블 */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200 rounded-lg">
          <thead className="bg-gray-50">
            <tr>
              <th 
                className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 border border-gray-300"
                onClick={() => handleSort('date')}
              >
                <div className="flex items-center justify-center">
                  <Calendar className="w-4 h-4 mr-1" />
                  날짜
                  <SortIcon field="date" />
                </div>
              </th>
              <th 
                className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 border border-gray-300"
                onClick={() => handleSort('amount')}
              >
                <div className="flex items-center justify-center">
                  <DollarSign className="w-4 h-4 mr-1" />
                  입금 금액
                  <SortIcon field="amount" />
                </div>
              </th>
              <th 
                className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 border border-gray-300"
                onClick={() => handleSort('amount')}
              >
                <div className="flex items-center justify-center">
                  <DollarSign className="w-4 h-4 mr-1" />
                  지출 금액
                  <SortIcon field="amount" />
                </div>
              </th>
              <th 
                className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 border border-gray-300"
                onClick={() => handleSort('description')}
              >
                <div className="flex items-center justify-center">
                  <FileText className="w-4 h-4 mr-1" />
                  항목
                  <SortIcon field="description" />
                </div>
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">
                잔액
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">
                비고
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {sortedTransactions.map((transaction, index) => (
              <tr key={transaction.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 whitespace-nowrap text-center border border-gray-300">
                  <div className="text-sm font-medium text-gray-900">
                    {new Date(transaction.date).toLocaleDateString('ko-KR', { 
                      year: 'numeric', 
                      month: '2-digit', 
                      day: '2-digit' 
                    }).replace(/\. /g, '.').replace(/ /g, '')}({new Date(transaction.date).toLocaleDateString('ko-KR', { weekday: 'short' })})
                  </div>
                </td>
                <td className="px-3 py-2 text-center border border-gray-300">
                  <div className={`text-sm font-medium ${
                    transaction.type === 'income' ? 'text-green-600' : 'text-gray-400'
                  }`}>
                    {transaction.type === 'income' ? `¥${Number(transaction.amount).toLocaleString()} CNY` : '-'}
                  </div>
                </td>
                <td className="px-3 py-2 text-center border border-gray-300">
                  <div className={`text-sm font-medium ${
                    transaction.type === 'expense' ? 'text-red-600' : 'text-gray-400'
                  }`}>
                    {transaction.type === 'expense' ? `¥${Number(Math.abs(transaction.amount)).toLocaleString()} CNY` : '-'}
                  </div>
                </td>
                <td className="px-3 py-2 text-center border border-gray-300">
                  <div className="text-sm font-medium text-gray-900">
                    {transaction.description}
                  </div>
                </td>
                <td className="px-3 py-2 text-center border border-gray-300">
                  <div className="text-sm font-medium text-gray-900">
                    ¥{Number(transaction.balance).toLocaleString()} CNY
                  </div>
                </td>
                <td className="px-3 py-2 text-center border border-gray-300">
                  <div className="text-sm text-gray-600 max-w-xs truncate" title={transaction.notes}>
                    {transaction.notes || '-'}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default FinanceLedger; 