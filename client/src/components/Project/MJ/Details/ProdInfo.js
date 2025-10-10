import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Package, Upload, X, Play, Image as ImageIcon, Video, Save, Lock } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const ProdInfo = ({ project }) => {
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const fileInputRef = useRef(null);

  // 제품 정보 입력 상태
  const [editableUnitWeight, setEditableUnitWeight] = useState(project.unit_weight || '');
  const [editablePackagingMethod, setEditablePackagingMethod] = useState(project.packaging_method || '');
  const [editableBoxDimensions, setEditableBoxDimensions] = useState(project.box_dimensions || '');
  const [editableBoxWeight, setEditableBoxWeight] = useState(project.box_weight || '');
  const [editableSupplierName, setEditableSupplierName] = useState(project.supplier_name || '');
  const [editableFactoryDeliveryDays, setEditableFactoryDeliveryDays] = useState(project.factory_delivery_days || '');
  
  // 예상 단가 자동 계산: (최종 금액/수량) + (41/1000 × 1개 무게) + (4.8/(5000/1개 무게)) + (1/(5000/1개 무게))
  const calculateEstimatedCost = () => {
    const quantity = Number(project.quantity) || 0;
    const unitWeight = Number(project.unit_weight) || 0;
    
    if (quantity === 0) {
      return 0;
    }
    
    // 최종 금액 계산: 총계 + 수수료 + 공장배송비 + 추가비용
    const subtotal = Number(project.unit_price) * quantity || 0; // 총계
    const fee = Number(project.fee) || 0; // 수수료
    const factoryShippingCost = Number(project.factory_shipping_cost) || 0; // 공장배송비
    
    // 추가비용 합계 계산
    let additionalCostTotal = 0;
    if (project.additional_cost_items) {
      try {
        const additionalCosts = typeof project.additional_cost_items === 'string'
          ? JSON.parse(project.additional_cost_items)
          : project.additional_cost_items;
        
        if (Array.isArray(additionalCosts)) {
          additionalCostTotal = additionalCosts.reduce((sum, item) => sum + (Number(item.cost) || 0), 0);
        }
      } catch (e) {
        console.error('추가비용 파싱 오류:', e);
      }
    }
    
    const finalAmount = subtotal + fee + factoryShippingCost + additionalCostTotal;
    
    // 1. 최종 금액 / 수량
    const pricePerUnit = finalAmount / quantity;
    
    // 2. 41/1000 × 1개 무게
    const weightCost1 = (41 / 1000) * unitWeight;
    
    // 3. 4.8/(5000/1개 무게) = 4.8 × 1개 무게 / 5000
    const weightCost2 = unitWeight > 0 ? (4.8 / (5000 / unitWeight)) : 0;
    
    // 4. 1/(5000/1개 무게) = 1 × 1개 무게 / 5000
    const weightCost3 = unitWeight > 0 ? (1 / (5000 / unitWeight)) : 0;
    
    // 총 예상 단가
    const estimatedUnitPrice = pricePerUnit + weightCost1 + weightCost2 + weightCost3;
    
    return estimatedUnitPrice;
  };

  // 컴포넌트 마운트 시 admin 권한 확인 및 기존 파일들 불러오기
  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await axios.get('/api/users/me', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        setIsAdmin(response.data.is_admin || false);
      } catch (error) {
        console.error('admin 권한 확인 오류:', error);
        setIsAdmin(false);
      }
    };

    const loadExistingFiles = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await axios.get(
          `/api/mj-project/${project.id}/real-images`,
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );

        const files = response.data.files.map(fileInfo => ({
          id: fileInfo.id,
          originalName: fileInfo.original_name,
          filePath: fileInfo.file_path,
          fileSize: fileInfo.file_size,
          mimeType: fileInfo.mime_type,
          type: fileInfo.mime_type.startsWith('image/') ? 'image' : 'video',
          preview: fileInfo.mime_type.startsWith('image/') 
            ? `/uploads/project/mj/realImage/${fileInfo.file_path.split('/').pop()}`
            : null
        }));

        setUploadedFiles(files);
      } catch (error) {
        console.error('기존 파일 불러오기 오류:', error);
      }
    };

    checkAdminStatus();
    loadExistingFiles();
  }, [project.id]);

  // project prop 변경 시 제품 정보 상태 업데이트
  useEffect(() => {
    if (project) {
      console.log('🔍 Project 데이터 업데이트:', {
        unit_weight: project.unit_weight,
        packaging_method: project.packaging_method,
        box_dimensions: project.box_dimensions,
        box_weight: project.box_weight, // 제품사이즈
        supplier_name: project.supplier_name,
        factory_delivery_days: project.factory_delivery_days
      });
      
      setEditableUnitWeight(project.unit_weight || '');
      setEditablePackagingMethod(project.packaging_method || '');
      setEditableBoxDimensions(project.box_dimensions || '');
      setEditableBoxWeight(project.box_weight || '');
      setEditableSupplierName(project.supplier_name || '');
      setEditableFactoryDeliveryDays(project.factory_delivery_days || '');
      setHasChanges(false); // 데이터 로드 시 변경사항 초기화
    }
  }, [project]);

  // 변경사항 감지
  useEffect(() => {
    const isChanged = 
      editableUnitWeight !== (project.unit_weight || '') ||
      editablePackagingMethod !== (project.packaging_method || '') ||
      editableBoxDimensions !== (project.box_dimensions || '') ||
      editableBoxWeight !== (project.box_weight || '') ||
      editableSupplierName !== (project.supplier_name || '') ||
      editableFactoryDeliveryDays !== (project.factory_delivery_days || '');
    
    setHasChanges(isChanged);
  }, [
    editableUnitWeight, 
    editablePackagingMethod, 
    editableBoxDimensions, 
    editableBoxWeight, 
    editableSupplierName, 
    editableFactoryDeliveryDays,
    project
  ]);

  // 제품 정보를 DB에 저장하는 함수
  const saveProductInfo = useCallback(async () => {
    if (!isAdmin) {
      toast.error('admin 권한이 필요합니다.');
      return;
    }

    if (!hasChanges) {
      toast.info('변경된 내용이 없습니다.');
      return;
    }

    setIsSaving(true);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('로그인이 필요합니다.');
        setIsSaving(false);
        return;
      }

      // 숫자 필드는 빈 문자열이면 null로, 값이 있으면 숫자로 변환
      const parseNumberOrNull = (value) => {
        if (value === '' || value === null || value === undefined) {
          return null;
        }
        const parsed = Number(value);
        return isNaN(parsed) ? null : parsed;
      };

      // 텍스트 필드는 빈 문자열이면 null로 변환
      const parseTextOrNull = (value) => {
        if (value === '' || value === null || value === undefined) {
          return null;
        }
        return String(value).trim() || null;
      };

      const updateData = {
        unit_weight: parseNumberOrNull(editableUnitWeight),
        packaging_method: parseTextOrNull(editablePackagingMethod),
        box_dimensions: parseTextOrNull(editableBoxDimensions),
        box_weight: parseTextOrNull(editableBoxWeight), // 제품사이즈는 텍스트
        supplier_name: parseTextOrNull(editableSupplierName),
        factory_delivery_days: parseNumberOrNull(editableFactoryDeliveryDays)
      };

      console.log('💾 제품 정보 저장 시작:', {
        raw: {
          unit_weight: editableUnitWeight,
          packaging_method: editablePackagingMethod,
          box_dimensions: editableBoxDimensions,
          box_weight: editableBoxWeight,
          supplier_name: editableSupplierName,
          factory_delivery_days: editableFactoryDeliveryDays
        },
        processed: updateData
      });

      const response = await axios.patch(
        `/api/mj-project/${project.id}`,
        updateData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('✅ 제품 정보 저장 성공:', response.data);
      toast.success('제품 정보가 성공적으로 저장되었습니다.');
      setHasChanges(false);

      // 저장 후 페이지 새로고침하여 최신 데이터 가져오기
      setTimeout(() => {
        window.location.reload();
      }, 1000);

    } catch (error) {
      console.error('❌ 제품 정보 저장 오류:', error);
      console.error('오류 상세:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      const errorMessage = error.response?.data?.error || 
                          error.response?.data?.message || 
                          '제품 정보 저장 중 오류가 발생했습니다.';
      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  }, [
    project.id, 
    isAdmin, 
    hasChanges,
    editableUnitWeight,
    editablePackagingMethod,
    editableBoxDimensions,
    editableBoxWeight,
    editableSupplierName,
    editableFactoryDeliveryDays
  ]);

  const handleFileUpload = async (event) => {
    if (!isAdmin) {
      toast.error('admin 권한이 필요합니다.');
      return;
    }

    const files = Array.from(event.target.files);
    
    if (uploadedFiles.length + files.length > 10) {
      toast.error('최대 10개까지만 업로드할 수 있습니다.');
      return;
    }

    setIsUploading(true);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('로그인이 필요합니다.');
        return;
      }

      // FormData 생성
      const formData = new FormData();
      files.forEach(file => {
        formData.append('files', file);
      });

      // 서버에 파일 업로드
      const response = await axios.post(
        `/api/mj-project/${project.id}/real-images`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      // 업로드 성공 시 파일 목록에 추가
      const newFiles = response.data.files.map(fileInfo => ({
        id: Date.now() + Math.random(),
        originalName: fileInfo.original_name,
        filePath: fileInfo.file_path,
        fileSize: fileInfo.file_size,
        mimeType: fileInfo.mime_type,
        type: fileInfo.mime_type.startsWith('image/') ? 'image' : 'video',
        preview: fileInfo.mime_type.startsWith('image/') 
          ? `/uploads/project/mj/realImage/${fileInfo.file_path.split('/').pop()}`
          : null
      }));

      setUploadedFiles(prev => [...prev, ...newFiles]);
      toast.success(`${files.length}개 파일이 성공적으로 업로드되었습니다.`);

    } catch (error) {
      console.error('파일 업로드 오류:', error);
      toast.error(error.response?.data?.error || '파일 업로드 중 오류가 발생했습니다.');
    } finally {
      setIsUploading(false);
    }
  };

  const removeFile = async (fileId) => {
    if (!isAdmin) {
      toast.error('admin 권한이 필요합니다.');
      return;
    }

    const fileToRemove = uploadedFiles.find(f => f.id === fileId);
    if (!fileToRemove) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('로그인이 필요합니다.');
        return;
      }

      // 서버에서 파일 삭제
      await axios.delete(
        `/api/mj-project/${project.id}/real-images/${fileToRemove.id}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      // 로컬 상태에서 파일 제거
      setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
      toast.success('파일이 성공적으로 삭제되었습니다.');

    } catch (error) {
      console.error('파일 삭제 오류:', error);
      toast.error('파일 삭제 중 오류가 발생했습니다.');
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const isImage = (file) => {
    return file.type.startsWith('image/');
  };

  const isVideo = (file) => {
    return file.type.startsWith('video/');
  };

  return (
    <div className="mb-8">
      {/* 헤더 및 저장 버튼 */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center">
          <Package className="w-5 h-5 mr-2 text-orange-600" />
          제품정보
        </h2>
        
        {isAdmin && (
          <button
            onClick={saveProductInfo}
            disabled={!hasChanges || isSaving}
            className={`flex items-center px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
              hasChanges && !isSaving
                ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? '저장 중...' : hasChanges ? '저장' : '변경사항 없음'}
          </button>
        )}
      </div>

      {/* 변경사항 안내 */}
      {isAdmin && hasChanges && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center">
            <Save className="w-4 h-4 mr-2 text-blue-600" />
            <span className="text-sm text-blue-800">
              변경된 내용이 있습니다. 저장 버튼을 클릭하여 저장하세요.
            </span>
          </div>
        </div>
      )}
      
      {/* 제품정보 테이블 */}
      <div className="overflow-x-auto mb-6">
        {!isAdmin && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center">
              <Lock className="w-4 h-4 mr-2 text-yellow-600" />
              <span className="text-sm text-yellow-800">
                제품 정보 수정은 admin 권한이 필요합니다. 현재 읽기 전용 모드입니다.
              </span>
            </div>
          </div>
        )}
        <table className="min-w-full divide-y divide-gray-200 border border-gray-200">
          <tbody className="bg-white divide-y divide-gray-200">
            <tr className="hover:bg-gray-50">
              {/* 1. 1개 무게 */}
              <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900 bg-gray-50 border-r border-gray-200" style={{width: '12.5%'}}>
                <div className="flex items-center">
                  <div className="w-4 h-4 mr-2 rounded-full bg-blue-600"></div>
                  1개 무게
                </div>
              </td>
              <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-gray-200" style={{width: '12.5%'}}>
                {isAdmin ? (
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      value={editableUnitWeight}
                      onChange={(e) => setEditableUnitWeight(e.target.value)}
                      placeholder="0"
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      min="0"
                      step="0.1"
                    />
                    <span className="text-sm text-gray-600 font-medium">g</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-900">
                      {editableUnitWeight ? `${editableUnitWeight}g` : '-'}
                    </span>
                  </div>
                )}
              </td>
              
              {/* 2. 제품사이즈 */}
              <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900 bg-gray-50 border-r border-gray-200" style={{width: '12.5%'}}>
                <div className="flex items-center">
                  <div className="w-4 h-4 mr-2 rounded-full bg-purple-600"></div>
                  제품사이즈
                </div>
              </td>
              <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-gray-200" style={{width: '12.5%'}}>
                {isAdmin ? (
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={editableBoxWeight}
                      onChange={(e) => setEditableBoxWeight(e.target.value)}
                      placeholder="예: 10x5x3"
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                    <span className="text-sm text-gray-600 font-medium">cm</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-900">
                      {editableBoxWeight ? `${editableBoxWeight}cm` : '-'}
                    </span>
                  </div>
                )}
              </td>
              
              {/* 3. 소포장 방식 */}
              <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900 bg-gray-50 border-r border-gray-200" style={{width: '12.5%'}}>
                <div className="flex items-center">
                  <div className="w-4 h-4 mr-2 rounded-full bg-green-600"></div>
                  소포장 수량
                </div>
              </td>
              <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-gray-200" style={{width: '12.5%'}}>
                {isAdmin ? (
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={editablePackagingMethod}
                      onChange={(e) => setEditablePackagingMethod(e.target.value)}
                      placeholder="예: 비닐, 종이, 폴리백"
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                    <span className="text-sm text-gray-600 font-medium">개</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-900">
                      {editablePackagingMethod || '-'}
                    </span>
                  </div>
                )}
              </td>
              
              {/* 4. 한박스 입수량 */}
              <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900 bg-gray-50 border-r border-gray-200" style={{width: '12.5%'}}>
                <div className="flex items-center">
                  <div className="w-4 h-4 mr-2 rounded-full bg-yellow-600"></div>
                  한박스 입수량
                </div>
              </td>
              <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900" style={{width: '12.5%'}}>
                {isAdmin ? (
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={editableBoxDimensions}
                      onChange={(e) => setEditableBoxDimensions(e.target.value)}
                      placeholder="예: 100"
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                    />
                    <span className="text-sm text-gray-600 font-medium">개</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-900">
                      {editableBoxDimensions ? `${editableBoxDimensions}개` : '-'}
                    </span>
                  </div>
                )}
              </td>
            </tr>
            <tr className="hover:bg-gray-50">
              <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900 bg-gray-50 border-r border-gray-200" style={{width: '12.5%'}}>
                <div className="flex items-center">
                  <div className="w-4 h-4 mr-2 rounded-full bg-indigo-600"></div>
                  공급자 이름
                </div>
              </td>
              <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-gray-200" style={{width: '12.5%'}}>
                {isAdmin ? (
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={editableSupplierName}
                      onChange={(e) => setEditableSupplierName(e.target.value)}
                      placeholder="공급자명 입력"
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-900">
                      {editableSupplierName || '-'}
                    </span>
                  </div>
                )}
              </td>
              <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900 bg-gray-50 border-r border-gray-200" style={{width: '12.5%'}}>
                <div className="flex items-center">
                  <div className="w-4 h-4 mr-2 rounded-full bg-red-600"></div>
                  공장 납기
                </div>
              </td>
              <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-gray-200" style={{width: '12.5%'}}>
                {isAdmin ? (
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      value={editableFactoryDeliveryDays}
                      onChange={(e) => setEditableFactoryDeliveryDays(e.target.value)}
                      placeholder="0"
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      min="0"
                      step="1"
                    />
                    <span className="text-sm text-gray-600 font-medium">일</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-900">
                      {editableFactoryDeliveryDays ? `${editableFactoryDeliveryDays}일` : '-'}
                    </span>
                  </div>
                )}
              </td>
              <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 bg-gray-50 border-r border-gray-200" style={{width: '12.5%'}}>
                <div className="flex items-center">
                  <div className="w-4 h-4 mr-2 rounded-full bg-teal-600"></div>
                  예상원가
                </div>
              </td>
              <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-gray-200" style={{width: '12.5%'}}>
                <div className="flex flex-col space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-semibold text-teal-700" title="단가×(1+수수료율) + 무게기반 비용">
                      {calculateEstimatedCost() > 0 ? `¥${calculateEstimatedCost().toFixed(2)}` : '-'}
                    </span>
                    <span className="text-xs text-gray-500">(자동)</span>
                  </div>
                  {project.unit_weight > 0 && (
                    <span className="text-xs text-gray-400">
                      {project.unit_weight}g 기준
                    </span>
                  )}
                </div>
              </td>
              <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900 bg-gray-50 border-r border-gray-200" style={{width: '12.5%'}}>
                <div className="flex items-center">
                  <div className="w-4 h-4 mr-2 rounded-full bg-gray-600"></div>
                  -
                </div>
              </td>
              <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-gray-200" style={{width: '12.5%'}}>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-900">-</span>
                </div>
              </td>
              
            </tr>
          </tbody>
        </table>
      </div>

      {/* 제품 이미지/동영상 업로드 섹션 */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <ImageIcon className="w-5 h-5 mr-2 text-blue-600" />
            제품 이미지/동영상
          </h3>
          {isAdmin && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">
                {uploadedFiles.length}/10
              </span>
              <button
                onClick={handleUploadClick}
                disabled={uploadedFiles.length >= 10 || isUploading}
                className="flex items-center px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {isUploading ? (
                  <>
                    <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    업로드 중...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    업로드
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {!isAdmin && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center">
              <Lock className="w-4 h-4 mr-2 text-yellow-600" />
              <span className="text-sm text-yellow-800">
                파일 업로드/삭제는 admin 권한이 필요합니다. 현재 읽기 전용 모드입니다.
              </span>
            </div>
          </div>
        )}

        {/* 파일 업로드 안내 */}
        {isAdmin && (
          <div className="mb-4 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              • 최대 10개까지 이미지와 동영상을 업로드할 수 있습니다.<br/>
              • 파일 크기 제한은 없습니다.<br/>
              • 지원 형식: JPG, PNG, GIF, MP4, MOV, AVI 등
            </p>
          </div>
        )}

        {/* 숨겨진 파일 입력 */}
        {isAdmin && (
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*"
            onChange={handleFileUpload}
            className="hidden"
          />
        )}

        {/* 업로드된 파일 썸네일 */}
        {uploadedFiles.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {uploadedFiles.map((file) => (
              <div key={file.id} className="relative group">
                <div className="relative">
                  {file.type === 'image' ? (
                    <img
                      src={file.preview}
                      alt="제품 이미지"
                      className="w-full h-32 object-cover rounded-lg border border-gray-200 shadow-sm"
                    />
                  ) : (
                    <div className="w-full h-32 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center relative">
                      <video
                        src={file.preview}
                        className="w-full h-full object-cover rounded-lg"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-30 rounded-lg flex items-center justify-center">
                        <Play className="w-8 h-8 text-white" />
                      </div>
                    </div>
                  )}
                  
                  {/* 삭제 버튼 */}
                  {isAdmin && (
                    <button
                      onClick={() => removeFile(file.id)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
                
                {/* 파일 정보 */}
                <div className="mt-2 text-center">
                  <p className="text-xs text-gray-600 truncate">
                    {file.originalName}
                  </p>
                  <div className="flex items-center justify-center mt-1">
                    {file.type === 'image' ? (
                      <ImageIcon className="w-3 h-3 text-blue-500 mr-1" />
                    ) : (
                      <Video className="w-3 h-3 text-purple-500 mr-1" />
                    )}
                    <span className="text-xs text-gray-500">
                      {file.type === 'image' ? '이미지' : '동영상'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 업로드 안내 (파일이 없을 때) */}
        {uploadedFiles.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Upload className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">업로드 버튼을 클릭하여 제품 이미지나 동영상을 추가하세요</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProdInfo; 