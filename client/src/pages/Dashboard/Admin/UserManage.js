import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Search, Filter, User, Building, Shield } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const UserManage = () => {
  const [users, setUsers] = useState([]);
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    contact_person: '',
    phone: '',
    email: '',
    company_name: '',
    is_admin: false,
    partner_name: ''
  });

  // 사용자 목록 조회
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/users');
      if (response.data.success) {
        setUsers(response.data.users);
      }
    } catch (error) {
      console.error('사용자 조회 오류:', error);
      toast.error('사용자 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 파트너스 목록 조회
  const fetchPartners = async () => {
    try {
      const response = await axios.get('/api/partners');
      if (response.data.success) {
        setPartners(response.data.partners);
      }
    } catch (error) {
      console.error('파트너스 조회 오류:', error);
      toast.error('파트너스 목록을 불러오는데 실패했습니다.');
    }
  };

  // 컴포넌트 마운트 시 사용자 및 파트너스 목록 조회
  useEffect(() => {
    fetchUsers();
    fetchPartners();
  }, []);

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.contact_person.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (user.company_name && user.company_name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'admin' && user.is_admin) ||
                         (statusFilter === 'user' && !user.is_admin);
    return matchesSearch && matchesStatus;
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingUser) {
        // 사용자 수정
        const response = await axios.put(`/api/users/${editingUser.id}`, formData);
        if (response.data.success) {
          toast.success('사용자가 성공적으로 수정되었습니다.');
          setUsers(users.map(u => u.id === editingUser.id ? response.data.user : u));
          setEditingUser(null);
        }
      } else {
        // 새 사용자 추가
        const response = await axios.post('/api/users', formData);
        if (response.data.success) {
          toast.success('사용자가 성공적으로 추가되었습니다.');
          setUsers([response.data.user, ...users]);
        }
      }
      
      setFormData({
        username: '',
        contact_person: '',
        phone: '',
        email: '',
        company_name: '',
        is_admin: false,
        partner_name: null
      });
      setShowModal(false);
    } catch (error) {
      console.error('사용자 저장 오류:', error);
      const errorMessage = error.response?.data?.message || '사용자 저장 중 오류가 발생했습니다.';
      toast.error(errorMessage);
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      contact_person: user.contact_person,
      phone: user.phone,
      email: user.email,
      company_name: user.company_name || '',
      is_admin: user.is_admin,
      partner_name: user.partner_name || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('정말로 이 사용자를 삭제하시겠습니까?')) {
      try {
        const response = await axios.delete(`/api/users/${id}`);
        if (response.data.success) {
          toast.success('사용자가 성공적으로 삭제되었습니다.');
          setUsers(users.filter(u => u.id !== id));
        }
      } catch (error) {
        console.error('사용자 삭제 오류:', error);
        toast.error('사용자 삭제 중 오류가 발생했습니다.');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      username: '',
      contact_person: '',
      phone: '',
      email: '',
      company_name: '',
      is_admin: false,
      partner_name: null
    });
    setEditingUser(null);
    setShowModal(false);
  };

  const toggleAdminStatus = async (userId, currentStatus) => {
    try {
      const response = await axios.patch(`/api/users/${userId}/role`, {
        is_admin: !currentStatus
      });
      if (response.data.success) {
        toast.success(`사용자 권한이 ${!currentStatus ? '관리자' : '일반 사용자'}로 변경되었습니다.`);
        setUsers(users.map(u => u.id === userId ? response.data.user : u));
      }
    } catch (error) {
      console.error('권한 변경 오류:', error);
      toast.error('권한 변경 중 오류가 발생했습니다.');
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">사용자 목록을 불러오는 중...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* 헤더 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">사용자 관리</h1>
        <p className="text-gray-600 mt-2">시스템의 모든 사용자를 관리하고 권한을 설정할 수 있습니다.</p>
      </div>

      {/* 컨트롤 바 */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="사용자명, 담당자, 이메일, 회사명으로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">전체 사용자</option>
            <option value="admin">관리자</option>
            <option value="user">일반 사용자</option>
          </select>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          새 사용자 추가
        </button>
      </div>

      {/* 사용자 목록 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">사용자 정보</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">연락처</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">회사 정보</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">권한</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">작업</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <User className="h-5 w-5 text-blue-600" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{user.username}</div>
                        <div className="text-sm text-gray-500">{user.contact_person}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{user.phone}</div>
                    <div className="text-sm text-gray-500">{user.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {user.company_name ? (
                        <div className="flex items-center">
                          <Building className="h-4 w-4 text-gray-400 mr-1" />
                          {user.company_name}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </div>
                    {user.partner_name && (
                      <div className="text-sm text-gray-500">파트너스: {user.partner_name}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.is_admin 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {user.is_admin ? (
                          <div className="flex items-center">
                            <Shield className="h-3 w-3 mr-1" />
                            관리자
                          </div>
                        ) : '일반 사용자'}
                      </span>
                      <button
                        onClick={() => toggleAdminStatus(user.id, user.is_admin)}
                        className={`text-xs px-2 py-1 rounded ${
                          user.is_admin 
                            ? 'text-red-600 hover:text-red-800' 
                            : 'text-green-600 hover:text-green-800'
                        }`}
                      >
                        {user.is_admin ? '권한 해제' : '관리자 지정'}
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(user)}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded"
                        title="수정"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(user.id)}
                        className="text-red-600 hover:text-red-900 p-1 rounded"
                        title="삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">
              {users.length === 0 ? '등록된 사용자가 없습니다.' : '검색 결과가 없습니다.'}
            </p>
          </div>
        )}
      </div>

      {/* 모달 */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">
              {editingUser ? '사용자 수정' : '새 사용자 추가'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">사용자명 *</label>
                  <input
                    type="text"
                    required
                    value={formData.username}
                    onChange={(e) => setFormData({...formData, username: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="사용자명을 입력하세요"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">담당자 *</label>
                  <input
                    type="text"
                    required
                    value={formData.contact_person}
                    onChange={(e) => setFormData({...formData, contact_person: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="담당자명을 입력하세요"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">연락처 *</label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="연락처를 입력하세요"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">이메일 *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="이메일을 입력하세요"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">회사명</label>
                  <input
                    type="text"
                    value={formData.company_name}
                    onChange={(e) => setFormData({...formData, company_name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="회사명을 입력하세요"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">파트너스</label>
                  <select
                    value={formData.partner_name || ''}
                    onChange={(e) => setFormData({...formData, partner_name: e.target.value === '' ? null : e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">파트너스를 선택하세요</option>
                    {partners.map((partner) => (
                      <option key={partner.id} value={partner.name}>
                        {partner.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.is_admin}
                    onChange={(e) => setFormData({...formData, is_admin: e.target.checked})}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm font-medium text-gray-700">관리자 권한 부여</span>
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingUser ? '수정' : '추가'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                >
                  취소
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManage; 