import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Package, Camera, X, Plus, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getCurrentKST, formatDate } from '../../../../../utils/timezone';

const WarehouseEntry = ({ project, isAdmin, isAdminLoading, onDeliveryStatusChange }) => {
  // 입고 기록 배열 상태 (여러 행을 관리)
  const [warehouseEntries, setWarehouseEntries] = useState([
    {
      id: 1,
      date: null,
      shippingDate: null, // 출고 날짜 추가
      quantity: '',
      images: [],
      isNew: true // 새로 작성된 항목 표시
    }
  ]);
  
  // 이미지 미리보기 모달 상태
  const [selectedImage, setSelectedImage] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // 파일 입력 참조
  const fileInputRef = useRef(null);

  // 총 입고 수량 계산
  const totalEnteredQuantity = warehouseEntries.reduce((total, entry) => {
    return total + (parseInt(entry.quantity) || 0);
  }, 0);

  // 남은 입고 수량 계산
  const remainingQuantity = (project.quantity || 0) - totalEnteredQuantity;

  // 인증 토큰 확인 헬퍼 함수
  const getAuthToken = useCallback(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      toast.error('로그인이 필요합니다. 다시 로그인해주세요.');
      return null;
    }
    return token;
  }, []);

  // 날짜 형식 변환 헬퍼 함수
  const formatDateForInput = (dateValue) => {
    if (!dateValue) return null;
    
    // ISO 문자열인 경우 (예: "2024-01-15T00:00:00.000Z")
    if (typeof dateValue === 'string' && dateValue.includes('T')) {
      return dateValue.split('T')[0];
    }
    
    // Date 객체인 경우
    if (dateValue instanceof Date) {
      return dateValue.toISOString().split('T')[0];
    }
    
    // YYYY-MM-DD 형식인 경우
    if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
      return dateValue;
    }
    
            // 다른 형식인 경우 null 반환
        return null;
  };

  // 영문 고유 파일명 생성 함수
  const generateUniqueFileName = (originalFile, projectId, entryId) => {
    const now = new Date();
    const timestamp = now.getTime();
    
    // 파일 확장자 추출
    const fileExtension = originalFile.name.split('.').pop().toLowerCase();
    
    // 영문 파일명 생성: warehouse_project{프로젝트ID}_entry{엔트리ID}_{타임스탬프}.확장자
    const uniqueFileName = `warehouse_project${projectId}_entry${entryId}_${timestamp}.${fileExtension}`;
    

    
    return uniqueFileName;
  };

    // 컴포넌트 마운트 시 기존 입고기록 로드
  useEffect(() => {
    const loadWarehouseEntries = async () => {
      try {
        // 인증 토큰 가져오기
        const token = getAuthToken();
        if (!token) {
          return;
        }

        const response = await fetch(`/api/warehouse/project/${project.id}/entries`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
                                  if (response.ok) {
          const result = await response.json();
          
          console.log('🔄 [loadWarehouseEntries] DB에서 입고기록 로드 완료:', {
            totalEntries: result.entries?.length || 0,
            entries: result.entries
          });
          
          if (result.entries && result.entries.length > 0) {
              // DB에서 로드한 데이터를 로컬 상태에 설정
              const loadedEntries = result.entries.map(entry => {
                return {
                  id: entry.id,
                  date: formatDateForInput(entry.entryDate || entry.date), // 날짜 형식 변환 적용
                  shippingDate: formatDateForInput(entry.shippingDate), // 출고날짜 형식 변환 적용
                  quantity: entry.quantity || '',
                  status: entry.status || '입고중',
                  images: entry.images || [], // DB에서 로드한 이미지 데이터 사용
                  isNew: false,
                  createdAt: entry.createdAt,
                  updatedAt: entry.updatedAt
                };
              });
              
              console.log('✅ [loadWarehouseEntries] 매핑된 입고기록:', {
                totalLoaded: loadedEntries.length,
                loadedEntries: loadedEntries.map(entry => ({
                  id: entry.id,
                  date: entry.date,
                  shippingDate: entry.shippingDate,
                  quantity: entry.quantity,
                  createdAt: entry.createdAt
                }))
              });
              
              // 생성 시간 순으로 정렬 (먼저 기록된 순서대로)
              const sortedEntries = loadedEntries.sort((a, b) => {
                const dateA = new Date(a.createdAt || 0);
                const dateB = new Date(b.createdAt || 0);
                return dateA - dateB; // 오름차순 정렬 (과거 → 최신)
              });
              
              console.log('🔄 [loadWarehouseEntries] 정렬된 입고기록:', {
                sortedEntries: sortedEntries.map(entry => ({
                  id: entry.id,
                  date: entry.date,
                  createdAt: entry.createdAt
                }))
              });
              
              setWarehouseEntries(sortedEntries);
          } else {
            // DB에 저장된 항목이 없는 경우 초기 상태 유지
            // 기존 로컬 상태에서 새로 생성된 항목만 유지
            const existingNewEntries = warehouseEntries.filter(entry => entry.isNew);
            console.log('ℹ️ [loadWarehouseEntries] DB에 저장된 항목이 없음, 기존 새 항목 유지:', {
              existingNewEntries: existingNewEntries.length
            });
          }
        }
      } catch (error) {
        // 에러 발생 시 기존 로컬 상태 유지
      }
    };

    if (project.id) {
      loadWarehouseEntries();
    }
  }, [project.id]);

  // 첫 번째 행의 입고 상태를 확인하고 납기상태 자동 변경
  useEffect(() => {
    if (onDeliveryStatusChange && warehouseEntries.length > 0) {
      const firstEntry = warehouseEntries[0];
      const hasFirstEntryData = firstEntry.date && firstEntry.shippingDate && firstEntry.quantity && parseInt(firstEntry.quantity) > 0;
      
      if (hasFirstEntryData) {
        // 첫 번째 행에 입고날짜, 출고날짜, 수량이 입력되면 "입고중" 상태로 변경
        onDeliveryStatusChange('입고중');
      }
    }
  }, [warehouseEntries.length, warehouseEntries[0]?.date, warehouseEntries[0]?.shippingDate, warehouseEntries[0]?.quantity, onDeliveryStatusChange]);

  // 남은 수량이 0이 되면 "입고 완료" 상태로 자동 변경
  useEffect(() => {
    if (onDeliveryStatusChange && remainingQuantity === 0 && totalEnteredQuantity > 0) {
      onDeliveryStatusChange('입고 완료');
    }
  }, [remainingQuantity, totalEnteredQuantity, onDeliveryStatusChange]);

  // 새로운 입고 기록 행 추가
  const addWarehouseEntry = useCallback(() => {
    if (warehouseEntries.length >= 10) {
      toast.error('최대 10개까지만 추가할 수 있습니다.');
      return;
    }

    const newEntry = {
      id: Date.now() + Math.random(), // 임시 ID (서버에서 실제 ID로 교체)
      date: null,
      shippingDate: null,
      quantity: '',
      images: [],
      isNew: true, // 새로 생성된 항목임을 표시
      status: '입고중',
      createdAt: new Date().toISOString() // 현재 시간을 생성 시간으로 설정
    };

    console.log('➕ [addWarehouseEntry] 새로운 입고 기록 행 추가:', {
      newEntry,
      currentTotal: warehouseEntries.length
    });

    setWarehouseEntries(prev => {
      const updatedEntries = [...prev, newEntry];
      
      // 생성 시간 순으로 정렬 (먼저 기록된 순서대로)
      const sortedEntries = updatedEntries.sort((a, b) => {
        // isNew가 true인 항목은 맨 뒤에 배치
        if (a.isNew && !b.isNew) return 1;
        if (!a.isNew && b.isNew) return -1;
        
        // 둘 다 isNew가 true이거나 false인 경우 생성 시간으로 정렬
        const dateA = new Date(a.createdAt || 0);
        const dateB = new Date(b.createdAt || 0);
        return dateA - dateB; // 오름차순 정렬 (과거 → 최신)
      });
      
      console.log('🔄 [addWarehouseEntry] 정렬된 입고기록:', {
        totalEntries: sortedEntries.length,
        sortedEntries: sortedEntries.map(entry => ({
          id: entry.id,
          isNew: entry.isNew,
          createdAt: entry.createdAt
        }))
      });
      
      return sortedEntries;
    });
    toast.success('새로운 입고 기록 행이 추가되었습니다. 데이터를 입력하고 저장해주세요.');
  }, [warehouseEntries.length]);

  // 입고 기록 행 삭제
  const removeWarehouseEntry = useCallback((entryId) => {
    if (warehouseEntries.length <= 1) {
      toast.error('최소 1개의 입고 기록은 유지해야 합니다.');
      return;
    }

    // 새로 생성된 항목은 바로 삭제
    const entry = warehouseEntries.find(e => e.id === entryId);
    if (entry && entry.isNew) {
      setWarehouseEntries(prev => prev.filter(e => e.id !== entryId));
      toast.success('입고 기록 행이 삭제되었습니다.');
      return;
    }

    // DB에 저장된 항목은 서버에서 삭제
    deleteWarehouseEntryFromServer(entryId);
  }, [warehouseEntries.length, warehouseEntries]);

  // 특정 행의 날짜 변경
  const handleDateChange = useCallback((entryId, newDate) => {
    setWarehouseEntries(prev => prev.map(entry => 
      entry.id === entryId 
        ? { ...entry, date: newDate }
        : entry
    ));

    if (newDate) {
      const now = new Date();
      const currentTime = now.toTimeString().slice(0, 5);
      toast.success(`입고 날짜가 선택되었습니다. 현재 시간(${currentTime})이 자동으로 저장됩니다.`);
    }
  }, []);

  // 특정 행의 출고 날짜 변경
  const handleShippingDateChange = useCallback((entryId, newShippingDate) => {
    setWarehouseEntries(prev => prev.map(entry => 
      entry.id === entryId 
        ? { ...entry, shippingDate: newShippingDate }
        : entry
    ));

    if (newShippingDate) {
      const now = new Date();
      const currentTime = now.toTimeString().slice(0, 5);
      toast.success(`출고 날짜가 선택되었습니다. 현재 시간(${currentTime})이 자동으로 저장됩니다.`);
    }
  }, []);

  // 특정 행의 수량 변경
  const handleQuantityChange = useCallback((entryId, newQuantity) => {
    setWarehouseEntries(prev => prev.map(entry => 
      entry.id === entryId 
        ? { ...entry, quantity: newQuantity }
        : entry
    ));
  }, []);





  // 입고기록을 DB에 저장 (수동 저장용)
  const handleSaveEntry = useCallback(async (entryId) => {
    const entry = warehouseEntries.find(e => e.id === entryId);
    if (!entry) return;

    // 필수 필드 검증
    if (!entry.date || !entry.shippingDate || !entry.quantity || parseInt(entry.quantity) <= 0) {
      toast.error('입고 날짜, 출고 날짜, 수량을 모두 입력해주세요.');
      return;
    }

    console.log('🔄 [handleSaveEntry] 입고기록 수동 저장 시작:', {
      entryId,
      entry: { date: entry.date, shippingDate: entry.shippingDate, quantity: entry.quantity }
    });

    try {
  

      // 인증 토큰 가져오기
      const token = getAuthToken();
      if (!token) {
        throw new Error('인증 토큰이 없습니다. 다시 로그인해주세요.');
      }

      console.log('📤 [handleSaveEntry] 서버로 입고기록 전송:', {
        projectId: project.id,
        entryDate: entry.date,
        shippingDate: entry.shippingDate,
        quantity: parseInt(entry.quantity)
      });

      const response = await fetch('/api/warehouse/entries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          projectId: project.id,
          entryDate: entry.date,
          shippingDate: entry.shippingDate,
          quantity: parseInt(entry.quantity)
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '입고기록 저장에 실패했습니다.');
      }

      const result = await response.json();
      
      console.log('✅ [handleSaveEntry] 서버 응답 성공:', result);
      
      // 서버에서 반환된 데이터로 업데이트
      setWarehouseEntries(prev => prev.map(e => 
        e.id === entryId 
          ? {
              ...e,
              id: result.entry.id, // 서버에서 생성된 ID로 업데이트
              date: formatDateForInput(result.entry.entryDate || result.entry.date), // 날짜 형식 변환 적용
              shippingDate: formatDateForInput(result.entry.shippingDate), // 출고날짜 형식 변환 적용
              quantity: result.entry.quantity,
              status: result.entry.status || '입고중',
              isNew: false, // 저장 완료 표시
              createdAt: result.entry.createdAt,
              updatedAt: result.entry.updatedAt
            }
          : e
      ));

      console.log('🔄 [handleSaveEntry] 로컬 상태 업데이트 완료, entry_quantity 업데이트 시작');

      toast.success('입고기록이 성공적으로 저장되었습니다! 🎉');

      // 입고기록 저장 후 프로젝트의 entry_quantity 업데이트
      await updateProjectEntryQuantity();

    } catch (error) {
      toast.error(`입고기록 저장에 실패했습니다: ${error.message}`);
    }
  }, [warehouseEntries, project.id]);

  // 입고기록을 DB에 업데이트
  const handleUpdateEntry = useCallback(async (entryId) => {
    const entry = warehouseEntries.find(e => e.id === entryId);
    if (!entry) return;

    // 필수 필드 검증
    if (!entry.date || !entry.shippingDate || !entry.quantity || parseInt(entry.quantity) <= 0) {
      toast.error('입고 날짜, 출고 날짜, 수량을 모두 입력해주세요.');
      return;
    }

    console.log('🔄 [handleUpdateEntry] 입고기록 업데이트 시작:', {
      entryId,
      entry: { date: entry.date, shippingDate: entry.shippingDate, quantity: entry.quantity }
    });

    try {


      // 인증 토큰 가져오기
      const token = getAuthToken();
      if (!token) {
        throw new Error('인증 토큰이 없습니다. 다시 로그인해주세요.');
      }

      console.log('📤 [handleUpdateEntry] 서버로 입고기록 업데이트 전송:', {
        entryId,
        entryDate: entry.date,
        shippingDate: entry.shippingDate,
        quantity: parseInt(entry.quantity)
      });

      const response = await fetch(`/api/warehouse/entries/${entryId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          entryDate: entry.date,
          shippingDate: entry.shippingDate,
          quantity: parseInt(entry.quantity)
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '입고기록 업데이트에 실패했습니다.');
      }

      const result = await response.json();
      
      console.log('✅ [handleUpdateEntry] 서버 응답 성공:', result);
      
      // 서버에서 반환된 데이터로 업데이트
      setWarehouseEntries(prev => prev.map(e => 
        e.id === entryId 
          ? {
              ...e,
              date: formatDateForInput(result.entry.entryDate || result.entry.date), // 날짜 형식 변환 적용
              shippingDate: formatDateForInput(result.entry.shippingDate), // 출고날짜 형식 변환 적용
              quantity: result.entry.quantity,
              status: result.entry.status || '입고중',
              updatedAt: result.entry.updatedAt
            }
          : e
      ));

      console.log('🔄 [handleUpdateEntry] 로컬 상태 업데이트 완료, entry_quantity 업데이트 시작');

      toast.success('입고기록이 성공적으로 업데이트되었습니다! ✨');

      // 입고기록 업데이트 후 프로젝트의 entry_quantity 업데이트
      await updateProjectEntryQuantity();

    } catch (error) {
      toast.error(`입고기록 업데이트에 실패했습니다: ${error.message}`);
    }
  }, [warehouseEntries, project.id]);

  // 입고기록을 DB에 저장 (기존 함수 - 이미지 업로드 시 사용)
  const saveWarehouseEntry = useCallback(async (entryId) => {
    const entry = warehouseEntries.find(e => e.id === entryId);
    if (!entry) return;

    // 필수 필드 검증
    if (!entry.date || !entry.shippingDate || !entry.quantity || entry.quantity <= 0) {
      return; // 자동 저장 시에는 에러 메시지 표시하지 않음
    }

    console.log('🔄 [saveWarehouseEntry] 입고기록 저장 시작:', {
      entryId,
      entry: { date: entry.date, shippingDate: entry.shippingDate, quantity: entry.quantity }
    });

    try {


      // 인증 토큰 가져오기
      const token = getAuthToken();
      if (!token) {
        throw new Error('인증 토큰이 없습니다. 다시 로그인해주세요.');
      }

      console.log('📤 [saveWarehouseEntry] 서버로 입고기록 전송:', {
        projectId: project.id,
        entryDate: entry.date,
        shippingDate: entry.shippingDate,
        quantity: parseInt(entry.quantity)
      });

      const response = await fetch('/api/warehouse/entries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          projectId: project.id,
          entryDate: entry.date,
          shippingDate: entry.shippingDate,
          quantity: parseInt(entry.quantity)
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '입고기록 저장에 실패했습니다.');
      }

      const result = await response.json();
      
      console.log('✅ [saveWarehouseEntry] 서버 응답 성공:', result);
      
      // 서버에서 반환된 실제 ID와 데이터로 업데이트
      setWarehouseEntries(prev => prev.map(e => 
        e.id === entryId 
          ? {
              ...e,
              id: result.entry.id,
              date: formatDateForInput(result.entry.entryDate || result.entry.date), // 날짜 형식 변환 적용
              shippingDate: formatDateForInput(result.entry.shippingDate), // 출고날짜 형식 변환 적용
              quantity: result.entry.quantity,
              status: result.entry.status || '입고중',
              isNew: false,
              createdAt: result.entry.createdAt,
              updatedAt: result.entry.updatedAt
            }
          : e
      ));

      console.log('🔄 [saveWarehouseEntry] 로컬 상태 업데이트 완료, entry_quantity 업데이트 시작');

      // 자동 저장 성공 시 사용자에게 알림
      toast.success('입고기록이 자동으로 저장되었습니다! 🎉');

      // 입고기록 저장 후 프로젝트의 entry_quantity 업데이트
      await updateProjectEntryQuantity();

    } catch (error) {
      // 자동 저장 실패 시 사용자에게 알림 (선택사항)
      // toast.error(`입고기록 자동 저장에 실패했습니다: ${error.message}`);
    }
  }, [warehouseEntries, project.id]);

  // 입고기록을 DB에 저장 (수동 저장용)
  const saveWarehouseEntryManual = useCallback(async (entryId) => {
    const entry = warehouseEntries.find(e => e.id === entryId);
    if (!entry) return;

    // 필수 필드 검증
    if (!entry.date || !entry.shippingDate || !entry.quantity || entry.quantity <= 0) {
      toast.error('입고 날짜, 출고 날짜, 수량을 모두 입력해주세요.');
      return;
    }

    try {


      // 인증 토큰 가져오기
      const token = getAuthToken();
      if (!token) {
        throw new Error('인증 토큰이 없습니다. 다시 로그인해주세요.');
      }

      const response = await fetch('/api/warehouse/entries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          projectId: project.id,
          entryDate: entry.date,
          shippingDate: entry.shippingDate,
          quantity: parseInt(entry.quantity)
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '입고기록 저장에 실패했습니다.');
      }

      const result = await response.json();
      
      // 서버에서 반환된 실제 ID와 데이터로 업데이트
      setWarehouseEntries(prev => prev.map(e => 
        e.id === entryId 
          ? {
              ...e,
              id: result.entry.id,
              isNew: false,
              status: result.entry.status,
              createdAt: result.entry.createdAt,
              updatedAt: result.entry.updatedAt
            }
          : e
      ));

      toast.success('입고기록이 성공적으로 저장되었습니다.');

      // 입고기록 저장 후 프로젝트의 entry_quantity 업데이트
      await updateProjectEntryQuantity();

    } catch (error) {
      toast.error(`입고기록 저장에 실패했습니다: ${error.message}`);
    }
  }, [warehouseEntries, project.id]);

  // 입고기록 수정
  const updateWarehouseEntry = useCallback(async (entryId) => {
    const entry = warehouseEntries.find(e => e.id === entryId);
    if (!entry || entry.isNew) return;

    // 필수 필드 검증
    if (!entry.date || !entry.shippingDate || !entry.quantity || entry.quantity <= 0) {
      toast.error('입고 날짜, 출고 날짜, 수량을 모두 입력해주세요.');
      return;
    }

    try {


      // 인증 토큰 가져오기
      const token = getAuthToken();
      if (!token) {
        throw new Error('인증 토큰이 없습니다. 다시 로그인해주세요.');
      }

      const response = await fetch(`/api/warehouse/entries/${entryId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          entryDate: entry.date,
          shippingDate: entry.shippingDate,
          quantity: parseInt(entry.quantity),
          status: entry.status
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '입고기록 수정에 실패했습니다.');
      }

      const result = await response.json();
      
      // 서버에서 반환된 데이터로 업데이트
      setWarehouseEntries(prev => prev.map(e => 
        e.id === entryId 
          ? {
              ...e,
              ...result.entry,
              updatedAt: result.entry.updatedAt
            }
          : e
      ));

      toast.success('입고기록이 성공적으로 수정되었습니다.');

      // 입고기록 수정 후 프로젝트의 entry_quantity 업데이트
      await updateProjectEntryQuantity();

    } catch (error) {
      toast.error(`입고기록 수정에 실패했습니다: ${error.message}`);
    }
  }, [warehouseEntries, project.id]);

  // 입고기록 삭제 (서버에서)
  const deleteWarehouseEntryFromServer = useCallback(async (entryId) => {
    const entry = warehouseEntries.find(e => e.id === entryId);
    if (!entry) return;

    try {


      // 인증 토큰 가져오기
      const token = getAuthToken();
      if (!token) {
        throw new Error('인증 토큰이 없습니다. 다시 로그인해주세요.');
      }

      const response = await fetch(`/api/warehouse/entries/${entryId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '입고기록 삭제에 실패했습니다.');
      }

      const result = await response.json();
      
      // 로컬 상태에서 제거
      setWarehouseEntries(prev => prev.filter(e => e.id !== entryId));
      
      toast.success('입고기록이 성공적으로 삭제되었습니다.');

      // 입고기록 삭제 후 프로젝트의 entry_quantity 업데이트
      await updateProjectEntryQuantity();

    } catch (error) {
      toast.error(`입고기록 삭제에 실패했습니다: ${error.message}`);
    }
  }, [warehouseEntries]);

  // 프로젝트의 entry_quantity 업데이트 (warehouse_entries의 quantity 합산)
  const updateProjectEntryQuantity = useCallback(async () => {
    console.log('🔄 [updateProjectEntryQuantity] 프로젝트 entry_quantity 업데이트 시작');
    
    try {
      // 인증 토큰 가져오기
      const token = getAuthToken();
      if (!token) {
        console.log('❌ [updateProjectEntryQuantity] 인증 토큰이 없어서 entry_quantity 업데이트를 건너뜁니다.');
        return;
      }

      console.log('📤 [updateProjectEntryQuantity] 서버에서 warehouse_entries quantity 합산 조회 시작:', {
        projectId: project.id,
        url: `/api/warehouse/project/${project.id}/total-quantity`
      });

      // 서버에서 해당 프로젝트의 warehouse_entries quantity를 모두 조회하여 합산
      const response = await fetch(`/api/warehouse/project/${project.id}/total-quantity`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ [updateProjectEntryQuantity] warehouse entries quantity 조회 실패:', errorData.error);
        return;
      }

      const result = await response.json();
      const totalQuantity = result.total_quantity || 0;

      console.log('✅ [updateProjectEntryQuantity] 서버에서 조회한 총 quantity:', {
        totalQuantity,
        response: result
      });

      console.log('📤 [updateProjectEntryQuantity] 프로젝트 entry_quantity 업데이트 전송:', {
        projectId: project.id,
        entry_quantity: totalQuantity,
        url: `/api/mj-project/${project.id}/entry-quantity`
      });

      // 프로젝트의 entry_quantity 업데이트
      const updateResponse = await fetch(`/api/mj-project/${project.id}/entry-quantity`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          entry_quantity: totalQuantity
        })
      });

      if (!updateResponse.ok) {
        const errorData = await updateResponse.json();
        console.error('❌ [updateProjectEntryQuantity] entry_quantity 업데이트 실패:', errorData.error);
        return;
      }

      const updateResult = await updateResponse.json();
      console.log('✅ [updateProjectEntryQuantity] entry_quantity 업데이트 성공:', updateResult);

      // 부모 컴포넌트에 업데이트 알림 (필요시)
      if (onDeliveryStatusChange) {
        onDeliveryStatusChange('입고중');
      }

    } catch (error) {
      console.error('entry_quantity 업데이트 중 오류:', error);
    }
  }, [project.id, onDeliveryStatusChange]);

  // 특정 행에 이미지 업로드
  const handleImageUpload = useCallback(async (event, entryId) => {
    const files = Array.from(event.target.files);
    const targetEntry = warehouseEntries.find(entry => entry.id === entryId);
    
    if (!targetEntry) return;
    
    if (targetEntry.images.length + files.length > 5) {
      toast.error('최대 5개까지만 업로드할 수 있습니다.');
      return;
    }

    try {
      // 입고기록이 DB에 저장되어 있는지 확인
      if (targetEntry.isNew) {
        // 필수 필드가 모두 입력되었는지 확인
        if (!targetEntry.date || !targetEntry.shippingDate || !targetEntry.quantity || targetEntry.quantity <= 0) {
          toast.error('이미지를 업로드하기 전에 입고기록을 먼저 저장해주세요. (날짜, 출고날짜, 수량 입력 후 저장 버튼 클릭)');
          return;
        }
        
        // 입고기록을 먼저 저장
  
        await handleSaveEntry(entryId);
        
        // 저장 후 업데이트된 entry 정보 가져오기
        const updatedEntry = warehouseEntries.find(e => e.id === entryId);
        if (!updatedEntry || updatedEntry.isNew) {
          throw new Error('입고기록 저장에 실패했습니다.');
        }
        
        // 새로운 entryId 사용 (서버에서 반환된 실제 ID)
        entryId = updatedEntry.id;

      }

      // FormData를 사용하여 서버로 파일 업로드
      const formData = new FormData();
      files.forEach(file => {
        // 고유한 파일명 생성
        const uniqueFileName = generateUniqueFileName(file, project.id, entryId);
        
        // 원본 파일을 복사하고 이름을 변경
        const renamedFile = new File([file], uniqueFileName, {
          type: file.type,
          lastModified: file.lastModified
        });
        

        
        formData.append('images', renamedFile);
      });
      formData.append('projectId', project.id);
      formData.append('entryId', entryId);
      


      // 인증 토큰 가져오기
      const token = getAuthToken();
      if (!token) {
        throw new Error('인증 토큰이 없습니다. 다시 로그인해주세요.');
      }



      const response = await fetch('/api/warehouse/upload-images', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });



      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '이미지 업로드에 실패했습니다.');
      }

      const result = await response.json();
      
      // 서버에서 반환된 이미지 정보를 상태에 저장
      
      const newImages = result.images.map(image => {
        const mappedImage = {
          id: image.id || image.storedName, // ID가 없으면 storedName을 ID로 사용
          name: image.originalName || image.name,
          size: image.fileSize || image.size,
          url: image.url,
          thumbnailUrl: image.thumbnailUrl,
          storedName: image.storedName,
          filename: image.filename || image.originalName || image.name,
          // 추가 필드들도 포함
          ...image
        };
        return mappedImage;
      });

      // 이미지 상태 업데이트 - 정확한 entry 찾기
      
      setWarehouseEntries(prev => {
        // 정확한 entry를 찾기 위한 로직
        let targetEntryId = targetEntry.id;
        
        // 새로 저장된 항목인 경우, 실제 DB ID로 찾기
        if (targetEntry.isNew && entryId !== targetEntry.id) {
          targetEntryId = entryId;
        }
        

        
        const updated = prev.map(entry => {
          if (entry.id === targetEntryId) {
            const updatedEntry = { ...entry, images: [...entry.images, ...newImages] };

            return updatedEntry;
          }
          return entry;
        });
        

        return updated;
      });

      toast.success(`${newImages.length}개의 이미지가 성공적으로 업로드되었습니다.`);
      
      // 파일 입력 초기화
      event.target.value = '';
      

      
    } catch (error) {
      toast.error(`이미지 업로드에 실패했습니다: ${error.message}`);
    }
  }, [warehouseEntries, project.id]);

  // 특정 행에서 이미지 제거
  const removeImage = useCallback(async (entryId, imageId) => {
    try {
      // 서버에서 이미지 삭제
      // 인증 토큰 가져오기
      const token = getAuthToken();
      if (!token) {
        throw new Error('인증 토큰이 없습니다. 다시 로그인해주세요.');
      }

      const response = await fetch(`/api/warehouse/delete-image/${imageId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '이미지 삭제에 실패했습니다.');
      }

      // 로컬 상태에서 이미지 제거
      
      setWarehouseEntries(prev => {
        const updated = prev.map(entry => {
          if (entry.id === entryId) {
            const filteredImages = entry.images.filter(img => img.id !== imageId);

            return { ...entry, images: filteredImages };
          }
          return entry;
        });
        
        return updated;
      });
      
      toast.success('이미지가 성공적으로 제거되었습니다.');
      
    } catch (error) {
      toast.error(`이미지 삭제에 실패했습니다: ${error.message}`);
    }
  }, []);

  // 이미지 미리보기 모달 열기
  const openImageModal = useCallback((image) => {
    setSelectedImage(image);
    setIsModalOpen(true);
  }, []);

  // 이미지 미리보기 모달 닫기
  const closeImageModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedImage(null);
  }, []);

  // 첫 번째 행의 입고 상태 확인
  const firstEntry = warehouseEntries[0];
  const isFirstEntryComplete = firstEntry.date && firstEntry.shippingDate && firstEntry.quantity && parseInt(firstEntry.quantity) > 0;

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* 입고 내용 입력 표 헤더 */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Package className="w-5 h-5 mr-2 text-green-600" />
            <h3 className="text-lg font-medium text-gray-900">
              입고 기록
            </h3>
            {/* 첫 번째 행 완성 상태 표시 */}
            {isFirstEntryComplete && (
              <div className="ml-3 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full border border-green-200">
                🚚 납기상태 자동 변경됨
              </div>
            )}
          </div>
          
          {/* 총 입고 수량 정보 - 헤더 옆에 표시 */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 bg-blue-50 px-3 py-2 rounded-lg border border-blue-200">
              <Package className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">
                총 입고 예정:
              </span>
              <span className="text-lg font-bold text-blue-900">
                {project.quantity?.toLocaleString() || '0'}
              </span>
              <span className="text-sm text-blue-700">개</span>
            </div>
            
            {/* 현재까지 입고된 수량 */}
            <div className="flex items-center space-x-2 bg-green-50 px-3 py-2 rounded-lg border border-green-200">
              <Package className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-900">
                입고 완료:
              </span>
              <span className="text-lg font-bold text-green-900">
                {totalEnteredQuantity.toLocaleString()}
              </span>
              <span className="text-sm text-green-700">개</span>
            </div>
            
            {/* 남은 입고 수량 / 초과 입고 수량 */}
            <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg border ${
              remainingQuantity === 0 
                ? 'bg-green-50 border-green-200' 
                : remainingQuantity < 0
                  ? 'bg-red-50 border-red-200'
                  : 'bg-orange-50 border-orange-200'
            }`}>
              <Package className={`w-4 h-4 ${
                remainingQuantity === 0 ? 'text-green-600' : 
                remainingQuantity < 0 ? 'text-red-600' : 'text-orange-600'
              }`} />
              <span className={`text-sm font-medium ${
                remainingQuantity === 0 ? 'text-green-900' : 
                remainingQuantity < 0 ? 'text-red-900' : 'text-orange-900'
              }`}>
                {remainingQuantity < 0 ? '초과 입고 수량:' : '남은 수량:'}
              </span>
              <span className={`text-lg font-bold ${
                remainingQuantity === 0 ? 'text-green-900' : 
                remainingQuantity < 0 ? 'text-red-900' : 'text-orange-900'
              }`}>
                {remainingQuantity < 0 ? `+${Math.abs(remainingQuantity).toLocaleString()}` : remainingQuantity.toLocaleString()}
              </span>
              <span className={`text-sm ${
                remainingQuantity === 0 ? 'text-green-700' : 
                remainingQuantity < 0 ? 'text-red-700' : 'text-orange-700'
              }`}>개</span>
              {remainingQuantity < 0 && (
                <span className="ml-2 text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full border border-red-200">
                  ⚠️ 초과!
                </span>
              )}
              {remainingQuantity === 0 && (
                <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full border border-green-200">
                  🎉 완료!
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 입고 내용 입력 폼 */}
      <div className="p-6">
        {!isAdmin && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center">
              <Package className="w-4 h-4 mr-2 text-yellow-600" />
              <span className="text-sm text-yellow-800">
                입고 내용 입력은 admin 권한이 필요합니다. 현재 읽기 전용 모드입니다.
              </span>
            </div>
          </div>
        )}

        {/* 입고 기록 행들 */}
        {warehouseEntries.map((entry, index) => (
          <div key={entry.id} className={`mb-6 p-4 border rounded-lg ${
            index === 0 && isFirstEntryComplete 
              ? 'border-green-300 bg-green-50' 
              : 'border-gray-200 bg-gray-50'
          }`}>
            {/* 행 헤더 */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <span className={`text-sm font-medium ${
                  index === 0 && isFirstEntryComplete ? 'text-green-700' : 'text-gray-700'
                }`}>
                  입고 기록 #{index + 1}
                  {entry.isNew && (
                    <span className="ml-2 text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full">
                      📝 새로 작성
                    </span>
                  )}
                  {entry.isNew && entry.date && entry.shippingDate && entry.quantity && parseInt(entry.quantity) > 0 && (
                    <span className="ml-2 text-xs bg-yellow-100 text-yellow-600 px-2 py-1 rounded-full">
                      💾 저장 버튼 클릭 필요
                    </span>
                  )}
                  {!entry.isNew && entry.status === '입고완료' && (
                    <span className="ml-2 text-xs bg-green-100 text-green-600 px-2 py-1 rounded-full">
                      ✓ 입고완료
                    </span>
                  )}
                  {index === 0 && isFirstEntryComplete && (
                    <span className="ml-2 text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
                      ✓ 완성됨
                    </span>
                  )}
                </span>
                <div className="flex items-center space-x-2 text-xs text-gray-500">
                  {entry.date && (
                    <span>입고: {entry.date}</span>
                  )}
                  {entry.shippingDate && (
                    <span>출고: {entry.shippingDate}</span>
                  )}
                </div>
              </div>
              
              {/* 행 액션 버튼들 */}
              <div className="flex items-center space-x-2">

                
                {/* 행 삭제 버튼 */}
                {isAdmin && warehouseEntries.length > 1 && (
                  <button
                    onClick={() => removeWarehouseEntry(entry.id)}
                    className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                    title="이 행 삭제"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* 입고 내용 입력 폼 */}
            <div className="flex flex-col lg:flex-row items-end space-y-4 lg:space-y-0 lg:space-x-6">
              {/* 출고 날짜, 입고 날짜, 수량을 하나의 그룹으로 묶기 */}
              <div className="flex items-end space-x-4">
                {/* 출고 날짜 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    출고 날짜
                  </label>
                  <input
                    type="date"
                    value={entry.shippingDate || ''}
                    onChange={(e) => handleShippingDateChange(entry.id, e.target.value)}
                    disabled={!isAdmin}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>

                {/* 입고 날짜 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    입고 날짜
                  </label>
                  <input
                    type="date"
                    value={entry.date || ''}
                    onChange={(e) => handleDateChange(entry.id, e.target.value)}
                    disabled={!isAdmin}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>

                {/* 입고 수량 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    입고 수량
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={entry.quantity}
                      onChange={(e) => handleQuantityChange(entry.id, e.target.value)}
                      disabled={!isAdmin}
                      min="1"
                      max={remainingQuantity + (parseInt(entry.quantity) || 0)}
                      placeholder="수량 입력"
                      className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                    <span className="text-sm text-gray-600">개</span>
                    
                    {/* 저장/업데이트 버튼 - 항상 표시 */}
                    {isAdmin && (
                      <button
                        onClick={() => entry.isNew ? handleSaveEntry(entry.id) : handleUpdateEntry(entry.id)}
                        disabled={!entry.date || !entry.shippingDate || !entry.quantity || parseInt(entry.quantity) <= 0}
                        className={`px-3 py-2 text-white text-sm rounded-md transition-colors ${
                          !entry.date || !entry.shippingDate || !entry.quantity || parseInt(entry.quantity) <= 0
                            ? 'bg-gray-400 cursor-not-allowed'
                            : entry.isNew
                              ? 'bg-blue-600 hover:bg-blue-700'
                              : 'bg-green-600 hover:bg-green-700'
                        }`}
                        title={entry.isNew ? '입고기록 저장' : '입고기록 업데이트'}
                      >
                        {entry.isNew ? '저장' : '업데이트'}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* 이미지 업로드 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  입고 사진
                </label>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      // 인증 토큰 확인
                      const token = getAuthToken();
                      if (!token) {
                        return;
                      }
                      
                      // DB에 저장되지 않은 항목인 경우 안내
                      if (entry.isNew) {
                        toast.info('이미지를 업로드하기 전에 입고기록을 먼저 저장해주세요. (저장 버튼 클릭)');
                        return;
                      }
                      
                      fileInputRef.current?.click();
                    }}
                    disabled={!isAdmin || entry.isNew || entry.images.length >= 5}
                    className="flex items-center px-3 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    {entry.isNew ? '저장 후 업로드' : '사진 추가'}
                  </button>
                  <span className="text-sm text-gray-500">
                    {entry.images.length}/5
                  </span>
                  
                  {/* 업로드된 이미지 썸네일 */}
                  {entry.images && entry.images.length > 0 && (
                    <div className="flex items-center space-x-2 ml-2">
                      {entry.images.map((image, imageIndex) => {
                        // 이미지 소스 결정 로직 개선
                        let imageSrc = null;
                        let imageType = 'unknown';
                        
                        // 1. 서버에서 반환된 URL을 단순화된 경로로 변환
                          if (image.url && image.url.startsWith('/uploads/')) {
                            // /uploads/ 경로를 단순화된 경로로 변환
                            const fileName = image.url.split('/').pop(); // 파일명만 추출
                            imageSrc = `/uploads/project/mj/warehouse/${encodeURIComponent(fileName)}`;
                            imageType = 'simplified_uploads_url';
                          }
                        // 2. 직접 URL (http/https)
                        else if (image.url && (image.url.startsWith('http://') || image.url.startsWith('https://'))) {
                          imageSrc = image.url;
                          imageType = 'http_url';
                        }
                        // 3. 썸네일 URL
                        else if (image.thumbnailUrl && (image.thumbnailUrl.startsWith('http://') || image.thumbnailUrl.startsWith('https://'))) {
                          imageSrc = image.thumbnailUrl;
                          imageType = 'thumbnail_url';
                        }
                        // 4. Base64 데이터
                        else if (image.data && image.data.startsWith('data:image')) {
                          imageSrc = image.data;
                          imageType = 'base64_data';
                        }
                        // 5. 서버 이미지 URL 구성 (ID 기반)
                        else if (image.id) {
                          imageSrc = `/api/warehouse/images/${image.id}`;
                          imageType = 'server_url';
                        }
                        // 6. 상대 경로 URL
                        else if (image.url && image.url.startsWith('/')) {
                          imageSrc = image.url;
                          imageType = 'relative_url';
                        }
                        
                        if (!imageSrc) {
                          return null;
                        }
                        
                        return (
                          <div key={image.id || `img-${entry.id}-${imageIndex}`} className="relative group">
                            <img
                              src={imageSrc}
                              alt={`입고 이미지 ${imageIndex + 1}`}
                              className="w-10 h-10 object-cover rounded-lg border border-gray-200 shadow-sm cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => openImageModal(image)}
                              title="클릭하여 크게 보기"
                              onError={(e) => {
                                // 서버 URL이 실패하면 다른 소스 시도
                                if (image.thumbnailUrl && image.thumbnailUrl !== imageSrc) {
                                  // 썸네일 URL도 /uploads/ 경로인 경우 단순화된 경로로 변환
                                  if (image.thumbnailUrl.startsWith('/uploads/')) {
                                    const thumbnailFileName = image.thumbnailUrl.split('/').pop();
                                    const thumbnailSimplifiedUrl = `/uploads/project/mj/warehouse/${encodeURIComponent(thumbnailFileName)}`;
                                    e.target.src = thumbnailSimplifiedUrl;
                                  } else {
                                    e.target.src = image.thumbnailUrl;
                                  }
                                } else if (image.data && image.data.startsWith('data:image')) {
                                  e.target.src = image.data;
                                } else if (image.storedName) {
                                  // storedName을 사용하여 단순화된 경로 구성
                                  const fallbackUrl = `/uploads/project/mj/warehouse/${encodeURIComponent(image.storedName)}`;
                                  e.target.src = fallbackUrl;
                                }
                              }}

                            />
                            {isAdmin && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeImage(entry.id, image.id);
                                }}
                                className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 transition-colors flex items-center justify-center"
                                title="이미지 삭제"
                              >
                                <X className="w-2.5 h-2.5" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                
                {/* 숨겨진 파일 입력 */}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, entry.id)}
                  className="hidden"
                />
              </div>
            </div>
          </div>
        ))}

        {/* 새로운 행 추가 버튼 */}
        {isAdmin && (
          <div className="flex justify-center">
            <button
              onClick={addWarehouseEntry}
              disabled={warehouseEntries.length >= 10}
              className="flex items-center px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              새로운 입고 기록 추가
            </button>
          </div>
        )}

        {/* 안내 메시지 */}
        <div className="mt-4 text-center text-sm text-gray-500">
          {warehouseEntries.length >= 10 && (
            <p>최대 10개까지 입고 기록을 추가할 수 있습니다.</p>
          )}
          {remainingQuantity < 0 && (
            <p className="text-red-600 font-medium">
              ⚠️ 입고 수량이 예정 수량을 초과했습니다. ({Math.abs(remainingQuantity).toLocaleString()}개 초과)
            </p>
          )}
          {isFirstEntryComplete && (
            <p className="text-green-600 font-medium">
              🎉 첫 번째 입고 기록이 완성되어 납기상태가 자동으로 "입고중"으로 변경되었습니다!
            </p>
          )}
          {remainingQuantity === 0 && totalEnteredQuantity > 0 && (
            <p className="text-green-600 font-medium">
              🎉 모든 입고가 완료되어 납기상태가 자동으로 "입고 완료"로 변경되었습니다!
            </p>
          )}
        </div>
      </div>

      {/* 이미지 미리보기 모달 */}
      {isModalOpen && selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
          <div className="relative w-full h-full flex items-center justify-center p-2">
            {/* 모달 닫기 버튼 */}
            <button
              onClick={closeImageModal}
              className="absolute top-4 right-4 w-12 h-12 bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 z-10 border border-white border-opacity-30"
            >
              <X className="w-7 h-7" />
            </button>
            
            {/* 이미지 */}
            <img
              src={selectedImage.url || selectedImage.thumbnailUrl || selectedImage.data}
              alt="입고 이미지 미리보기"
              className="w-full h-full object-contain"
              onError={(e) => {
                // 서버 URL이 실패하면 기존 Base64 데이터 사용 (fallback)
                if (selectedImage.data) {
                  e.target.src = selectedImage.data;
                }
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default WarehouseEntry; 