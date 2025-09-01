import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle, ArrowRight, Home, User, Mail, Building } from 'lucide-react';

const RegisterSuccess = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const userData = location.state?.userData || {};
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate('/');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <Link to="/" className="inline-flex items-center space-x-2 mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-2xl">L</span>
            </div>
            <span className="text-3xl font-bold text-gray-900">LABSEMBLE</span>
          </Link>
          
          {/* Success Icon */}
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🎉 회원가입 완료!
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-4">
            LABSEMBLE에 오신 것을 환영합니다!<br/>
            이제 혁신적인 제조 솔루션을 경험해보세요.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 inline-block">
            <p className="text-blue-800 font-medium">
              <span className="text-2xl font-bold text-blue-600">{countdown}</span>초 후 홈페이지로 자동 이동됩니다
            </p>
          </div>
        </div>

        {/* User Info Card */}
        <div className="bg-white rounded-xl shadow-xl p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            가입 정보 확인
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center space-x-3">
              <User className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-500">사용자명</p>
                <p className="font-semibold text-gray-900">{userData.username || '사용자'}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Mail className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-500">이메일</p>
                <p className="font-semibold text-gray-900">{userData.email || '이메일'}</p>
              </div>
            </div>
            
            {userData.companyName && (
              <div className="flex items-center space-x-3">
                <Building className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-500">회사명</p>
                  <p className="font-semibold text-gray-900">{userData.companyName}</p>
                </div>
              </div>
            )}
            
            <div className="flex items-center space-x-3">
              <User className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-500">담당자</p>
                <p className="font-semibold text-gray-900">{userData.contactPerson || '담당자'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Next Steps */}
        <div className="bg-white rounded-xl shadow-xl p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            다음 단계
          </h2>
          
          <div className="space-y-6">
            <div className="flex items-start space-x-4">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-blue-600 font-bold text-sm">1</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">이메일 인증</h3>
                <p className="text-gray-600">
                  가입하신 이메일로 인증 메일이 발송되었습니다. 
                  이메일을 확인하여 계정을 활성화해주세요.
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-blue-600 font-bold text-sm">2</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">서비스 둘러보기</h3>
                <p className="text-gray-600">
                  LABSEMBLE의 다양한 제조 서비스를 살펴보고 
                  필요한 서비스를 선택해보세요.
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-blue-600 font-bold text-sm">3</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">첫 견적 요청</h3>
                <p className="text-gray-600">
                  프로젝트에 대한 견적을 요청하고 
                  전문 엔지니어와 상담해보세요.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="text-center space-y-4">
          <div className="space-y-3">
            <Link
              to="/"
              className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-4 px-8 rounded-lg hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 text-lg"
            >
              <Home className="w-5 h-5" />
              <span>지금 홈으로 이동</span>
            </Link>
            
            <div className="text-gray-600">
              또는{' '}
              <Link to="/login" className="text-blue-600 hover:text-blue-700 font-medium">
                로그인하기
              </Link>
            </div>
          </div>
          
          <div className="text-sm text-gray-500">
            자동 이동을 기다리지 않고 바로 이동하려면 위 버튼을 클릭하세요
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-12 text-center">
          <p className="text-gray-500 text-sm">
            문의사항이 있으시면{' '}
            <a href="mailto:support@labsemble.com" className="text-blue-600 hover:text-blue-700">
              support@labsemble.com
            </a>
            으로 연락해주세요.
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterSuccess; 