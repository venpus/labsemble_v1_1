import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import RegisterSuccess from './pages/RegisterSuccess';
import Dashboard from './pages/Dashboard/Dashboard';
import ProjectRegister from './components/Project/MJ/ProjectRegister';
import './App.css';

// Footer를 조건부로 렌더링하는 컴포넌트
function ConditionalFooter() {
  const location = useLocation();
  
  // 대시보드 경로인지 확인
  const isDashboardRoute = location.pathname.startsWith('/dashboard') || 
                          location.pathname.startsWith('/services/mj-distribution');
  
  // 대시보드 경로가 아닌 경우에만 Footer 표시
  return !isDashboardRoute ? <Footer /> : null;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App min-h-screen flex flex-col">
          <Navbar />
          <main className="flex-grow">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/register-success" element={<RegisterSuccess />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/dashboard/admin/partners" element={<Dashboard />} />
              <Route path="/dashboard/admin/users" element={<Dashboard />} />
              <Route path="/dashboard/admin" element={<Dashboard />} />
              <Route path="/dashboard/mj-projects" element={<Dashboard />} />
              <Route path="/dashboard/mj-projects/:id" element={<Dashboard />} />
              <Route path="/dashboard/mj-calendar" element={<Dashboard />} />
              <Route path="/dashboard/mj-packing-list" element={<Dashboard />} />
              <Route path="/dashboard/mj-packing-list/create" element={<Dashboard />} />
              <Route path="/dashboard/mj-packing-list/:packingCode" element={<Dashboard />} />
              <Route path="/dashboard/mj-packing-list/date/:date" element={<Dashboard />} />
              <Route path="/dashboard/mj-packing-list/logistic-payment" element={<Dashboard />} />
              <Route path="/dashboard/mj-packing-list/date-detail" element={<Dashboard />} />
              <Route path="/dashboard/finance" element={<Dashboard />} />
              <Route path="/services/mj-distribution" element={<ProjectRegister />} />
            </Routes>
          </main>
          <ConditionalFooter />
          <Toaster position="top-right" />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App; 