import React from 'react';
import { Calendar } from 'lucide-react';
import OrderCheck from './OrderCheck';
import FactoryShip from './FactoryShip';

const Schedule = ({ project, onDateChange, handleMultipleUpdates, isAdmin, isAdminLoading }) => {


  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* 헤더 */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <Calendar className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">납기 일정</h3>
        </div>
      </div>

      {/* 일정 테이블 */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                업무 단계
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                상태 확인
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                예상일
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                실제일
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                비고
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {/* 발주 확인 행 - OrderCheck 컴포넌트 사용 */}
            <OrderCheck 
              project={project} 
              onDateChange={onDateChange}
              handleMultipleUpdates={handleMultipleUpdates}
              isAdmin={isAdmin}
              isAdminLoading={isAdminLoading}
            />
            <FactoryShip
              project={project}
              onDateChange={onDateChange}
              handleMultipleUpdates={handleMultipleUpdates}
              isAdmin={isAdmin}
              isAdminLoading={isAdminLoading}
            />
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Schedule;