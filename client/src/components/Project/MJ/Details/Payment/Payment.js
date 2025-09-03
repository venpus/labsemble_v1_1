import React, { useState, useEffect, useCallback } from 'react';
import { DollarSign, Save, Lock } from 'lucide-react';
import PaymentHeader from './PaymentHeader';
import PaymentTable from './PaymentTable';
import PaymentToSupplier from './PaymentToSupplier';
import PaymentSummary from './PaymentSummary';
import { usePaymentData } from './hooks/usePaymentData';
import { usePaymentActions } from './hooks/usePaymentActions';

const Payment = ({ project, user, showPaymentToSupplier = false, onPaymentDataChange }) => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAdminLoading, setIsAdminLoading] = useState(true);
  const [hasUnsavedPaymentChanges, setHasUnsavedPaymentChanges] = useState(false);

  const {
    paymentData,
    updatePaymentData,
    resetPaymentData
  } = usePaymentData(project);

// project가 변경될 때마다 paymentData 동기화 (초기 로딩 시에만)
useEffect(() => {
  console.log('프로젝트 데이터 변경 감지:', project);
}, [project]); // paymentData 의존성 제거

  const {
    handlePaymentStatusChange,
    handleUnitPriceChange,
    handleFeeRateChange,
    handleAdditionalCostSave,
    handleSaveAllPaymentData
  } = usePaymentActions(project, paymentData, updatePaymentData, isAdmin);

  // PaymentToSupplier 데이터 변경 처리
  const handlePaymentToSupplierDataChange = useCallback((hasChanges) => {
    setHasUnsavedPaymentChanges(hasChanges);
    if (onPaymentDataChange) {
      onPaymentDataChange(hasChanges);
    }
  }, [onPaymentDataChange]);

  // 저장 중 상태 관리
  const [isSaving, setIsSaving] = useState(false);

  // 모든 정보 저장 핸들러
  const handleSaveAll = useCallback(async () => {
    setIsSaving(true);
    try {
      await handleSaveAllPaymentData();
    } finally {
      setIsSaving(false);
    }
  }, [handleSaveAllPaymentData]);

  // 컴포넌트 마운트 시 admin 권한 확인
  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          console.log('🔑 토큰이 없습니다.');
          setIsAdmin(false);
          setIsAdminLoading(false);
          return;
        }

        console.log('🔍 Admin 권한 확인 중...');
        const response = await fetch('/api/users/me', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const userData = await response.json();
          console.log('👤 사용자 정보:', userData);
          const adminStatus = Boolean(userData.is_admin);
          console.log('👑 Admin 권한:', adminStatus);
          
          setIsAdmin(adminStatus);
          console.log('✅ Admin 권한 확인 완료. isAdmin:', adminStatus, 'isAdminLoading:', false);
        } else {
          setIsAdmin(false);
          console.log('✅ Admin 권한 확인 완료. isAdmin:', false, 'isAdminLoading:', false);
        }
      } catch (error) {
        console.error('❌ Admin 권한 확인 오류:', error);
        setIsAdmin(false);
        console.log('✅ Admin 권한 확인 완료. isAdmin:', false, 'isAdminLoading:', false);
      } finally {
        setIsAdminLoading(false);
      }
    };

    checkAdminStatus();
  }, []);

  return (
    <div className="space-y-6">
      {showPaymentToSupplier ? (
        // 결제정보 탭: 업체결제 정보만 표시
        <PaymentToSupplier
          isAdmin={isAdmin}
          isAdminLoading={isAdminLoading}
          project={project}
          onDataChange={handlePaymentToSupplierDataChange}
        />
      ) : (
        // 비용 정보 탭: 기존 비용 관련 컴포넌트들 표시
        <>
          {/* 결제 정보 헤더 */}
          <PaymentHeader 
            isAdmin={isAdmin}
            isAdminLoading={isAdminLoading}
            paymentStatus={paymentData.paymentStatus}
            onSaveAll={handleSaveAll}
            isSaving={isSaving}
          />

          {/* 결제 상세 테이블 */}
          <PaymentTable
            project={project}
            paymentData={paymentData}
            isAdmin={isAdmin}
            isAdminLoading={isAdminLoading}
            onUnitPriceChange={handleUnitPriceChange}
            onFeeRateChange={handleFeeRateChange}
            onPaymentDataUpdate={updatePaymentData}
            onAdditionalCostSave={handleAdditionalCostSave}
          />

          {/* 결제 정보 요약 */}
          <PaymentSummary
            project={project}
            paymentData={paymentData}
            isAdmin={isAdmin}
            isAdminLoading={isAdminLoading}
            onPaymentStatusChange={handlePaymentStatusChange}
            onPaymentDataUpdate={updatePaymentData}
          />
        </>
      )}
    </div>
  );
};

export default Payment; 