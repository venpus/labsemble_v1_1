import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, Facebook, Twitter, Linkedin, Instagram } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-lg">L</span>
              </div>
              <span className="text-xl font-bold">LABSEMBLE</span>
            </div>
            <p className="text-gray-300 mb-4 max-w-md">
              혁신적인 제조 솔루션을 제공하는 글로벌 제조업체입니다. 
              PCB 제조, 조립, 3D 프린팅, CNC 가공 등 최첨단 기술을 통해 
              고객의 창의적인 아이디어를 현실로 구현합니다.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <Linkedin className="w-5 h-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <Instagram className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Services */}
          <div>
            <h3 className="text-lg font-semibold mb-4">서비스</h3>
            <ul className="space-y-2">
              <li>
                <span className="text-gray-300">PCB 제조</span>
              </li>
              <li>
                <span className="text-gray-300">PCB 조립</span>
              </li>
              <li>
                <span className="text-gray-300">3D 프린팅</span>
              </li>
              <li>
                <span className="text-gray-300">CNC 가공</span>
              </li>
              <li>
                <span className="text-gray-300">레이아웃 서비스</span>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-lg font-semibold mb-4">회사</h3>
            <ul className="space-y-2">
              <li>
                <span className="text-gray-300">회사소개</span>
              </li>
              <li>
                <span className="text-gray-300">채용정보</span>
              </li>
              <li>
                <span className="text-gray-300">뉴스</span>
              </li>
              <li>
                <span className="text-gray-300">문의하기</span>
              </li>
              <li>
                <span className="text-gray-300">고객지원</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Contact Info */}
        <div className="border-t border-gray-800 mt-8 pt-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center space-x-3">
              <Mail className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-sm text-gray-400">이메일</p>
                <p className="text-white">support@manufacturing.com</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Phone className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-sm text-gray-400">전화번호</p>
                <p className="text-white">+82-2-1234-5678</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <MapPin className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-sm text-gray-400">주소</p>
                <p className="text-white">서울특별시 강남구 테헤란로 123</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-400 text-sm">
            © 2024 LABSEMBLE. All rights reserved.
          </p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <span className="text-gray-400 text-sm">개인정보처리방침</span>
            <span className="text-gray-400 text-sm">이용약관</span>
            <span className="text-gray-400 text-sm">사이트맵</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 