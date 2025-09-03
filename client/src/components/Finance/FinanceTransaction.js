import React, { useState } from 'react';
import { Plus, X, Save, Calendar, DollarSign, MessageSquare } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const FinanceTransaction = ({ onAddTransaction }) => {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    currency: 'KRW',
    exchangeRate: '1',
    amount: '',
    notes: ''
  });

  const [errors, setErrors] = useState({});

  // 화폐 단위 옵션
  const currencyOptions = [
    { code: 'KRW', symbol: '₩', name: '한화 원' },
    { code: 'USD', symbol: '$', name: '미국 달러' },
    { code: 'CNY', symbol: '¥', name: '중국 위안' }
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // 화폐가 변경되면 환율 초기화
    if (name === 'currency') {
      let defaultRate = '1';
      if (value === 'USD') defaultRate = '1350'; // 1달러 = 1,300원
      if (value === 'CNY') defaultRate = '193';  // 1위안 = 180원
      
      setFormData(prev => ({
        ...prev,
        [name]: value,
        exchangeRate: defaultRate
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }

    // 에러 메시지 제거
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.date) {
      newErrors.date = '날짜를 선택해주세요.';
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = '올바른 금액을 입력해주세요.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      // API 호출을 위한 데이터 준비
      const transactionData = {
        transaction_date: formData.date,
        currency: formData.currency,
        exchange_rate: parseFloat(formData.currency === 'KRW' ? '1' : formData.exchangeRate),
        amount: parseFloat(formData.amount),
        notes: formData.notes || ''
      };

      // API 호출
      const response = await axios.post('/api/finance/incoming', transactionData, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.data.success) {
        toast.success('입금 내역이 성공적으로 저장되었습니다.');
        
        // 부모 컴포넌트에 새 거래 전달
        const savedTransaction = {
          ...transactionData,
          id: response.data.data.id,
          created_at: new Date().toISOString()
        };
        
        onAddTransaction(savedTransaction);
        
        // 폼 초기화
        setFormData({
          date: new Date().toISOString().split('T')[0],
          currency: 'KRW',
          exchangeRate: '1',
          amount: '',
          notes: ''
        });
        
        setErrors({});
      }
    } catch (error) {
      console.error('입금 내역 저장 실패:', error);
      
      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error('입금 내역 저장 중 오류가 발생했습니다.');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      currency: 'KRW',
      exchangeRate: '1',
      amount: '',
      notes: ''
    });
    setErrors({});
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">거래내역 추가</h3>
        <p className="text-sm text-gray-600">
          새로운 수입 또는 지출 내역을 등록합니다.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-6">
          {/* 날짜 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-2" />
              거래일자 *
            </label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.date ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            {errors.date && (
              <p className="mt-1 text-sm text-red-600">{errors.date}</p>
            )}
          </div>

          {/* 금액 */}
          <div>
            <div className="flex space-x-3">
              {/* 화폐 단위 선택 */}
              <div className="w-24">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <DollarSign className="w-4 h-4 inline mr-2" />
                  화폐
                </label>
                <select
                  name="currency"
                  value={formData.currency}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                >
                  {currencyOptions.map(currency => (
                    <option key={currency.code} value={currency.code}>
                      {currency.symbol} {currency.code}
                    </option>
                  ))}
                </select>
              </div>
              {/* 환율 입력 */}
              <div className="w-32">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  환율
                </label>
                <input
                  type="number"
                  name="exchangeRate"
                  value={formData.exchangeRate}
                  onChange={handleInputChange}
                  placeholder="1"
                  min="0.01"
                  step="0.01"
                  className="w-full px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
              {/* 금액 입력 */}
              <div className="w-48">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  금액 *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    name="amount"
                    value={formData.amount}
                    onChange={handleInputChange}
                    placeholder="0"
                    min="0"
                    step="1000"
                    className={`w-full px-3 py-2 pr-12 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.amount ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                    {currencyOptions.find(c => c.code === formData.currency)?.symbol || '₩'}
                  </span>
                </div>
              </div>
              
              {/* 환율 계산된 금액 표시 */}
              {formData.amount && (
                <div className="w-64">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    환율 계산 금액
                  </label>
                  <div className="text-base font-bold text-gray-700">
                    {formData.currency === 'KRW' ? (
                      <>
                        $ {(parseFloat(formData.amount) / 1350).toFixed(2)} | ¥ {(parseFloat(formData.amount) / 193).toFixed(2)}
                      </>
                    ) : formData.currency === 'USD' ? (
                      <>
                        ₩ {(parseFloat(formData.amount) * 1350).toLocaleString()} | ¥ {(parseFloat(formData.amount) * 1350 / 193).toFixed(2)}
                      </>
                    ) : formData.currency === 'CNY' ? (
                      <>
                        ₩ {(parseFloat(formData.amount) * 193).toLocaleString()} | $ {(parseFloat(formData.amount) * 193 / 1350).toFixed(2)}
                      </>
                    ) : null}
                  </div>
                </div>
              )}
            </div>
            {errors.amount && (
              <p className="mt-1 text-sm text-red-600">{errors.amount}</p>
            )}
          </div>



          {/* 비고 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <MessageSquare className="w-4 h-4 inline mr-2" />
              비고
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              placeholder="추가 설명이나 메모를 입력하세요"
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* 버튼 */}
        <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={resetForm}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 focus:border-transparent"
          >
            <X className="w-4 h-4 inline mr-2" />
            초기화
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <Save className="w-4 h-4 inline mr-2" />
            저장
          </button>
        </div>
      </form>
    </div>
  );
};

export default FinanceTransaction; 