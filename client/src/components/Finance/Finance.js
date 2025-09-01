import React, { useState, useEffect } from 'react';
import { Plus, Download, Filter, Search, Calendar, DollarSign, TrendingUp, TrendingDown, Truck } from 'lucide-react';
import FinanceLedger from './FinanceLedger';
import FinanceTransaction from './FinanceTransaction';
import FinancePaymentSchedule from './FinancePaymentSchedule';
import FinanceQuickStats from './FinanceQuickStats';
import FinanceFilters from './FinanceFilters';
import { useAuth } from '../../contexts/AuthContext';

const Finance = () => {
  const { user } = useAuth();
  const isAdmin = user?.isAdmin || false;
  const [activeTab, setActiveTab] = useState('ledger');
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState({
    startDate: '',
    endDate: ''
  });

  const [summaryData, setSummaryData] = useState({
    totalAmountKRW: 0,
    totalAmountUSD: 0,
    totalAmountCNY: 0
  });

  // Finance 카드 상태 변수들
  const [totalAdvancePayment, setTotalAdvancePayment] = useState(0);
  const [totalTransactionAmount, setTotalTransactionAmount] = useState(0);
  const [totalBalance, setTotalBalance] = useState(0);
  const [totalShippingCost, setTotalShippingCost] = useState(0);
  const [totalUnpaidAdvance, setTotalUnpaidAdvance] = useState(0);
  const [totalUnpaidBalance, setTotalUnpaidBalance] = useState(0);
  const [totalUnpaidShippingCost, setTotalUnpaidShippingCost] = useState(0); // 미지급 배송비 추가
  
  // 지급 예정 관련 상태 변수들 (UI 표시용 고정값)
  const [advancePaymentSchedule, setAdvancePaymentSchedule] = useState(0); // 선금 지급 예정
  const [balancePaymentSchedule, setBalancePaymentSchedule] = useState(0); // 잔금 지급 예정
  const [shippingPaymentSchedule, setShippingPaymentSchedule] = useState(0); // 배송비 지급 예정

  // Admin이 아닌 경우 거래내역 탭을 선택했을 때 장부 탭으로 자동 전환
  useEffect(() => {
    if (!isAdmin && activeTab === 'transaction') {
      setActiveTab('ledger');
    }
  }, [isAdmin, activeTab]);

  // 지급 예정 선금 정보 가져오기 (payment_status.advance = false인 프로젝트들의 advance_payment 합계)
  const fetchAdvancePaymentSchedule = async () => {
    try {
      const response = await fetch('/api/finance/advance-payment-schedule', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.success) {
          const scheduleAmount = Number(data.data.totalAdvancePaymentSchedule ?? 0) || 0;
          
          // 지급 예정 선금 설정
          if (scheduleAmount > 0) {
            setAdvancePaymentSchedule(scheduleAmount);
          } else {
            setAdvancePaymentSchedule(0);
          }
        } else {
          setAdvancePaymentSchedule(0);
        }
      } else {
        setAdvancePaymentSchedule(0);
      }
    } catch (error) {
      setAdvancePaymentSchedule(0);
    }
  };

  // 잔금 지급 예정 정보 가져오기 (payment_status.balance = false인 프로젝트들의 balance_amount 합계)
  const fetchBalancePaymentSchedule = async () => {
    try {
      const response = await fetch('/api/finance/balance-payment-schedule', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.success) {
          const scheduleAmount = Number(data.data.totalBalancePaymentSchedule ?? 0) || 0;
          
          // 잔금 지급 예정 설정
          if (scheduleAmount > 0) {
            setBalancePaymentSchedule(scheduleAmount);
          } else {
            setBalancePaymentSchedule(0);
          }
        } else {
          setBalancePaymentSchedule(0);
        }
      } else {
        setBalancePaymentSchedule(0);
      }
    } catch (error) {
      setBalancePaymentSchedule(0);
    }
  };

  // 배송비 지급 예정 정보 가져오기 (is_paid = 0인 데이터들의 logistic_fee 합계)
  const fetchShippingPaymentSchedule = async () => {
    try {
      const response = await fetch('/api/logistic-payment/shipping-payment-schedule', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.success) {
          const scheduleAmount = Number(data.data.totalShippingPaymentSchedule ?? 0) || 0;
          
          // 배송비 지급 예정 설정
          if (scheduleAmount > 0) {
            setShippingPaymentSchedule(scheduleAmount);
          } else {
            setShippingPaymentSchedule(0);
          }
        } else {
          setShippingPaymentSchedule(0);
        }
      } else {
        setShippingPaymentSchedule(0);
      }
    } catch (error) {
      setShippingPaymentSchedule(0);
    }
  };

  // advance_payment 정보 가져오기 (CNY 단위로 직접 사용)
  const fetchAdvancePayment = async () => {
    try {
      const response = await fetch('/api/finance/advance-payment', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.success) {
          // advance_payment는 이미 CNY 단위로 저장되어 있음
          const advancePaymentCNY = Number(data.data.totalAdvancePayment ?? 0) || 0;
          
          // advance_payment가 0보다 큰 경우에만 설정
          if (advancePaymentCNY > 0) {
            setTotalAdvancePayment(advancePaymentCNY);
          } else {
            setTotalAdvancePayment(0);
          }
        } else {
          setTotalAdvancePayment(0);
        }
      } else {
        setTotalAdvancePayment(0);
      }
    } catch (error) {
      setTotalAdvancePayment(0);
    }
  };



  // 입금 및 지출 내역 데이터 가져오기
  const fetchTransactions = async () => {
    try {
      setLoading(true);
      
      // 입금 내역과 지출 내역을 병렬로 가져오기
      const [incomingResponse, expenseResponse] = await Promise.all([
        fetch('/api/finance/incoming', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }),
        fetch('/api/finance/expense', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        })
      ]);
      
      if (incomingResponse.ok && expenseResponse.ok) {
        const incomingData = await incomingResponse.json();
        const expenseData = await expenseResponse.json();
        
        if (incomingData.success && expenseData.success) {
          // 입금 내역 변환 (숫자 타입 보장)
          const incomingTransactions = incomingData.data.transactions.map(transaction => ({
            id: `incoming-${transaction.id}`,
            date: transaction.transaction_date,
            description: transaction.notes || '입금 내역',
            category: transaction.currency,
            amount: Number(transaction.amount_cny) || 0,
            type: 'income',
            reference: `FIN-${transaction.id.toString().padStart(3, '0')}`,
            notes: transaction.notes || ''
          }));
          
          // 지출 내역 변환 (숫자 타입 보장)
          const expenseTransactions = expenseData.data.transactions.map(transaction => ({
            id: `expense-${transaction.id}`,
            date: transaction.transaction_date,
            description: transaction.notes || '지출 내역',
            category: transaction.category || '기타',
            amount: -Number(Math.abs(transaction.amount_cny)) || 0, // 음수로 표시
            type: 'expense',
            reference: `EXP-${transaction.id.toString().padStart(3, '0')}`,
            notes: transaction.notes || ''
          }));
          
          // 모든 거래를 날짜순으로 정렬하고 잔액 계산
          const allTransactions = [...incomingTransactions, ...expenseTransactions]
            .sort((a, b) => new Date(a.date) - new Date(b.date));
          
          // 잔액 계산 (CNY 기준, 숫자 타입 보장)
          let runningBalance = 0;
          const transactionsWithBalance = allTransactions.map(transaction => {
            const amount = Number(transaction.amount) || 0; // 이미 CNY 기준으로 변환된 금액
            runningBalance += amount;
            return {
              ...transaction,
              amount: amount,
              balance: Number(runningBalance) // CNY 기준 누적 잔액
            };
          });
          
          setTransactions(transactionsWithBalance);
          
          // 요약 통계 데이터 설정 (CNY 기준)
          if (incomingData.data.summary) {
            setSummaryData(incomingData.data.summary);
          }
        }
      }
    } catch (error) {
      // 오류 처리
    } finally {
      setLoading(false);
    }
  };

  // mj_project에서 총 거래금액 정보 가져오기
  const fetchTotalAmount = async () => {
    try {
      const response = await fetch('/api/finance/total-amount', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.success) {
          const totalAmount = Number(data.data.totalTransactionAmount ?? 0) || 0;
          
          // 총 거래금액 설정
          if (totalAmount > 0) {
            setTotalTransactionAmount(totalAmount);
          } else {
            setTotalTransactionAmount(0);
          }
        } else {
          setTotalTransactionAmount(0);
        }
      } else {
        setTotalTransactionAmount(0);
      }
    } catch (error) {
      setTotalTransactionAmount(0);
    }
  };

  // mj_project에서 총 balance_amount 정보 가져오기
  const fetchTotalFee = async () => {
    try {
      const response = await fetch('/api/finance/total-fee', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.success) {
          const totalFee = Number(data.data.totalFeeAmount ?? 0) || 0;
          
          // 총 balance_amount 설정 (총 잔금으로 사용)
          if (totalFee > 0) {
            setTotalBalance(totalFee);
          } else {
            setTotalBalance(0);
          }
        } else {
          setTotalBalance(0);
        }
      } else {
        setTotalBalance(0);
      }
    } catch (error) {
      setTotalBalance(0);
    }
  };

  // mj_project에서 미지급 선금 정보 가져오기
  const fetchUnpaidAdvance = async () => {
    try {
      const response = await fetch('/api/finance/unpaid-advance', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.success) {
          const unpaidAdvance = Number(data.data.totalUnpaidAdvance ?? 0) || 0;
          
          // 미지급 선금 설정
          if (unpaidAdvance > 0) {
            setTotalUnpaidAdvance(unpaidAdvance);
          } else {
            setTotalUnpaidAdvance(0);
          }
        } else {
          setTotalUnpaidAdvance(0);
        }
      } else {
        setTotalUnpaidAdvance(0);
      }
    } catch (error) {
      setTotalUnpaidAdvance(0);
    }
  };

  // mj_project에서 미지급 잔금 정보 가져오기
  const fetchUnpaidBalance = async () => {
    try {
      const response = await fetch('/api/finance/unpaid-balance', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.success) {
          const unpaidBalance = Number(data.data.totalUnpaidBalance ?? 0) || 0;
          
          // 미지급 잔금 설정
          if (unpaidBalance > 0) {
            setTotalUnpaidBalance(unpaidBalance);
          } else {
            setTotalUnpaidBalance(0);
          }
        } else {
          setTotalUnpaidBalance(0);
        }
      } else {
        setTotalUnpaidBalance(0);
      }
    } catch (error) {
      setTotalUnpaidBalance(0);
    }
  };

  // logistic_payment 테이블에서 총 배송비 정보 가져오기
  const fetchTotalShippingCost = async () => {
    try {
      const response = await fetch('/api/logistic-payment/total-shipping-cost', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.success) {
          const totalShippingCostCNY = Number(data.data.totalShippingCost ?? 0) || 0;
          
          // 총 배송비 설정
          if (totalShippingCostCNY > 0) {
            setTotalShippingCost(totalShippingCostCNY);
          } else {
            setTotalShippingCost(0);
          }
        } else {
          setTotalShippingCost(0);
        }
      } else {
        setTotalShippingCost(0);
      }
    } catch (error) {
      setTotalShippingCost(0);
    }
  };

  // logistic_payment 테이블에서 미지급 배송비 정보 가져오기 (is_paid = 0인 데이터들의 logistic_fee 합계)
  const fetchUnpaidShippingCost = async () => {
    try {
      const response = await fetch('/api/logistic-payment/unpaid-shipping-cost', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.success) {
          const totalUnpaidShippingCostCNY = Number(data.data.totalUnpaidShippingCost ?? 0) || 0;
          
          // 미지급 배송비 설정
          if (totalUnpaidShippingCostCNY > 0) {
            setTotalUnpaidShippingCost(totalUnpaidShippingCostCNY);
          } else {
            setTotalUnpaidShippingCost(0);
          }
        } else {
          setTotalUnpaidShippingCost(0);
        }
      } else {
        setTotalUnpaidShippingCost(0);
      }
    } catch (error) {
      setTotalUnpaidShippingCost(0);
    }
  };

  useEffect(() => {
    fetchTransactions();
    fetchAdvancePayment();
    fetchAdvancePaymentSchedule(); // 지급 예정 선금 조회 추가
    fetchBalancePaymentSchedule(); // 잔금 지급 예정 조회 추가
    fetchShippingPaymentSchedule(); // 배송비 지급 예정 조회 추가
    fetchTotalAmount();
    fetchTotalFee();
    fetchUnpaidAdvance();
    fetchUnpaidBalance();
    fetchTotalShippingCost(); // 총 배송비 조회 추가
    fetchUnpaidShippingCost(); // 미지급 배송비 조회 추가
  }, []);

  const filteredTransactions = transactions.filter(transaction => {
    const searchLower = (searchTerm || '').toLowerCase();
    const matchesSearch = (transaction.description?.toLowerCase() || '').includes(searchLower) ||
                         (transaction.reference?.toLowerCase() || '').includes(searchLower);
    const matchesDate = (!dateFilter?.startDate || (transaction.date && transaction.date >= dateFilter.startDate)) &&
                       (!dateFilter?.endDate || (transaction.date && transaction.date <= dateFilter.endDate));
    
    return matchesSearch && matchesDate;
  });

  const handleAddTransaction = (newTransaction) => {
    if (!newTransaction) return;
    
    // 새 거래 내역이 추가되면 목록을 새로고침
    fetchTransactions();
  };

  const calculateNewBalance = (amount) => {
    if (!transactions || transactions.length === 0) return amount;
    return (transactions[0]?.balance || 0) + amount;
  };

  const exportToExcel = () => {
    // Excel 내보내기 기능 (실제 구현 시 xlsx 라이브러리 사용)
  };

  // CNY 기준 요약 통계 (API에서 가져온 데이터 사용, 숫자 타입 보장)

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">회계 장부</h1>
              <p className="text-gray-600 mt-1">수입/지출 관리 및 재무 현황</p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={exportToExcel}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>Excel 내보내기</span>
              </button>
              {isAdmin && (
                <button
                  onClick={() => setActiveTab('transaction')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>거래내역 추가</span>
                </button>
              )}
            </div>
          </div>

          {/* Quick Stats Table */}
          <FinanceQuickStats 
            totalTransactionAmount={totalTransactionAmount}
            totalAdvancePayment={totalAdvancePayment}
            totalBalance={totalBalance}
            totalShippingCost={totalShippingCost}
            totalUnpaidAdvance={totalUnpaidAdvance}
            totalUnpaidBalance={totalUnpaidBalance}
            totalUnpaidShippingCost={totalUnpaidShippingCost}
          />
        </div>

        {/* 지급 예정 항목 표 (UI만 유지) */}
        <FinancePaymentSchedule 
          advancePaymentSchedule={advancePaymentSchedule}
          balancePaymentSchedule={balancePaymentSchedule}
          shippingPaymentSchedule={shippingPaymentSchedule}
        />

        {/* Filters */}
        <FinanceFilters 
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          dateFilter={dateFilter}
          onDateFilterChange={setDateFilter}
        />

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { id: 'ledger', label: '장부', icon: Calendar },
                ...(isAdmin ? [{ id: 'transaction', label: '입금내역', icon: Plus }] : [])
              ].map((tab) => {
                const IconComponent = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <IconComponent className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow-sm">
          {activeTab === 'ledger' && (
            <FinanceLedger 
              transactions={filteredTransactions}
              loading={loading}
            />
          )}
          {activeTab === 'transaction' && isAdmin && (
            <FinanceTransaction 
              onAddTransaction={handleAddTransaction}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Finance; 