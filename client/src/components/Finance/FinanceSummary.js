import React from 'react';
import { TrendingUp, TrendingDown, DollarSign, Calendar, PieChart } from 'lucide-react';

const FinanceSummary = ({ transactions, totalIncome, totalExpense, netIncome }) => {
  // 카테고리별 수입 분석
  const incomeByCategory = transactions
    .filter(t => t.type === 'income')
    .reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {});

  // 카테고리별 지출 분석
  const expenseByCategory = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + Math.abs(t.amount);
      return acc;
    }, {});

  // 월별 수입/지출 분석
  const monthlyData = transactions.reduce((acc, t) => {
    const month = t.date.substring(0, 7); // YYYY-MM
    if (!acc[month]) {
      acc[month] = { income: 0, expense: 0 };
    }
    if (t.type === 'income') {
      acc[month].income += t.amount;
    } else {
      acc[month].expense += Math.abs(t.amount);
    }
    return acc;
  }, {});

  const monthlyLabels = Object.keys(monthlyData).sort().slice(-6); // 최근 6개월

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 수입 분석 */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <TrendingUp className="w-5 h-5 text-green-600 mr-2" />
              수입 분석
            </h3>
            <span className="text-2xl font-bold text-green-600">
              {totalIncome.toLocaleString()}원
            </span>
          </div>
          
          <div className="space-y-3">
            {Object.entries(incomeByCategory).map(([category, amount]) => (
              <div key={category} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{category}</span>
                <span className="text-sm font-medium text-green-600">
                  {amount.toLocaleString()}원
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 지출 분석 */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <TrendingDown className="w-5 h-5 text-red-600 mr-2" />
              지출 분석
            </h3>
            <span className="text-2xl font-bold text-red-600">
              {totalExpense.toLocaleString()}원
            </span>
          </div>
          
          <div className="space-y-3">
            {Object.entries(expenseByCategory).map(([category, amount]) => (
              <div key={category} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{category}</span>
                <span className="text-sm font-medium text-red-600">
                  {amount.toLocaleString()}원
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 월별 추이 */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Calendar className="w-5 h-5 text-blue-600 mr-2" />
              월별 수입/지출 추이
            </h3>
          </div>
          
          <div className="grid grid-cols-6 gap-4">
            {monthlyLabels.map(month => {
              const data = monthlyData[month];
              const monthLabel = month.substring(5); // MM만 표시
              return (
                <div key={month} className="text-center">
                  <div className="text-sm font-medium text-gray-600 mb-2">{monthLabel}월</div>
                  <div className="space-y-1">
                    <div className="text-xs text-green-600">
                      +{data.income.toLocaleString()}
                    </div>
                    <div className="text-xs text-red-600">
                      -{data.expense.toLocaleString()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 재무 지표 */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <PieChart className="w-5 h-5 text-purple-600 mr-2" />
              재무 지표
            </h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {totalIncome > 0 ? ((totalIncome / (totalIncome + totalExpense)) * 100).toFixed(1) : 0}%
              </div>
              <div className="text-sm text-green-600">수입 비율</div>
            </div>
            
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {totalExpense > 0 ? ((totalExpense / (totalIncome + totalExpense)) * 100).toFixed(1) : 0}%
              </div>
              <div className="text-sm text-red-600">지출 비율</div>
            </div>
            
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {totalIncome > 0 ? ((netIncome / totalIncome) * 100).toFixed(1) : 0}%
              </div>
              <div className="text-sm text-blue-600">수익률</div>
            </div>
            
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {transactions.length}
              </div>
              <div className="text-sm text-purple-600">총 거래건수</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinanceSummary; 