import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Package, ArrowLeft, Plus, Trash2, Edit, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ProjectSearchModal from './ProjectSearchModal';
import { toast } from 'react-hot-toast';

const MakePackingList = () => {
  const navigate = useNavigate();
  
  // 포장 코드별 상품 데이터 상태
  const [packingData, setPackingData] = useState([]);
  const [plDate, setPlDate] = useState(new Date().toISOString().split('T')[0]);
  const [logisticCompany, setLogisticCompany] = useState('비전');
  
  // 검색 모달 상태
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [currentSearchContext, setCurrentSearchContext] = useState(null);
  
  // 자동 저장 상태
  const [autoSaveStatus, setAutoSaveStatus] = useState('idle'); // idle, saving, success, error
  const [lastSavedAt, setLastSavedAt] = useState(null);
  
  // 포장코드 입력을 위한 임시 상태
  const [editingPackingCodes, setEditingPackingCodes] = useState({});
  const packingCodeRefs = useRef({});
  
  // 포장코드 추가 모달 상태
  const [isAddPackingCodeModalOpen, setIsAddPackingCodeModalOpen] = useState(false);
  const [newPackingCodeInput, setNewPackingCodeInput] = useState('');

  // 선택된 프로젝트 ID 상태
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  
  // 이미 저장된 상품 ID 추적을 위한 상태
  const [savedProductIds, setSavedProductIds] = useState(new Set());

  // 상품 추가 중 상태
  const [addingProduct, setAddingProduct] = useState({});

  // exportQuantity 계산 함수
  const calculateExportQuantity = useCallback((packagingMethod, packagingCount, boxCount) => {
    const method = Number(packagingMethod) || 0;
    const count = Number(packagingCount) || 0;
    const boxes = Number(boxCount) || 0;
    
    const exportQuantity = method * count * boxes;
    
    console.log('🧮 [calculateExportQuantity] 출고 수량 계산:', {
      packagingMethod: method,
      packagingCount: count,
      boxCount: boxes,
      calculation: `${method} × ${count} × ${boxes}`,
      exportQuantity: exportQuantity
    });
    
    return exportQuantity;
  }, []);

  // 프로젝트 export_quantity 업데이트 함수 (기존 방식)
  const updateProjectExportQuantity = useCallback(async (projectId, totalExportQuantity) => {
    if (!projectId) {
      console.warn('⚠️ [updateProjectExportQuantity] 프로젝트 ID가 없습니다.');
      return false;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('인증 토큰이 없습니다.');
      }

      console.log('🚀 [updateProjectExportQuantity] 프로젝트 export_quantity 업데이트 시작:', {
        projectId,
        totalExportQuantity
      });

      const response = await fetch('/api/packing-list/update-project-export-quantity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          projectId,
          exportQuantity: totalExportQuantity
        })
      });

      if (!response.ok) {
        throw new Error('프로젝트 export_quantity 업데이트에 실패했습니다.');
      }

      const result = await response.json();
      
      if (result.success) {
        console.log('✅ [updateProjectExportQuantity] 프로젝트 export_quantity 업데이트 성공:', {
          projectId,
          oldExportQuantity: result.oldExportQuantity,
          newExportQuantity: result.newExportQuantity,
          remainQuantity: result.remainQuantity
        });
        return true;
      } else {
        throw new Error(result.error || '업데이트에 실패했습니다.');
      }
      
    } catch (error) {
      console.error('❌ [updateProjectExportQuantity] 프로젝트 export_quantity 업데이트 오류:', {
        error: error.message,
        projectId,
        totalExportQuantity
      });
      return false;
    }
  }, []);

  // mj_packing_list 기반으로 프로젝트 export_quantity 계산 및 업데이트 함수
  const calculateProjectExportQuantity = useCallback(async (projectId) => {
    if (!projectId) {
      console.warn('⚠️ [calculateProjectExportQuantity] 프로젝트 ID가 없습니다.');
      return false;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('인증 토큰이 없습니다.');
      }

      console.log('🚀 [calculateProjectExportQuantity] mj_packing_list 기반 export_quantity 계산 시작:', {
        projectId
      });

      const response = await fetch('/api/packing-list/calculate-project-export-quantity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          projectId
        })
      });

      if (!response.ok) {
        throw new Error('프로젝트 export_quantity 계산에 실패했습니다.');
      }

      const result = await response.json();
      
      if (result.success) {
        console.log('✅ [calculateProjectExportQuantity] 프로젝트 export_quantity 계산 및 업데이트 성공:', {
          projectId,
          oldExportQuantity: result.oldExportQuantity,
          newExportQuantity: result.newExportQuantity,
          remainQuantity: result.remainQuantity,
          packingListCount: result.packingListCount,
          calculationDetails: result.calculationDetails
        });

        // 각 물품별 계산 상세 로그 출력
        if (result.calculationDetails && result.calculationDetails.length > 0) {
          console.log('📦 [calculateProjectExportQuantity] 물품별 개별 계산 상세:', result.calculationDetails.map(item => ({
            packingCode: item.packingCode,
            productName: item.productName,
            clientProductId: item.clientProductId,
            calculation: `${item.boxCount} × ${item.packagingCount} × ${item.packagingMethod} = ${item.calculatedQuantity}`
          })));
        }
        return true;
      } else {
        // 제약조건 위반 등 상세한 오류 정보 포함
        const errorMessage = result.error || '계산에 실패했습니다.';
        const errorDetails = result.details ? ` (${JSON.stringify(result.details)})` : '';
        throw new Error(errorMessage + errorDetails);
      }
      
    } catch (error) {
      console.error('❌ [calculateProjectExportQuantity] 프로젝트 export_quantity 계산 오류:', {
        error: error.message,
        projectId
      });
      return false;
    }
  }, []);
  


  const handleBack = () => {
    navigate('/dashboard/mj-packing-list');
  };

  // 자동 저장 함수
  const autoSavePackingList = useCallback(async (packingCode, product, forceInsert = false) => {
    console.log('🚀 [autoSavePackingList] 자동 저장 시작:', {
      packingCode,
      productId: product.id,
      productName: product.productName,
      currentTime: new Date().toISOString(),
      productData: product,
      selectedProjectId,
      hasSelectedProject: !!selectedProjectId
    });
    
    // 중복 저장 방지: 이미 저장된 상품이고 forceInsert가 false인 경우 건너뛰기
    if (savedProductIds.has(product.id) && !forceInsert) {
      console.log('⚠️ [autoSavePackingList] 이미 저장된 상품으로 건너뛰기:', {
        productId: product.id,
        productName: product.productName,
        isSaved: savedProductIds.has(product.id),
        forceInsert,
        savedProductIds: Array.from(savedProductIds)
      });
      return;
    }
    
    if (!packingCode || !product.productName) {
      console.log('⚠️ [autoSavePackingList] 필수 필드 누락으로 저장 건너뛰기:', {
        packingCode: !!packingCode,
        productName: !!product.productName
      });
      return; // 필수 필드가 없으면 저장하지 않음
    }

    setAutoSaveStatus('saving');
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('인증 토큰이 없습니다.');
      }

      // packingGroup에서 pl_date와 logistic_company 가져오기
      const packingGroup = packingData.find(item => item.packingCode === packingCode);
      
      console.log('🔍 [autoSavePackingList] 전체 packingData 상태:', {
        totalPackingCodes: packingData.length,
        allPackingCodes: packingData.map(item => ({
          packingCode: item.packingCode,
          plDate: item.plDate,
          projectId: item.projectId,
          productCount: item.products.length
        }))
      });
      
      if (!packingGroup) {
        console.warn('⚠️ [autoSavePackingList] packingGroup을 찾을 수 없음, 전역 상태 사용:', {
          packingCode,
          availablePackingCodes: packingData.map(item => item.packingCode),
          totalPackingCodes: packingData.length,
          packingDataState: packingData
        });
        
        // packingGroup을 찾을 수 없으면 전역 상태 사용
        console.log('🔄 [autoSavePackingList] 전역 상태 사용:', {
          globalPlDate: plDate,
          globalLogisticCompany: logisticCompany,
          selectedProjectId
        });
      }
      
      console.log('🔍 [autoSavePackingList] packingGroup 정보:', {
        packingCode,
        packingGroup: packingGroup ? '찾음' : '찾을 수 없음',
        packingGroupData: packingGroup,
        globalPlDate: plDate,
        packingGroupPlDate: packingGroup?.plDate,
        productPlDate: product.plDate,
        globalLogisticCompany: logisticCompany,
        packingGroupLogisticCompany: packingGroup?.logisticCompany
      });
      
      // 날짜 우선순위: 날짜 입력 필드 > product.plDate > packingGroup.plDate > global plDate
      let finalPlDate = plDate;
      let finalLogisticCompany = logisticCompany;
      
      // 날짜 입력 필드에서 직접 현재 값을 읽어오기
      const dateInputElement = document.getElementById('pl-date-input');
      const currentDateInputValue = dateInputElement ? dateInputElement.value : null;
      
      if (currentDateInputValue && currentDateInputValue.trim() !== '') {
        // 날짜 입력 필드의 현재 값 사용 (가장 신뢰할 수 있는 값)
        finalPlDate = currentDateInputValue;
        console.log('📅 [autoSavePackingList] 날짜 입력 필드 값 사용:', finalPlDate);
      } else if (product.plDate) {
        // handleDateChange에서 전달된 product의 plDate 사용
        finalPlDate = product.plDate;
        console.log('📅 [autoSavePackingList] product.plDate 사용:', finalPlDate);
      } else if (packingGroup?.plDate) {
        // packingGroup의 plDate 사용
        finalPlDate = packingGroup.plDate;
        console.log('📅 [autoSavePackingList] packingGroup.plDate 사용:', finalPlDate);
      } else {
        // 전역 plDate 사용
        console.log('📅 [autoSavePackingList] global plDate 사용:', finalPlDate);
      }
      
      if (packingGroup?.logisticCompany) {
        finalLogisticCompany = packingGroup.logisticCompany;
      }
      
      // projectId 우선순위: 상품 > 포장코드 그룹 > 전역 선택
      const projectIdFromData = product.projectId || packingGroup?.projectId || selectedProjectId;
      
      const saveData = {
        packing_code: packingCode,
        box_count: product.boxCount || 0,
        pl_date: finalPlDate,
        logistic_company: finalLogisticCompany,
        product_name: product.productName,
        product_sku: product.sku || '',
        product_image: product.firstImage?.url || '',
        packaging_method: product.packagingMethod || 0,
        packaging_count: product.packagingCount || 0,
        quantity_per_box: product.packagingMethod && product.packagingMethod > 0 && product.packagingCount > 0
          ? (product.packagingMethod * product.packagingCount)
          : 0,
        // 새 상품 추가 시 강제 삽입 플래그
        force_insert: forceInsert,
        // 디버깅을 위한 추가 정보
        client_product_id: product.id,
        // 프로젝트 ID 추가 (packingData에서 우선, 없으면 selectedProjectId 사용)
        project_id: projectIdFromData,
        timestamp: new Date().toISOString()
      };
      
      console.log('📤 [autoSavePackingList] 최종 saveData:', {
        packing_code: saveData.packing_code,
        pl_date: saveData.pl_date,
        pl_date_source: currentDateInputValue ? '날짜 입력 필드' : (product.plDate ? 'product.plDate' : (packingGroup?.plDate ? 'packingGroup.plDate' : 'global plDate')),
        dateInputValue: currentDateInputValue,
        productPlDate: product.plDate,
        packingGroup_plDate: packingGroup?.plDate,
        global_plDate: plDate,
        project_id: saveData.project_id
      });

      console.log('📤 [autoSavePackingList] 서버로 전송할 데이터:', saveData);
      console.log('🔍 [autoSavePackingList] project_id 확인:', {
        selectedProjectId,
        packingGroupProjectId: packingGroup?.projectId,
        projectIdFromData,
        saveDataProjectId: saveData.project_id,
        hasProjectId: !!saveData.project_id,
        packingDataProjectIds: packingData.map(item => ({
          packingCode: item.packingCode,
          projectId: item.projectId
        }))
      });

      const response = await fetch('/api/packing-list/auto-save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(saveData)
      });

      if (!response.ok) {
        throw new Error('저장에 실패했습니다.');
      }

      const result = await response.json();
      
      console.log('📥 [autoSavePackingList] 서버 응답:', result);
      
      if (result.success) {
        setAutoSaveStatus('success');
        setLastSavedAt(new Date());
        
        // 3초 후 상태를 idle로 변경
        setTimeout(() => {
          setAutoSaveStatus('idle');
        }, 3000);
        
        // 저장 성공 시 상품 ID를 저장된 목록에 추가
        setSavedProductIds(prev => new Set([...prev, product.id]));
        
        console.log('✅ [autoSavePackingList] 패킹리스트 자동 저장 성공:', {
          message: result.message,
          action: result.action,
          id: result.id,
          productName: product.productName,
          savedProductIds: Array.from([...savedProductIds, product.id])
        });
      } else {
        throw new Error(result.error || '저장에 실패했습니다.');
      }
      
    } catch (error) {
      console.error('❌ [autoSavePackingList] 패킹리스트 자동 저장 오류:', {
        error: error.message,
        productName: product.productName,
        packingCode,
        stack: error.stack
      });
      setAutoSaveStatus('error');
      
      // 5초 후 상태를 idle로 변경
      setTimeout(() => {
        setAutoSaveStatus('idle');
      }, 5000);
      
      toast.error('자동 저장에 실패했습니다: ' + error.message);
    }
  }, []);

  // useEffect 제거 - 상태 동기화 문제로 인한 저장 실패 방지

  // 포커스 아웃 시 자동 저장
  const handleBlur = useCallback((packingCode, product) => {
    console.log('🔍 [handleBlur] 포커스 아웃 감지:', {
      packingCode,
      productId: product.id,
      productName: product.productName,
      currentTime: new Date().toISOString(),
      productData: product
    });
    
    // 기존 상품 수정 시에는 forceInsert: false (중복 저장 방지)
    autoSavePackingList(packingCode, product, false);
  }, [autoSavePackingList]);

  // 포장코드 변경 시 자동 저장 (포커스 아웃 시에만 실행)
  const handlePackingCodeChange = useCallback((oldPackingCode, newPackingCode) => {
    // 포장코드가 실제로 변경되었는지 확인
    if (oldPackingCode === newPackingCode) {
      return;
    }

    // 먼저 로컬 상태 업데이트
    setPackingData(prev => {
      const updatedData = prev.map(item => {
        if (item.packingCode === oldPackingCode) {
          return { ...item, packingCode: newPackingCode };
        }
        return item;
      });
      
      return updatedData;
    });
    
    // 포장코드 변경 시 자동저장 실행
    console.log(`ℹ️ 포장코드 변경: ${oldPackingCode} → ${newPackingCode} (자동저장 시작)`);
    
    // 해당 포장코드의 모든 상품에 대해 자동저장 실행
    const packingGroup = packingData.find(item => item.packingCode === newPackingCode);
    if (packingGroup && packingGroup.products.length > 0) {
      packingGroup.products.forEach(product => {
        if (product.productName && product.productName.trim() !== '') {
          console.log(`💾 [handlePackingCodeChange] 포장코드 변경 자동저장: ${newPackingCode} - ${product.productName}`);
          // 기존 상품 수정 시에는 forceInsert: false (중복 저장 방지)
          autoSavePackingList(newPackingCode, product, false);
        }
      });
    }
  }, [packingData, autoSavePackingList]);

  // 박스수 변경 시 자동 저장 (포커스 아웃 시에만 실행)
  const handleBoxCountChange = useCallback((packingCode, newBoxCount) => {
    setPackingData(prev => {
      const updatedData = prev.map(item => {
        if (item.packingCode === packingCode) {
          return {
            ...item,
            products: item.products.map(product => {
              const updatedProduct = { ...product, boxCount: newBoxCount };
              
              // exportQuantity 자동 계산 및 업데이트
              const exportQuantity = calculateExportQuantity(
                updatedProduct.packagingMethod,
                updatedProduct.packagingCount,
                updatedProduct.boxCount
              );
              updatedProduct.exportQuantity = exportQuantity;
              
              console.log('🧮 [handleBoxCountChange] exportQuantity 자동 계산 완료:', {
                packingCode,
                productId: updatedProduct.id,
                productName: updatedProduct.productName,
                boxCount: newBoxCount,
                exportQuantity,
                calculation: `${updatedProduct.packagingMethod} × ${updatedProduct.packagingCount} × ${newBoxCount} = ${exportQuantity}`
              });
              
              return updatedProduct;
            })
          };
        }
        return item;
      });
      
      return updatedData;
    });
    
    // 박스수 변경 시 자동저장 실행
    console.log(`ℹ️ 박스수 변경: ${packingCode} → ${newBoxCount} (자동저장 시작)`);
    
    // 해당 포장코드의 모든 상품에 대해 자동저장 실행
    const packingGroup = packingData.find(item => item.packingCode === packingCode);
    if (packingGroup && packingGroup.products.length > 0) {
      packingGroup.products.forEach(product => {
        if (product.productName && product.productName.trim() !== '') {
          console.log(`💾 [handleBoxCountChange] 박스수 변경 자동저장: ${packingCode} - ${product.productName}`);
          // 기존 상품 수정 시에는 forceInsert: false (중복 저장 방지)
          autoSavePackingList(packingCode, product, false);
        }
      });
    }
  }, [packingData, autoSavePackingList, calculateExportQuantity]);

  // 작성 날짜 변경 시 자동 저장
  const handleDateChange = useCallback((newDate) => {
    console.log(`ℹ️ [handleDateChange] 작성 날짜 변경 시작: ${newDate}`);
    
    // 전역 날짜 상태 업데이트
    setPlDate(newDate);
    
    // 기존 포장코드들의 plDate도 업데이트
    setPackingData(prev => {
      const updatedData = prev.map(item => ({
        ...item,
        plDate: newDate
      }));
      
      console.log('🔄 [handleDateChange] 포장코드 데이터 plDate 업데이트 완료:', {
        newDate,
        updatedData: updatedData.map(item => ({
          packingCode: item.packingCode,
          plDate: item.plDate
        }))
      });
      
      return updatedData;
    });
    
    // 날짜 변경 시 자동저장은 필요 없음 - autoSavePackingList에서 날짜 입력 필드 값을 직접 읽어옴
    console.log('ℹ️ [handleDateChange] 날짜 변경 완료. 자동저장 시 날짜 입력 필드 값 사용 예정.');
  }, []);

  // 물류회사 변경 시 자동 저장 (더 이상 사용되지 않음)
  const handleLogisticCompanyChange = useCallback((newCompany) => {
    console.log('🚚 [handleLogisticCompanyChange] 물류회사 변경:', newCompany);
    setLogisticCompany(newCompany);
  }, []);

  // 포장코드 추가 모달 열기
  const openAddPackingCodeModal = () => {
    setIsAddPackingCodeModalOpen(true);
    setNewPackingCodeInput('');
  };

  // 포장코드 추가 모달 닫기
  const closeAddPackingCodeModal = () => {
    setIsAddPackingCodeModalOpen(false);
    setNewPackingCodeInput('');
  };



  // UUID 생성 함수
  const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  // 새로운 포장코드 추가
  const addPackingCode = () => {
    console.log('🏷️ [addPackingCode] 새 포장코드 추가 시작:', {
      inputValue: newPackingCodeInput,
      currentTime: new Date().toISOString()
    });
    
    if (!newPackingCodeInput || newPackingCodeInput.trim() === '') {
      console.log('⚠️ [addPackingCode] 포장코드 입력값이 비어있음');
      toast.error('포장코드를 입력해주세요.');
      return;
    }
    
    // 중복 포장코드 확인
    const isDuplicate = packingData.some(item => item.packingCode === newPackingCodeInput.trim());
    if (isDuplicate) {
      console.log('⚠️ [addPackingCode] 중복 포장코드 감지:', newPackingCodeInput.trim());
      toast.error('이미 존재하는 포장코드입니다.');
      return;
    }
    
    const newPackingCode = {
      packingCode: newPackingCodeInput.trim(),
      plDate: plDate,
      logisticCompany: logisticCompany || '비전',
      projectId: selectedProjectId, // 프로젝트 ID 포함
      products: [
        {
          id: generateUUID(), // UUID 사용
          productName: '새 상품',
          sku: 'SKU-' + Date.now(),
          boxCount: 0,
          packagingMethod: 0,
          packagingCount: 0,
          exportQuantity: 0, // 출고 수량 초기화
          firstImage: null,  // 이미지 정보 초기화
          projectId: selectedProjectId // 선택된 프로젝트 ID 설정
        }
      ]
    };
    
    // exportQuantity 계산
    newPackingCode.products[0].exportQuantity = calculateExportQuantity(
      newPackingCode.products[0].packagingMethod,
      newPackingCode.products[0].packagingCount,
      newPackingCode.products[0].boxCount
    );
    
    console.log('🆕 [addPackingCode] 새 포장코드 생성:', {
      newPackingCode: newPackingCode.packingCode,
      newProductId: newPackingCode.products[0].id,
      plDate: newPackingCode.plDate,
      logisticCompany: newPackingCode.logisticCompany,
      globalLogisticCompany: logisticCompany
    });
    
    setPackingData(prev => {
      const updatedData = [...prev, newPackingCode];
      console.log('📊 [addPackingCode] 포장코드 추가 후 전체 데이터 상태:', {
        totalPackingCodes: updatedData.length,
        totalProducts: updatedData.reduce((sum, item) => sum + item.products.length, 0),
        packingCodes: updatedData.map(item => ({
          packingCode: item.packingCode,
          productCount: item.products.length,
          productIds: item.products.map(p => p.id)
        }))
      });
      
      return updatedData;
    });
    
    // useEffect가 packingData 변경을 감지하여 자동 저장 처리
    console.log('💾 [addPackingCode] 상태 업데이트 완료, useEffect가 자동 저장 처리 예정');
    
    toast.success(`포장코드 '${newPackingCodeInput.trim()}'가 추가되었습니다.`);
    closeAddPackingCodeModal();
  };

  // 액션 버튼들 컴포넌트
  const ActionButtons = () => {
    return (
      <div className="flex space-x-2">
        <button
          onClick={openAddPackingCodeModal}
          className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          포장코드 추가
        </button>
        
        <button
          onClick={async () => {
            try {
              // 전체 저장 기능 실행
              const result = await performFullSave();
              
              if (result.success) {
                toast.success(result.message);
              } else {
                toast.error(result.message);
              }
            } catch (error) {
              console.error('❌ [전체 저장] 오류:', error);
              toast.error('전체 저장 중 오류가 발생했습니다.');
            }
          }}
          className={`inline-flex items-center px-4 py-2 text-white text-sm font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors ${
            selectedProjectId 
              ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500' 
              : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
          }`}
        >
          <Package className="w-4 h-4 mr-2" />
          {selectedProjectId ? '전체 저장 (프로젝트 연결됨)' : '전체 저장'}
        </button>
      </div>
    );
  };

  // 전체 저장과 같은 기능을 수행하는 함수 (모든 데이터 저장 + 프로젝트 export_quantity 업데이트)
  const performFullSave = useCallback(async (packingCode = null) => {
    console.log('💾 [performFullSave] 전체 저장 기능 시작:', {
      packingCode: packingCode || '전체',
      currentTime: new Date().toISOString()
    });

    try {
      // 1단계: 모든 패킹리스트 데이터 저장
      console.log('🔄 [performFullSave] 1단계: 모든 패킹리스트 데이터 저장 시작');
      
      const savePromises = [];
      const targetPackingGroups = packingCode 
        ? packingData.filter(item => item.packingCode === packingCode)
        : packingData;

      targetPackingGroups.forEach(packingGroup => {
        packingGroup.products.forEach(product => {
          // 전체 저장 시에는 forceInsert: false (중복 저장 방지)
          savePromises.push(autoSavePackingList(packingGroup.packingCode, product, false));
        });
      });

      // 모든 저장 작업 완료 대기
      await Promise.all(savePromises);
      
      console.log('✅ [performFullSave] 1단계 완료: 모든 패킹리스트 데이터 저장 완료');

      // 2단계: 프로젝트 export_quantity 업데이트 (mj_packing_list 기반 계산)
      if (selectedProjectId) {
        console.log('🔄 [performFullSave] 2단계: 프로젝트 export_quantity 계산 시작:', {
          selectedProjectId,
          packingDataSummary: packingData.map(group => ({
            packingCode: group.packingCode,
            productCount: group.products.length,
            groupExportQuantity: group.products.reduce((sum, p) => sum + (p.exportQuantity || 0), 0)
          }))
        });

        // mj_packing_list 테이블의 데이터를 기반으로 export_quantity 계산 및 업데이트
        const calculateSuccess = await calculateProjectExportQuantity(selectedProjectId);
        if (calculateSuccess) {
          console.log('✅ [performFullSave] 2단계 완료: 프로젝트 출고 수량 계산/업데이트 완료');
          return { success: true, message: '패킹리스트 저장 및 프로젝트 출고 수량 계산/업데이트가 완료되었습니다.' };
        } else {
          console.error('❌ [performFullSave] 2단계 실패: 프로젝트 출고 수량 계산/업데이트 실패');
          return { success: false, message: '패킹리스트는 저장되었으나 프로젝트 출고 수량 계산/업데이트에 실패했습니다.' };
        }
      } else {
        console.log('✅ [performFullSave] 완료: 프로젝트 ID가 없어 export_quantity 업데이트 건너뛰기');
        return { success: true, message: '모든 데이터가 저장되었습니다.' };
      }
    } catch (error) {
      console.error('❌ [performFullSave] 전체 저장 중 오류:', {
        packingCode,
        error: error.message
      });
      return { success: false, message: `전체 저장 중 오류가 발생했습니다: ${error.message}` };
    }
  }, [packingData, selectedProjectId, autoSavePackingList, calculateProjectExportQuantity]);

  // 상품 추가
  const addProduct = async (packingCode) => {
    console.log('➕ [addProduct] 새 상품 추가 시작:', {
      packingCode,
      currentTime: new Date().toISOString()
    });

    // 로딩 상태 설정
    setAddingProduct(prev => ({ ...prev, [packingCode]: true }));

    try {
      // 상품 추가 전에 기존 물품들을 전체 저장과 같은 방식으로 저장
      console.log('🔄 [addProduct] 상품 추가 전 기존 물품들 전체 저장 시작');
      const saveResult = await performFullSave(packingCode);
      
      if (!saveResult.success) {
        console.error('❌ [addProduct] 기존 물품 전체 저장 실패로 새 상품 추가 중단');
        toast.error(saveResult.message);
        return;
      }
      
      console.log('✅ [addProduct] 기존 물품 전체 저장 완료, 새 상품 추가 진행');
    
              // 고유한 상품명 생성 (중복 방지)
          const timestamp = Date.now();
          const newProduct = {
            id: generateUUID(), // UUID 사용 (변경되지 않는 고유 ID)
            productName: `새 상품 ${timestamp}`,  // 고유한 상품명으로 변경
            sku: 'SKU-' + timestamp,
            boxCount: 0, // 기본값으로 설정
            packagingMethod: 0,
            packagingCount: 0,
            exportQuantity: 0, // 출고 수량 초기화
            firstImage: null,  // 이미지 정보 초기화
            projectId: selectedProjectId // 선택된 프로젝트 ID 설정
          };
    
    console.log('🆕 [addProduct] 새 상품 생성:', {
      newProductId: newProduct.id,
      newProductName: newProduct.productName,
      packingCode,
      timestamp: new Date().toISOString()
    });
    
    setPackingData(prev => {
      const updatedData = prev.map(item => {
        if (item.packingCode === packingCode) {
          // 기존 상품들의 박스수 중 첫 번째 상품의 박스수를 사용
          const existingBoxCount = item.products.length > 0 ? item.products[0].boxCount : 0;
          
          // 박스수 상속
          newProduct.boxCount = existingBoxCount;
          
          // exportQuantity 계산
          newProduct.exportQuantity = calculateExportQuantity(
            newProduct.packagingMethod,
            newProduct.packagingCount,
            newProduct.boxCount
          );
          
          console.log('🧮 [addProduct] 새 상품 exportQuantity 계산 완료:', {
            productId: newProduct.id,
            productName: newProduct.productName,
            packagingMethod: newProduct.packagingMethod,
            packagingCount: newProduct.packagingCount,
            boxCount: newProduct.boxCount,
            exportQuantity: newProduct.exportQuantity
          });
          
          return {
            ...item,
            products: [...item.products, newProduct]
          };
        }
        return item;
      });
      
      console.log('📊 [addProduct] 상품 추가 후 전체 데이터 상태:', {
        totalPackingCodes: updatedData.length,
        totalProducts: updatedData.reduce((sum, item) => sum + item.products.length, 0),
        packingCodes: updatedData.map(item => ({
          packingCode: item.packingCode,
          productCount: item.products.length,
          productIds: item.products.map(p => p.id)
        }))
      });
      
      return updatedData;
    });
    
      // useEffect가 packingData 변경을 감지하여 자동 저장 처리
      console.log('💾 [addProduct] 상태 업데이트 완료, useEffect가 자동 저장 처리 예정');
      
      // 성공 메시지 표시 (전체 저장과 같은 기능이 수행되었음을 알림)
      toast.success(`새 상품이 추가되었습니다. (기존 물품들은 전체 저장과 같은 방식으로 저장되었습니다)`);
      
    } catch (error) {
      console.error('❌ [addProduct] 상품 추가 중 오류:', {
        packingCode,
        error: error.message
      });
      toast.error(`상품 추가 중 오류가 발생했습니다: ${error.message}`);
    } finally {
      // 로딩 상태 해제
      setAddingProduct(prev => ({ ...prev, [packingCode]: false }));
    }
  };

  // 포장코드 삭제
  const removePackingCode = (packingCode) => {
    // 삭제 전에 해당 포장코드의 모든 상품을 DB에서 제거
    const packingGroup = packingData.find(item => item.packingCode === packingCode);
    if (packingGroup) {
      packingGroup.products.forEach(product => {
        // DB에서 삭제하는 API 호출 (선택사항)
        // deletePackingListItems(packingCode, product.id);
      });
    }
    
    setPackingData(prev => prev.filter(item => item.packingCode !== packingCode));
  };

  // 상품 삭제
  const removeProduct = (packingCode, productId) => {
    // 삭제 전에 해당 상품을 DB에서 제거
    const packingGroup = packingData.find(item => item.packingCode === packingCode);
    if (packingGroup) {
      const productToDelete = packingGroup.products.find(product => product.id === productId);
      if (productToDelete) {
        // DB에서 삭제하는 API 호출 (선택사항)
        // deletePackingListItems(packingCode, productId);
      }
    }
    
    setPackingData(prev => prev.map(item => {
      if (item.packingCode === packingCode) {
        return {
          ...item,
          products: item.products.filter(product => product.id !== productId)
        };
      }
      return item;
    }));
  };

  // 상품 정보 수정
  const updateProduct = (packingCode, productId, field, value) => {
    console.log('✏️ [updateProduct] 상품 정보 수정:', {
      packingCode,
      productId,
      field,
      oldValue: '이전 값 (확인 불가)',
      newValue: value,
      currentTime: new Date().toISOString()
    });
    
    setPackingData(prev => {
      const updatedData = prev.map(item => {
        if (item.packingCode === packingCode) {
          return {
            ...item,
            products: item.products.map(product => {
              if (product.id === productId) {
                const updatedProduct = { ...product, [field]: value };
                
                // exportQuantity 자동 계산 및 업데이트
                if (['packagingMethod', 'packagingCount', 'boxCount'].includes(field)) {
                  const exportQuantity = calculateExportQuantity(
                    updatedProduct.packagingMethod,
                    updatedProduct.packagingCount,
                    updatedProduct.boxCount
                  );
                  updatedProduct.exportQuantity = exportQuantity;
                  
                  console.log('🧮 [updateProduct] exportQuantity 자동 계산 완료:', {
                    productId,
                    field,
                    newValue: value,
                    exportQuantity,
                    calculation: `${updatedProduct.packagingMethod} × ${updatedProduct.packagingCount} × ${updatedProduct.boxCount} = ${exportQuantity}`
                  });
                }
                
                console.log('🔄 [updateProduct] 상품 업데이트 완료:', {
                  productId,
                  field,
                  newValue: value,
                  updatedProduct
                });
                return updatedProduct;
              }
              return product;
            })
          };
        }
        return item;
      });
      
      console.log('📊 [updateProduct] 전체 데이터 상태:', {
        totalPackingCodes: updatedData.length,
        totalProducts: updatedData.reduce((sum, item) => sum + item.products.length, 0),
        packingCodes: updatedData.map(item => ({
          packingCode: item.packingCode,
          productCount: item.products.length,
          productIds: item.products.map(p => p.id)
        }))
      });
      
      return updatedData;
    });
  };

  // 검색 모달 열기
  const openSearchModal = (packingCode, productId) => {
    setCurrentSearchContext({ packingCode, productId });
    setIsSearchModalOpen(true);
  };

  // 프로젝트 선택 처리
  const handleProjectSelect = (selectedProject) => {
    console.log('🔍 [handleProjectSelect] 선택된 프로젝트:', selectedProject);
    
    // 선택된 프로젝트 ID 저장
    if (selectedProject.projectId) {
      setSelectedProjectId(selectedProject.projectId);
      console.log('✅ [handleProjectSelect] 프로젝트 ID 설정:', selectedProject.projectId);
    }
    
    if (currentSearchContext) {
      const { packingCode, productId } = currentSearchContext;
      
      setPackingData(prev => prev.map(item => {
        if (item.packingCode === packingCode) {
          return {
            ...item,
            projectId: selectedProject.projectId, // 포장코드 그룹에 projectId 설정
            products: item.products.map(product => {
              if (product.id === productId) {
                const updatedProduct = {
                  ...product,
                  productName: selectedProject.productName,
                  sku: selectedProject.sku,
                  firstImage: selectedProject.firstImage,
                  projectId: selectedProject.projectId // 상품에도 projectId 설정
                };
                
                console.log('💾 [handleProjectSelect] 상품 업데이트 완료:', {
                  packingCode,
                  productId,
                  productName: updatedProduct.productName,
                  projectId: updatedProduct.projectId
                });
                
                // useEffect가 packingData 변경을 감지하여 자동 저장 처리
                console.log('🚀 [handleProjectSelect] 상태 업데이트 완료, useEffect가 자동 저장 처리 예정');
                
                return updatedProduct;
              }
              return product;
            })
          };
        }
        return item;
      }));
    }
  };



  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* 헤더 */}
      <div className="mb-6">
        <div className="flex items-center space-x-3 mb-4">
          <button
            onClick={handleBack}
            className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            title="뒤로 가기"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="p-2 bg-blue-100 rounded-lg">
            <Package className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">새 패킹리스트 생성</h1>
            <p className="text-gray-600">새로운 MJ 프로젝트 패킹리스트를 생성합니다</p>
          </div>
        </div>
      </div>

      {/* 패킹리스트 테이블 */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">패킹리스트 상세</h2>
            <p className="text-sm text-gray-600">포장 정보를 확인하고 관리할 수 있습니다</p>
            <div className="mt-2 flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <label htmlFor="plDate" className="text-sm font-medium text-gray-700">
                  작성 날짜:
                </label>
                <input
                  type="date"
                  id="pl-date-input"
                  value={plDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="text-sm border border-gray-300 rounded px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-blue-500"
                />
              </div>
              

              
              {/* 자동 저장 상태 표시 */}
              <div className="ml-4 flex items-center space-x-4">
                {/* 선택된 프로젝트 ID 표시 */}
                {selectedProjectId && (
                  <div className="flex items-center space-x-2 text-sm">
                    <span className="text-gray-600">연결된 프로젝트:</span>
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded-md font-medium">
                      ID: {selectedProjectId}
                    </span>
                  </div>
                )}
                
                {/* 자동 저장 상태 표시 */}
                <div className="flex items-center space-x-2">
                  {autoSaveStatus === 'saving' && (
                    <div className="flex items-center space-x-1 text-blue-600">
                      <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-xs">저장 중...</span>
                    </div>
                  )}
                  {autoSaveStatus === 'success' && (
                    <div className="flex items-center space-x-1 text-green-600">
                      <div className="w-3 h-3 bg-green-600 rounded-full"></div>
                      <span className="text-xs">저장 완료</span>
                    </div>
                  )}
                  {autoSaveStatus === 'error' && (
                    <div className="flex items-center space-x-1 text-red-600">
                      <div className="w-3 h-3 bg-red-600 rounded-full"></div>
                      <span className="text-xs">저장 실패</span>
                    </div>
                  )}
                  {lastSavedAt && (
                    <span className="text-xs text-gray-500">
                      마지막 저장: {lastSavedAt.toLocaleTimeString()}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
          <ActionButtons />
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  포장코드
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  물류회사
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  박스수
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  상품명
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  상품사진
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  소포장 구성
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  포장수
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  한박스 내 수량
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  출고 수량
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  작업
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {packingData.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-6 py-12 text-center">
                    <div className="text-gray-500">
                      <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p className="text-lg font-medium mb-2">패킹리스트가 비어있습니다</p>
                      <p className="text-sm">위의 "포장코드 추가" 버튼을 클릭하여 첫 번째 포장코드를 추가해주세요.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                packingData.map((packingGroup, groupIndex) => (
                <React.Fragment key={packingGroup.packingCode}>
                  {packingGroup.products.map((product, productIndex) => (
                    <tr key={product.id} className={`hover:bg-gray-50 ${groupIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                      {/* 포장코드 셀 - 첫 번째 상품일 때만 표시하고 rowSpan 적용 */}
                      {productIndex === 0 && (
                        <td 
                          rowSpan={packingGroup.products.length + 1} 
                          className="px-6 py-4 whitespace-nowrap border-r border-gray-200 bg-blue-50"
                        >
                          <input
                            ref={(el) => {
                              if (el) {
                                packingCodeRefs.current[packingGroup.packingCode] = el;
                              }
                            }}
                            type="text"
                            value={editingPackingCodes[packingGroup.packingCode] !== undefined 
                              ? editingPackingCodes[packingGroup.packingCode] 
                              : packingGroup.packingCode
                            }
                            onChange={(e) => {
                              const newPackingCode = e.target.value;
                              setEditingPackingCodes(prev => ({
                                ...prev,
                                [packingGroup.packingCode]: newPackingCode
                              }));
                            }}
                            onFocus={() => {
                              // 포커스 시 현재 값을 임시 상태에 설정
                              setEditingPackingCodes(prev => ({
                                ...prev,
                                [packingGroup.packingCode]: packingGroup.packingCode
                              }));
                            }}
                            onBlur={(e) => {
                              const newPackingCode = e.target.value;
                              const oldPackingCode = packingGroup.packingCode;
                              
                              if (newPackingCode && newPackingCode !== oldPackingCode) {
                                // 포커스가 벗어날 때만 자동저장 실행
                                handlePackingCodeChange(oldPackingCode, newPackingCode);
                              }
                              
                              // 임시 상태 정리
                              setEditingPackingCodes(prev => {
                                const newState = { ...prev };
                                delete newState[oldPackingCode];
                                return newState;
                              });
                            }}
                            className="w-24 text-sm font-medium text-gray-900 mb-2 border border-gray-300 rounded px-2 py-1 bg-white"
                            placeholder="코드"
                          />
                          <button
                            onClick={() => removePackingCode(packingGroup.packingCode)}
                            className="text-red-600 hover:text-red-900 text-xs"
                            title="포장코드 삭제"
                          >
                            삭제
                          </button>
                        </td>
                      )}
                      {/* 물류회사 셀 - 첫 번째 상품일 때만 표시하고 rowSpan 적용 */}
                      {productIndex === 0 && (
                        <td 
                          rowSpan={packingGroup.products.length + 1} 
                          className="px-6 py-4 whitespace-nowrap border-r border-gray-200"
                        >
                          <select
                            value={packingGroup.logisticCompany || logisticCompany || '비전'}
                            onChange={(e) => {
                              const newCompany = e.target.value;
                              console.log('🚚 [테이블] 물류회사 변경:', {
                                packingCode: packingGroup.packingCode,
                                oldCompany: packingGroup.logisticCompany,
                                newCompany
                              });
                              
                              // 해당 포장코드의 물류회사만 업데이트
                              setPackingData(prev => {
                                const updatedData = prev.map(item => {
                                  if (item.packingCode === packingGroup.packingCode) {
                                    return { ...item, logisticCompany: newCompany };
                                  }
                                  return item;
                                });
                                return updatedData;
                              });
                              
                              // 모든 상품에 대해 자동저장 실행
                              packingGroup.products.forEach(product => {
                                if (product.productName && product.productName.trim() !== '') {
                                  console.log(`💾 [테이블] 물류회사 변경 자동저장: ${packingGroup.packingCode} - ${product.productName}`);
                                  // 기존 상품 수정 시에는 forceInsert: false (중복 저장 방지)
                                  autoSavePackingList(packingGroup.packingCode, product, false);
                                }
                              });
                            }}
                            className="w-full text-sm border border-gray-300 rounded px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="비전">비전</option>
                            <option value="청도">청도</option>
                            <option value="항공특송">항공특송</option>
                          </select>
                        </td>
                      )}
                      {/* 박스수 셀 - 첫 번째 상품일 때만 표시하고 rowSpan 적용 */}
                      {productIndex === 0 && (
                        <td 
                          rowSpan={packingGroup.products.length + 1} 
                          className="px-6 py-4 whitespace-nowrap border-r border-gray-200"
                        >
                          <input
                            type="number"
                            value={packingGroup.products[0].boxCount}
                            onChange={(e) => {
                              const newValue = parseInt(e.target.value) || 0;
                              // 같은 포장코드의 모든 상품의 박스수를 동일하게 업데이트
                              packingGroup.products.forEach(product => {
                                updateProduct(packingGroup.packingCode, product.id, 'boxCount', newValue);
                              });
                            }}
                            onBlur={(e) => {
                              const newValue = parseInt(e.target.value) || 0;
                              handleBoxCountChange(packingGroup.packingCode, newValue);
                            }}
                            className="w-20 text-sm border border-gray-300 rounded px-2 py-1"
                          />
                          <div className="text-sm text-gray-500">박스</div>
                        </td>
                      )}
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-1">
                          <input
                            type="text"
                            value={product.productName}
                            onChange={(e) => updateProduct(packingGroup.packingCode, product.id, 'productName', e.target.value)}
                            onBlur={() => handleBlur(packingGroup.packingCode, product)}
                            className="w-40 text-sm border border-gray-300 rounded px-2 py-1"
                            placeholder="상품명 입력"
                          />
                          <button
                            onClick={() => openSearchModal(packingGroup.packingCode, product.id)}
                            className="px-2 py-1 bg-blue-100 border border-blue-300 rounded hover:bg-blue-200 transition-colors"
                            title="상품 검색"
                          >
                            <Search className="w-4 h-4 text-blue-600" />
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex-shrink-0 h-12 w-12">
                          {product.firstImage ? (
                            <img
                              src={product.firstImage.url}
                              alt={product.productName || '상품 이미지'}
                              className="h-12 w-12 rounded-lg object-cover border border-gray-200"
                              onError={(e) => {
                                console.log('❌ [MakePackingList] 테이블 이미지 로드 실패:', {
                                  url: product.firstImage.url,
                                  fileName: product.firstImage.stored_filename,
                                  filePath: product.firstImage.file_path,
                                  error: '이미지 로드 실패'
                                });
                                // 이미지 로드 실패 시 기본 아이콘 표시
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }}
                              onLoad={() => {
                                console.log('✅ [MakePackingList] 테이블 이미지 로드 성공:', {
                                  url: product.firstImage.url,
                                  fileName: product.firstImage.stored_filename
                                });
                              }}
                            />
                          ) : null}
                          <div 
                            className={`h-12 w-12 rounded-lg bg-gray-200 flex items-center justify-center ${
                              product.firstImage ? 'hidden' : 'flex'
                            }`}
                          >
                            <Package className="h-6 w-6 text-gray-400" />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-1">
                          <input
                            type="number"
                            value={product.packagingMethod}
                            onChange={(e) => updateProduct(packingGroup.packingCode, product.id, 'packagingMethod', e.target.value)}
                            onBlur={() => handleBlur(packingGroup.packingCode, product)}
                            className="w-20 text-sm border border-gray-300 rounded px-2 py-1"
                            placeholder="소포장 구성"
                          />
                          <span className="text-sm text-gray-500 flex-shrink-0">개</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-1">
                          <input
                            type="number"
                            value={product.packagingCount}
                            onChange={(e) => updateProduct(packingGroup.packingCode, product.id, 'packagingCount', parseInt(e.target.value) || 0)}
                            onBlur={() => handleBlur(packingGroup.packingCode, product)}
                            className="w-20 text-sm border border-gray-300 rounded px-2 py-1"
                            placeholder="포장수"
                          />
                          <span className="text-sm text-gray-500 flex-shrink-0">개</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 font-bold">
                          {product.packagingMethod && product.packagingCount && product.packagingMethod > 0 && product.packagingCount > 0 
                            ? `${((product.packagingMethod || 0) * (product.packagingCount || 0)).toLocaleString()} 개/박스`
                            : '-'
                          }
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 font-bold text-blue-600">
                          {product.exportQuantity && product.exportQuantity > 0 
                            ? `${product.exportQuantity.toLocaleString()} 개`
                            : '-'
                          }
                        </div>
                        <div className="text-xs text-gray-500">
                          {product.packagingMethod && product.packagingCount && product.boxCount 
                            ? `${product.packagingMethod} × ${product.packagingCount} × ${product.boxCount}`
                            : '수량 입력 필요'
                          }
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => removeProduct(packingGroup.packingCode, product.id)}
                            className="text-red-600 hover:text-red-900"
                            title="상품 삭제"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {/* 포장 코드별 상품 추가 버튼 */}
                  <tr className="bg-blue-100 border-b-4 border-blue-300">
                    <td colSpan="6" className="px-6 py-4">
                      <button
                        onClick={async () => await addProduct(packingGroup.packingCode)}
                        disabled={addingProduct[packingGroup.packingCode]}
                        className={`inline-flex items-center px-4 py-2 text-white text-sm font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${
                          addingProduct[packingGroup.packingCode]
                            ? 'bg-gray-400 cursor-not-allowed focus:ring-gray-500'
                            : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
                        }`}
                      >
                        {addingProduct[packingGroup.packingCode] ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            저장 중...
                          </>
                        ) : (
                          <>
                            <Plus className="w-4 h-4 mr-2" />
                            {packingGroup.packingCode}에 상품 추가
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                </React.Fragment>
              ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* 하단 액션 버튼들 */}
        <div className="px-6 py-4 bg-white border-t border-gray-200">
          <div className="flex justify-end">
            <ActionButtons />
          </div>
        </div>
        
        {/* 테이블 하단 정보 */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <div className="flex justify-between items-center text-sm text-gray-600">
            <span>총 {packingData.reduce((total, group) => total + group.products.length, 0)}개 상품</span>
            <span>마지막 업데이트: {new Date().toLocaleDateString('ko-KR')} {new Date().toLocaleTimeString('ko-KR')}</span>
          </div>
        </div>
      </div>

      {/* 검색 모달 */}
      <ProjectSearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        onSelectProject={handleProjectSelect}
      />

      {/* 포장코드 추가 모달 */}
      {isAddPackingCodeModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">새 포장코드 추가</h3>
              <button
                onClick={closeAddPackingCodeModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="mb-4">
              <label htmlFor="newPackingCode" className="block text-sm font-medium text-gray-700 mb-2">
                포장코드
              </label>
              <input
                type="text"
                id="newPackingCode"
                value={newPackingCodeInput}
                onChange={(e) => setNewPackingCodeInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    addPackingCode();
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="포장코드를 입력하세요"
                autoFocus
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={closeAddPackingCodeModal}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
              >
                취소
              </button>
              <button
                onClick={addPackingCode}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
              >
                추가
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
};

export default MakePackingList; 