import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { 
  ArrowLeft, 
  Trash2, 
  Calendar,
  Package,
  DollarSign,
  CreditCard,
  Link as LinkIcon,
  Image as ImageIcon,
  Clock,
  Truck,
  Ship
} from 'lucide-react';
import ProdInfo from './Details/ProdInfo';
import Payment from './Details/Payment';
import { Delivery } from './Details/Delivery';
import Logistic from './Details/Logistic';

const ProjectDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('basic');
  const [hasUnsavedPaymentChanges, setHasUnsavedPaymentChanges] = useState(false);
  const [tabLoading, setTabLoading] = useState(false);

  // URL 쿼리 파라미터에서 탭 정보 가져오기
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    if (tabParam && ['basic', 'payment', 'delivery', 'shipping'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && id) {
      fetchProjectDetails();
    }
  }, [isAuthenticated, id]);

  const fetchProjectDetails = async (showTabLoading = false, tabName = null) => {
    try {
      if (showTabLoading) {
        setTabLoading(true);
      } else {
        setLoading(true);
      }
      
      const token = localStorage.getItem('token');
      
      // 탭별 최적화된 API 호출
      const url = tabName 
        ? `/api/mj-project/${id}?tab=${tabName}`
        : `/api/mj-project/${id}`;
      
      console.log(`📡 API 호출: ${url}`);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('프로젝트 상세 정보를 불러오는데 실패했습니다.');
      }

      const data = await response.json();
      
      if (data.success) {
        setProject(data.project);
        console.log(`✅ 프로젝트 데이터 새로고침 완료 (탭: ${tabName || '전체'}):`, data.project);
      } else {
        setError(data.message || '프로젝트 상세 정보를 불러오는데 실패했습니다.');
      }
    } catch (error) {
      setError(error.message);
    } finally {
      if (showTabLoading) {
        setTabLoading(false);
      } else {
        setLoading(false);
      }
    }
  };

  // 탭 변경 핸들러 (저장되지 않은 변경사항 확인 및 데이터 새로고침)
  const handleTabChange = async (newTab) => {
    if (hasUnsavedPaymentChanges && activeTab === 'paymentInfo') {
      const shouldLeave = window.confirm(
        '저장되지 않은 결제 정보 변경사항이 있습니다.\n' +
        '다른 탭으로 이동하시겠습니까?\n\n' +
        '확인: 변경사항을 저장하지 않고 이동\n' +
        '취소: 현재 탭에 머물기'
      );
      
      if (!shouldLeave) {
        return; // 사용자가 취소한 경우 탭 변경하지 않음
      }
    }
    
    // 탭 변경
    setActiveTab(newTab);
    
    // URL 쿼리 파라미터 업데이트
    const url = new URL(window.location);
    url.searchParams.set('tab', newTab);
    window.history.pushState({}, '', url);
    
    // 탭 변경 시 최신 데이터 새로고침
    console.log(`🔄 탭 변경: ${activeTab} → ${newTab}, 데이터 새로고침 시작`);
    await fetchProjectDetails(true, newTab);
  };

  // Payment 데이터 변경 핸들러
  const handlePaymentDataChange = (hasChanges) => {
    setHasUnsavedPaymentChanges(hasChanges);
  };

  // 프로젝트 상태 업데이트 처리
  const handleProjectUpdate = (updates) => {
    console.log('🔄 프로젝트 상태 업데이트:', updates);
    setProject(prev => ({
      ...prev,
      ...updates
    }));
  };

  const handleDeleteProject = async () => {
    if (!window.confirm('정말로 이 프로젝트를 삭제하시겠습니까?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/mj-project/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        alert('프로젝트가 삭제되었습니다.');
        navigate('/dashboard/mj-projects');
      } else {
        const data = await response.json();
        alert(data.message || '프로젝트 삭제에 실패했습니다.');
      }
    } catch (error) {
      alert('프로젝트 삭제 중 오류가 발생했습니다.');
    }
  };

  const handleBackToList = () => {
    // URL에서 return 파라미터를 확인하여 페이지 상태 복원
    const urlParams = new URLSearchParams(window.location.search);
    const returnParams = urlParams.get('return');
    
    console.log('🔙 [ProjectDetails] 목록으로 돌아가기:', {
      returnParams,
      currentUrl: window.location.href
    });
    
    if (returnParams) {
      // return 파라미터가 있으면 해당 페이지로 이동
      console.log('🔙 [ProjectDetails] return 파라미터로 이동:', `/dashboard/mj-projects?${returnParams}`);
      navigate(`/dashboard/mj-projects?${returnParams}`);
    } else {
      // return 파라미터가 없으면 기본 목록으로 이동
      console.log('🔙 [ProjectDetails] 기본 목록으로 이동');
      navigate('/dashboard/mj-projects');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR');
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'pending': { label: '대기중', color: 'bg-yellow-100 text-yellow-800' },
      'approved': { label: '승인됨', color: 'bg-green-100 text-green-800' },
      'rejected': { label: '거부됨', color: 'bg-red-100 text-red-800' },
      'completed': { label: '완료', color: 'bg-blue-100 text-blue-800' }
    };

    const config = statusConfig[status] || { label: status, color: 'bg-gray-100 text-gray-800' };
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">로그인이 필요합니다</h2>
          <p className="text-gray-600 mb-6">프로젝트 상세 정보를 보려면 로그인해주세요.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">프로젝트 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">오류가 발생했습니다</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={fetchProjectDetails}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors mr-4"
          >
            다시 시도
          </button>
          <button
            onClick={handleBackToList}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            목록으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">프로젝트를 찾을 수 없습니다</h2>
          <p className="text-gray-600 mb-6">요청하신 프로젝트가 존재하지 않습니다.</p>
          <button
            onClick={handleBackToList}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            목록으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center space-x-4 mb-4 lg:mb-0">
              <button
                onClick={handleBackToList}
                className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                목록으로 돌아가기
              </button>
              
              {/* 상품 사진 */}
              <div className="flex-shrink-0">
                {project?.images?.[0] ? (
                  <img
                    src={project.images[0].url}
                    alt={project.project_name}
                    className="w-16 h-16 rounded-lg object-cover border border-gray-200 shadow-sm"
                    onError={(e) => {
                      if (project.images[0].fallback_url && e.target.src !== project.images[0].fallback_url) {
                        e.target.src = project.images[0].fallback_url;
                      } else {
                        e.target.style.display = 'none';
                        e.target.nextElementSibling.style.display = 'flex';
                      }
                    }}
                  />
                ) : null}
                <div 
                  className={`w-16 h-16 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center shadow-sm ${project?.images?.[0] ? 'hidden' : ''}`}
                >
                  <Package className="w-8 h-8 text-gray-400" />
                </div>
              </div>
              
              {/* 상품명과 설명 */}
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl font-bold text-gray-900 mb-1 truncate">
                  {project?.project_name || '프로젝트 상세 정보'}
                </h1>
                <p className="text-sm text-gray-600 truncate">
                  {project?.description || '프로젝트의 모든 정보를 확인할 수 있습니다.'}
                </p>
                {project?.supplier_name && (
                  <p className="text-xs text-gray-500 mt-1 truncate">
                    공급자: {project.supplier_name}
                  </p>
                )}
              </div>
            </div>
            
            {/* 액션 버튼들 */}
            <div className="flex items-center space-x-3">
              <button
                onClick={handleDeleteProject}
                className="flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                프로젝트 삭제
              </button>
            </div>
          </div>
        </div>

        {/* Tab Menu */}
        <div className="mb-6">
          <div className="bg-gray-50 rounded-lg p-2 border border-gray-200">
            <nav className="flex space-x-2">
              <button
                onClick={() => handleTabChange('basic')}
                className={`py-3 px-4 border-2 font-medium text-sm transition-all duration-200 rounded-lg flex items-center ${
                  activeTab === 'basic'
                    ? 'border-blue-500 text-blue-600 bg-blue-50 shadow-sm'
                    : 'border-gray-200 text-gray-500 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-300 bg-white'
                }`}
              >
                <Package className="w-4 h-4 mr-2" />
                기본정보
              </button>
              <button
                onClick={() => handleTabChange('payment')}
                className={`py-3 px-4 border-2 font-medium text-sm transition-all duration-200 rounded-lg flex items-center ${
                  activeTab === 'payment'
                    ? 'border-green-500 text-green-600 bg-green-50 shadow-sm'
                    : 'border-gray-200 text-gray-500 hover:text-green-600 hover:bg-green-50 hover:border-green-300 bg-white'
                }`}
              >
                <DollarSign className="w-4 h-4 mr-2" />
                비용 정보
              </button>
              <button
                onClick={() => handleTabChange('paymentInfo')}
                className={`py-3 px-4 border-2 font-medium text-sm transition-all duration-200 rounded-lg flex items-center ${
                  activeTab === 'paymentInfo'
                    ? 'border-emerald-500 text-emerald-600 bg-emerald-50 shadow-sm'
                    : 'border-gray-200 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 hover:border-emerald-300 bg-white'
                }`}
              >
                <CreditCard className="w-4 h-4 mr-2" />
                결제정보
              </button>
              <button
                onClick={() => handleTabChange('delivery')}
                className={`py-3 px-4 border-2 font-medium text-sm transition-all duration-200 rounded-lg flex items-center ${
                  activeTab === 'delivery'
                    ? 'border-orange-500 text-orange-600 bg-orange-50 shadow-sm'
                    : 'border-gray-200 text-gray-500 hover:text-orange-600 hover:bg-orange-50 hover:border-orange-300 bg-white'
                }`}
              >
                <Truck className="w-4 h-4 mr-2" />
                납기 정보
              </button>
              <button
                onClick={() => handleTabChange('shipping')}
                className={`py-3 px-4 border-2 font-medium text-sm transition-all duration-200 rounded-lg flex items-center ${
                  activeTab === 'shipping'
                    ? 'border-purple-500 text-purple-600 bg-purple-50 shadow-sm'
                    : 'border-gray-200 text-gray-500 hover:text-purple-600 hover:bg-purple-50 hover:border-purple-300 bg-white'
                }`}
              >
                <Ship className="w-4 h-4 mr-2" />
                물류 정보
              </button>
            </nav>
          </div>
        </div>

        {/* Project Details */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="p-6">
            {/* Tab Loading Indicator */}
            {tabLoading && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-3"></div>
                  <span className="text-sm text-blue-800">최신 데이터를 불러오는 중...</span>
                </div>
              </div>
            )}
            
            {/* Tab Content */}
            {activeTab === 'basic' && (
              <>
                {/* Images Section - Moved to top */}
                {project.images && project.images.length > 0 && (
                  <div className="mb-8">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                      <ImageIcon className="w-5 h-5 mr-2 text-orange-600" />
                      업로드된 이미지 ({project.images.length}개)
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                      {project.images.map((image, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={image.url || `/uploads/project/mj/registImage/${image.file_name}`}
                            alt={`프로젝트 이미지 ${index + 1}`}
                            className="w-full h-32 object-cover rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                            onError={(e) => {
                              // 이미지 로드 실패 시 대체 URL 시도
                              if (image.fallback_url) {
                                e.target.src = image.fallback_url;
                              } else if (image.file_name) {
                                const fallbackUrl = `/uploads/project/mj/registImage/${image.file_name}`;
                                e.target.src = fallbackUrl;
                              }
                              
                              // 대체 URL도 실패하면 기본 아이콘 표시
                              e.target.onerror = () => {
                                e.target.style.display = 'none';
                                // 기본 아이콘 표시 로직 추가
                              };
                            }}
                            onClick={() => {
                              const imageUrl = image.url || image.fallback_url || `/uploads/project/mj/registImage/${image.file_name}`;
                              window.open(imageUrl, '_blank');
                            }}
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 rounded-lg flex items-center justify-center">
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                              <span className="text-white text-sm font-medium">클릭하여 확대</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

            {/* Basic Information Table */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Package className="w-5 h-5 mr-2 text-blue-600" />
                기본 정보
              </h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 border border-gray-200">
                  <tbody className="bg-white divide-y divide-gray-200">
                    <tr className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 bg-gray-50 border-r border-gray-200 w-1/6">
                        <div className="flex items-center">
                          <Package className="w-4 h-4 mr-2 text-blue-600" />
                          프로젝트명
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-gray-200 w-1/6">
                        {project.project_name}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 bg-gray-50 border-r border-gray-200 w-1/6">
                        <div className="flex items-center">
                          <div className="w-4 h-4 mr-2 rounded-full bg-blue-600"></div>
                          상태
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-gray-200 w-1/6">
                        {getStatusBadge(project.status)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 bg-gray-50 border-r border-gray-200 w-1/6">
                        <div className="flex items-center">
                          <Package className="w-4 h-4 mr-2 text-green-600" />
                          수량
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 w-1/6">
                        {project.quantity?.toLocaleString() || '-'}
                      </td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 bg-gray-50 border-r border-gray-200">
                        <div className="flex items-center">
                          <div className="w-4 h-4 mr-2 text-yellow-600 font-bold">¥</div>
                          목표단가
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-gray-200">
                        {project.target_price ? `¥${project.target_price.toLocaleString()}` : '-'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 bg-gray-50 border-r border-gray-200">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-2 text-purple-600" />
                          등록일
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-gray-200">
                        {formatDate(project.created_at)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 bg-gray-50 border-r border-gray-200">
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 mr-2 text-indigo-600" />
                          수정일
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(project.updated_at)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>


            {/* Product Information Component */}
            <ProdInfo project={project} />

            {/* Description */}
            {project.description && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">프로젝트 설명</h2>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-700 whitespace-pre-wrap">{project.description}</p>
                </div>
              </div>
            )}

            {/* Reference Links */}
            {project.referenceLinks && project.referenceLinks.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <LinkIcon className="w-5 h-5 mr-2 text-purple-600" />
                  참고링크
                </h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          링크
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          작업
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {project.referenceLinks.map((link, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <a
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 underline break-all"
                            >
                              {link.url}
                            </a>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(link.url);
                                alert('링크가 클립보드에 복사되었습니다.');
                              }}
                              className="text-green-600 hover:text-green-900 transition-colors"
                              title="링크 복사"
                            >
                              복사
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
              </>
            )}

            {/* 납기 정보 탭 */}
            {activeTab === 'delivery' && project && (
              <Delivery project={project} onUpdate={handleProjectUpdate} />
            )}

            {/* 비용 정보 탭 */}
            {activeTab === 'payment' && project && (
              <Payment project={project} user={user} />
            )}

            {/* 결제정보 탭 */}
            {activeTab === 'paymentInfo' && project && (
              <Payment 
                project={project} 
                user={user} 
                showPaymentToSupplier={true} 
                onPaymentDataChange={handlePaymentDataChange}
              />
            )}

            {/* 물류 정보 탭 */}
            {activeTab === 'shipping' && project && (
              <Logistic project={project} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectDetails; 