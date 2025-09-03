import React, { useEffect } from 'react';
import { getCurrentKST, formatDate, calculateDateDifference } from '../../../../../utils/timezone';

const FactoryShip = ({ project, onDateChange, handleMultipleUpdates, isAdmin, isAdminLoading }) => {
  // 한국 시간대 기준 오늘 날짜 계산 (KST)
  const getTodayString = () => {
    return getCurrentKST().toISOString().split('T')[0];
  };

  // 한국 시간대 기준 현재 날짜 객체 생성 (KST)
  const getCurrentKSTDate = () => {
    return getCurrentKST();
  };

  // 날짜를 년-월-일 형식으로 포맷팅 (유틸리티 함수 사용)
  const formatDateString = (dateString) => {
    return formatDate(dateString);
  };

  // 예상 공장 출고일 계산 (발주 실제일 + 공장 납기 소요일)
  const calculateExpectedFactoryShippingDate = () => {
    if (!project?.actual_order_date) {
      return null;
    }

    const orderDate = new Date(project.actual_order_date);
    // 공장 납기 소요일 (DB의 factory_delivery_days 필드 우선 사용, 없으면 기본값 7일)
    const leadTime = project?.factory_delivery_days || 7;
    
    // 발주일 + 납기 소요일 계산
    const expectedDate = new Date(orderDate);
    expectedDate.setDate(orderDate.getDate() + leadTime);
    
    return expectedDate.toISOString().split('T')[0];
  };

  // 잔금 지급예정일 계산 (실제 출고일 + 10일)
  const calculateBalanceDueDate = (actualShippingDate) => {
    if (!actualShippingDate) {
      return null;
    }

    const shippingDate = new Date(actualShippingDate);
    const balanceDueDate = new Date(shippingDate);
    balanceDueDate.setDate(shippingDate.getDate() + 10);
    
    return balanceDueDate.toISOString().split('T')[0];
  };

  // 날짜 변경 처리
  const handleDateChange = (field, value) => {
    // actual_factory_shipping_date만 업데이트하는 경우
    if (field === 'actual_factory_shipping_date') {
      const shippingStatus = calculateShippingStatus();
      const balanceDueDate = calculateBalanceDueDate(value);
      
      if (handleMultipleUpdates && typeof handleMultipleUpdates === 'function') {
        // 기존 payment_due_dates JSON 가져오기
        let existingPaymentDueDates = {};
        try {
          if (project?.payment_due_dates) {
            existingPaymentDueDates = typeof project.payment_due_dates === 'string' 
              ? JSON.parse(project.payment_due_dates) 
              : project.payment_due_dates;
          }
        } catch (error) {
          console.error('payment_due_dates 파싱 오류:', error);
          existingPaymentDueDates = {};
        }
        
        // payment_due_dates JSON 업데이트 (balance 키에 새로운 날짜 설정)
        const updatedPaymentDueDates = {
          ...existingPaymentDueDates,
          balance: balanceDueDate
        };
        
        // 기존 값들과 출고상태, 잔금 지급예정일, payment_due_dates를 함께 전송하여 보호
        const updateData = {
          [field]: value,
          actual_order_date: project?.actual_order_date,
          expected_factory_shipping_date: project?.expected_factory_shipping_date,
          is_order_completed: project?.is_order_completed,
          factory_shipping_status: shippingStatus,
          balance_due_date: balanceDueDate,
          payment_due_dates: JSON.stringify(updatedPaymentDueDates)
        };
        
        handleMultipleUpdates(updateData);
      } else if (onDateChange && typeof onDateChange === 'function') {
        // 기존 payment_due_dates JSON 가져오기
        let existingPaymentDueDates = {};
        try {
          if (project?.payment_due_dates) {
            existingPaymentDueDates = typeof project.payment_due_dates === 'string' 
              ? JSON.parse(project.payment_due_dates) 
              : project.payment_due_dates;
          }
        } catch (error) {
          console.error('payment_due_dates 파싱 오류:', error);
          existingPaymentDueDates = {};
        }
        
        onDateChange(field, value);
        onDateChange('factory_shipping_status', shippingStatus);
        onDateChange('balance_due_date', balanceDueDate);
        onDateChange('payment_due_dates', JSON.stringify({
          ...existingPaymentDueDates,
          balance: balanceDueDate
        }));
      }
    } else {
      // 다른 필드의 경우에도 출고상태 자동 계산 및 저장
      const newShippingStatus = calculateShippingStatus();
      
      if (handleMultipleUpdates && typeof handleMultipleUpdates === 'function') {
        const updateData = {
          [field]: value,
          factory_shipping_status: newShippingStatus,
          // 기존 값들 보호
          actual_order_date: project?.actual_order_date,
          expected_factory_shipping_date: project?.expected_factory_shipping_date,
          is_order_completed: project?.is_order_completed
        };
        handleMultipleUpdates(updateData);
      } else if (onDateChange && typeof onDateChange === 'function') {
        onDateChange(field, value);
        onDateChange('factory_shipping_status', newShippingStatus);
      }
    }
  };

  // 날짜 차이 계산 (조기/연기)
  const calculateDateDifference = () => {
    if (!project?.expected_factory_shipping_date || !project?.actual_factory_shipping_date) {
      return null;
    }

    const expectedDate = new Date(project.expected_factory_shipping_date);
    const actualDate = new Date(project.actual_factory_shipping_date);
    
    const timeDiff = actualDate.getTime() - expectedDate.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 1000));
    
    return {
      days: Math.abs(daysDiff),
      isEarly: daysDiff < 0,
      isDelayed: daysDiff > 0
    };
  };

  // 출고상태 계산 및 반환
  const calculateShippingStatus = () => {
    // actual_order_date가 null이면 '출고 대기' 반환
    if (!project?.actual_order_date) {
      return '출고 대기';
    }

    // expected_factory_shipping_date가 없으면 '출고 대기' 반환
    if (!project?.expected_factory_shipping_date) {
      return '출고 대기';
    }

    // actual_factory_shipping_date가 설정되어 있으면 출고 완료 상태
    if (project?.actual_factory_shipping_date) {
      // 예상일과 실제일 비교하여 상태 계산
      const dateDiff = calculateDateDifference();
      if (dateDiff) {
        if (dateDiff.days === 0) {
          return '정상 출고';
        } else if (dateDiff.isEarly && dateDiff.days > 0) {
          return '조기 출고';
        } else if (dateDiff.isDelayed && dateDiff.days > 0) {
          return '출고 연기';
        }
      }
      // 날짜 차이 계산이 안 되는 경우 기본적으로 '출고 완료' 반환
      return '출고 완료';
    }

    // GMT+9 시간대 기준 현재 날짜와 공장출고 예상일 비교
    const today = getCurrentKSTDate();
    const expectedDate = new Date(project.expected_factory_shipping_date);
    
    // 시간을 제거하고 날짜만 비교
    today.setHours(0, 0, 0, 0);
    expectedDate.setHours(0, 0, 0, 0);
    
    // 현재 날짜가 예상일보다 빠르면 '출고 대기'
    if (today < expectedDate) {
      return '출고 대기';
    }
    
    // 현재 날짜가 예상일보다 늦으면 '출고 연기'
    if (today > expectedDate) {
      return '출고 연기';
    }
    
    // 현재 날짜가 예상일과 같으면 '출고 대기' (아직 출고하지 않음)
    return '출고 대기';
  };

  // 비고 메시지 생성
  const getRemarkMessage = () => {
    const status = calculateShippingStatus();
    
    if (status === '출고 완료') {
      return (
        <span className="text-green-600 font-medium">
          출고 완료
        </span>
      );
    } else if (status === '정상 출고') {
      return (
        <span className="text-green-600 font-medium">
          정상 출고
        </span>
      );
    } else if (status === '조기 출고') {
      return (
        <span className="text-blue-600 font-medium">
          조기 출고
        </span>
      );
    } else if (status === '출고 연기') {
      return (
        <span className="text-orange-600 font-medium">
          출고 연기
        </span>
      );
    } else if (status === '출고 대기') {
      // 출고 대기 상태에 대한 상세 메시지
      if (!project?.actual_order_date) {
        return <span className="text-gray-500">발주 미완료</span>;
      } else if (!project?.expected_factory_shipping_date) {
        return <span className="text-gray-500">예상일 미계산</span>;
      } else {
        const today = getCurrentKSTDate();
        const expectedDate = new Date(project.expected_factory_shipping_date);
        today.setHours(0, 0, 0, 0);
        expectedDate.setHours(0, 0, 0, 0);
        
        if (today < expectedDate) {
          const daysUntilExpected = Math.ceil((expectedDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
          return <span className="text-yellow-600">출고 대기 ({daysUntilExpected}일 남음)</span>;
        } else if (today > expectedDate) {
          const daysDelayed = Math.ceil((today.getTime() - expectedDate.getTime()) / (1000 * 3600 * 24));
          return <span className="text-orange-600 font-medium">출고연기 ({daysDelayed}일 연기)</span>;
        } else {
          return <span className="text-yellow-600">출고 대기</span>;
        }
      }
    }

    return <span className="text-yellow-600">출고 대기</span>;
  };

  // 계산된 예상 공장 출고일 (표시용)
  const calculatedExpectedDate = calculateExpectedFactoryShippingDate();

  // GMT+9 시간대 기준 현재 날짜와 예상일 비교 정보
  const today = getCurrentKSTDate();
  const expectedDate = project?.expected_factory_shipping_date ? new Date(project.expected_factory_shipping_date) : null;
  const isBeforeExpectedDate = expectedDate ? today < expectedDate : false;
  const isAfterExpectedDate = expectedDate ? today > expectedDate : false;
  const isOnExpectedDate = expectedDate ? today.getTime() === expectedDate.getTime() : false;
  const daysUntilExpected = expectedDate && isBeforeExpectedDate 
    ? Math.ceil((expectedDate.getTime() - today.getTime()) / (1000 * 3600 * 24))
    : null;
  const daysDelayed = expectedDate && isAfterExpectedDate && project?.actual_order_date && !project?.actual_factory_shipping_date
    ? Math.ceil((today.getTime() - expectedDate.getTime()) / (1000 * 3600 * 24))
    : null;

  // 출고상태 자동 업데이트 및 DB 저장 (날짜 변경 시)
  useEffect(() => {
    if (project?.actual_order_date && project?.expected_factory_shipping_date) {
      const currentStatus = calculateShippingStatus();
      const currentBalanceDueDate = calculateBalanceDueDate(project?.actual_factory_shipping_date);
      
      // 출고상태가 변경되었거나, 실제 출고일이 설정되어 있으면 잔금 지급예정일을 강제 업데이트
      const shouldUpdateBalanceDueDate = project?.actual_factory_shipping_date && 
                                        project?.balance_due_date !== currentBalanceDueDate;
      
      // payment_due_dates JSON도 동기화 필요 여부 확인
      let shouldUpdatePaymentDueDates = false;
      let updatedPaymentDueDates = {};
      
      if (project?.actual_factory_shipping_date && currentBalanceDueDate) {
        try {
          const existingPaymentDueDates = project?.payment_due_dates 
            ? (typeof project.payment_due_dates === 'string' 
                ? JSON.parse(project.payment_due_dates) 
                : project.payment_due_dates)
            : {};
          
          // payment_due_dates의 balance 값이 현재 계산된 값과 다른 경우 업데이트 필요
          if (existingPaymentDueDates.balance !== currentBalanceDueDate) {
            shouldUpdatePaymentDueDates = true;
            updatedPaymentDueDates = {
              ...existingPaymentDueDates,
              balance: currentBalanceDueDate
            };
          }
        } catch (error) {
          console.error('payment_due_dates 파싱 오류:', error);
          shouldUpdatePaymentDueDates = true;
          updatedPaymentDueDates = { balance: currentBalanceDueDate };
        }
      }
      
      if (project?.factory_shipping_status !== currentStatus || shouldUpdateBalanceDueDate || shouldUpdatePaymentDueDates) {

        // handleMultipleUpdates를 통해 DB에 저장
        if (handleMultipleUpdates && typeof handleMultipleUpdates === 'function') {
          const updateData = {
            factory_shipping_status: currentStatus,
            // 실제 출고일이 있으면 잔금 지급예정일을 강제 업데이트 (기존 값이 있어도)
            ...(project?.actual_factory_shipping_date && { balance_due_date: currentBalanceDueDate }),
            // payment_due_dates JSON도 동기화
            ...(shouldUpdatePaymentDueDates && { payment_due_dates: JSON.stringify(updatedPaymentDueDates) }),
            // 기존 값들 보호
            actual_order_date: project?.actual_order_date,
            expected_factory_shipping_date: project?.expected_factory_shipping_date,
            is_order_completed: project?.is_order_completed
          };
          
          handleMultipleUpdates(updateData);
        } else if (onDateChange && typeof onDateChange === 'function') {
          onDateChange('factory_shipping_status', currentStatus);
          // 실제 출고일이 있으면 잔금 지급예정일도 업데이트
          if (project?.actual_factory_shipping_date) {
            onDateChange('balance_due_date', currentBalanceDueDate);
          }
          // payment_due_dates도 업데이트
          if (shouldUpdatePaymentDueDates) {
            onDateChange('payment_due_dates', JSON.stringify(updatedPaymentDueDates));
          }
        }
      }
    }
  }, [project?.actual_order_date, project?.expected_factory_shipping_date, project?.actual_factory_shipping_date, project?.factory_shipping_status, project?.balance_due_date, project?.payment_due_dates]);

  const isDateInputDisabled = !project || isAdminLoading || !isAdmin;

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span className="text-sm font-medium text-gray-900">공장 출고</span>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-700">
            -
          </span>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {project?.expected_factory_shipping_date ? (
          // DB에 저장된 expected_factory_shipping_date가 있으면 우선 표시
          <div className="space-y-1">
            <span className="text-gray-900 font-medium">
              {formatDateString(project.expected_factory_shipping_date)}
            </span>
          </div>
        ) : calculatedExpectedDate ? (
          // DB 값이 없으면 계산된 값 표시
          <div className="space-y-1">
            <span className="text-gray-900 font-medium">
              {formatDateString(calculatedExpectedDate)}
            </span>
            <div className="text-xs text-gray-500">
              발주일({formatDateString(project.actual_order_date)}) + {project?.factory_delivery_days || 7}일
            </div>
          </div>
        ) : (
          // 둘 다 없으면 안내 메시지
          <div className="space-y-1">
            <span className="text-gray-400">-</span>
            <div className="text-xs text-gray-400">
              발주 완료 후 계산
            </div>
          </div>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <input
          type="date"
          className={`w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent ${
            isDateInputDisabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'
          }`}
          value={formatDateString(project?.actual_factory_shipping_date) || ''}
          onChange={(e) => {
            handleDateChange('actual_factory_shipping_date', e.target.value);
          }}
          disabled={isDateInputDisabled}
        />
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {getRemarkMessage()}
      </td>
    </tr>
  );
};

export default FactoryShip; 