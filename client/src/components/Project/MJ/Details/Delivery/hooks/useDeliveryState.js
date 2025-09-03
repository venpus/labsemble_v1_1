import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

export const useDeliveryState = (project) => {
  // Admin 권한 상태
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAdminLoading, setIsAdminLoading] = useState(true);

  // Admin 권한 확인
  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setIsAdmin(false);
          setIsAdminLoading(false);
          return;
        }

        const response = await axios.get('/api/users/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        setIsAdmin(response.data.is_admin || false);
      } catch (error) {
        setIsAdmin(false);
      } finally {
        setIsAdminLoading(false);
      }
    };

    checkAdminStatus();
  }, []);

  // 상태 업데이트 함수
  const updateDeliveryState = useCallback((updates) => {
    // 상태 업데이트 로직 (필요시 구현)
  }, []);

  return {
    isAdmin,
    isAdminLoading,
    updateDeliveryState
  };
}; 