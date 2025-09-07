import React, { useState, useEffect } from 'react';
import { 
  Upload, 
  Download, 
  Trash2, 
  Edit, 
  Plus, 
  AlertCircle, 
  CheckCircle, 
  Clock,
  Smartphone,
  FileText,
  Calendar,
  HardDrive,
  Shield
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../../../contexts/AuthContext';

const AppUpdateManagement = () => {
  const { user } = useAuth();
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [editingVersion, setEditingVersion] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  
  const [formData, setFormData] = useState({
    versionCode: '',
    versionName: '',
    releaseNotes: '',
    forceUpdate: false,
    minSdk: 33,
    targetSdk: 36
  });

  // 버전 목록 조회
  const fetchVersions = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('인증 토큰이 없습니다. 다시 로그인해주세요.');
      }
      
      const response = await axios.get('/api/app-update/versions', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data.success) {
        setVersions(response.data.versions);
      }
    } catch (error) {
      console.error('버전 목록 조회 오류:', error);
      if (error.response?.status === 401) {
        toast.error('인증이 만료되었습니다. 다시 로그인해주세요.');
      } else if (error.response?.status === 403) {
        toast.error('관리자 권한이 필요합니다.');
      } else {
        toast.error('버전 목록을 불러오는데 실패했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('🔍 [AppUpdateManagement] 컴포넌트 마운트됨', { user, isAdmin: user?.isAdmin });
    
    // 관리자 권한 확인
    if (!user?.isAdmin) {
      console.log('❌ [AppUpdateManagement] 관리자 권한 없음');
      toast.error('관리자 권한이 필요합니다.');
      return;
    }
    
    console.log('✅ [AppUpdateManagement] 관리자 권한 확인됨, 버전 목록 조회 시작');
    fetchVersions();
  }, [user]);

  // 선택된 파일 상태 추가
  const [selectedFile, setSelectedFile] = useState(null);

  // 파일 선택 핸들러
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // APK 파일 검증
    if (!file.name.endsWith('.apk')) {
      toast.error('APK 파일만 업로드 가능합니다.');
      return;
    }

    // 파일 크기 검증 (100MB 제한)
    if (file.size > 100 * 1024 * 1024) {
      toast.error('파일 크기는 100MB를 초과할 수 없습니다.');
      return;
    }

    setSelectedFile(file);
  };

  // 파일 업로드 핸들러
  const handleFileUpload = async () => {
    if (!selectedFile) {
      toast.error('업로드할 파일을 선택해주세요.');
      return;
    }

    // 필수 필드 검증
    if (!formData.versionCode || !formData.versionName) {
      toast.error('버전 코드와 버전 이름을 입력해주세요.');
      return;
    }

    const formDataToSend = new FormData();
    formDataToSend.append('apk', selectedFile);
    formDataToSend.append('versionCode', formData.versionCode);
    formDataToSend.append('versionName', formData.versionName);
    formDataToSend.append('releaseNotes', formData.releaseNotes);
    formDataToSend.append('forceUpdate', formData.forceUpdate);
    formDataToSend.append('minSdk', formData.minSdk);
    formDataToSend.append('targetSdk', formData.targetSdk);

    try {
      setUploading(true);
      setUploadProgress(0);
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('인증 토큰이 없습니다. 다시 로그인해주세요.');
      }

      const response = await axios.post('/api/app-update/upload', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        },
      });

      if (response.data.success) {
        toast.success('APK 업로드가 완료되었습니다.');
        setShowUploadModal(false);
        setFormData({
          versionCode: '',
          versionName: '',
          releaseNotes: '',
          forceUpdate: false,
          minSdk: 33,
          targetSdk: 36
        });
        setSelectedFile(null);
        fetchVersions();
      }
    } catch (error) {
      console.error('APK 업로드 오류:', error);
      toast.error(error.response?.data?.error || 'APK 업로드에 실패했습니다.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // 버전 삭제
  const handleDeleteVersion = async (versionId) => {
    if (!window.confirm('정말로 이 버전을 삭제하시겠습니까?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('인증 토큰이 없습니다. 다시 로그인해주세요.');
      }
      
      const response = await axios.delete(`/api/app-update/versions/${versionId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data.success) {
        toast.success('버전이 삭제되었습니다.');
        fetchVersions();
      }
    } catch (error) {
      console.error('버전 삭제 오류:', error);
      if (error.response?.status === 401) {
        toast.error('인증이 만료되었습니다. 다시 로그인해주세요.');
      } else if (error.response?.status === 403) {
        toast.error('관리자 권한이 필요합니다.');
      } else {
        toast.error('버전 삭제에 실패했습니다.');
      }
    }
  };

  // 버전 활성화/비활성화
  const handleToggleActive = async (versionId, isActive) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('인증 토큰이 없습니다. 다시 로그인해주세요.');
      }
      
      const response = await axios.patch(`/api/app-update/versions/${versionId}`, {
        isActive: !isActive
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data.success) {
        toast.success(isActive ? '버전이 비활성화되었습니다.' : '버전이 활성화되었습니다.');
        fetchVersions();
      }
    } catch (error) {
      console.error('버전 상태 변경 오류:', error);
      if (error.response?.status === 401) {
        toast.error('인증이 만료되었습니다. 다시 로그인해주세요.');
      } else if (error.response?.status === 403) {
        toast.error('관리자 권한이 필요합니다.');
      } else {
        toast.error('버전 상태 변경에 실패했습니다.');
      }
    }
  };

  // 파일 크기 포맷팅
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 날짜 포맷팅
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 관리자 권한이 없는 경우
  if (!user?.isAdmin) {
    return (
      <div className="p-6">
        <div className="text-center">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">접근 권한 없음</h1>
          <p className="text-gray-600">이 페이지는 관리자만 접근할 수 있습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">앱 업데이트 관리</h1>
        <p className="text-gray-600">모바일 앱 버전 관리 및 APK 파일 업로드</p>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Smartphone className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">총 버전</p>
              <p className="text-2xl font-bold text-gray-900">{versions.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">활성 버전</p>
              <p className="text-2xl font-bold text-gray-900">
                {versions.filter(v => v.is_active).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <AlertCircle className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">강제 업데이트</p>
              <p className="text-2xl font-bold text-gray-900">
                {versions.filter(v => v.force_update).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <HardDrive className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">최신 버전</p>
              <p className="text-2xl font-bold text-gray-900">
                {versions.length > 0 ? versions[0].version_name : '-'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 액션 버튼 */}
      <div className="mb-6 flex justify-between items-center">
        <div className="flex space-x-4">
          <button
            onClick={() => {
              setShowUploadModal(true);
              setSelectedFile(null);
              setFormData({
                versionCode: '',
                versionName: '',
                releaseNotes: '',
                forceUpdate: false,
                minSdk: 33,
                targetSdk: 36
              });
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>새 버전 업로드</span>
          </button>
        </div>
      </div>

      {/* 버전 목록 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">버전 목록</h3>
        </div>

        {loading ? (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">로딩 중...</p>
          </div>
        ) : versions.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <Smartphone className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>등록된 버전이 없습니다.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    버전 정보
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    파일 정보
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    상태
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    릴리스 노트
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    등록일
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    액션
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {versions.map((version) => (
                  <tr key={version.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <Smartphone className="w-8 h-8 text-gray-400" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            v{version.version_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            Code: {version.version_code}
                          </div>
                          <div className="text-xs text-gray-400">
                            SDK: {version.min_sdk} - {version.target_sdk}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {version.download_url}
                      </div>
                      <div className="text-sm text-gray-500">
                        {formatFileSize(version.file_size || 0)}
                      </div>
                      {version.checksum && (
                        <div className="text-xs text-gray-400 font-mono">
                          {version.checksum.substring(0, 16)}...
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col space-y-1">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          version.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {version.is_active ? '활성' : '비활성'}
                        </span>
                        {version.force_update && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            강제 업데이트
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs truncate">
                        {version.release_notes || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(version.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleToggleActive(version.id, version.is_active)}
                          className={`${
                            version.is_active 
                              ? 'text-yellow-600 hover:text-yellow-900' 
                              : 'text-green-600 hover:text-green-900'
                          }`}
                          title={version.is_active ? '비활성화' : '활성화'}
                        >
                          {version.is_active ? '비활성화' : '활성화'}
                        </button>
                        <button
                          onClick={() => handleDeleteVersion(version.id)}
                          className="text-red-600 hover:text-red-900"
                          title="삭제"
                        >
                          삭제
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 업로드 모달 */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">새 버전 업로드</h3>
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <form className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    버전 코드 *
                  </label>
                  <input
                    type="number"
                    value={formData.versionCode}
                    onChange={(e) => setFormData({...formData, versionCode: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="예: 2"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    버전 이름 *
                  </label>
                  <input
                    type="text"
                    value={formData.versionName}
                    onChange={(e) => setFormData({...formData, versionName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="예: 1.1"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    릴리스 노트
                  </label>
                  <textarea
                    value={formData.releaseNotes}
                    onChange={(e) => setFormData({...formData, releaseNotes: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows="3"
                    placeholder="업데이트 내용을 입력하세요..."
                  />
                </div>

                <div className="flex space-x-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      최소 SDK
                    </label>
                    <input
                      type="number"
                      value={formData.minSdk}
                      onChange={(e) => setFormData({...formData, minSdk: parseInt(e.target.value)})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      대상 SDK
                    </label>
                    <input
                      type="number"
                      value={formData.targetSdk}
                      onChange={(e) => setFormData({...formData, targetSdk: parseInt(e.target.value)})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="forceUpdate"
                    checked={formData.forceUpdate}
                    onChange={(e) => setFormData({...formData, forceUpdate: e.target.checked})}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="forceUpdate" className="ml-2 block text-sm text-gray-700">
                    강제 업데이트
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    APK 파일 *
                  </label>
                  <input
                    type="file"
                    accept=".apk"
                    onChange={handleFileSelect}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  {selectedFile && (
                    <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md">
                      <p className="text-sm text-green-800">
                        선택된 파일: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                      </p>
                    </div>
                  )}
                </div>

                {uploading && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <span>업로드 중...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowUploadModal(false);
                      setSelectedFile(null);
                      setFormData({
                        versionCode: '',
                        versionName: '',
                        releaseNotes: '',
                        forceUpdate: false,
                        minSdk: 33,
                        targetSdk: 36
                      });
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                    disabled={uploading}
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    onClick={handleFileUpload}
                    disabled={uploading || !selectedFile || !formData.versionCode || !formData.versionName}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    {uploading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>업로드 중...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        <span>업로드</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppUpdateManagement;
