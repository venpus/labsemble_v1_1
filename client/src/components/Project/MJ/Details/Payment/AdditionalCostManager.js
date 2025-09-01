import React, { useState } from 'react';
import toast from 'react-hot-toast';

const AdditionalCostManager = ({
  additionalCostItems,
  isAdmin,
  isAdminLoading,
  onPaymentDataUpdate,
  onAdditionalCostSave,
  project
}) => {
  const [isAdditionalCostFocused, setIsAdditionalCostFocused] = useState(false);

  // 추가 비용 항목 추가
  const addAdditionalCostItem = () => {
    if (additionalCostItems.length >= 5) return;
    
    const newItem = {
      id: Date.now(),
      description: '',
      cost: 0
    };
    
    const newItems = [...additionalCostItems, newItem];
    onPaymentDataUpdate({ additionalCostItems: newItems });
    
    // DB에 자동 저장
    if (onAdditionalCostSave) {
      onAdditionalCostSave(newItems);
    }
  };

  // 추가 비용 항목 제거
  const removeAdditionalCostItem = (id) => {
    const newItems = additionalCostItems.filter(item => item.id !== id);
    onPaymentDataUpdate({ additionalCostItems: newItems });
    
    // DB에 자동 저장
    if (onAdditionalCostSave) {
      onAdditionalCostSave(newItems);
    }
  };

  // 추가 비용 항목 업데이트
  const updateAdditionalCostItem = (index, field, value) => {
    const newItems = [...additionalCostItems];
    newItems[index] = { ...newItems[index], [field]: value };
    onPaymentDataUpdate({ additionalCostItems: newItems });
  };

  // 추가 비용 항목 저장 (onBlur 시)
  const saveAdditionalCostItem = (index) => {
    const item = additionalCostItems[index];
    if (item.description && item.cost > 0) {
      // DB에 자동 저장
      if (onAdditionalCostSave) {
        onAdditionalCostSave(additionalCostItems);
      }
    }
  };

  return (
    <>
      {/* 추가 비용 항목 추가/삭제 버튼 */}
      <tr className="hover:bg-gray-50">
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="flex items-center">
            <div className="w-4 h-4 mr-3 rounded-full bg-blue-600"></div>
            <span className="text-sm font-medium text-gray-900">추가 비용 항목 관리</span>
          </div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="text-sm text-gray-900">
            <span className="font-medium">
              {additionalCostItems.length === 0 
                ? '추가 비용 항목을 추가해주세요' 
                : `${additionalCostItems.length}개 항목 관리 중`
              }
            </span>
          </div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-right">
          {!isAdminLoading && isAdmin ? (
            <button
              onClick={addAdditionalCostItem}
              disabled={additionalCostItems.length >= 5}
              className={`px-3 py-1 text-xs rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${
                additionalCostItems.length >= 5
                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500'
              }`}
            >
              {additionalCostItems.length >= 5 ? '최대 항목 수 도달' : '추가 비용 항목 추가'}
            </button>
          ) : !isAdminLoading ? (
            <span className="text-sm text-gray-500">관리자 전용</span>
          ) : (
            <span className="text-sm text-gray-400">권한 확인 중...</span>
          )}
        </td>
      </tr>

      {/* 추가 비용 항목 목록 - 항목이 있을 때만 표시 */}
      {additionalCostItems.length > 0 && additionalCostItems.map((item, index) => (
        <tr key={item.id} className="hover:bg-gray-50">
          <td className="px-6 py-4 whitespace-nowrap">
            <div className="flex items-center">
              <div className="w-4 h-4 mr-3 rounded-full bg-red-600"></div>
              <span className="text-sm font-medium text-gray-900">추가 비용 {index + 1}</span>
            </div>
          </td>
          <td className="px-3 py-4 whitespace-nowrap">
            <div className="flex items-center space-x-2">
              {!isAdminLoading && isAdmin ? (
                <input
                  type="text"
                  placeholder="비용 설명 입력..."
                  value={item.description}
                  onChange={(e) => updateAdditionalCostItem(index, 'description', e.target.value)}
                  onFocus={() => setIsAdditionalCostFocused(true)}
                  onBlur={() => {
                    setIsAdditionalCostFocused(false);
                    // 포커스를 벗어날 때 자동 저장
                    if (item.description !== '' && item.description !== project?.additional_cost_items?.[index]?.description) {
                      // 추가 비용 항목이 변경되었을 때만 저장
                      console.log('추가 비용 설명 자동 저장:', item.description);
                      saveAdditionalCostItem(index);
                    }
                  }}
                  className="w-72 px-3 py-2 text-sm border border-gray-300 rounded-md bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200"
                />
              ) : !isAdminLoading ? (
                <span className="text-sm text-gray-900 px-3 py-2">
                  {item.description || '-'}
                </span>
              ) : (
                <span className="text-sm text-gray-400 px-3 py-2">권한 확인 중...</span>
              )}
            </div>
          </td>
          <td className="px-3 py-4 whitespace-nowrap text-right">
            <div className="flex items-center justify-end space-x-2">
              {!isAdminLoading && isAdmin ? (
                <input
                  type="number"
                  value={item.cost}
                  onChange={(e) => updateAdditionalCostItem(index, 'cost', Number(e.target.value) || 0)}
                  onFocus={() => setIsAdditionalCostFocused(true)}
                  onBlur={() => {
                    setIsAdditionalCostFocused(false);
                    // 포커스를 벗어날 때 자동 저장
                    if (item.cost !== 0 && item.cost !== project?.additional_cost_items?.[index]?.cost) {
                      // 추가 비용이 변경되었을 때만 저장
                      console.log('추가 비용 금액 자동 저장:', item.cost);
                      saveAdditionalCostItem(index);
                    }
                  }}
                  className="w-28 px-2 py-1 text-right border border-gray-300 rounded bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200"
                  min="0"
                  step="0.01"
                />
              ) : !isAdminLoading ? (
                <span className="text-sm text-gray-900 px-2 py-1">
                  ¥{item.cost.toLocaleString()}
                </span>
              ) : (
                <span className="text-sm text-gray-400 px-2 py-1">권한 확인 중...</span>
              )}
              {!isAdminLoading && isAdmin && (
                <button
                  onClick={() => removeAdditionalCostItem(item.id)}
                  className="px-2 py-1 text-xs bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
                >
                  삭제
                </button>
              )}
            </div>
          </td>
        </tr>
      ))}
    </>
  );
};

export default AdditionalCostManager; 