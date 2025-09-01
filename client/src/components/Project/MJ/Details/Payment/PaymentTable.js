import React from 'react';
import { Lock } from 'lucide-react';
import PaymentTableRow from './PaymentTableRow';
import AdditionalCostManager from './AdditionalCostManager';

const PaymentTable = ({
  project,
  paymentData,
  isAdmin,
  isAdminLoading,
  onUnitPriceChange,
  onFeeRateChange,
  onPaymentDataUpdate,
  onAdditionalCostSave
}) => {
  const {
    editableUnitPrice,
    editableShippingCost,
    editableSubtotal,
    selectedFeeRate,
    editableFee,
    additionalCostItems,
    totalAdditionalCosts,
    totalAmount
  } = paymentData;

  const quantity = project.quantity || 0;

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {!isAdminLoading && !isAdmin && (
        <div className="p-4 bg-yellow-50 border-b border-yellow-200">
          <div className="flex items-center">
            <Lock className="w-4 h-4 mr-2 text-yellow-600" />
            <span className="text-sm text-yellow-800">
              결제 정보 수정은 admin 권한이 필요합니다. 현재 읽기 전용 모드입니다.
            </span>
          </div>
        </div>
      )}
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <tbody className="bg-white divide-y divide-gray-200">
            {/* 단가와 수량 */}
            <PaymentTableRow
              label="단가 & 수량"
              description={`1개당 × ${quantity.toLocaleString()}개`}
              value={
                !isAdminLoading && isAdmin ? (
                  <input
                    type="number"
                    value={editableUnitPrice}
                    placeholder="0.00"
                    onChange={(e) => {
                      // onChange에서는 로컬 상태만 업데이트 (즉시 저장하지 않음)
                      const newValue = e.target.value === '' ? '' : Number(e.target.value) || 0;
                      onPaymentDataUpdate({ editableUnitPrice: newValue });
                    }}
                    onBlur={(e) => {
                      // 포커스를 벗어날 때 자동 저장
                      const newValue = Number(e.target.value) || 0;
                      // onUnitPriceChange만 호출 (중복 호출 방지)
                      onUnitPriceChange(newValue);
                    }}
                    className="w-28 px-2 py-1 text-right border border-gray-300 rounded bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    min="0"
                    step="0.01"
                  />
                ) : !isAdminLoading ? (
                  <span className="text-sm text-gray-900">
                    ¥{editableUnitPrice.toLocaleString()}
                  </span>
                ) : (
                  <span className="text-sm text-gray-400">권한 확인 중...</span>
                )
              }
              color="blue"
              isHighlighted={false}
            />

            {/* 총계 */}
            <PaymentTableRow
              label="총계"
              description="단가 × 수량"
              value={<span className="text-lg font-bold text-blue-900">¥{editableSubtotal.toLocaleString()}</span>}
              color="yellow"
              isHighlighted={true}
            />

            {/* 공장 배송비 */}
            <PaymentTableRow
              label="공장 배송비"
              description="공장에서 배송지까지"
              value={
                !isAdminLoading && isAdmin ? (
                  <input
                    type="number"
                    value={editableShippingCost}
                    placeholder="0.00"
                    onChange={(e) => {
                      // onChange에서는 로컬 상태만 업데이트
                      const newValue = e.target.value === '' ? '' : Number(e.target.value) || 0;
                      onPaymentDataUpdate({ editableShippingCost: newValue });
                    }}
                    onBlur={(e) => {
                      // 포커스를 벗어날 때 자동 저장
                      const newValue = Number(e.target.value) || 0;
                      // 공장 배송비 변경 시 자동 저장 함수 호출
                      onPaymentDataUpdate({ editableShippingCost: newValue });
                    }}
                    className="w-28 px-2 py-1 text-right border border-gray-300 rounded bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
                    min="0"
                    step="0.01"
                  />
                ) : !isAdminLoading ? (
                  <span className="text-sm text-gray-900">
                    ¥{editableShippingCost.toLocaleString()}
                  </span>
                ) : (
                  <span className="text-sm text-gray-400">권한 확인 중...</span>
                )
              }
              color="purple"
              isHighlighted={false}
            />

            {/* 수수료 */}
            <PaymentTableRow
              label="수수료"
              description={
                <div className="flex flex-wrap gap-3">
                  {!isAdminLoading && isAdmin ? (
                    [0, 5, 7, 8, 10].map((rate) => (
                      <label key={rate} className="flex items-center cursor-pointer p-2 rounded hover:bg-orange-50 transition-colors">
                        <input
                          type="radio"
                          name="feeRate"
                          value={rate}
                          checked={selectedFeeRate === rate}
                          onChange={(e) => onFeeRateChange(Number(e.target.value))}
                          className="w-4 h-4 text-orange-600 border-gray-300 focus:ring-orange-500 focus:ring-2 cursor-pointer"
                          id={`feeRate-${rate}`}
                        />
                        <span className={`ml-2 text-sm select-none ${
                          selectedFeeRate === rate 
                            ? 'text-orange-700 font-semibold' 
                            : 'text-gray-900'
                        }`}>
                          {rate}%
                        </span>
                      </label>
                    ))
                  ) : !isAdminLoading ? (
                    <span className="text-sm text-gray-900 px-3 py-2">
                      {selectedFeeRate}%
                    </span>
                  ) : (
                    <span className="text-sm text-gray-400 px-3 py-2">권한 확인 중...</span>
                  )}
                </div>
              }
              value={<span className="text-sm font-semibold text-gray-900">¥{editableFee.toLocaleString()}</span>}
              color="orange"
              isHighlighted={false}
            />

            {/* 추가 비용 항목 관리 */}
            <AdditionalCostManager
              additionalCostItems={additionalCostItems}
              isAdmin={isAdmin}
              isAdminLoading={isAdminLoading}
              onPaymentDataUpdate={onPaymentDataUpdate}
              onAdditionalCostSave={onAdditionalCostSave}
              project={project}
            />

            {/* 추가 비용 항목들의 총합 */}
            {additionalCostItems.length > 0 && (
              <PaymentTableRow
                label="추가 비용 총합"
                description="추가 비용 항목들의 총합"
                value={<span className="text-sm font-semibold text-gray-900">¥{totalAdditionalCosts.toLocaleString()}</span>}
                color="gray"
                isHighlighted={false}
              />
            )}

            {/* 최종 결제 금액 */}
            <PaymentTableRow
              label="최종 결제 금액"
              description={
                <div className="text-sm text-green-700">
                  <span className="font-medium">
                    총계 + 공장 배송비 + 수수료{additionalCostItems.length > 0 ? ' + 추가 비용 총합' : ''}
                  </span>
                  <div className="text-xs text-green-600 mt-1">
                    {editableSubtotal.toLocaleString()} + {editableShippingCost.toLocaleString()} + {editableFee.toLocaleString()}{additionalCostItems.length > 0 ? ` + ${totalAdditionalCosts.toLocaleString()}` : ''} = {totalAmount.toLocaleString()}
                  </div>
                </div>
              }
              value={<span className="text-xl font-bold text-green-900">¥{totalAmount.toLocaleString()}</span>}
              color="green"
              isHighlighted={true}
            />
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PaymentTable; 