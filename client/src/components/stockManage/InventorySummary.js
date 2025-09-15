import React from 'react';
import { 
  Package, 
  CheckCircle, 
  Clock, 
  Truck, 
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';

const InventorySummary = ({ summary, loading }) => {
  // summary 객체가 없거나 불완전한 경우 기본값 설정
  const safeSummary = {
    total_projects: summary?.total_projects || 0,
    status_counts: {
      입고예정: summary?.status_counts?.입고예정 || 0,
      입고중: summary?.status_counts?.입고중 || 0,
      입고완료: summary?.status_counts?.입고완료 || 0,
      배송중: summary?.status_counts?.배송중 || 0,
      도착완료: summary?.status_counts?.도착완료 || 0
    }
  };

  if (loading) {
    return (
      <div className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, index) => (
            <div key={index} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const statusCards = [
    {
      key: 'total_projects',
      label: '전체 프로젝트',
      value: safeSummary.total_projects,
      icon: Package,
      color: 'blue',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
      iconColor: 'text-blue-500'
    },
    {
      key: '입고예정',
      label: '입고예정',
      value: safeSummary.status_counts.입고예정,
      icon: Clock,
      color: 'gray',
      bgColor: 'bg-gray-50',
      textColor: 'text-gray-600',
      iconColor: 'text-gray-500'
    },
    {
      key: '입고중',
      label: '입고중',
      value: safeSummary.status_counts.입고중,
      icon: Package,
      color: 'orange',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-600',
      iconColor: 'text-orange-500'
    },
    {
      key: '입고완료',
      label: '입고완료',
      value: safeSummary.status_counts.입고완료,
      icon: CheckCircle,
      color: 'green',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600',
      iconColor: 'text-green-500'
    },
    {
      key: '배송중',
      label: '배송중',
      value: safeSummary.status_counts.배송중,
      icon: Truck,
      color: 'yellow',
      bgColor: 'bg-yellow-50',
      textColor: 'text-yellow-600',
      iconColor: 'text-yellow-500'
    },
    {
      key: '도착완료',
      label: '도착완료',
      value: safeSummary.status_counts.도착완료,
      icon: AlertCircle,
      color: 'purple',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600',
      iconColor: 'text-purple-500'
    }
  ];

  return (
    <div className="mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        {statusCards.map((card) => {
          const IconComponent = card.icon;
          return (
            <div
              key={card.key}
              className={`${card.bgColor} p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${card.textColor} mb-1`}>
                    {card.label}
                  </p>
                  <p className={`text-2xl font-bold ${card.textColor}`}>
                    {(card.value || 0).toLocaleString()}
                  </p>
                </div>
                <div className={`p-2 rounded-lg ${card.bgColor}`}>
                  <IconComponent className={`w-5 h-5 ${card.iconColor}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default InventorySummary;


