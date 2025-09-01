import React from 'react';

const PaymentStatus = ({ paymentStatus, isAdmin, isAdminLoading, onSaveAll, isSaving }) => {
  return (
    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-900">결제 상태</h3>
        {isAdmin && (
          <button
            onClick={onSaveAll}
            disabled={isSaving}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              isSaving
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
            }`}
          >
            {isSaving ? (
              <div className="flex items-center">
                <svg className="animate-spin -ml-1 mr-1 h-3 w-3 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                저장 중...
              </div>
            ) : (
              '모든 정보 저장'
            )}
          </button>
        )}
      </div>
      <div className="flex items-center space-x-4">
        {/* 선금 대기 상태 - 선금이 미완료인 경우에만 표시 */}
        {!paymentStatus.advance && (
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-yellow-400 mr-2"></div>
            <span className="text-sm text-gray-600">선금 대기</span>
          </div>
        )}
        
        {/* 잔금 대기 상태 - 선금이 완료된 경우에만 표시 */}
        {paymentStatus.advance && (
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full mr-2 ${
              paymentStatus.balance ? 'bg-green-400' : 'bg-blue-400'
            }`}></div>
            <span className="text-sm text-gray-600">잔금 대기</span>
          </div>
        )}
        
        {/* 결제 완료 상태 - 최종금액이 완료된 경우에만 표시 */}
        {paymentStatus.total && (
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-green-400 mr-2"></div>
            <span className="text-sm text-gray-600">결제 완료</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentStatus; 