import React from 'react';

const PaymentTableRow = ({ label, description, value, color, isHighlighted }) => {
  const getColorClasses = (color) => {
    const colorMap = {
      blue: 'bg-blue-600',
      green: 'bg-green-600',
      yellow: 'bg-yellow-600',
      purple: 'bg-purple-600',
      orange: 'bg-orange-600',
      red: 'bg-red-600',
      gray: 'bg-gray-600'
    };
    return colorMap[color] || 'bg-gray-600';
  };

  const getHighlightClasses = (isHighlighted) => {
    if (isHighlighted) {
      return 'bg-blue-50';
    }
    return 'hover:bg-gray-50';
  };

  return (
    <tr className={`${getHighlightClasses(isHighlighted)}`}>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <div className={`w-4 h-4 mr-3 rounded-full ${getColorClasses(color)}`}></div>
          <span className="text-sm font-medium text-gray-900">{label}</span>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-900">
          <span className="font-medium">{description}</span>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right">
        <div className="text-sm font-semibold text-gray-900">
          {value}
        </div>
      </td>
    </tr>
  );
};

export default PaymentTableRow; 