import React from 'react';
import { TrendingUp, TrendingDown, Calendar, PieChart, BarChart3 } from 'lucide-react';

const FinanceChart = ({ transactions }) => {
  // 월별 데이터 집계
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

  // 카테고리별 데이터 집계
  const categoryData = transactions.reduce((acc, t) => {
    if (!acc[t.category]) {
      acc[t.category] = { income: 0, expense: 0 };
    }
    if (t.type === 'income') {
      acc[t.category].income += t.amount;
    } else {
      acc[t.category].expense += Math.abs(t.amount);
    }
    return acc;
  }, {});

  // 수입/지출 비율 계산
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const total = totalIncome + totalExpense;
  const incomePercentage = total > 0 ? (totalIncome / total) * 100 : 0;
  const expensePercentage = total > 0 ? (totalExpense / total) * 100 : 0;

  // 간단한 막대 차트 컴포넌트
  const SimpleBarChart = ({ data, labels, maxValue, color }) => {
    return (
      <div className="space-y-2">
        {labels.map((label, index) => {
          const value = data[label];
          const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
          
          return (
            <div key={label} className="flex items-center space-x-3">
              <div className="w-16 text-xs text-gray-600 truncate">
                {label.substring(5)}월
              </div>
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${color}`}
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
              <div className="w-20 text-xs text-gray-900 text-right">
                {value.toLocaleString()}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // 원형 차트 컴포넌트
  const SimplePieChart = ({ income, expense }) => {
    const total = income + expense;
    const incomeAngle = total > 0 ? (income / total) * 360 : 0;
    const expenseAngle = total > 0 ? (expense / total) * 360 : 0;

    return (
      <div className="flex items-center justify-center space-x-8">
        <div className="relative w-32 h-32">
          <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
            {/* 수입 부분 */}
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke="#10b981"
              strokeWidth="20"
              strokeDasharray={`${(incomeAngle / 360) * 251.2} 251.2`}
            />
            {/* 지출 부분 */}
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke="#ef4444"
              strokeWidth="20"
              strokeDasharray={`${(expenseAngle / 360) * 251.2} 251.2`}
              strokeDashoffset={-((incomeAngle / 360) * 251.2)}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-lg font-bold text-gray-900">
                {total.toLocaleString()}
              </div>
              <div className="text-xs text-gray-600">총액</div>
            </div>
          </div>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-green-500 rounded-full"></div>
            <span className="text-sm text-gray-700">수입: {incomePercentage.toFixed(1)}%</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-red-500 rounded-full"></div>
            <span className="text-sm text-gray-700">지출: {expensePercentage.toFixed(1)}%</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">재무 차트</h3>
        <p className="text-sm text-gray-600">
          수입/지출 현황을 시각적으로 분석합니다.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 수입/지출 비율 차트 */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-gray-900 flex items-center">
              <PieChart className="w-5 h-5 text-purple-600 mr-2" />
              수입/지출 비율
            </h4>
          </div>
          <SimplePieChart income={totalIncome} expense={totalExpense} />
        </div>

        {/* 월별 수입 추이 */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-gray-900 flex items-center">
              <TrendingUp className="w-5 h-5 text-green-600 mr-2" />
              월별 수입 추이
            </h4>
          </div>
          <SimpleBarChart
            data={monthlyData}
            labels={monthlyLabels}
            maxValue={Math.max(...monthlyLabels.map(m => monthlyData[m].income))}
            color="bg-green-500"
          />
        </div>

        {/* 월별 지출 추이 */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-gray-900 flex items-center">
              <TrendingDown className="w-5 h-5 text-red-600 mr-2" />
              월별 지출 추이
            </h4>
          </div>
          <SimpleBarChart
            data={monthlyData}
            labels={monthlyLabels}
            maxValue={Math.max(...monthlyLabels.map(m => monthlyData[m].expense))}
            color="bg-red-500"
          />
        </div>

        {/* 카테고리별 분석 */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-gray-900 flex items-center">
              <BarChart3 className="w-5 h-5 text-blue-600 mr-2" />
              카테고리별 분석
            </h4>
          </div>
          <div className="space-y-3">
            {Object.entries(categoryData).map(([category, data]) => {
              const total = data.income + data.expense;
              const maxValue = Math.max(...Object.values(categoryData).map(d => d.income + d.expense));
              const percentage = maxValue > 0 ? (total / maxValue) * 100 : 0;
              
              return (
                <div key={category} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">{category}</span>
                    <span className="text-sm text-gray-900">{total.toLocaleString()}원</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-blue-500"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-500 w-12 text-right">
                      {percentage.toFixed(1)}%
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>수입: {data.income.toLocaleString()}원</span>
                    <span>지출: {data.expense.toLocaleString()}원</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 요약 통계 */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-green-50 p-4 rounded-lg border border-green-200 text-center">
          <div className="text-2xl font-bold text-green-600">
            {totalIncome.toLocaleString()}
          </div>
          <div className="text-sm text-green-600">총 수입</div>
        </div>
        <div className="bg-red-50 p-4 rounded-lg border border-red-200 text-center">
          <div className="text-2xl font-bold text-red-600">
            {totalExpense.toLocaleString()}
          </div>
          <div className="text-sm text-red-600">총 지출</div>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 text-center">
          <div className={`text-2xl font-bold ${totalIncome - totalExpense >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
            {(totalIncome - totalExpense).toLocaleString()}
          </div>
          <div className="text-sm text-blue-600">순이익</div>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200 text-center">
          <div className="text-2xl font-bold text-purple-600">
            {transactions.length}
          </div>
          <div className="text-sm text-purple-600">거래건수</div>
        </div>
      </div>
    </div>
  );
};

export default FinanceChart; 