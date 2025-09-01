import React from 'react';

const PaymentSummaryCard = ({
  title,
  amount,
  icon: Icon,
  iconColor,
  bgColor,
  borderColor,
  textColor,
  isChecked,
  onCheckChange,
  isAdmin,
  isAdminLoading,
  showPaymentDate,
  paymentDate,
  showDueDate,
  dueDate,
  onDueDateChange,
  additionalInfo,
  disabled = false,
  disabledText,
  showDueDateWarning = false,
  dueDateWarningText = "결제 예정일을 먼저 설정해주세요"
}) => {
  return (
    <div className={`${bgColor} p-4 rounded-lg border ${borderColor}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Icon className={`w-5 h-5 ${iconColor} mr-2`} />
          <span className={`text-sm font-medium ${textColor}`}>{title}</span>
        </div>
        <label className={`flex items-center ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
          <input
            type="checkbox"
            checked={isChecked}
            onChange={onCheckChange}
            disabled={disabled || !isAdmin || isAdminLoading}
            className={`w-4 h-4 ${iconColor.replace('text-', 'text-')} bg-gray-100 border-gray-300 rounded focus:ring-2 focus:ring-offset-2 ${
              disabled || !isAdmin || isAdminLoading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          />
          <span className={`ml-2 text-xs ${disabled ? textColor.replace('900', '500') : textColor.replace('900', '700')}`}>
            {disabled ? disabledText : '결제완료'}
          </span>
        </label>
      </div>
      
      <div className={`text-2xl font-bold ${textColor} mt-2`}>
        ¥{amount.toLocaleString()}
      </div>

      {/* 추가 정보 표시 (잔금 카드의 경우) */}
      {additionalInfo && (
        <div className="text-xs text-orange-600 mt-1">
          {additionalInfo}
        </div>
      )}

      {/* 결제 예정일 관리 (잔금 카드의 경우) */}
      {showDueDate && (
        <div className="mt-3 pt-3 border-t border-orange-200">
          <div className="flex items-center mb-2">
            <div className="w-2 h-2 rounded-full bg-orange-400 mr-2"></div>
            <span className="text-xs font-medium text-orange-800">결제 예정일 관리</span>
          </div>
          
          {/* 결제 예정일 경고 메시지 */}
          {showDueDateWarning && (
            <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded-md">
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-red-400 mr-2"></div>
                <span className="text-xs text-red-700 font-medium">{dueDateWarningText}</span>
              </div>
            </div>
          )}
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-xs text-orange-700 font-medium">결제 예정일</span>
              {dueDate && (
                <span className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded-full">
                  설정됨
                </span>
              )}
            </div>
            <input
              type="date"
              value={dueDate || ''}
              onChange={(e) => onDueDateChange(e.target.value)}
              onBlur={(e) => {
                // 포커스를 벗어날 때 자동 저장 로그
                if (e.target.value) {
                  console.log('결제 예정일 자동 저장:', e.target.value);
                }
              }}
              className={`text-xs px-2 py-1 border rounded focus:outline-none focus:ring-2 transition-colors ${
                dueDate 
                  ? 'border-orange-400 bg-orange-50 text-orange-900 focus:ring-orange-500 focus:border-orange-500' 
                  : 'border-orange-300 bg-white text-orange-900 focus:ring-orange-500 focus:border-orange-500'
              }`}
              min={new Date().toISOString().split('T')[0]}
              placeholder="날짜 선택"
            />
          </div>
        </div>
      )}

      {/* 결제 확정일 표시 */}
      {showPaymentDate && paymentDate && (
        <div className={`mt-3 pt-3 border-t ${
          title === '선금' ? 'border-blue-200' : 
          title === '잔금' ? 'border-orange-200' : 
          'border-green-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-medium ${
              title === '선금' ? 'text-blue-700' : 
              title === '잔금' ? 'text-orange-700' : 
              'text-green-700'
            }`}>
              결제 확정일
            </span>
            <span className={`text-xs font-semibold ${
              title === '선금' ? 'text-blue-600' : 
              title === '잔금' ? 'text-orange-600' : 
              'text-green-600'
            }`}>
              {paymentDate}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentSummaryCard; 