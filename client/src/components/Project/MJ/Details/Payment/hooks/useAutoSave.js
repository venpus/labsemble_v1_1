import { useEffect, useCallback } from 'react';
import axios from 'axios';

export const useAutoSave = (project, paymentData, updatePaymentData) => {
  const {
    selectedFeeRate,
    paymentStatus,
    paymentDates,
    balanceDueDate,
    advanceDueDate,
    paymentDueDates,
    editableShippingCost,
    editableSubtotal,
    editableFee,
    balanceAmount,
    totalAmount,
    additionalCostItems
  } = paymentData;

  // 총계를 DB에 저장하는 함수
  const saveSubtotalToDB = useCallback(async (newSubtotal) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        return; // 토큰이 없으면 조용히 리턴 (사용자에게 에러 표시하지 않음)
      }

      const paymentDataToSave = {
        unitPrice: paymentData.editableUnitPrice,
        selectedFeeRate: selectedFeeRate,
        paymentStatus: paymentStatus,
        paymentDates: paymentDates,
        balanceDueDate: balanceDueDate,
        advanceDueDate: advanceDueDate,
        paymentDueDates: paymentDueDates,
        factoryShippingCost: editableShippingCost,
        subtotal: newSubtotal,
        fee: editableFee,
        totalAmount: totalAmount,
        advancePayment: newSubtotal,
        additionalCostItems: JSON.stringify(additionalCostItems)
      };

      await axios.post(
        `/api/mj-project/${project.id}/payment`,
        paymentDataToSave,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('총계가 자동으로 DB에 저장되었습니다:', newSubtotal);
    } catch (error) {
      console.error('총계 자동 저장 오류:', error);
      // 사용자에게 에러 표시하지 않음 (자동 저장이므로)
    }
  }, [project.id, paymentData, selectedFeeRate, paymentStatus, paymentDates, balanceDueDate, advanceDueDate, paymentDueDates, editableShippingCost, editableFee, totalAmount, additionalCostItems]);

  // 공장 배송비를 DB에 저장하는 함수
  const saveShippingCostToDB = useCallback(async (newShippingCost) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        return; // 토큰이 없으면 조용히 리턴 (사용자에게 에러 표시하지 않음)
      }

      // 새로운 balanceAmount 계산
      const totalAdditionalCosts = additionalCostItems.reduce((sum, item) => sum + item.cost, 0);
      const newBalanceAmount = editableFee + newShippingCost + totalAdditionalCosts;

      const paymentDataToSave = {
        unitPrice: paymentData.editableUnitPrice,
        selectedFeeRate: selectedFeeRate,
        paymentStatus: paymentStatus,
        paymentDates: paymentDates,
        balanceDueDate: balanceDueDate,
        advanceDueDate: advanceDueDate,
        paymentDueDates: paymentDueDates,
        factoryShippingCost: newShippingCost,
        subtotal: editableSubtotal,
        fee: editableFee,
        totalAmount: totalAmount,
        advancePayment: editableSubtotal,
        additionalCostItems: JSON.stringify(additionalCostItems)
      };

      await axios.post(
        `/api/mj-project/${project.id}/payment`,
        paymentDataToSave,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('공장 배송비가 자동으로 DB에 저장되었습니다:', newShippingCost);
    } catch (error) {
      console.error('공장 배송비 자동 저장 오류:', error);
      // 사용자에게 에러 표시하지 않음 (자동 저장이므로)
    }
  }, [project.id, paymentData, selectedFeeRate, paymentStatus, paymentDates, balanceDueDate, advanceDueDate, paymentDueDates, editableSubtotal, editableFee, totalAmount, additionalCostItems]);

  // 수수료를 DB에 저장하는 함수
  const saveFeeToDB = useCallback(async (newFee) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        return; // 토큰이 없으면 조용히 리턴 (사용자에게 에러 표시하지 않음)
      }

      // 새로운 balanceAmount 계산
      const totalAdditionalCosts = additionalCostItems.reduce((sum, item) => sum + item.cost, 0);
      const newBalanceAmount = newFee + editableShippingCost + totalAdditionalCosts;

      const paymentDataToSave = {
        unitPrice: paymentData.editableUnitPrice,
        selectedFeeRate: selectedFeeRate,
        paymentStatus: paymentStatus,
        paymentDates: paymentDates,
        balanceDueDate: balanceDueDate,
        advanceDueDate: advanceDueDate,
        paymentDueDates: paymentDueDates,
        factoryShippingCost: editableShippingCost,
        subtotal: editableSubtotal,
        fee: newFee,
        totalAmount: totalAmount,
        advancePayment: editableSubtotal,
        additionalCostItems: JSON.stringify(additionalCostItems)
      };

      await axios.post(
        `/api/mj-project/${project.id}/payment`,
        paymentDataToSave,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('수수료가 자동으로 DB에 저장되었습니다:', newFee);
    } catch (error) {
      console.error('수수료 자동 저장 오류:', error);
      // 사용자에게 에러 표시하지 않음 (자동 저장이므로)
    }
  }, [project.id, paymentData, selectedFeeRate, paymentStatus, paymentDates, balanceDueDate, advanceDueDate, paymentDueDates, editableShippingCost, editableSubtotal, totalAmount, additionalCostItems]);

  // 추가 비용 항목을 DB에 저장하는 함수
  const saveAdditionalCostItemsToDB = useCallback(async (newItems) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        return; // 토큰이 없으면 조용히 리턴 (사용자에게 에러 표시하지 않음)
      }

      const paymentDataToSave = {
        unitPrice: paymentData.editableUnitPrice,
        selectedFeeRate: selectedFeeRate,
        paymentStatus: paymentStatus,
        paymentDates: paymentDates,
        balanceDueDate: balanceDueDate,
        advanceDueDate: advanceDueDate,
        paymentDueDates: paymentDueDates,
        factoryShippingCost: editableShippingCost,
        subtotal: editableSubtotal,
        fee: editableFee,
        totalAmount: totalAmount,
        advancePayment: editableSubtotal,
        additionalCostItems: JSON.stringify(newItems)
      };

      await axios.post(
        `/api/mj-project/${project.id}/payment`,
        paymentDataToSave,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('추가 비용 항목이 자동으로 DB에 저장되었습니다:', newItems);
    } catch (error) {
      console.error('추가 비용 항목 자동 저장 오류:', error);
      // 사용자에게 에러 표시하지 않음 (자동 저장이므로)
    }
  }, [project.id, paymentData, selectedFeeRate, paymentStatus, paymentDates, balanceDueDate, advanceDueDate, paymentDueDates, editableShippingCost, editableSubtotal, editableFee, totalAmount, additionalCostItems]);

  // 최종 결제 금액을 DB에 저장하는 함수
  const saveTotalAmountToDB = useCallback(async (newTotalAmount) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        return; // 토큰이 없으면 조용히 리턴 (사용자에게 에러 표시하지 않음)
      }

      const paymentDataToSave = {
        unitPrice: paymentData.editableUnitPrice,
        selectedFeeRate: selectedFeeRate,
        paymentStatus: paymentStatus,
        paymentDates: paymentDates,
        balanceDueDate: balanceDueDate,
        advanceDueDate: advanceDueDate,
        paymentDueDates: paymentDueDates,
        factoryShippingCost: editableShippingCost,
        subtotal: editableSubtotal,
        fee: editableFee,
        totalAmount: newTotalAmount,
        advancePayment: editableSubtotal,
        additionalCostItems: JSON.stringify(additionalCostItems)
      };

      await axios.post(
        `/api/mj-project/${project.id}/payment`,
        paymentDataToSave,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('최종 결제 금액이 자동으로 DB에 저장되었습니다:', newTotalAmount);
    } catch (error) {
      console.error('최종 결제 금액 자동 저장 오류:', error);
      // 사용자에게 에러 표시하지 않음 (자동 저장이므로)
    }
  }, [project.id, paymentData, selectedFeeRate, paymentStatus, paymentDates, balanceDueDate, advanceDueDate, paymentDueDates, editableShippingCost, editableSubtotal, editableFee, additionalCostItems]);

  // 선금을 DB에 저장하는 함수
  const saveAdvancePaymentToDB = useCallback(async (newAdvancePayment) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        return; // 토큰이 없으면 조용히 리턴 (사용자에게 에러 표시하지 않음)
      }

      const paymentDataToSave = {
        unitPrice: paymentData.editableUnitPrice,
        selectedFeeRate: selectedFeeRate,
        paymentStatus: paymentStatus,
        paymentDates: paymentDates,
        balanceDueDate: balanceDueDate,
        advanceDueDate: advanceDueDate,
        paymentDueDates: paymentDueDates,
        factoryShippingCost: editableShippingCost,
        subtotal: editableSubtotal,
        fee: editableFee,
        totalAmount: totalAmount,
        advancePayment: newAdvancePayment,
        additionalCostItems: JSON.stringify(additionalCostItems)
      };

      await axios.post(
        `/api/mj-project/${project.id}/payment`,
        paymentDataToSave,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('선금이 자동으로 DB에 저장되었습니다:', newAdvancePayment);
    } catch (error) {
      console.error('선금 자동 저장 오류:', error);
      // 사용자에게 에러 표시하지 않음 (자동 저장이므로)
    }
  }, [project.id, paymentData, selectedFeeRate, paymentStatus, paymentDates, balanceDueDate, advanceDueDate, paymentDueDates, editableShippingCost, editableSubtotal, editableFee, totalAmount, additionalCostItems]);

  // 총계 변경 시 자동 DB 저장
  useEffect(() => {
    if (editableSubtotal !== 0) {
      saveSubtotalToDB(editableSubtotal);
    }
  }, [editableSubtotal, saveSubtotalToDB]);

  // 최종 결제 금액 변경 시 자동 DB 저장
  useEffect(() => {
    const newTotalAmount = editableSubtotal + editableShippingCost + editableFee + 
      additionalCostItems.reduce((sum, item) => sum + item.cost, 0);
    
    if (newTotalAmount !== 0) {
      saveTotalAmountToDB(newTotalAmount);
    }
  }, [editableSubtotal, editableShippingCost, editableFee, additionalCostItems, saveTotalAmountToDB]);

  // 총계 변경 시 선금 자동 DB 저장
  useEffect(() => {
    if (editableSubtotal !== 0) {
      saveAdvancePaymentToDB(editableSubtotal);
    }
  }, [editableSubtotal, saveAdvancePaymentToDB]);

  // 공장 배송비 변경 시 자동 DB 저장
  useEffect(() => {
    if (editableShippingCost !== 0) {
      saveShippingCostToDB(editableShippingCost);
    }
  }, [editableShippingCost, saveShippingCostToDB]);

  // 수수료 변경 시 자동 DB 저장 (초기 로딩 시에는 저장하지 않음)
  useEffect(() => {
    if (editableFee !== 0 && project.fee !== editableFee) {
      console.log('수수료 변경 감지, DB에 자동 저장:', editableFee);
      saveFeeToDB(editableFee);
    }
  }, [editableFee, saveFeeToDB, project.fee]);

  // 추가 비용 항목 변경 시 자동 DB 저장
  useEffect(() => {
    if (JSON.stringify(additionalCostItems) !== JSON.stringify(project.additional_cost_items)) {
      console.log('추가 비용 항목 변경 감지, DB에 자동 저장:', additionalCostItems);
      saveAdditionalCostItemsToDB(additionalCostItems);
    }
  }, [additionalCostItems, saveAdditionalCostItemsToDB, project.additional_cost_items]);

  return {
    saveSubtotalToDB,
    saveShippingCostToDB,
    saveFeeToDB,
    saveAdditionalCostItemsToDB,
    saveTotalAmountToDB,
    saveAdvancePaymentToDB
  };
}; 