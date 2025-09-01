import React from 'react';

const EventModal = ({ 
  isOpen, 
  newEvent, 
  onClose, 
  onAddEvent, 
  onUpdateEvent 
}) => {
  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onAddEvent();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">새 일정 추가</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              프로젝트명 *
            </label>
            <input
              type="text"
              value={newEvent.title}
              onChange={(e) => onUpdateEvent('title', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="프로젝트명을 입력하세요"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              날짜 *
            </label>
            <input
              type="date"
              value={newEvent.date}
              onChange={(e) => onUpdateEvent('date', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              상품명 *
            </label>
            <input
              type="text"
              value={newEvent.productName}
              onChange={(e) => onUpdateEvent('productName', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="상품명을 입력하세요"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                수량 *
              </label>
              <input
                type="number"
                value={newEvent.quantity}
                onChange={(e) => onUpdateEvent('quantity', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="수량"
                min="1"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                단위
              </label>
              <select
                value={newEvent.unit}
                onChange={(e) => onUpdateEvent('unit', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="개">개</option>
                <option value="박스">박스</option>
                <option value="세트">세트</option>
                <option value="kg">kg</option>
                <option value="m">m</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              시간
            </label>
            <input
              type="time"
              value={newEvent.time}
              onChange={(e) => onUpdateEvent('time', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              장소
            </label>
            <input
              type="text"
              value={newEvent.location}
              onChange={(e) => onUpdateEvent('location', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="장소를 입력하세요"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              담당자
            </label>
            <input
              type="text"
              value={newEvent.assignee}
              onChange={(e) => onUpdateEvent('assignee', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="담당자를 입력하세요"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              설명
            </label>
            <textarea
              value={newEvent.description}
              onChange={(e) => onUpdateEvent('description', e.target.value)}
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="일정에 대한 설명을 입력하세요"
            />
          </div>

          <div className="flex items-center justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              추가
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EventModal; 