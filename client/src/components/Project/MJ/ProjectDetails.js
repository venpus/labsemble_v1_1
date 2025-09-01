import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { 
  ArrowLeft, 
  Edit, 
  Trash2, 
  Calendar,
  Package,
  DollarSign,
  Link as LinkIcon,
  Image as ImageIcon,
  User,
  Building,
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

  const fetchProjectDetails = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch(`/api/mj-project/${id}`, {
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
      } else {
        setError(data.message || '프로젝트 상세 정보를 불러오는데 실패했습니다.');
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // 프로젝트 상태 업데이트 처리
  const handleProjectUpdate = (updates) => {
    console.log('🔄 프로젝트 상태 업데이트:', updates);
    setProject(prev => ({
      ...prev,
      ...updates
    }));
  };

  const handleEditProject = () => {
    navigate(`/dashboard/mj-projects/${id}/edit`);
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
    navigate('/dashboard/mj-projects');
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
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleBackToList}
                className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                목록으로 돌아가기
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">프로젝트 상세 정보</h1>
                <p className="text-gray-600">프로젝트의 모든 정보를 확인할 수 있습니다.</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={handleEditProject}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                <Edit className="w-4 h-4 mr-2" />
                프로젝트 수정
              </button>
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
                onClick={() => setActiveTab('basic')}
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
                onClick={() => setActiveTab('payment')}
                className={`py-3 px-4 border-2 font-medium text-sm transition-all duration-200 rounded-lg flex items-center ${
                  activeTab === 'payment'
                    ? 'border-green-500 text-green-600 bg-green-50 shadow-sm'
                    : 'border-gray-200 text-gray-500 hover:text-green-600 hover:bg-green-50 hover:border-green-300 bg-white'
                }`}
              >
                <DollarSign className="w-4 h-4 mr-2" />
                결제정보
              </button>
              <button
                onClick={() => setActiveTab('delivery')}
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
                onClick={() => setActiveTab('shipping')}
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
                            src={`/uploads/project/mj/registImage/${image.file_name}`}
                            alt={`프로젝트 이미지 ${index + 1}`}
                            className="w-full h-32 object-cover rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                            onClick={() => window.open(`/uploads/project/mj/registImage/${image.file_name}`, '_blank')}
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

            {/* User Information Table */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <User className="w-5 h-5 mr-2 text-green-600" />
                사용자 정보
              </h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 border border-gray-200">
                  <tbody className="bg-white divide-y divide-gray-200">
                    <tr className="hover:bg-gray-50">
                      <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900 bg-gray-50 border-r border-gray-200" style={{width: '12.5%'}}>
                        <div className="flex items-center">
                          <User className="w-4 h-4 mr-2 text-blue-600" />
                          프로젝트 소유자
                        </div>
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-gray-200" style={{width: '12.5%'}}>
                        {project.username || '알 수 없음'}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900 bg-gray-50 border-r border-gray-200" style={{width: '12.5%'}}>
                        <div className="flex items-center">
                          <Building className="w-4 h-4 mr-2 text-green-600" />
                          회사명
                        </div>
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-gray-200" style={{width: '12.5%'}}>
                        {project.company_name || '-'}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900 bg-gray-50 border-r border-gray-200" style={{width: '12.5%'}}>
                        <div className="flex items-center">
                          <div className="w-4 h-4 mr-2 rounded-full bg-yellow-600"></div>
                          전화번호
                        </div>
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-gray-200" style={{width: '12.5%'}}>
                        {project.phone ? (
                          <a href={`tel:${project.phone}`} className="text-blue-600 hover:text-blue-800">
                            {project.phone}
                          </a>
                        ) : '-'}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900 bg-gray-50 border-r border-gray-200" style={{width: '12.5%'}}>
                        <div className="flex items-center">
                          <div className="w-4 h-4 mr-2 rounded-full bg-purple-600"></div>
                          이메일
                        </div>
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900" style={{width: '12.5%'}}>
                        {project.email ? (
                          <a href={`mailto:${project.email}`} className="text-blue-600 hover:text-blue-800">
                            {project.email}
                          </a>
                        ) : '-'}
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
            {activeTab === 'delivery' && (
              <Delivery project={project} onUpdate={handleProjectUpdate} />
            )}

            {/* 결제정보 탭 */}
            {activeTab === 'payment' && (
              <Payment project={project} user={user} />
            )}

            {/* 물류 정보 탭 */}
            {activeTab === 'shipping' && (
              <Logistic project={project} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectDetails; 