import React from 'react';

const QuantityDisplay = ({ 
  value, 
  color = 'text-gray-900', 
  fontWeight = 'font-normal',
  showZero = true 
}) => {
  if (!showZero && value === 0) {
    return (
      <span className={`text-sm ${color} ${fontWeight} text-gray-400`}>
        -
      </span>
    );
  }

  return (
    <span className={`text-sm ${color} ${fontWeight}`}>
      {value.toLocaleString()}
    </span>
  );
};

export default QuantityDisplay;


