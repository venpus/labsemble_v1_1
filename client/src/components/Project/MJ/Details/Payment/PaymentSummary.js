import React from 'react';
import { Calculator, Package, DollarSign } from 'lucide-react';
import { toast } from 'react-hot-toast';
import PaymentSummaryCard from './PaymentSummaryCard';

const PaymentSummary = ({
  project,
  paymentData,
  isAdmin,
  isAdminLoading,
  onPaymentStatusChange,
  onPaymentDataUpdate
}) => {
  const {
    editableSubtotal,
    editableShippingCost,
    editableFee,
    additionalCostItems,
    balanceAmount,
    paymentStatus,
    paymentDates,
    balanceDueDate,
    advanceDueDate
  } = paymentData;

  const totalAdditionalCosts = additionalCostItems.reduce((sum, item) => sum + item.cost, 0);

  // 잔금 결제완료 체크 전 예정일 확인
  const handleBalancePaymentCheck = () => {
    if (!balanceDueDate) {
      // 결제 예정일이 설정되지 않은 경우
      toast.error('잔금 결제 예정일을 먼저 설정해주세요.');
      return;
    }
    
    // 결제 예정일이 설정된 경우에만 결제완료 체크 진행
    onPaymentStatusChange('balance');
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* 선금 카드 */}
      <PaymentSummaryCard
        title="선금"
        amount={editableSubtotal}
        icon={Calculator}
        iconColor="text-blue-600"
        bgColor="bg-blue-50"
        borderColor="border-blue-200"
        textColor="text-blue-900"
        isChecked={paymentStatus.advance}
        onCheckChange={() => onPaymentStatusChange('advance')}
        isAdmin={isAdmin}
        isAdminLoading={isAdminLoading}
        showPaymentDate={paymentStatus.advance && paymentDates.advance}
        paymentDate={paymentDates.advance}
        showDueDate={false}
      />

      {/* 잔금 카드 */}
      <PaymentSummaryCard
        title="잔금"
        amount={balanceAmount}
        icon={Package}
        iconColor="text-orange-600"
        bgColor="bg-orange-50"
        borderColor="border-orange-200"
        textColor="text-orange-900"
        isChecked={paymentStatus.balance}
        onCheckChange={handleBalancePaymentCheck}
        isAdmin={isAdmin}
        isAdminLoading={isAdminLoading}
        showPaymentDate={paymentStatus.balance && paymentDates.balance}
        paymentDate={paymentDates.balance}
        showDueDate={true}
        dueDate={balanceDueDate}
        onDueDateChange={(newDate) => {
          onPaymentDataUpdate({ 
            balanceDueDate: newDate,
            paymentDueDates: {
              ...paymentData.paymentDueDates,
              balance: newDate
            }
          });
        }}
        additionalInfo={`${editableFee.toLocaleString()} + ${editableShippingCost.toLocaleString()}${additionalCostItems.length > 0 ? ` + ${totalAdditionalCosts.toLocaleString()}` : ''} = ${balanceAmount.toLocaleString()}`}
        showDueDateWarning={!balanceDueDate && !paymentStatus.balance}
        dueDateWarningText="결제 예정일을 먼저 설정해주세요"
      />

      {/* 최종 금액 카드 */}
      <PaymentSummaryCard
        title="최종 금액"
        amount={editableSubtotal + balanceAmount}
        icon={DollarSign}
        iconColor="text-green-600"
        bgColor="bg-green-50"
        borderColor="border-green-200"
        textColor="text-green-900"
        isChecked={paymentStatus.total}
        onCheckChange={() => onPaymentStatusChange('total')}
        isAdmin={isAdmin}
        isAdminLoading={isAdminLoading}
        showPaymentDate={paymentStatus.total && paymentDates.total}
        paymentDate={paymentDates.total}
        showDueDate={false}
        disabled={!(paymentStatus.advance && paymentStatus.balance)}
        disabledText="자동완료"
      />
    </div>
  );
};

export default PaymentSummary; 