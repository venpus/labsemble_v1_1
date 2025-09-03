import React from 'react';
import { Truck } from 'lucide-react';

const DeliveryHeader = ({ project }) => {
  return (
    <div className="border-b border-gray-200 pb-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <Truck className="w-5 h-5 mr-2 text-blue-600" />
            납기 일정
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            프로젝트의 발주 및 공장 출고 일정을 관리할 수 있습니다.
          </p>
        </div>
      </div>
    </div>
  );
};

export default DeliveryHeader; 