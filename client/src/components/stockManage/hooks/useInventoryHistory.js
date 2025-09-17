import { useState, useCallback } from 'react';
import { apiRequest } from '../../../utils/api';

const useInventoryHistory = () => {
  const [entryHistory, setEntryHistory] = useState([]);
  const [exportHistory, setExportHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 프로젝트 히스토리 로드
  const loadProjectHistory = useCallback(async (projectId) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiRequest(`/api/inventory/project/${projectId}/history`);
      
      if (response.success) {
        setEntryHistory(response.entry_history || []);
        setExportHistory(response.export_history || []);
        return response;
      } else {
        throw new Error(response.error || '히스토리 데이터를 불러오는데 실패했습니다.');
      }
    } catch (err) {
      console.error('❌ 히스토리 로드 오류:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // 히스토리 초기화
  const clearHistory = useCallback(() => {
    setEntryHistory([]);
    setExportHistory([]);
    setError(null);
  }, []);

  return {
    // 데이터
    entryHistory,
    exportHistory,
    loading,
    error,
    
    // 액션
    loadProjectHistory,
    clearHistory
  };
};

export default useInventoryHistory;



