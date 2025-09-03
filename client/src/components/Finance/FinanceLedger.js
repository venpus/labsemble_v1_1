import React, { useState } from 'react';
import { Calendar, DollarSign, FileText } from 'lucide-react';

const FinanceLedger = ({ transactions, loading }) => {
  const [showPaymentOnly, setShowPaymentOnly] = useState(false);

  // Payment 관련 거래 필터링
  const filteredTransactions = showPaymentOnly 
    ? transactions.filter(transaction => transaction.payment_type)
    : transactions;

  // 날짜순 오름차순 정렬 (오래된 날짜부터)
  const sortedTransactions = [...filteredTransactions].sort((a, b) => {
    const aDate = new Date(a.date);
    const bDate = new Date(b.date);
    return aDate - bDate; // 오름차순 정렬
  });

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
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-semibold text-gray-900">장부 보기</h3>
          <div className="flex items-center space-x-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={showPaymentOnly}
                onChange={(e) => setShowPaymentOnly(e.target.checked)}
                className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-600">Payment 관련 거래만 보기</span>
            </label>
          </div>
        </div>
        <p className="text-sm text-gray-600">
          총 {filteredTransactions.length}건의 거래내역이 있습니다.
          {showPaymentOnly && (
            <span className="ml-2 text-blue-600">
              (Payment 관련: {transactions.filter(t => t.payment_type).length}건)
            </span>
          )}
        </p>
      </div>

      {/* 장부 테이블 */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200 rounded-lg">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">
                <div className="flex items-center justify-center">
                  <Calendar className="w-4 h-4 mr-1" />
                  날짜
                </div>
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">
                <div className="flex items-center justify-center">
                  <DollarSign className="w-4 h-4 mr-1" />
                  입금 금액
                </div>
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">
                <div className="flex items-center justify-center">
                  <DollarSign className="w-4 h-4 mr-1" />
                  지출 금액
                </div>
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">
                <div className="flex items-center justify-center">
                  <FileText className="w-4 h-4 mr-1" />
                  항목
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
              <tr key={transaction.id} className={`hover:bg-gray-50 ${
                transaction.payment_type ? 'bg-blue-50' : ''
              }`}>
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
                    {transaction.notes || ''}
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