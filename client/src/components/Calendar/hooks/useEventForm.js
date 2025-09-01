import { useState, useCallback } from 'react';

const INITIAL_EVENT_STATE = {
  title: '',
  date: '',
  time: '',
  location: '',
  description: '',
  assignee: '',
  productName: '',
  quantity: '',
  unit: '개'
};

export const useEventForm = (onAddEvent) => {
  const [showEventModal, setShowEventModal] = useState(false);
  const [newEvent, setNewEvent] = useState(INITIAL_EVENT_STATE);

  // 폼 필드 업데이트
  const updateEventField = useCallback((field, value) => {
    setNewEvent(prev => ({ ...prev, [field]: value }));
  }, []);

  // 폼 초기화
  const resetForm = useCallback(() => {
    setNewEvent(INITIAL_EVENT_STATE);
  }, []);

  // 모달 열기
  const openModal = useCallback(() => {
    setShowEventModal(true);
  }, []);

  // 모달 닫기
  const closeModal = useCallback(() => {
    setShowEventModal(false);
    resetForm();
  }, [resetForm]);

  // 이벤트 추가
  const handleAddEvent = useCallback(() => {
    if (newEvent.title && newEvent.date && newEvent.productName && newEvent.quantity) {
      onAddEvent(newEvent);
      closeModal();
    }
  }, [newEvent, onAddEvent, closeModal]);

  // 날짜 설정
  const setEventDate = useCallback((date) => {
    updateEventField('date', date.toISOString().split('T')[0]);
  }, [updateEventField]);

  return {
    showEventModal,
    newEvent,
    updateEventField,
    openModal,
    closeModal,
    handleAddEvent,
    setEventDate
  };
}; 