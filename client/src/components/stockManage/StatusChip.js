import React from 'react';

const StatusChip = ({ status, icon }) => {
  const getStatusConfig = (status) => {
    switch (status) {
      case '입고예정':
        return {
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-800',
          iconColor: 'text-gray-500',
          borderColor: 'border-gray-200'
        };
      case '입고중':
        return {
          bgColor: 'bg-orange-100',
          textColor: 'text-orange-800',
          iconColor: 'text-orange-500',
          borderColor: 'border-orange-200'
        };
      case '입고완료':
        return {
          bgColor: 'bg-green-100',
          textColor: 'text-green-800',
          iconColor: 'text-green-500',
          borderColor: 'border-green-200'
        };
      case '배송중':
        return {
          bgColor: 'bg-yellow-100',
          textColor: 'text-yellow-800',
          iconColor: 'text-yellow-500',
          borderColor: 'border-yellow-200'
        };
      case '도착완료':
        return {
          bgColor: 'bg-purple-100',
          textColor: 'text-purple-800',
          iconColor: 'text-purple-500',
          borderColor: 'border-purple-200'
        };
      default:
        return {
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-800',
          iconColor: 'text-gray-500',
          borderColor: 'border-gray-200'
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.bgColor} ${config.textColor} ${config.borderColor}`}>
      {icon && (
        <span className={`mr-1 ${config.iconColor}`}>
          {icon}
        </span>
      )}
      {status}
    </span>
  );
};

export default StatusChip;


