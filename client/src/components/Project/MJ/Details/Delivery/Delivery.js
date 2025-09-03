import React, { useState, useEffect } from 'react';
import DeliveryHeader from './DeliveryHeader';
import WarehouseEntry from './WarehouseEntry';
import Schedule from './Schedule';
import { useDeliveryState } from './hooks/useDeliveryState';

const Delivery = ({ project, onUpdate }) => {
  // Custom Hook을 사용한 상태 관리
  const {
    isAdmin,
    isAdminLoading,
    updateDeliveryState
  } = useDeliveryState(project);

  // 로컬 프로젝트 상태 관리
  const [localProject, setLocalProject] = useState(project);

  // project prop이 변경될 때 로컬 상태 업데이트
  useEffect(() => {
    setLocalProject(project);
  }, [project]);



  // 납기 상태 업데이트 처리
  const handleDeliveryUpdate = (updates) => {
    updateDeliveryState(updates);
  };

  // 날짜 및 체크박스 변경 처리
  const handleDateChange = async (field, value) => {
    if (!isAdmin) {
      return;
    }

    try {
      // 즉시 로컬 상태 업데이트 (낙관적 업데이트)
      setLocalProject(prev => {
        const newState = { ...prev };
        
        // 해당 필드만 업데이트, 다른 필드들은 보호
        if (value !== undefined) {
          newState[field] = value;
        }
        
        return newState;
      });

      const token = localStorage.getItem('token');
      const requestBody = { [field]: value };
      
      const response = await fetch(`/api/mj-project/${project.id}/delivery`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
      });

      if (response.ok) {
        const responseData = await response.json();
        
        // 부모 컴포넌트에 업데이트 알림
        if (updateDeliveryState) {
          updateDeliveryState({ [field]: value });
        }

        // 성공 시 부모 컴포넌트의 project 상태도 업데이트
        if (onUpdate && typeof onUpdate === 'function') {
          onUpdate({ [field]: value });
        }
      } else {
        const errorData = await response.text();
        
        // 실패 시 로컬 상태 롤백
        setLocalProject(prev => {
          return { ...prev, [field]: project[field] };
        });
      }
    } catch (error) {
      // 오류 시 로컬 상태 롤백
      setLocalProject(prev => {
        return { ...prev, [field]: project[field] };
      });
    }
  };

  // 여러 필드를 동시에 업데이트하는 함수
  const handleMultipleUpdates = async (updates) => {
    if (!isAdmin) {
      return;
    }

    // undefined 값이 포함된 필드 제거하여 보호
    const cleanUpdates = {};
    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined) {
        cleanUpdates[key] = updates[key];
      }
    });

    try {
      // 즉시 로컬 상태 업데이트 (낙관적 업데이트)
      setLocalProject(prev => {
        // updates 객체에 포함되지 않은 필드들은 기존 값을 유지
        const newState = { ...prev };
        
        // updates 객체의 각 필드만 업데이트
        Object.keys(cleanUpdates).forEach(key => {
          if (cleanUpdates[key] !== undefined) {
            newState[key] = cleanUpdates[key];
          }
        });
        
        return newState;
      });

      const token = localStorage.getItem('token');
      
      const response = await fetch(`/api/mj-project/${project.id}/delivery`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(cleanUpdates)
      });

      if (response.ok) {
        const responseData = await response.json();
        
        // updateDeliveryState 호출 추가
        if (updateDeliveryState) {
          updateDeliveryState(cleanUpdates);
        }
        
        // 부모 컴포넌트에 업데이트 알림
        if (onUpdate && typeof onUpdate === 'function') {
          onUpdate(cleanUpdates);
        }
      } else {
        // 실패 시 로컬 상태 롤백 - 기존 project 상태로 완전 복원
        setLocalProject(prev => {
          return { ...project };
        });
      }
    } catch (error) {
      // 오류 시 로컬 상태 롤백 - 기존 project 상태로 완전 복원
      setLocalProject(prev => {
        return { ...project };
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* 납기 일정 헤더 */}
      <DeliveryHeader project={localProject} />

      {/* 납기 일정 테이블 */}
      <Schedule 
        project={localProject} 
        onDateChange={handleDateChange}
        handleMultipleUpdates={handleMultipleUpdates}
        isAdmin={isAdmin}
        isAdminLoading={isAdminLoading}
      />

      {/* 입고 기록 컴포넌트 */}
      <WarehouseEntry 
        project={localProject}
        isAdmin={isAdmin}
        isAdminLoading={isAdminLoading}
        onDeliveryStatusChange={(newStatus) => {
          handleDeliveryUpdate({ deliveryStatus: newStatus });
        }}
      />
    </div>
  );
};

export default Delivery; 