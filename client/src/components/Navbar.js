import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, User, LogOut, ChevronDown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isServicesHovered, setIsServicesHovered] = useState(false);
  const [servicesTimeout, setServicesTimeout] = useState(null);
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="bg-white shadow-lg border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-lg">L</span>
            </div>
            <span className="text-xl font-bold text-gray-900">LABSEMBLE</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/" className="text-gray-700 hover:text-blue-600 font-bold">
              홈
            </Link>
            <Link to="/about" className="text-gray-700 hover:text-blue-600 font-bold">
              LABSemble 소개
            </Link>
            <div 
              className="relative"
              onMouseEnter={() => {
                if (servicesTimeout) {
                  clearTimeout(servicesTimeout);
                  setServicesTimeout(null);
                }
                setIsServicesHovered(true);
              }}
              onMouseLeave={() => {
                const timeout = setTimeout(() => {
                  setIsServicesHovered(false);
                }, 300); // 300ms 지연
                setServicesTimeout(timeout);
              }}
            >
              <div className="flex items-center space-x-1 text-gray-700 hover:text-blue-600 font-bold cursor-pointer">
                <span>서비스</span>
                <ChevronDown className="w-4 h-4" />
              </div>
              
              {/* Services Dropdown */}
              {isServicesHovered && (
                <div 
                  className="absolute top-full left-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50"
                  onMouseEnter={() => {
                    if (servicesTimeout) {
                      clearTimeout(servicesTimeout);
                      setServicesTimeout(null);
                    }
                  }}
                  onMouseLeave={() => {
                    const timeout = setTimeout(() => {
                      setIsServicesHovered(false);
                    }, 300); // 300ms 지연
                    setServicesTimeout(timeout);
                  }}
                >
                  <div className="py-3">
                    <Link 
                      to="/services/smt" 
                      className="block px-5 py-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 font-medium transition-colors"
                    >
                      SMT
                    </Link>
                    <Link 
                      to="/services/artwork" 
                      className="block px-5 py-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 font-medium transition-colors"
                    >
                      아트웍
                    </Link>
                    <Link 
                      to="/services/3d-mockup" 
                      className="block px-5 py-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 font-medium transition-colors"
                    >
                      3D 목업
                    </Link>
                    <Link 
                      to="/services/mold" 
                      className="block px-5 py-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 font-medium transition-colors"
                    >
                      금형
                    </Link>
                    {isAuthenticated && (user?.isAdmin || user?.partnerName === 'MJ유통') && (
                      <Link 
                        to="/services/mj-distribution" 
                        className="block px-5 py-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 font-medium transition-colors"
                      >
                        MJ유통
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </div>

            <Link to="/news" className="text-gray-700 hover:text-blue-600 font-bold">
              Labsemble 소식
            </Link>
            <Link to="/contact" className="text-gray-700 hover:text-blue-600 font-bold">
              Contact
            </Link>
          </div>

          {/* User Actions */}
          <div className="hidden md:flex items-center space-x-4">
            {isAuthenticated ? (
              <>
                <div className="flex items-center space-x-3">
                  <Link 
                    to="/dashboard"
                    className="flex items-center space-x-2 bg-gray-100 px-3 py-2 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer"
                  >
                    <User className="w-4 h-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">
                      {user?.companyName 
                        ? `(${user.companyName}) ${user.username}${user?.isAdmin ? ' 관리자님' : ''}`
                        : `${user.username}${user?.isAdmin ? ' 관리자님' : ''}`
                      }
                    </span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex items-center space-x-2 text-gray-700 hover:text-red-600 font-medium transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>로그아웃</span>
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link to="/login" className="text-gray-700 hover:text-blue-600 font-medium">
                  로그인
                </Link>
                <Link to="/register" className="btn-primary">
                  회원가입
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={toggleMenu}
              className="text-gray-700 hover:text-blue-600 p-2"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 border-t border-gray-200">
              <Link
                to="/"
                className="block px-3 py-2 text-gray-700 hover:text-blue-600 font-bold"
                onClick={() => setIsMenuOpen(false)}
              >
                홈
              </Link>
              <Link
                to="/about"
                className="block px-3 py-2 text-gray-700 hover:text-blue-600 font-bold"
                onClick={() => setIsMenuOpen(false)}
              >
                LABSemble 소개
              </Link>
              <div 
                className="relative"
                onMouseEnter={() => setIsServicesHovered(true)}
                onMouseLeave={() => setIsServicesHovered(false)}
              >
                <div className="flex items-center space-x-1 text-gray-700 hover:text-blue-600 font-bold cursor-pointer" onClick={() => setIsMenuOpen(false)}>
                  <span>서비스</span>
                  <ChevronDown className="w-4 h-4" />
                </div>
                
                {/* Services Dropdown */}
                {isServicesHovered && (
                  <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                    <div className="py-2">
                      <Link 
                        to="/services/smt" 
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 font-medium"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        SMT
                      </Link>
                      <Link 
                        to="/services/artwork" 
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 font-medium"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        아트웍
                      </Link>
                      <Link 
                        to="/services/3d-mockup" 
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 font-medium"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        3D 목업
                      </Link>
                      <Link 
                        to="/services/mold" 
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 font-medium"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        금형
                      </Link>
                      {isAuthenticated && (user?.isAdmin || user?.partnerName === 'MJ유통') && (
                        <Link 
                          to="/services/mj-distribution" 
                          className="block px-4 py-2 text-sm text-gray-700 hover:text-blue-600 font-medium"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          MJ유통
                        </Link>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <Link
                to="/inquiry"
                className="block px-3 py-2 text-gray-700 hover:text-blue-600 font-bold"
                onClick={() => setIsMenuOpen(false)}
              >
                문의
              </Link>
              <Link
                to="/news"
                className="block px-3 py-2 text-gray-700 hover:text-blue-600 font-bold"
                onClick={() => setIsMenuOpen(false)}
              >
                Labsemble 소식
              </Link>
              <Link
                to="/resources"
                className="block px-3 py-2 text-gray-700 hover:text-blue-600 font-bold"
                onClick={() => setIsMenuOpen(false)}
              >
                자료실
              </Link>
              <Link
                to="/contact"
                className="block px-3 py-2 text-gray-700 hover:text-blue-600 font-bold"
                onClick={() => setIsMenuOpen(false)}
              >
                Contact
              </Link>
            
            {/* Mobile Auth */}
            <div className="px-3 py-2 space-y-2">
              {isAuthenticated ? (
                <>
                  <Link
                    to="/dashboard"
                    className="px-3 py-2 bg-gray-100 rounded-lg hover:bg-blue-50 transition-colors block"
                  >
                    <div className="flex items-center space-x-2">
                      <User className="w-4 h-4 text-gray-600" />
                      <span className="text-sm font-medium text-gray-700">
                        {user?.companyName 
                          ? `(${user.companyName}) ${user.username}${user?.isAdmin ? ' 관리자님' : ''}`
                          : `${user.username}${user?.isAdmin ? ' 관리자님' : ''}`
                        }
                      </span>
                    </div>
                  </Link>
                  <button
                    onClick={() => {
                      handleLogout();
                      setIsMenuOpen(false);
                    }}
                    className="flex items-center space-x-2 text-gray-700 hover:text-red-600 font-medium w-full text-left px-3 py-2"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>로그아웃</span>
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="block text-gray-700 hover:text-blue-600 font-medium"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    로그인
                  </Link>
                  <Link
                    to="/register"
                    className="block btn-primary text-center"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    회원가입
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar; 