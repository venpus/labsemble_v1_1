import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Package, ArrowLeft, Plus, Trash2, Edit, Search, X } from 'lucide-react';
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
  
  // 사용자 권한 상태
  const [isAdmin, setIsAdmin] = useState(false);
  
  // 일괄 삭제 관련 상태
  const [selectedProducts, setSelectedProducts] = useState(new Set());
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  
  // 개별 제품 삭제 미리보기 상태
  const [isProductDeletePreviewOpen, setIsProductDeletePreviewOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);

  // 사용자 권한 확인
  const checkUserRole = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setIsAdmin(false);
        return;
      }

      const response = await fetch('/api/users/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const userData = await response.json();
        const adminStatus = Boolean(userData.is_admin);
        setIsAdmin(adminStatus);
        console.log('🔐 [MakePackingList] 사용자 권한 확인:', {
          is_admin: userData.is_admin,
          isAdmin: adminStatus
        });
      }
    } catch (error) {
      console.error('❌ [MakePackingList] 사용자 권한 확인 오류:', error);
      setIsAdmin(false);
    }
  };

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
      
      // projectId 설정: 수동 입력 상품은 null, 프로젝트 검색 상품은 해당 프로젝트 ID
      const projectIdFromData = product.projectId || null;
      
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

  // 컴포넌트 마운트 시 권한 확인
  useEffect(() => {
    checkUserRole();
  }, []);

  // packingData 변경 감지하여 자동 저장 (제품 삭제 후에도 실행)
  useEffect(() => {
    // packingData가 비어있거나 초기 로딩 중이면 실행하지 않음
    if (packingData.length === 0) {
      return;
    }
    
    console.log('🔄 [useEffect] packingData 변경 감지, 자동 저장 시작:', {
      packingDataLength: packingData.length,
      timestamp: new Date().toISOString()
    });
    
    // 각 포장코드 그룹의 상품들을 자동 저장
    const performAutoSave = async () => {
      try {
        setAutoSaveStatus('saving');
        
        const savePromises = [];
        
        packingData.forEach(packingGroup => {
          packingGroup.products.forEach(product => {
            // 제품 삭제 후에는 forceInsert: false (중복 저장 방지)
            savePromises.push(
              autoSavePackingList(packingGroup.packingCode, product, false)
            );
          });
        });
        
        // 모든 저장 작업 병렬 실행
        const results = await Promise.allSettled(savePromises);
        
        // 결과 확인
        const successCount = results.filter(result => result.status === 'fulfilled').length;
        const failureCount = results.filter(result => result.status === 'rejected').length;
        
        console.log('📊 [useEffect] 자동 저장 결과:', {
          total: results.length,
          success: successCount,
          failure: failureCount
        });
        
        if (failureCount === 0) {
          setAutoSaveStatus('success');
          setLastSavedAt(new Date());
          
          // 3초 후 상태를 idle로 변경
          setTimeout(() => {
            setAutoSaveStatus('idle');
          }, 3000);
        } else {
          setAutoSaveStatus('error');
          console.error('❌ [useEffect] 일부 자동 저장 실패:', results);
        }
        
      } catch (error) {
        console.error('❌ [useEffect] 자동 저장 중 오류:', error);
        setAutoSaveStatus('error');
      }
    };
    
    // 디바운스를 위한 타이머 설정 (500ms 후 실행)
    const timer = setTimeout(performAutoSave, 500);
    
    return () => clearTimeout(timer);
  }, [packingData, autoSavePackingList]);

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
    
    // 중복 포장코드 확인 (pl_date와 packing_code 조합으로 검사)
    const isDuplicate = packingData.some(item => 
      item.packingCode === newPackingCodeInput.trim() && item.plDate === plDate
    );
    if (isDuplicate) {
      console.log('⚠️ [addPackingCode] 중복 포장코드 감지 (같은 날짜):', {
        packingCode: newPackingCodeInput.trim(),
        plDate: plDate
      });
      toast.error('같은 날짜에 이미 존재하는 포장코드입니다.');
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

      console.log('✅ [performFullSave] 완료: 프로젝트 출고 수량 계산 없이 저장만 수행');
      return { success: true, message: '모든 데이터가 저장되었습니다.' };
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
            projectId: null // 수동 입력 상품은 projectId를 null로 설정
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
      
        // 성공 메시지 표시
        toast.success(`새 상품이 추가되었습니다.`);
      
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

  // 제품 삭제 미리보기 열기
  const openProductDeletePreview = (packingCode, productId) => {
    console.log('🔍 [openProductDeletePreview] 제품 삭제 미리보기 열기:', {
      packingCode,
      productId,
      isAdmin,
      timestamp: new Date().toISOString()
    });
    
    // Admin 권한 확인
    if (!isAdmin) {
      console.log('🚫 [openProductDeletePreview] Admin 권한이 없어 삭제 불가');
      toast.error('제품 삭제는 관리자만 가능합니다.');
      return;
    }
    
    // 삭제할 상품 정보 확인
    const packingGroup = packingData.find(item => item.packingCode === packingCode);
    if (!packingGroup) {
      console.error('❌ [openProductDeletePreview] 포장코드 그룹을 찾을 수 없음:', packingCode);
      toast.error('삭제할 상품을 찾을 수 없습니다.');
      return;
    }
    
    const product = packingGroup.products.find(p => p.id === productId);
    if (!product) {
      console.error('❌ [openProductDeletePreview] 삭제할 상품을 찾을 수 없음:', productId);
      toast.error('삭제할 상품을 찾을 수 없습니다.');
      return;
    }
    
    setProductToDelete({ ...product, packingCode });
    setIsProductDeletePreviewOpen(true);
  };

  // 제품 삭제 미리보기 닫기
  const closeProductDeletePreview = () => {
    setIsProductDeletePreviewOpen(false);
    setProductToDelete(null);
  };

  // 실제 제품 삭제 실행
  const executeProductDelete = async () => {
    if (!productToDelete) return;

    console.log('🗑️ [executeProductDelete] 제품 삭제 실행:', {
      productId: productToDelete.id,
      productName: productToDelete.productName,
      projectId: productToDelete.projectId,
      packingCode: productToDelete.packingCode,
      isAdmin,
      timestamp: new Date().toISOString()
    });
    
    try {
      // 로딩 상태 표시
      toast.loading('제품을 삭제하는 중...');
      
      // 서버에서 제품 삭제
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('인증 토큰이 없습니다.');
      }
      
      const response = await fetch(`/api/packing-list/product/${productToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      const result = await response.json();
      toast.dismiss();
      
      if (result.success) {
        console.log('✅ [executeProductDelete] 서버에서 제품 삭제 성공:', result);
        
        // 클라이언트 삭제 로그 기록
        const clientDeleteLog = {
          action: 'DELETE_PRODUCT',
          productId: productToDelete.id,
          productName: productToDelete.productName,
          projectId: productToDelete.projectId,
          packingCode: productToDelete.packingCode,
          deletedAt: new Date().toISOString(),
          userAgent: navigator.userAgent,
          timestamp: Date.now()
        };
        
        console.log('📝 [executeProductDelete] 클라이언트 삭제 로그:', clientDeleteLog);
        
        // 클라이언트 상태에서 제품 제거
        setPackingData(prev => prev.map(item => {
          if (item.packingCode === productToDelete.packingCode) {
            return {
              ...item,
              products: item.products.filter(product => product.id !== productToDelete.id)
            };
          }
          return item;
        }));
        
        // 성공 메시지 표시
        toast.success(`"${productToDelete.productName}" 상품이 삭제되었습니다.`);
        
        // 프로젝트가 있는 경우 export_quantity 재계산 알림
        if (productToDelete.projectId) {
          console.log('🔄 [executeProductDelete] 프로젝트 export_quantity가 자동으로 재계산되었습니다:', {
            projectId: productToDelete.projectId
          });
        }
        
        // 미리보기 모달 닫기
        closeProductDeletePreview();
        
      } else {
        console.error('❌ [executeProductDelete] 서버에서 제품 삭제 실패:', result);
        toast.error(result.error || '제품 삭제에 실패했습니다.');
      }
      
    } catch (error) {
      console.error('❌ [executeProductDelete] 제품 삭제 중 오류:', {
        productId: productToDelete.id,
        error: error.message,
        stack: error.stack
      });
      
      toast.dismiss();
      toast.error(`제품 삭제 중 오류가 발생했습니다: ${error.message}`);
    }
  };

  // 상품 삭제 (미리보기 열기)
  const removeProduct = (packingCode, productId) => {
    openProductDeletePreview(packingCode, productId);
  };

  // 제품 선택/해제
  const toggleProductSelection = (productId) => {
    setSelectedProducts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  // 전체 선택/해제
  const toggleAllProductsSelection = () => {
    const allProductIds = new Set();
    packingData.forEach(packingGroup => {
      packingGroup.products.forEach(product => {
        allProductIds.add(product.id);
      });
    });

    if (selectedProducts.size === allProductIds.size) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(allProductIds);
    }
  };

  // 일괄 삭제 실행
  const executeBulkDelete = async () => {
    if (selectedProducts.size === 0) {
      toast.error('삭제할 제품을 선택해주세요.');
      return;
    }

    console.log('🗑️ [executeBulkDelete] 일괄 삭제 시작:', {
      selectedCount: selectedProducts.size,
      selectedProducts: Array.from(selectedProducts),
      isAdmin,
      timestamp: new Date().toISOString()
    });

    try {
      // Admin 권한 확인
      if (!isAdmin) {
        console.log('🚫 [executeBulkDelete] Admin 권한이 없어 삭제 불가');
        toast.error('일괄 삭제는 관리자만 가능합니다.');
        return;
      }

      // 로딩 상태 표시
      toast.loading(`${selectedProducts.size}개 제품을 삭제하는 중...`);

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('인증 토큰이 없습니다.');
      }

      // 선택된 제품들을 순차적으로 삭제
      const deletePromises = Array.from(selectedProducts).map(async (productId) => {
        try {
          const response = await fetch(`/api/packing-list/product/${productId}`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          });

          const result = await response.json();
          return { productId, success: result.success, result };
        } catch (error) {
          console.error(`❌ [executeBulkDelete] 제품 ${productId} 삭제 실패:`, error);
          return { productId, success: false, error: error.message };
        }
      });

      const results = await Promise.allSettled(deletePromises);
      toast.dismiss();

      // 결과 분석
      const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
      const failCount = results.length - successCount;

      console.log('📊 [executeBulkDelete] 일괄 삭제 결과:', {
        total: results.length,
        success: successCount,
        failed: failCount
      });

      // 클라이언트 상태에서 성공한 제품들 제거
      if (successCount > 0) {
        setPackingData(prev => prev.map(packingGroup => ({
          ...packingGroup,
          products: packingGroup.products.filter(product => 
            !selectedProducts.has(product.id) || 
            !results.find(r => r.status === 'fulfilled' && r.value.productId === product.id && r.value.success)
          )
        })));

        // 선택 상태 초기화
        setSelectedProducts(new Set());
        setIsBulkDeleteModalOpen(false);
      }

      // 결과 메시지 표시
      if (successCount > 0 && failCount === 0) {
        toast.success(`${successCount}개 제품이 성공적으로 삭제되었습니다.`);
      } else if (successCount > 0 && failCount > 0) {
        toast.success(`${successCount}개 제품이 삭제되었습니다. ${failCount}개 제품 삭제에 실패했습니다.`);
      } else {
        toast.error('모든 제품 삭제에 실패했습니다.');
      }

    } catch (error) {
      console.error('❌ [executeBulkDelete] 일괄 삭제 중 오류:', {
        error: error.message,
        stack: error.stack
      });

      toast.dismiss();
      toast.error(`일괄 삭제 중 오류가 발생했습니다: ${error.message}`);
    }
  };

  // 일괄 삭제 모달 열기
  const openBulkDeleteModal = () => {
    if (selectedProducts.size === 0) {
      toast.error('삭제할 제품을 선택해주세요.');
      return;
    }
    setIsBulkDeleteModalOpen(true);
  };

  // 일괄 삭제 모달 닫기
  const closeBulkDeleteModal = () => {
    setIsBulkDeleteModalOpen(false);
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
          <div className="flex items-center space-x-3">
            {selectedProducts.size > 0 && isAdmin && (
              <button
                onClick={openBulkDeleteModal}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                선택된 {selectedProducts.size}개 삭제
              </button>
            )}
            <ActionButtons />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={selectedProducts.size > 0 && selectedProducts.size === packingData.reduce((total, group) => total + group.products.length, 0)}
                      onChange={toggleAllProductsSelection}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      title="전체 선택/해제"
                    />
                    <span>선택</span>
                  </div>
                </th>
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
                  <td colSpan="10" className="px-6 py-12 text-center">
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
                      {/* 선택 체크박스 */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <input
                          type="checkbox"
                          checked={selectedProducts.has(product.id)}
                          onChange={() => toggleProductSelection(product.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          title="제품 선택/해제"
                        />
                      </td>
                      {/* 포장코드 셀 - 첫 번째 상품일 때만 표시하고 rowSpan 적용 */}
                      {productIndex === 0 && (
                        <td 
                          rowSpan={packingGroup.products.length} 
                          className="px-6 py-4 whitespace-nowrap border-r border-gray-200 bg-blue-50"
                        >
                          <div className="space-y-3">
                            {/* 포장코드 입력 */}
                            <div>
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
                                className="w-24 text-sm font-medium text-gray-900 border border-gray-300 rounded px-2 py-1 bg-white"
                                placeholder="코드"
                              />
                            </div>
                            
                            {/* 상품 추가 버튼 */}
                            <div>
                              <button
                                onClick={async () => await addProduct(packingGroup.packingCode)}
                                disabled={addingProduct[packingGroup.packingCode]}
                                className={`w-full inline-flex items-center justify-center px-3 py-2 text-white text-xs font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${
                                  addingProduct[packingGroup.packingCode]
                                    ? 'bg-gray-400 cursor-not-allowed focus:ring-gray-500'
                                    : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
                                }`}
                                title={`${packingGroup.packingCode}에 상품 추가`}
                              >
                                {addingProduct[packingGroup.packingCode] ? (
                                  <>
                                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                                    추가 중...
                                  </>
                                ) : (
                                  <>
                                    <Plus className="w-3 h-3 mr-1" />
                                    상품 추가
                                  </>
                                )}
                              </button>
                            </div>
                            
                            {/* 포장코드 삭제 버튼 */}
                            <div>
                              <button
                                onClick={() => removePackingCode(packingGroup.packingCode)}
                                className="w-full text-red-600 hover:text-red-900 text-xs py-1 px-2 border border-red-300 rounded hover:bg-red-50 transition-colors"
                                title="포장코드 삭제"
                              >
                                삭제
                              </button>
                            </div>
                          </div>
                        </td>
                      )}
                      {/* 물류회사 셀 - 첫 번째 상품일 때만 표시하고 rowSpan 적용 */}
                      {productIndex === 0 && (
                        <td 
                          rowSpan={packingGroup.products.length} 
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
                          rowSpan={packingGroup.products.length} 
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
                                // 이미지 로드 실패 시 기본 아이콘 표시
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }}
                              onLoad={() => {
                                // 이미지 로드 성공
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
                          {isAdmin ? (
                            <button
                              onClick={() => removeProduct(packingGroup.packingCode, product.id)}
                              className="text-red-600 hover:text-red-900"
                              title="상품 삭제 (Admin 전용)"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          ) : (
                            <span className="text-gray-400 text-xs">권한 없음</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
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

      {/* 일괄 삭제 모달 */}
      {isBulkDeleteModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
            {/* 모달 헤더 */}
            <div className="px-6 py-4 border-b border-gray-200 bg-red-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                    <Trash2 className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      일괄 삭제 확인
                    </h3>
                    <p className="text-sm text-gray-600">
                      선택된 {selectedProducts.size}개 제품을 삭제하시겠습니까?
                    </p>
                  </div>
                </div>
                <button
                  onClick={closeBulkDeleteModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* 모달 내용 */}
            <div className="px-6 py-4 max-h-96 overflow-y-auto">
              <div className="space-y-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">!</span>
                    </div>
                    <span className="text-yellow-800 font-medium">
                      다음 {selectedProducts.size}개의 제품이 삭제됩니다:
                    </span>
                  </div>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {Array.from(selectedProducts).map((productId) => {
                    const product = packingData
                      .flatMap(group => group.products)
                      .find(p => p.id === productId);
                    
                    if (!product) return null;
                    
                    return (
                      <div key={productId} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-medium text-gray-900">{product.productName}</span>
                            {product.sku && (
                              <span className="ml-2 text-sm text-gray-600">(SKU: {product.sku})</span>
                            )}
                          </div>
                          <div className="text-sm text-gray-500">
                            {product.packagingMethod && product.packagingCount && product.boxCount
                              ? `${product.packagingMethod} × ${product.packagingCount} × ${product.boxCount} = ${product.packagingMethod * product.packagingCount * product.boxCount}개`
                              : '수량 미입력'
                            }
                          </div>
                        </div>
                        {product.projectId && (
                          <div className="mt-1 text-xs text-blue-600">
                            프로젝트 ID: {product.projectId}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-5 h-5 bg-red-400 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">!</span>
                    </div>
                    <span className="text-red-800 font-medium">
                      ⚠️ 이 작업은 되돌릴 수 없습니다. 삭제 후에는 복구할 수 없습니다.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 모달 푸터 */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end space-x-3">
              <button
                onClick={closeBulkDeleteModal}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={executeBulkDelete}
                disabled={selectedProducts.size === 0}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {selectedProducts.size}개 삭제 실행
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 개별 제품 삭제 미리보기 모달 */}
      {isProductDeletePreviewOpen && productToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[80vh] overflow-hidden">
            {/* 모달 헤더 */}
            <div className="px-6 py-4 border-b border-gray-200 bg-red-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                    <Trash2 className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      제품 삭제 확인
                    </h3>
                    <p className="text-sm text-gray-600">
                      "{productToDelete.productName}" 제품을 삭제하시겠습니까?
                    </p>
                  </div>
                </div>
                <button
                  onClick={closeProductDeletePreview}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* 모달 내용 */}
            <div className="px-6 py-4">
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-3">삭제될 제품 정보</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">제품명:</span>
                      <span className="font-medium text-gray-900">{productToDelete.productName}</span>
                    </div>
                    {productToDelete.sku && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">SKU:</span>
                        <span className="font-medium text-gray-900">{productToDelete.sku}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600">포장코드:</span>
                      <span className="font-medium text-gray-900">{productToDelete.packingCode}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">출고수량:</span>
                      <span className="font-medium text-gray-900">
                        {productToDelete.packagingMethod && productToDelete.packagingCount && productToDelete.boxCount
                          ? `${productToDelete.packagingMethod} × ${productToDelete.packagingCount} × ${productToDelete.boxCount} = ${productToDelete.packagingMethod * productToDelete.packagingCount * productToDelete.boxCount}개`
                          : '수량 미입력'
                        }
                      </span>
                    </div>
                    {productToDelete.projectId && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">프로젝트 ID:</span>
                        <span className="font-medium text-blue-600">{productToDelete.projectId}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">!</span>
                    </div>
                    <span className="text-yellow-800 font-medium">
                      이 제품이 삭제되면 관련된 물류 결제 정보도 함께 삭제됩니다.
                    </span>
                  </div>
                </div>

                {productToDelete.projectId && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-5 h-5 bg-blue-400 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-bold">i</span>
                      </div>
                      <span className="text-blue-800 font-medium">
                        프로젝트 상품이므로 삭제 후 해당 프로젝트의 출고 수량이 자동으로 재계산됩니다.
                      </span>
                    </div>
                  </div>
                )}

                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-5 h-5 bg-red-400 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">!</span>
                    </div>
                    <span className="text-red-800 font-medium">
                      ⚠️ 이 작업은 되돌릴 수 없습니다. 삭제 후에는 복구할 수 없습니다.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 모달 푸터 */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end space-x-3">
              <button
                onClick={closeProductDeletePreview}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={executeProductDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700 transition-colors"
              >
                삭제 실행
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default MakePackingList; 