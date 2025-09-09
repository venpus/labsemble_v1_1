import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, Plus, Trash2, Copy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';

const ProjectRegister = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [formData, setFormData] = useState({
    projectName: '',
    description: '',
    quantity: '',
    targetPrice: '',
    status: 'pending'
  });

  const [referenceLinks, setReferenceLinks] = useState([
    { id: 1, url: '' }
  ]);

  const [uploadedImages, setUploadedImages] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);



  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };



  const addReferenceLink = () => {
    const newId = Math.max(...referenceLinks.map(link => link.id)) + 1;
    setReferenceLinks(prev => [...prev, { id: newId, url: '' }]);
  };

  const removeReferenceLink = (id) => {
    if (referenceLinks.length > 1) {
      setReferenceLinks(prev => prev.filter(link => link.id !== id));
    }
  };

  const handleReferenceLinkChange = (id, field, value) => {
    setReferenceLinks(prev => prev.map(link => 
      link.id === id ? { ...link, [field]: value } : link
    ));
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    
    if (uploadedImages.length + files.length > 10) {
      alert(`이미지는 최대 10개까지 업로드 가능합니다. (현재: ${uploadedImages.length}개, 선택: ${files.length}개)`);
      return;
    }

    let validImages = 0;
    let invalidFiles = [];

    files.forEach(file => {
      if (file.type.startsWith('image/')) {
        validImages++;
        const reader = new FileReader();
        reader.onload = (e) => {
          const newImage = {
            id: Date.now() + Math.random(),
            file: file,
            preview: e.target.result,
            name: file.name
          };
          setUploadedImages(prev => [...prev, newImage]);
        };
        reader.readAsDataURL(file);
      } else {
        invalidFiles.push(file.name);
      }
    });

    // 사용자 피드백
    if (validImages > 0) {
      // 이미지 업로드 성공
    }
    
    if (invalidFiles.length > 0) {
      console.warn(`다음 파일들은 이미지가 아니어서 제외되었습니다: ${invalidFiles.join(', ')}`);
    }

    // 파일 입력 초기화 (같은 파일을 다시 선택할 수 있도록)
    e.target.value = '';
  };

  const removeImage = (imageId) => {
    setUploadedImages(prev => prev.filter(img => img.id !== imageId));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // 프로젝트 등록 시작
    
    try {
      // FormData 객체 생성
      const formDataToSend = new FormData();
      
      // 기본 프로젝트 정보 추가
      formDataToSend.append('projectName', formData.projectName);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('quantity', formData.quantity);
      formDataToSend.append('targetPrice', formData.targetPrice);
      
      // admin 사용자의 경우 선택된 사용자 ID 추가
      if (user.isAdmin && selectedUserId) {
        formDataToSend.append('selectedUserId', selectedUserId);
      }
      
      // 참고링크 추가
      if (referenceLinks.length > 0) {
        const validLinks = referenceLinks.filter(link => link.url.trim() !== '');
        if (validLinks.length > 0) {
          formDataToSend.append('referenceLinks', JSON.stringify(validLinks));
        }
      }
      
      // 이미지 파일 추가
      uploadedImages.forEach((image, index) => {
        formDataToSend.append('images', image.file);
      });
      
      // 인증 상태 확인
      if (!isAuthenticated || !user) {
        alert('로그인이 필요합니다. 다시 로그인해주세요.');
        navigate('/login');
        return;
      }
      
      // admin 사용자의 경우 선택된 사용자 ID 확인
      if (user.isAdmin && !selectedUserId) {
        alert('프로젝트를 등록할 사용자를 선택해주세요.');
        return;
      }
      
      // JWT 토큰 가져오기
      const token = localStorage.getItem('token');
      
      if (!token) {
        alert('토큰이 없습니다. 다시 로그인해주세요.');
        navigate('/login');
        return;
      }
      
      // API 호출
      const response = await fetch('/api/mj-project/register', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formDataToSend,
        // FormData를 사용할 때는 Content-Type을 설정하지 않음
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || '프로젝트 등록 중 오류가 발생했습니다.');
      }
      
      // 성공 시 등록한 프로젝트의 상세 페이지로 이동
      alert('프로젝트가 성공적으로 등록되었습니다!');
      navigate(`/dashboard/mj-projects/${data.projectId}`);
      
    } catch (error) {
      console.error('프로젝트 등록 실패:', error);
      alert(error.message || '프로젝트 등록 중 오류가 발생했습니다.');
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  // 사용자 목록 가져오기 (MJ유통 파트너스 사용자만)
  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users?partner=MJ유통');
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error('사용자 목록 가져오기 오류:', error);
    }
  };

  // 컴포넌트 마운트 시 사용자 목록 가져오기 (admin인 경우)
  useEffect(() => {
    if (user?.isAdmin) {
      fetchUsers();
      // admin인 경우 기본값으로 현재 사용자 ID 설정
      setSelectedUserId(user.id);
    }
  }, [user]);

  // 인증 상태 확인
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">로그인이 필요합니다</h2>
          <p className="text-gray-600 mb-6">이 페이지에 접근하려면 로그인이 필요합니다.</p>
          <button
            onClick={() => navigate('/login')}
            className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            로그인하기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={handleBack}
            className="flex items-center text-gray-600 hover:text-blue-600 mb-4"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            뒤로 가기
          </button>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">MJ유통 프로젝트 등록</h1>
                <p className="text-gray-600">새로운 MJ유통 프로젝트를 등록합니다.</p>
              </div>
              
              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={handleBack}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  <Save className="w-4 h-4 mr-2" />
                  프로젝트 등록
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Admin 사용자를 위한 사용자 선택 드롭다운 */}
        {user?.isAdmin && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex items-center space-x-4">
              <label className="text-sm font-medium text-blue-900">프로젝트 등록자:</label>
              <select
                value={selectedUserId || ''}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="px-3 py-2 border border-blue-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">사용자 선택</option>
                {users.map(userItem => (
                  <option key={userItem.id} value={userItem.id}>
                    {userItem.company_name ? `(${userItem.company_name}) ${userItem.username}` : userItem.username}
                    {userItem.is_admin ? ' - 관리자' : ''}
                    {userItem.partner_name ? ` [${userItem.partner_name}]` : ''}
                  </option>
                ))}
              </select>
              <span className="text-xs text-blue-600">
                MJ유통 파트너스 사용자만 표시됩니다. <br/>관리자는 다른 사용자 대신 프로젝트를 등록할 수 있습니다.
              </span>
              
              {/* 선택된 사용자 정보 표시 */}
              {selectedUserId && (
                <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md">
                  <span className="text-xs text-green-700">
                    선택된 사용자: {users.find(u => u.id === parseInt(selectedUserId))?.username || '알 수 없음'}
                    {users.find(u => u.id === parseInt(selectedUserId))?.company_name && 
                      ` (${users.find(u => u.id === parseInt(selectedUserId))?.company_name})`
                    }
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Project Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Project Information */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">프로젝트 기본 정보</h2>
            
            <div className="space-y-6">
              {/* 첫 번째 줄: 프로젝트명 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  제품품명 *
                </label>
                <input
                  type="text"
                  name="projectName"
                  value={formData.projectName}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              {/* 두 번째 줄: 수량과 목표단가 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    수량 *
                  </label>
                  <input
                    type="number"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    목표단가 (원)
                  </label>
                  <input
                    type="number"
                    name="targetPrice"
                    value={formData.targetPrice}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* 세 번째 줄: 프로젝트 설명 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  제품부가 설명
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Reference Links */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">참고링크</h2>
              <button
                type="button"
                onClick={addReferenceLink}
                className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                링크 추가
              </button>
            </div>

            <div className="space-y-4">
              {referenceLinks.map((link) => (
                <div key={link.id} className="flex items-end gap-3 p-4 border border-gray-200 rounded-lg">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
                    <input
                      type="url"
                      value={link.url}
                      onChange={(e) => handleReferenceLinkChange(link.id, 'url', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="https://example.com"
                    />
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (link.url) {
                          navigator.clipboard.writeText(link.url);
                          // TODO: 토스트 메시지로 복사 완료 알림
                        }
                      }}
                      disabled={!link.url}
                      className={`p-2 rounded-md transition-colors ${
                        link.url 
                          ? 'text-blue-600 hover:text-blue-800 hover:bg-blue-50' 
                          : 'text-gray-400 cursor-not-allowed'
                      }`}
                      title="링크 복사"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeReferenceLink(link.id)}
                      disabled={referenceLinks.length === 1}
                      className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 disabled:text-gray-400 disabled:cursor-not-allowed rounded-md transition-colors"
                      title="링크 삭제"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Image Upload */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">이미지 업로드</h2>
                <p className="text-sm text-gray-600 mt-1">최대 10개까지 이미지를 업로드할 수 있습니다.</p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">
                  {uploadedImages.length}/10
                </span>
                <label className="cursor-pointer">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={uploadedImages.length >= 10}
                  />
                  <div className={`flex items-center px-4 py-2 rounded-md transition-colors ${
                    uploadedImages.length >= 10 
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}>
                    <Plus className="w-4 h-4 mr-2" />
                    이미지 추가
                  </div>
                </label>
              </div>
            </div>

            {uploadedImages.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {uploadedImages.map((image) => (
                  <div key={image.id} className="relative group">
                    <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                      <img
                        src={image.preview}
                        alt={image.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center">
                        <button
                          type="button"
                          onClick={() => removeImage(image.id)}
                          className="opacity-0 group-hover:opacity-100 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-all duration-200"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {uploadedImages.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <p>업로드된 이미지가 없습니다.</p>
                <p className="text-sm">이미지를 추가하려면 위의 '이미지 추가' 버튼을 클릭하세요.</p>
                <p className="text-xs text-gray-400 mt-1">한 번에 여러 이미지를 선택할 수 있습니다.</p>
              </div>
            )}
          </div>

                  {/* Form Submit Button */}
        <div className="flex justify-center pt-6">
          <button
            type="submit"
            className="flex items-center px-8 py-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-lg font-medium"
          >
            <Save className="w-5 h-5 mr-2" />
            프로젝트 등록
          </button>
        </div>

        </form>
      </div>
    </div>
  );
};

export default ProjectRegister; 