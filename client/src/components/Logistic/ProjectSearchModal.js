import React, { useState, useEffect } from 'react';
import { X, Search, Package } from 'lucide-react';

const ProjectSearchModal = ({ isOpen, onClose, onSelectProject }) => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // 모달이 열릴 때 프로젝트 목록 조회
  useEffect(() => {
    if (isOpen) {
      fetchProjects();
    }
  }, [isOpen]);

  // entry_quantity > 0인 프로젝트 목록 조회
  const fetchProjects = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      const response = await fetch('/api/warehouse/products-with-remain-quantity', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('프로젝트 목록을 불러오는데 실패했습니다.');
      }

      const data = await response.json();
      
      if (data.success) {
        console.log('🔍 [ProjectSearchModal] API 응답 데이터:', JSON.stringify(data, null, 2));
        console.log('🔍 [ProjectSearchModal] products 배열:', data.products);
        if (data.products && data.products.length > 0) {
          console.log('🔍 [ProjectSearchModal] 첫 번째 프로젝트 상세:', JSON.stringify(data.products[0], null, 2));
          if (data.products[0].first_image) {
            console.log('🔍 [ProjectSearchModal] 이미지 데이터:', JSON.stringify(data.products[0].first_image, null, 2));
          } else {
            console.log('❌ [ProjectSearchModal] 이미지 데이터가 없습니다');
          }
        }
        setProjects(data.products || []);
      } else {
        setError(data.message || '프로젝트 목록을 불러오는데 실패했습니다.');
      }
    } catch (error) {
      console.error('프로젝트 목록 조회 오류:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // 검색 필터링
  const filteredProjects = projects.filter(project =>
    project.project_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.product_description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 프로젝트 선택 처리
  const handleSelectProject = (project) => {
    console.log('🔍 [ProjectSearchModal] 선택된 프로젝트:', project);
    console.log('🔍 [ProjectSearchModal] 이미지 정보:', project.first_image);
    
    onSelectProject({
      id: project.project_id,
      projectId: project.project_id, // 실제 프로젝트 ID 추가
      productName: project.project_name,
      sku: `SKU-${project.project_id}`,
      firstImage: project.first_image ? {
        url: project.first_image.url,
        stored_filename: project.first_image.stored_filename,
        file_path: project.first_image.file_path
      } : null
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">프로젝트 검색</h2>
            <p className="text-sm text-gray-600">잔여 재고가 있는 프로젝트 중에서 선택하세요</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* 검색 입력 */}
        <div className="p-6 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="프로젝트명 또는 설명으로 검색..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* 프로젝트 목록 */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">프로젝트 목록을 불러오는 중...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="text-red-600 mb-4">
                <Package className="w-12 h-12 mx-auto" />
              </div>
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={fetchProjects}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                다시 시도
              </button>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm ? '검색 결과가 없습니다' : '등록된 프로젝트가 없습니다'}
              </p>
              <p className="text-gray-600">
                {searchTerm ? '다른 검색어를 시도해보세요' : '잔여 재고가 있는 프로젝트가 없습니다'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {filteredProjects.map((project) => {
                console.log('🔍 [ProjectSearchModal] 렌더링할 프로젝트:', JSON.stringify(project, null, 2));
                return (
                  <div
                    key={project.project_id}
                    onClick={() => handleSelectProject(project)}
                    className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md cursor-pointer transition-all"
                  >
                    {/* 프로젝트 이미지 */}
                    <div className="mb-3">
                      {project.first_image ? (
                        <img
                          src={project.first_image.url}
                          alt={project.project_name || '프로젝트 이미지'}
                          className="w-full h-32 object-contain rounded-lg border border-gray-200 bg-gray-50"
                          onError={(e) => {
                            console.log('❌ [ProjectSearchModal] 이미지 로드 실패:', {
                              fileName: project.first_image.stored_filename,
                              fullUrl: project.first_image.url,
                              project: project.project_name,
                              projectData: project
                            });
                            
                            // 이미지 로드 실패 시 대체 URL 시도
                            if (project.first_image.fallback_url) {
                              console.log('🔄 [ProjectSearchModal] 서버 제공 fallback URL 시도:', project.first_image.fallback_url);
                              e.target.src = project.first_image.fallback_url;
                            } else if (project.first_image.stored_filename) {
                              const fallbackUrl = `/uploads/project/mj/registImage/${project.first_image.stored_filename}`;
                              console.log('🔄 [ProjectSearchModal] 클라이언트 생성 fallback URL 시도:', fallbackUrl);
                              e.target.src = fallbackUrl;
                            }
                            
                            // 대체 URL도 실패하면 기본 아이콘 표시
                            e.target.onerror = () => {
                              console.log('❌ [ProjectSearchModal] 모든 이미지 URL 시도 실패, 기본 아이콘 표시');
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            };
                          }}
                          onLoad={() => {
                            console.log('✅ [ProjectSearchModal] 이미지 로드 성공:', {
                              fileName: project.first_image.stored_filename,
                              fullUrl: project.first_image.url,
                              project: project.project_name
                            });
                          }}
                        />
                      ) : null}
                      <div 
                        className={`w-full h-32 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center ${
                          project.first_image ? 'hidden' : 'flex'
                        }`}
                      >
                        <Package className="w-12 h-12 text-gray-400" />
                      </div>
                    </div>

                    {/* 프로젝트 정보 */}
                    <div>
                      <h3 className="font-medium text-gray-900 mb-1 truncate">
                        {project.project_name || '제목 없음'}
                      </h3>
                      {project.product_description && (
                        <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                          {project.product_description}
                        </p>
                      )}
                      <div className="flex flex-col space-y-1 text-sm text-gray-500">
                        <div className="flex justify-between">
                          <span>총 주문:</span>
                          <span>{project.project_quantity?.toLocaleString() || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>입고:</span>
                          <span>{project.entry_quantity?.toLocaleString() || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>출고:</span>
                          <span>{project.export_quantity?.toLocaleString() || 0}</span>
                        </div>
                        <div className="flex justify-between font-medium text-blue-600">
                          <span>잔여:</span>
                          <span>{project.remain_quantity?.toLocaleString() || 0}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center text-sm text-gray-600">
            <span>총 {filteredProjects.length}개 프로젝트</span>
            <span>잔여 재고 {'>'} 0 조건</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectSearchModal; 