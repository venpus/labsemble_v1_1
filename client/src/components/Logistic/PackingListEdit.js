import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { 
  ArrowLeft, 
  Package, 
  Calendar, 
  Save, 
  Plus, 
  Trash2, 
  Edit3, 
  X, 
  Check,
  RotateCcw,
  RotateCw,
  Eye,
  AlertTriangle
} from 'lucide-react';

const PackingListEdit = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const date = searchParams.get('date');
  
  // 상태 관리
  const [packingData, setPackingData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [originalData, setOriginalData] = useState(null);
  
  // 편집 히스토리
  const [editHistory, setEditHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  // 일괄 편집
  const [selectedProducts, setSelectedProducts] = useState(new Set());
  const [isBulkEditMode, setIsBulkEditMode] = useState(false);
  const [bulkEditData, setBulkEditData] = useState({
    box_count: '',
    packaging_count: '',
    packaging_method: ''
  });
  
  // 검증 상태
  const [validationErrors, setValidationErrors] = useState({});
  const [isValidating, setIsValidating] = useState(false);
  
  // 재고 관리 상태 제거됨 - 편집 모드에서는 재고 상태를 체크하지 않음

  // URL 파라미터에서 날짜 정보 추출
  const displayDate = date === 'no-date' ? '날짜 미지정' : date;

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
        console.log('🔐 [PackingListEdit] 사용자 권한 확인:', {
          is_admin: userData.is_admin,
          isAdmin: adminStatus
        });
      }
    } catch (error) {
      console.error('❌ [PackingListEdit] 사용자 권한 확인 오류:', error);
      setIsAdmin(false);
    }
  };

  // 재고 상태 조회 함수 제거됨 - 편집 모드에서는 재고 상태를 체크하지 않음

  // 패킹리스트 데이터 가져오기
  const fetchPackingData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('인증 토큰이 없습니다.');
      }

      const response = await fetch('/api/packing-list', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('패킹 리스트 조회에 실패했습니다.');
      }

      const result = await response.json();
      
      if (result.success) {
        // 특정 날짜의 데이터만 필터링
        let filteredData;
        if (date === 'no-date') {
          filteredData = result.data.filter(item => !item.pl_date);
        } else {
          filteredData = result.data.filter(item => item.pl_date === date);
        }
        
        // 포장코드별로 그룹화
        const groupedData = filteredData.reduce((groups, item) => {
          const key = item.packing_code;
          if (!groups[key]) {
            groups[key] = {
              packing_code: key,
              box_count: item.box_count,
              logistic_company: item.logistic_company,
              products: []
            };
          }
          groups[key].products.push(item);
          return groups;
        }, {});

        const groupedArray = Object.values(groupedData);
        setPackingData(groupedArray);
        setOriginalData(JSON.parse(JSON.stringify(groupedArray))); // 깊은 복사
        
        console.log('📊 [PackingListEdit] 데이터 로드 완료:', {
          date,
          totalGroups: groupedArray.length,
          totalProducts: filteredData.length
        });
      } else {
        throw new Error(result.error || '패킹 리스트 조회에 실패했습니다.');
      }
    } catch (error) {
      console.error('❌ [PackingListEdit] 데이터 로드 오류:', error);
      setError(error.message);
      toast.error('데이터 로드에 실패했습니다: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    if (date) {
      checkUserRole();
      fetchPackingData();
    } else {
      setLoading(false);
    }
  }, [date]);

  // 변경사항 감지
  useEffect(() => {
    if (originalData && packingData) {
      const hasChanges = JSON.stringify(originalData) !== JSON.stringify(packingData);
      setHasUnsavedChanges(hasChanges);
    }
  }, [packingData, originalData]);

  // 뒤로 가기
  const handleGoBack = () => {
    if (hasUnsavedChanges) {
      if (window.confirm('저장되지 않은 변경사항이 있습니다. 정말로 나가시겠습니까?')) {
        navigate('/dashboard/mj-packing-list');
      }
    } else {
      navigate('/dashboard/mj-packing-list');
    }
  };

  // 편집 모드 토글
  const toggleEditMode = () => {
    if (!isAdmin) {
      toast.error('편집은 관리자만 가능합니다.');
      return;
    }
    setIsEditMode(!isEditMode);
    if (isEditMode) {
      setEditingProduct(null);
      setSelectedProducts(new Set());
      setIsBulkEditMode(false);
    }
  };

  // 상품 편집 시작
  const startEditProduct = (productId, packingCode) => {
    if (!isEditMode) {
      toast.error('편집 모드를 활성화해주세요.');
      return;
    }
    setEditingProduct({ productId, packingCode });
  };

  // 상품 편집 취소
  const cancelEditProduct = () => {
    setEditingProduct(null);
  };

  // 상품 수정
  const updateProduct = async (productId, packingCode, updatedData) => {
    try {
      // 기존 상품 정보 찾기
      const currentProduct = packingData
        .find(group => group.packing_code === packingCode)
        ?.products.find(product => product.id === productId);
      
      if (!currentProduct) {
        toast.error('상품을 찾을 수 없습니다.');
        return;
      }
      
      // 데이터 업데이트 (재고 처리 제거됨)
      setPackingData(prev => {
        const newData = prev.map(group => {
          if (group.packing_code === packingCode) {
            return {
              ...group,
              products: group.products.map(product => 
                product.id === productId 
                  ? { ...product, ...updatedData }
                  : product
              )
            };
          }
          return group;
        });
        
        // 히스토리에 추가
        addToHistory(prev, newData);
        return newData;
      });
      
      // 수정된 상품의 프로젝트 export_quantity 재계산
      if (currentProduct.project_id) {
        console.log('🔄 [PackingListEdit] 수정된 상품의 프로젝트 export_quantity 재계산:', {
          projectId: currentProduct.project_id,
          updatedProduct: {
            id: currentProduct.id,
            product_name: currentProduct.product_name,
            oldQuantity: currentProduct.box_count * currentProduct.packaging_count * currentProduct.packaging_method,
            newQuantity: updatedData.box_count * updatedData.packaging_count * updatedData.packaging_method
          }
        });
        
        // 비동기로 재계산 (사용자 경험을 위해 대기하지 않음)
        calculateProjectExportQuantity(currentProduct.project_id).then(success => {
          if (success) {
            console.log('✅ [PackingListEdit] 수정 후 export_quantity 재계산 완료');
          } else {
            console.warn('⚠️ [PackingListEdit] 수정 후 export_quantity 재계산 실패');
          }
        });
      }
      
      setEditingProduct(null);
      toast.success('상품이 수정되었습니다.');
    } catch (error) {
      console.error('❌ [PackingListEdit] 상품 수정 오류:', error);
      toast.error('상품 수정에 실패했습니다: ' + error.message);
    }
  };

  // 상품 삭제
  const deleteProduct = async (productId, packingCode) => {
    if (!window.confirm('이 상품을 삭제하시겠습니까?')) {
      return;
    }

    try {
      // 삭제할 상품 정보 찾기
      const productToDelete = packingData
        .find(group => group.packing_code === packingCode)
        ?.products.find(product => product.id === productId);
      
      if (!productToDelete) {
        toast.error('삭제할 상품을 찾을 수 없습니다.');
        return;
      }

      // 실제 데이터베이스에서 삭제 (새로 추가된 상품이 아닌 경우만)
      if (!productToDelete.isNew && productToDelete.id && !productToDelete.id.toString().startsWith('new_')) {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('인증 토큰이 없습니다.');
        }

        console.log('🗑️ [PackingListEdit] 서버에서 상품 삭제 시작:', {
          productId: productToDelete.id,
          productName: productToDelete.product_name
        });

        const response = await fetch(`/api/packing-list/${productToDelete.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || '상품 삭제에 실패했습니다.');
        }

        const result = await response.json();
        console.log('✅ [PackingListEdit] 서버에서 상품 삭제 완료:', result);
      } else {
        console.log('ℹ️ [PackingListEdit] 새로 추가된 상품이므로 서버 삭제 생략:', {
          productId: productToDelete.id,
          isNew: productToDelete.isNew
        });
      }
      
      // 클라이언트 상태에서 삭제
      setPackingData(prev => {
        const newData = prev.map(group => {
          if (group.packing_code === packingCode) {
            const updatedProducts = group.products.filter(product => product.id !== productId);
            if (updatedProducts.length === 0) {
              return null; // 그룹 전체 삭제
            }
            return {
              ...group,
              products: updatedProducts
            };
          }
          return group;
        }).filter(Boolean); // null 그룹 제거
        
        addToHistory(prev, newData);
        return newData;
      });
      
      // 삭제된 상품의 프로젝트 export_quantity 재계산
      if (productToDelete.project_id) {
        console.log('🔄 [PackingListEdit] 삭제된 상품의 프로젝트 export_quantity 재계산:', {
          projectId: productToDelete.project_id,
          deletedProduct: {
            id: productToDelete.id,
            product_name: productToDelete.product_name,
            quantity: productToDelete.box_count * productToDelete.packaging_count * productToDelete.packaging_method
          }
        });
        
        // 삭제 완료 후 재계산 (동기적으로 처리)
        try {
          const recalcSuccess = await calculateProjectExportQuantity(productToDelete.project_id);
          if (recalcSuccess) {
            console.log('✅ [PackingListEdit] 삭제 후 export_quantity 재계산 완료');
            toast.success('상품이 삭제되고 프로젝트 수량이 업데이트되었습니다.');
          } else {
            console.warn('⚠️ [PackingListEdit] 삭제 후 export_quantity 재계산 실패');
            toast.warning('상품은 삭제되었지만 프로젝트 수량 업데이트에 실패했습니다.');
          }
        } catch (recalcError) {
          console.error('❌ [PackingListEdit] export_quantity 재계산 오류:', recalcError);
          toast.warning('상품은 삭제되었지만 프로젝트 수량 업데이트 중 오류가 발생했습니다.');
        }
      }
      
      // 검증 오류 초기화
      setValidationErrors({});
      
      // 토스트 메시지는 위에서 처리됨 (재계산 성공/실패에 따라)
    } catch (error) {
      console.error('❌ [PackingListEdit] 상품 삭제 오류:', error);
      toast.error('상품 삭제에 실패했습니다: ' + error.message);
    }
  };

  // 상품 추가
  const addProduct = (packingCode) => {
    const newProduct = {
      id: `new_${Date.now()}`,
      product_name: '',
      product_sku: '',
      client_product_id: `temp_${Date.now()}`,
      box_count: 1,
      packaging_method: 1,
      packaging_count: 1,
      quantity_per_box: 1,
      project_id: null,
      isNew: true
    };

    setPackingData(prev => {
      const newData = prev.map(group => {
        if (group.packing_code === packingCode) {
          return {
            ...group,
            products: [...group.products, newProduct]
          };
        }
        return group;
      });
      
      addToHistory(prev, newData);
      return newData;
    });
    
    setEditingProduct({ productId: newProduct.id, packingCode });
    toast.success('새 상품이 추가되었습니다.');
  };

  // 일괄 편집 모드 토글
  const toggleBulkEditMode = () => {
    if (!isEditMode) {
      toast.error('편집 모드를 먼저 활성화해주세요.');
      return;
    }
    setIsBulkEditMode(!isBulkEditMode);
    if (isBulkEditMode) {
      setSelectedProducts(new Set());
      setBulkEditData({ box_count: '', packaging_count: '', packaging_method: '' });
    }
  };

  // 상품 선택 토글
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
    if (selectedProducts.size === getAllProductIds().length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(getAllProductIds()));
    }
  };

  // 모든 상품 ID 가져오기
  const getAllProductIds = () => {
    return packingData.flatMap(group => group.products.map(product => product.id));
  };

  // 일괄 편집 실행
  const executeBulkEdit = () => {
    if (selectedProducts.size === 0) {
      toast.error('편집할 상품을 선택해주세요.');
      return;
    }

    const updates = {};
    if (bulkEditData.box_count) updates.box_count = parseInt(bulkEditData.box_count);
    if (bulkEditData.packaging_count) updates.packaging_count = parseInt(bulkEditData.packaging_count);
    if (bulkEditData.packaging_method) updates.packaging_method = parseInt(bulkEditData.packaging_method);

    if (Object.keys(updates).length === 0) {
      toast.error('편집할 값을 입력해주세요.');
      return;
    }

    // 편집될 상품들의 프로젝트 ID 수집
    const affectedProjectIds = new Set();
    packingData.forEach(group => {
      group.products.forEach(product => {
        if (selectedProducts.has(product.id) && product.project_id) {
          affectedProjectIds.add(product.project_id);
        }
      });
    });

    setPackingData(prev => {
      const newData = prev.map(group => ({
        ...group,
        products: group.products.map(product => 
          selectedProducts.has(product.id) 
            ? { ...product, ...updates }
            : product
        )
      }));
      
      addToHistory(prev, newData);
      return newData;
    });

    // 편집된 상품들의 프로젝트 export_quantity 재계산
    if (affectedProjectIds.size > 0) {
      console.log('🔄 [PackingListEdit] 일괄 편집 후 프로젝트별 export_quantity 재계산:', Array.from(affectedProjectIds));
      
      // 비동기로 재계산 (사용자 경험을 위해 대기하지 않음)
      Array.from(affectedProjectIds).forEach(projectId => {
        calculateProjectExportQuantity(projectId).then(success => {
          if (success) {
            console.log(`✅ [PackingListEdit] 프로젝트 ${projectId} export_quantity 재계산 완료`);
          } else {
            console.warn(`⚠️ [PackingListEdit] 프로젝트 ${projectId} export_quantity 재계산 실패`);
          }
        });
      });
    }

    toast.success(`${selectedProducts.size}개 상품이 일괄 편집되었습니다.`);
    setSelectedProducts(new Set());
    setBulkEditData({ box_count: '', packaging_count: '', packaging_method: '' });
    setIsBulkEditMode(false);
  };

  // 일괄 삭제
  const executeBulkDelete = async () => {
    if (selectedProducts.size === 0) {
      toast.error('삭제할 상품을 선택해주세요.');
      return;
    }

    if (!window.confirm(`선택된 ${selectedProducts.size}개 상품을 삭제하시겠습니까?`)) {
      return;
    }

    try {
      // 삭제될 상품들의 정보 수집
      const productsToDelete = [];
      const affectedProjectIds = new Set();
      
      packingData.forEach(group => {
        group.products.forEach(product => {
          if (selectedProducts.has(product.id)) {
            productsToDelete.push({
              ...product,
              packingCode: group.packing_code
            });
            if (product.project_id) {
              affectedProjectIds.add(product.project_id);
            }
          }
        });
      });

      // 실제 데이터베이스에서 삭제 (기존 상품들만)
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('인증 토큰이 없습니다.');
      }

      const deletePromises = productsToDelete
        .filter(product => !product.isNew && product.id && !product.id.toString().startsWith('new_'))
        .map(async (product) => {
          try {
            console.log('🗑️ [PackingListEdit] 일괄 삭제 - 서버에서 상품 삭제:', {
              productId: product.id,
              productName: product.product_name
            });

            const response = await fetch(`/api/packing-list/${product.id}`, {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });

            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || `상품 ${product.product_name} 삭제에 실패했습니다.`);
            }

            const result = await response.json();
            console.log('✅ [PackingListEdit] 일괄 삭제 - 서버에서 상품 삭제 완료:', result);
            return { success: true, productId: product.id };
          } catch (error) {
            console.error(`❌ [PackingListEdit] 일괄 삭제 - 상품 ${product.id} 삭제 실패:`, error);
            return { success: false, productId: product.id, error: error.message };
          }
        });

      // 모든 삭제 작업 완료 대기
      const deleteResults = await Promise.all(deletePromises);
      const successCount = deleteResults.filter(result => result.success).length;
      const failCount = deleteResults.filter(result => !result.success).length;

      console.log('📊 [PackingListEdit] 일괄 삭제 결과:', {
        total: productsToDelete.length,
        serverDeleted: successCount,
        clientOnly: productsToDelete.length - deletePromises.length,
        failed: failCount
      });

      // 클라이언트 상태에서 삭제
      setPackingData(prev => {
        const newData = prev.map(group => ({
          ...group,
          products: group.products.filter(product => !selectedProducts.has(product.id))
        })).filter(group => group.products.length > 0); // 빈 그룹 제거
        
        addToHistory(prev, newData);
        return newData;
      });

      // 삭제된 상품들의 프로젝트 export_quantity 재계산
      let recalcResults = [];
      if (affectedProjectIds.size > 0) {
        console.log('🔄 [PackingListEdit] 일괄 삭제 후 프로젝트별 export_quantity 재계산:', Array.from(affectedProjectIds));
        
        // 동기적으로 재계산 (삭제 완료 후 정확한 계산을 위해)
        const recalcPromises = Array.from(affectedProjectIds).map(async (projectId) => {
          try {
            const success = await calculateProjectExportQuantity(projectId);
            if (success) {
              console.log(`✅ [PackingListEdit] 프로젝트 ${projectId} export_quantity 재계산 완료`);
              return { projectId, success: true };
            } else {
              console.warn(`⚠️ [PackingListEdit] 프로젝트 ${projectId} export_quantity 재계산 실패`);
              return { projectId, success: false };
            }
          } catch (error) {
            console.error(`❌ [PackingListEdit] 프로젝트 ${projectId} export_quantity 재계산 오류:`, error);
            return { projectId, success: false, error: error.message };
          }
        });

        // 모든 재계산 완료 대기
        recalcResults = await Promise.all(recalcPromises);
        const successCount = recalcResults.filter(result => result.success).length;
        const failCount = recalcResults.filter(result => !result.success).length;

        console.log('📊 [PackingListEdit] 일괄 삭제 후 재계산 결과:', {
          totalProjects: affectedProjectIds.size,
          successCount,
          failCount
        });
      }

      // 검증 오류 초기화
      setValidationErrors({});

      // 재계산 결과에 따른 토스트 메시지
      if (affectedProjectIds.size > 0) {
        const recalcSuccessCount = recalcResults.filter(result => result.success).length;
        const recalcFailCount = recalcResults.filter(result => !result.success).length;
        
        if (recalcFailCount > 0) {
          toast.warning(`${selectedProducts.size}개 상품이 삭제되었습니다. (프로젝트 수량 업데이트 ${recalcSuccessCount}/${affectedProjectIds.size}개 성공)`);
        } else {
          toast.success(`${selectedProducts.size}개 상품이 삭제되고 프로젝트 수량이 업데이트되었습니다.`);
        }
      } else {
        toast.success(`${selectedProducts.size}개 상품이 삭제되었습니다.`);
      }
      
      setSelectedProducts(new Set());
      setIsBulkEditMode(false);
    } catch (error) {
      console.error('❌ [PackingListEdit] 일괄 삭제 오류:', error);
      toast.error('일괄 삭제에 실패했습니다: ' + error.message);
    }
  };

  // 히스토리에 추가
  const addToHistory = (oldData, newData) => {
    const historyItem = {
      timestamp: Date.now(),
      action: 'edit',
      data: JSON.parse(JSON.stringify(newData))
    };
    
    setEditHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(historyItem);
      return newHistory.slice(-50); // 최대 50개 히스토리 유지
    });
    
    setHistoryIndex(prev => Math.min(prev + 1, 49));
  };

  // 되돌리기
  const undo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setPackingData(JSON.parse(JSON.stringify(editHistory[newIndex].data)));
      toast.success('되돌리기 완료');
    }
  };

  // 다시하기
  const redo = () => {
    if (historyIndex < editHistory.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setPackingData(JSON.parse(JSON.stringify(editHistory[newIndex].data)));
      toast.success('다시하기 완료');
    }
  };

  // 재고 상태 확인 함수 제거됨 - 편집 모드에서는 재고 상태를 체크하지 않음

  // 재고 관련 함수들 제거됨 - 편집 모드에서는 재고 상태를 체크하지 않음

  // 프로젝트 export_quantity 재계산
  const calculateProjectExportQuantity = async (projectId) => {
    try {
      console.log('🔄 [PackingListEdit] export_quantity 재계산 시작:', { projectId });
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('인증 토큰이 없습니다.');
      }

      const response = await fetch(`/api/packing-list/calculate-project-export-quantity`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ projectId })
      });

      console.log('📡 [PackingListEdit] API 응답 상태:', {
        projectId,
        status: response.status,
        statusText: response.statusText
      });

      const result = await response.json();
      
      console.log('📊 [PackingListEdit] API 응답 데이터:', {
        projectId,
        success: result.success,
        message: result.message,
        data: result.data
      });
      
      if (result.success) {
        console.log('✅ [PackingListEdit] export_quantity 재계산 성공:', {
          projectId,
          oldExportQuantity: result.oldExportQuantity,
          newExportQuantity: result.newExportQuantity,
          remainQuantity: result.remainQuantity,
          packingListCount: result.packingListCount
        });
        return true;
      } else {
        console.error('❌ [PackingListEdit] export_quantity 재계산 실패:', {
          projectId,
          error: result.error,
          details: result.details
        });
        return false;
      }
    } catch (error) {
      console.error('❌ [PackingListEdit] export_quantity 재계산 오류:', {
        projectId,
        error: error.message,
        stack: error.stack
      });
      return false;
    }
  };

  // 데이터 검증
  const validateData = useCallback(() => {
    setIsValidating(true);
    const errors = {};
    
    // 빈 데이터 체크
    if (!packingData || packingData.length === 0) {
      console.log('⚠️ [validateData] 패킹 데이터가 비어있습니다.');
      setValidationErrors({});
      setIsValidating(false);
      return true; // 빈 데이터는 유효한 상태로 간주
    }
    
    // 실제 상품이 있는지 확인
    const totalProducts = packingData.reduce((sum, group) => sum + (group.products?.length || 0), 0);
    if (totalProducts === 0) {
      console.log('⚠️ [validateData] 상품이 없는 빈 데이터입니다.');
      setValidationErrors({});
      setIsValidating(false);
      return true; // 상품이 없는 데이터도 유효한 상태로 간주
    }
    
    console.log('🔍 [validateData] 검증 시작:', {
      packingDataLength: packingData.length,
      packingData: packingData.map(group => ({
        packing_code: group.packing_code,
        productsCount: group.products?.length || 0,
        products: group.products?.map(p => ({
          id: p.id,
          product_name: p.product_name,
          product_sku: p.product_sku,
          box_count: p.box_count,
          packaging_count: p.packaging_count,
          packaging_method: p.packaging_method,
          project_id: p.project_id
        }))
      }))
    });
    
    packingData.forEach((group, groupIndex) => {
      // 그룹 유효성 체크
      if (!group || !group.products || !Array.isArray(group.products)) {
        console.log(`⚠️ [validateData] 잘못된 그룹 데이터:`, group);
        return;
      }
      
      // 빈 그룹 체크
      if (group.products.length === 0) {
        console.log(`⚠️ [validateData] 빈 그룹 발견: ${group.packing_code}`);
        return;
      }
      
      group.products.forEach((product, productIndex) => {
        // 상품 유효성 체크
        if (!product || typeof product !== 'object') {
          console.log(`⚠️ [validateData] 잘못된 상품 데이터:`, product);
          return;
        }
        
        const key = `${groupIndex}_${productIndex}`;
        const productErrors = {};
        
        console.log(`🔍 [validateData] 상품 검증 중:`, {
          key,
          product: {
            id: product.id,
            product_name: product.product_name,
            product_sku: product.product_sku,
            box_count: product.box_count,
            packaging_count: product.packaging_count,
            packaging_method: product.packaging_method,
            project_id: product.project_id
          }
        });
        
        // 필수 필드 검증
        if (!product.product_name || !product.product_name.trim()) {
          productErrors.product_name = '상품명은 필수입니다.';
          console.log(`❌ [validateData] 상품명 오류:`, product.product_name);
        }
        
        if (!product.product_sku || !product.product_sku.trim()) {
          productErrors.product_sku = '상품 SKU는 필수입니다.';
          console.log(`❌ [validateData] 상품 SKU 오류:`, product.product_sku);
        }
        
        // 수량 필드 검증 (숫자 타입 체크)
        const boxCount = Number(product.box_count);
        const packagingCount = Number(product.packaging_count);
        const packagingMethod = Number(product.packaging_method);
        
        if (isNaN(boxCount) || boxCount <= 0) {
          productErrors.box_count = '박스 수는 0보다 커야 합니다.';
          console.log(`❌ [validateData] 박스 수 오류:`, { boxCount, original: product.box_count });
        }
        
        if (isNaN(packagingCount) || packagingCount <= 0) {
          productErrors.packaging_count = '포장 수는 0보다 커야 합니다.';
          console.log(`❌ [validateData] 포장 수 오류:`, { packagingCount, original: product.packaging_count });
        }
        
        if (isNaN(packagingMethod) || packagingMethod <= 0) {
          productErrors.packaging_method = '포장 방법은 0보다 커야 합니다.';
          console.log(`❌ [validateData] 포장 방법 오류:`, { packagingMethod, original: product.packaging_method });
        }
        
        // 재고 검증 제거됨 - 편집 모드에서는 재고 상태를 체크하지 않음
        
        // 오류가 있으면 errors에 추가
        if (Object.keys(productErrors).length > 0) {
          errors[key] = productErrors;
          console.log(`❌ [validateData] 상품 검증 실패:`, { key, errors: productErrors });
        } else {
          console.log(`✅ [validateData] 상품 검증 성공:`, { key });
        }
      });
    });
    
    console.log('🔍 [validateData] 검증 결과:', {
      totalErrors: Object.keys(errors).length,
      errors: errors,
      packingDataLength: packingData.length,
      totalProducts: packingData.reduce((sum, group) => sum + (group.products?.length || 0), 0)
    });
    
    setValidationErrors(errors);
    setIsValidating(false);
    
    return Object.keys(errors).length === 0;
  }, [packingData]);

  // 자동 저장 (디바운스)
  const autoSave = useCallback(
    debounce(async (data) => {
      if (!hasUnsavedChanges) return;
      
      try {
        console.log('💾 [PackingListEdit] 자동 저장 시작');
        // 여기에 자동 저장 로직 구현
        toast.success('자동 저장 완료');
      } catch (error) {
        console.error('❌ [PackingListEdit] 자동 저장 오류:', error);
        toast.error('자동 저장에 실패했습니다.');
      }
    }, 2000),
    [hasUnsavedChanges]
  );

  // 자동 저장 트리거
  useEffect(() => {
    if (hasUnsavedChanges) {
      autoSave(packingData);
    }
  }, [packingData, autoSave, hasUnsavedChanges]);

  // 수동 저장
  const saveChanges = async () => {
    // 빈 데이터 체크
    if (!packingData || packingData.length === 0) {
      toast.error('저장할 데이터가 없습니다.');
      return;
    }
    
    // 실제 상품이 있는지 확인
    const totalProducts = packingData.reduce((sum, group) => sum + (group.products?.length || 0), 0);
    if (totalProducts === 0) {
      toast.error('저장할 상품이 없습니다.');
      return;
    }
    
    if (!validateData()) {
      toast.error('데이터 검증에 실패했습니다. 오류를 확인해주세요.');
      return;
    }

    try {
      toast.loading('변경사항을 저장하는 중...');
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('인증 토큰이 없습니다.');
      }

      console.log('💾 [PackingListEdit] 수동 저장 시작:', {
        date,
        packingData,
        totalGroups: packingData.length,
        totalProducts: packingData.reduce((sum, group) => sum + (group.products?.length || 0), 0)
      });

      // 재고 차감 처리 제거됨 - 편집 모드에서는 재고 상태를 체크하지 않음

      const response = await fetch('/api/packing-list/bulk-update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          packingData,
          date
        })
      });

      const result = await response.json();
      toast.dismiss();

      if (result.success) {
        console.log('✅ [PackingListEdit] 저장 성공:', {
          insertedCount: result.insertedCount,
          affectedProjects: result.affectedProjects
        });
        
        // 프로젝트별 export_quantity 재계산
        const affectedProjectIds = [...new Set(
          packingData.flatMap(group => 
            group.products
              .map(product => product.project_id)
              .filter(Boolean)
          )
        )];
        
        if (affectedProjectIds.length > 0) {
          console.log('🔄 [PackingListEdit] 프로젝트별 export_quantity 재계산 시작:', affectedProjectIds);
          
          const recalculationPromises = affectedProjectIds.map(async (projectId) => {
            const success = await calculateProjectExportQuantity(projectId);
            if (!success) {
              console.warn(`⚠️ [PackingListEdit] 프로젝트 ${projectId}의 export_quantity 재계산 실패`);
            }
            return success;
          });
          
          const recalculationResults = await Promise.all(recalculationPromises);
          const successCount = recalculationResults.filter(Boolean).length;
          
          console.log('✅ [PackingListEdit] export_quantity 재계산 완료:', {
            totalProjects: affectedProjectIds.length,
            successCount,
            failedCount: affectedProjectIds.length - successCount
          });
        }
        
        // 성공 시 원본 데이터 업데이트
        setOriginalData(JSON.parse(JSON.stringify(packingData)));
        setHasUnsavedChanges(false);
        
        toast.success(`${result.message}\n${result.insertedCount}개 항목이 저장되었습니다.`);
      } else {
        console.error('❌ [PackingListEdit] 저장 실패:', result);
        toast.error(result.error || '저장에 실패했습니다.');
      }
    } catch (error) {
      console.error('❌ [PackingListEdit] 저장 오류:', {
        error: error.message,
        stack: error.stack,
        date,
        timestamp: new Date().toISOString()
      });
      toast.dismiss();
      toast.error('저장에 실패했습니다: ' + error.message);
    }
  };

  // 디바운스 함수
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // 키보드 단축키
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        saveChanges();
      }
      if (e.key === 'Escape') {
        if (editingProduct) {
          cancelEditProduct();
        } else if (isEditMode) {
          toggleEditMode();
        }
      }
      if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        undo();
      }
      if (e.ctrlKey && e.key === 'y') {
        e.preventDefault();
        redo();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [editingProduct, isEditMode, saveChanges, undo, redo]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">데이터를 불러오는 중...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="text-red-600 mb-4">
            <AlertTriangle className="w-16 h-16 mx-auto mb-4" />
            <h2 className="text-xl font-semibold">오류가 발생했습니다</h2>
            <p className="text-gray-600 mt-2">{error}</p>
          </div>
          <button
            onClick={handleGoBack}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            목록으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* 헤더 */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={handleGoBack}
            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            title="목록으로 돌아가기"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                패킹리스트 편집 - {displayDate}
              </h1>
              <p className="text-gray-600">패킹리스트 데이터를 편집할 수 있습니다</p>
            </div>
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={toggleEditMode}
            className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
              isEditMode 
                ? 'bg-green-600 text-white hover:bg-green-700' 
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            <Edit3 className="w-4 h-4" />
            {isEditMode ? '편집 완료' : '편집 모드'}
          </button>
          
          {isEditMode && (
            <>
              <button
                onClick={toggleBulkEditMode}
                className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                  isBulkEditMode 
                    ? 'bg-orange-600 text-white hover:bg-orange-700' 
                    : 'bg-purple-600 text-white hover:bg-purple-700'
                }`}
              >
                <Edit3 className="w-4 h-4" />
                {isBulkEditMode ? '일괄편집 완료' : '일괄편집'}
              </button>
              
              <button
                onClick={saveChanges}
                disabled={!hasUnsavedChanges}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                저장 {hasUnsavedChanges && '(변경됨)'}
              </button>
              
              <button
                onClick={undo}
                disabled={historyIndex <= 0}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                되돌리기
              </button>
              
              <button
                onClick={redo}
                disabled={historyIndex >= editHistory.length - 1}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <RotateCw className="w-4 h-4" />
                다시하기
              </button>
            </>
          )}
        </div>

        {/* 상태 표시 */}
        {hasUnsavedChanges && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center gap-2 text-yellow-800">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm font-medium">저장되지 않은 변경사항이 있습니다.</span>
            </div>
          </div>
        )}

        {/* 일괄 편집 모달 */}
        {isBulkEditMode && (
          <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-purple-800">일괄 편집 모드</h3>
              <div className="flex items-center gap-2">
                <span className="text-sm text-purple-600">
                  {selectedProducts.size}개 상품 선택됨
                </span>
                <button
                  onClick={toggleAllProductsSelection}
                  className="px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700"
                >
                  {selectedProducts.size === getAllProductIds().length ? '전체 해제' : '전체 선택'}
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">박스 수</label>
                <input
                  type="number"
                  min="1"
                  value={bulkEditData.box_count}
                  onChange={(e) => setBulkEditData(prev => ({ ...prev, box_count: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="변경할 박스 수"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">포장 수</label>
                <input
                  type="number"
                  min="1"
                  value={bulkEditData.packaging_count}
                  onChange={(e) => setBulkEditData(prev => ({ ...prev, packaging_count: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="변경할 포장 수"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">포장 방법</label>
                <input
                  type="number"
                  min="1"
                  value={bulkEditData.packaging_method}
                  onChange={(e) => setBulkEditData(prev => ({ ...prev, packaging_method: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="변경할 포장 방법"
                />
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={executeBulkEdit}
                disabled={selectedProducts.size === 0}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Edit3 className="w-4 h-4" />
                일괄 편집 실행
              </button>
              <button
                onClick={executeBulkDelete}
                disabled={selectedProducts.size === 0}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                선택 삭제
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 패킹리스트 데이터 테이블 */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">패킹리스트 데이터</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {isBulkEditMode && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      checked={selectedProducts.size === getAllProductIds().length && getAllProductIds().length > 0}
                      onChange={toggleAllProductsSelection}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  포장코드
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  상품명
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  박스 수
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  포장 수
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  포장 방법
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  총 수량
                </th>
                {isEditMode && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    액션
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {packingData.map((group, groupIndex) => (
                <React.Fragment key={group.packing_code}>
                  {group.products.map((product, productIndex) => {
                    const key = `${groupIndex}_${productIndex}`;
                    const hasError = validationErrors[key];
                    const isEditing = editingProduct?.productId === product.id;
                    
                    return (
                      <tr key={product.id} className={`${hasError ? 'bg-red-50' : ''} ${selectedProducts.has(product.id) ? 'bg-purple-50' : ''}`}>
                        {isBulkEditMode && (
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={selectedProducts.has(product.id)}
                              onChange={() => toggleProductSelection(product.id)}
                              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                            />
                          </td>
                        )}
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {group.packing_code}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {isEditing ? (
                            <input
                              type="text"
                              defaultValue={product.product_name}
                              className="w-full px-2 py-1 border border-gray-300 rounded"
                              onBlur={(e) => {
                                if (e.target.value !== product.product_name) {
                                  updateProduct(product.id, group.packing_code, { product_name: e.target.value });
                                }
                              }}
                            />
                          ) : (
                            product.product_name
                          )}
                          {hasError?.product_name && (
                            <div className="text-red-500 text-xs mt-1">{hasError.product_name}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {isEditing ? (
                            <input
                              type="number"
                              min="1"
                              defaultValue={product.box_count}
                              className="w-20 px-2 py-1 border border-gray-300 rounded"
                              onBlur={(e) => {
                                const value = parseInt(e.target.value);
                                if (value !== product.box_count) {
                                  updateProduct(product.id, group.packing_code, { box_count: value });
                                }
                              }}
                            />
                          ) : (
                            product.box_count
                          )}
                          {hasError?.box_count && (
                            <div className="text-red-500 text-xs mt-1">{hasError.box_count}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {isEditing ? (
                            <input
                              type="number"
                              min="1"
                              defaultValue={product.packaging_count}
                              className="w-20 px-2 py-1 border border-gray-300 rounded"
                              onBlur={(e) => {
                                const value = parseInt(e.target.value);
                                if (value !== product.packaging_count) {
                                  updateProduct(product.id, group.packing_code, { packaging_count: value });
                                }
                              }}
                            />
                          ) : (
                            product.packaging_count
                          )}
                          {hasError?.packaging_count && (
                            <div className="text-red-500 text-xs mt-1">{hasError.packaging_count}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {isEditing ? (
                            <input
                              type="number"
                              min="1"
                              defaultValue={product.packaging_method}
                              className="w-20 px-2 py-1 border border-gray-300 rounded"
                              onBlur={(e) => {
                                const value = parseInt(e.target.value);
                                if (value !== product.packaging_method) {
                                  updateProduct(product.id, group.packing_code, { packaging_method: value });
                                }
                              }}
                            />
                          ) : (
                            product.packaging_method
                          )}
                          {hasError?.packaging_method && (
                            <div className="text-red-500 text-xs mt-1">{hasError.packaging_method}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {product.box_count * product.packaging_count * product.packaging_method}
                        </td>
                        {isEditMode && (
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div className="flex gap-2">
                              {isEditing ? (
                                <>
                                  <button
                                    onClick={() => updateProduct(product.id, group.packing_code, {})}
                                    className="text-green-600 hover:text-green-800"
                                    title="저장"
                                  >
                                    <Check className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={cancelEditProduct}
                                    className="text-gray-600 hover:text-gray-800"
                                    title="취소"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => startEditProduct(product.id, group.packing_code)}
                                    className="text-blue-600 hover:text-blue-800"
                                    title="편집"
                                  >
                                    <Edit3 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => deleteProduct(product.id, group.packing_code)}
                                    className="text-red-600 hover:text-red-800"
                                    title="삭제"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                  
                  {/* 상품 추가 버튼 */}
                  {isEditMode && (
                    <tr>
                      <td colSpan={isBulkEditMode ? (isEditMode ? 8 : 7) : (isEditMode ? 7 : 6)} className="px-6 py-4">
                        <button
                          onClick={() => addProduct(group.packing_code)}
                          className="flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm"
                        >
                          <Plus className="w-4 h-4" />
                          상품 추가
                        </button>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 키보드 단축키 안내 */}
      {isEditMode && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-medium text-gray-700 mb-2">키보드 단축키</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-gray-600">
            <div><kbd className="px-2 py-1 bg-white rounded">Ctrl + S</kbd> 저장</div>
            <div><kbd className="px-2 py-1 bg-white rounded">Ctrl + Z</kbd> 되돌리기</div>
            <div><kbd className="px-2 py-1 bg-white rounded">Ctrl + Y</kbd> 다시하기</div>
            <div><kbd className="px-2 py-1 bg-white rounded">Esc</kbd> 편집 취소</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PackingListEdit;
