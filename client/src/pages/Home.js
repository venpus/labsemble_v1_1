import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle, Clock, Users, Award, Zap } from 'lucide-react';

const Home = () => {
  const services = [
    
    {
      id: 1,
      name: 'SMT',
      description: '전문적인 SMT & THT 조립 서비스, 시제품부터 양산까지 원스탑 서비스',
      features: ['SMT & THT 조립', '재고 부품 관리', '무료 DFM 체크', '24시간 제작'],
      icon: '⚡'
    },
    {
      id: 2,
      name: '회로도 & 아트웍',
      description: '전문적인 PCB 설계 및 레이아웃 서비스, 고품질 아트웍 제작',
      features: ['회로도 설계', 'PCB 레이아웃', 'DFM 최적화', '전문 엔지니어 지원'],
      icon: '🔌'
    },
    {
      id: 3,
      name: '3D 목업 제작',
      description: '프로토타입 및 시제품을 위한 정밀한 3D 목업 제작 서비스',
      features: ['3D 모델링', '프로토타입 제작', '다양한 소재', '빠른 제작'],
      icon: '🖨️'
    },
    {
      id: 4,
      name: '부품 구매',
      description: '전자 부품 및 소재의 원스톱 구매 대행 서비스',
      features: ['글로벌 부품 소싱', '품질 보증', '배송 관리', '재고 확인'],
      icon: '📦'
    },
    /*{
      id: 5,
      name: 'MJ 유통 파트너스 업무',
      description: 'MJ 유통과의 전략적 파트너십을 통한 사업 확장 지원',
      features: ['전략적 파트너십', '사업 확장 지원', '유통망 활용', '맞춤형 솔루션'],
      icon: '🤝'
    },*/
  ];

  const stats = [
    { number: '10,000+', label: '완료된 프로젝트', icon: CheckCircle },
    { number: '24시간', label: '최대 제작 시간', icon: Clock },
    { number: '5,000+', label: '만족한 고객', icon: Users },
    { number: '98%', label: '품질 만족도', icon: Award }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 to-indigo-100 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            혁신적인 제조 솔루션으로
            <span className="text-blue-600 block">아이디어를 현실로</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            LABSEMBLE은 PCB/SMT 제조부터 3D 프린팅, 하드웨어 개발까지. <br/>
            전문적인 기술인력과 빠른 제작 시간으로 고품질 제조 서비스를 제공합니다.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="btn-primary text-lg px-8 py-3">
              견적 요청하기
              <ArrowRight className="inline ml-2 w-5 h-5" />
            </button>
            <button className="btn-secondary text-lg px-8 py-3">
              서비스 둘러보기
            </button>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="flex justify-center mb-4">
                  <stat.icon className="w-12 h-12 text-blue-600" />
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-2">{stat.number}</div>
                <div className="text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              주요 제조 서비스
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              다양한 제조 기술과 품질 관리 시스템으로 고객의 요구사항을 충족합니다
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {services.map((service) => (
              <div key={service.id} className="card hover:shadow-xl transition-shadow duration-300">
                <div className="text-4xl mb-4">{service.icon}</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{service.name}</h3>
                <p className="text-gray-600 mb-4">{service.description}</p>
                <ul className="space-y-2 mb-6">
                  {service.features.map((feature, index) => (
                    <li key={index} className="flex items-center text-sm text-gray-600">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <button 
                  className="btn-primary w-full text-center"
                >
                  자세히 보기
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
                      <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            왜 LABSEMBLE을 선택해야 할까요?
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            혁신적인 기술과 빠른 제작 시간, 그리고 뛰어난 품질로 고객 만족을 보장합니다
          </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">빠른 제작 시간</h3>
              <p className="text-gray-600">
                PCB 제조는 24시간, 조립은 1-2일 내 완료. 
                긴급한 프로젝트도 빠르게 처리합니다.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Award className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">품질 보장</h3>
              <p className="text-gray-600">
                ISO 9001:2015, IPC-6012E 인증을 받은 
                엄격한 품질 관리 시스템으로 완벽한 결과물을 제공합니다.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">전문 기술 지원</h3>
              <p className="text-gray-600">
                경험丰富的한 엔지니어 팀이 설계부터 제작까지 
                전 과정을 지원합니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-blue-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            프로젝트를 시작할 준비가 되셨나요?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            무료 견적과 기술 상담을 통해 최적의 제조 솔루션을 찾아보세요
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-white text-blue-600 hover:bg-gray-100 font-semibold py-3 px-8 rounded-lg transition-colors duration-200">
              무료 견적 받기
            </button>
            <button className="border-2 border-white text-white hover:bg-white hover:text-blue-600 font-semibold py-3 px-8 rounded-lg transition-colors duration-200">
              문의하기
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home; 