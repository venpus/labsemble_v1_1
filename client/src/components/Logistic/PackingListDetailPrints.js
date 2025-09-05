import React, { useState, useEffect } from 'react';
import { X, Printer, Download, Eye } from 'lucide-react';

const PackingListDetailPrints = ({ 
  isOpen, 
  onClose, 
  packingData, 
  selectedDate, 
  summary 
}) => {
  const [isPrinting, setIsPrinting] = useState(false);

  // 인쇄 기능
  const handlePrint = () => {
    setIsPrinting(true);
    
    // 인쇄 스타일 적용
    const printWindow = window.open('', '_blank');
    const printContent = document.getElementById('print-content');
    
    if (printWindow && printContent) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>패킹리스트 - ${selectedDate}</title>
          <style>
            @page {
              size: A4;
              margin: 20mm;
            }
            body {
              font-family: 'Arial', sans-serif;
              font-size: 12px;
              line-height: 1.4;
              color: #333;
              margin: 0;
              padding: 0;
            }
            .print-header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 2px solid #333;
              padding-bottom: 15px;
            }
            .print-title {
              font-size: 24px;
              font-weight: bold;
              margin-bottom: 10px;
            }
            .print-subtitle {
              font-size: 16px;
              color: #666;
            }
            .print-summary {
              display: flex;
              justify-content: space-around;
              margin-bottom: 30px;
              padding: 15px;
              background-color: #f8f9fa;
              border: 1px solid #dee2e6;
            }
            .summary-item {
              text-align: center;
            }
            .summary-label {
              font-size: 12px;
              color: #666;
              margin-bottom: 5px;
            }
            .summary-value {
              font-size: 18px;
              font-weight: bold;
              color: #333;
            }
            .print-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
              border: 2px solid #000 !important;
            }
            .print-table th,
            .print-table td {
              border: 1px solid #000 !important;
              padding: 8px;
              text-align: left;
              vertical-align: top;
            }
            .print-table th {
              background-color: #f8f9fa !important;
              font-weight: bold;
              text-align: center;
              border-bottom: 2px solid #000 !important;
            }
            .print-table tbody tr {
              border-bottom: 1px solid #000 !important;
            }
            .print-table tbody tr:nth-child(even) {
              background-color: #f9f9f9 !important;
            }
            .print-table tbody tr:hover {
              background-color: #f5f5f5 !important;
            }
            .print-table .number-col {
              width: 5%;
              text-align: center;
            }
            .print-table .product-col {
              width: 25%;
            }
            .print-table .image-col {
              width: 15%;
              text-align: center;
            }
            .print-table .packaging-col {
              width: 10%;
              text-align: center;
            }
            .print-table .count-col {
              width: 10%;
              text-align: center;
            }
            .print-table .quantity-col {
              width: 15%;
              text-align: center;
            }
            .print-table .date-col {
              width: 15%;
              text-align: center;
            }
            .product-name {
              font-weight: bold;
              margin-bottom: 5px;
            }
            .product-sku {
              font-size: 10px;
              color: #666;
            }
            .product-image {
              width: 40px;
              height: 40px;
              object-fit: cover;
              border: 1px solid #ddd;
              border-radius: 4px;
            }
            .product-image-placeholder {
              width: 40px;
              height: 40px;
              background-color: #f5f5f5;
              border: 1px solid #ddd;
              border-radius: 4px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 10px;
              color: #999;
            }
            .packing-code {
              display: inline-block;
              background-color: #e3f2fd;
              color: #1976d2;
              padding: 2px 6px;
              border-radius: 3px;
              font-size: 10px;
              font-weight: bold;
              margin-bottom: 3px;
            }
            .packing-group {
              margin-bottom: 30px;
              border: 2px solid #000 !important;
              border-radius: 8px;
              overflow: hidden;
            }
            .packing-group-header {
              background-color: #1976d2;
              color: white;
              padding: 12px 16px;
              font-weight: bold;
              font-size: 14px;
            }
            .packing-group-content {
              background-color: white;
            }
            .packing-group-table {
              width: 100%;
              border-collapse: collapse;
              margin: 0;
              border: 1px solid #000 !important;
            }
            .packing-group-table th,
            .packing-group-table td {
              border: 1px solid #000 !important;
              padding: 8px;
              text-align: left;
              vertical-align: top;
            }
            .packing-group-table th {
              background-color: #f8f9fa !important;
              font-weight: bold;
              text-align: center;
              border-bottom: 2px solid #000 !important;
            }
            .packing-group-table tbody tr {
              border-bottom: 1px solid #000 !important;
            }
            .packing-group-table tbody tr:nth-child(even) {
              background-color: #f9f9f9 !important;
            }
            .packing-group-summary {
              background-color: #f0f8ff !important;
              padding: 10px 16px;
              border-top: 1px solid #000 !important;
              font-size: 12px;
              color: #1976d2;
              font-weight: bold;
            }
            .print-footer {
              margin-top: 30px;
              text-align: center;
              font-size: 10px;
              color: #666;
              border-top: 1px solid #dee2e6;
              padding-top: 10px;
            }
            .no-data {
              text-align: center;
              padding: 40px;
              color: #666;
              font-style: italic;
            }
            @media print {
              .no-print {
                display: none !important;
              }
              .print-table,
              .packing-group-table {
                border-collapse: collapse !important;
              }
              .print-table th,
              .print-table td,
              .packing-group-table th,
              .packing-group-table td {
                border: 1px solid #000 !important;
                -webkit-print-color-adjust: exact !important;
                color-adjust: exact !important;
              }
              .print-table th,
              .packing-group-table th {
                background-color: #f8f9fa !important;
                -webkit-print-color-adjust: exact !important;
                color-adjust: exact !important;
              }
              .packing-group {
                border: 2px solid #000 !important;
                -webkit-print-color-adjust: exact !important;
                color-adjust: exact !important;
              }
              .packing-group-header {
                background-color: #1976d2 !important;
                -webkit-print-color-adjust: exact !important;
                color-adjust: exact !important;
              }
              .packing-group-summary {
                background-color: #f0f8ff !important;
                -webkit-print-color-adjust: exact !important;
                color-adjust: exact !important;
              }
              .product-image {
                width: 40px !important;
                height: 40px !important;
                object-fit: cover !important;
                border: 1px solid #ddd !important;
                border-radius: 4px !important;
              }
              .product-image-placeholder {
                width: 40px !important;
                height: 40px !important;
                background-color: #f5f5f5 !important;
                border: 1px solid #ddd !important;
                border-radius: 4px !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                font-size: 10px !important;
                color: #999 !important;
              }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
        </html>
      `);
      
      printWindow.document.close();
      printWindow.focus();
      
      // 인쇄 대화상자 열기
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
        setIsPrinting(false);
      }, 500);
    } else {
      setIsPrinting(false);
    }
  };

  // PDF 다운로드 기능 (기본 브라우저 인쇄를 PDF로 저장)
  const handleDownloadPDF = () => {
    handlePrint();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">패킹리스트 인쇄 미리보기</h2>
            <p className="text-sm text-gray-600">
              {selectedDate} 출고일자 - A4용지 기준 미리보기
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              disabled={isPrinting}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              {isPrinting ? '인쇄 중...' : '인쇄'}
            </button>
            <button
              onClick={handleDownloadPDF}
              disabled={isPrinting}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              PDF 저장
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* 미리보기 영역 */}
        <div className="flex-1 overflow-auto p-6 bg-gray-100">
          <div className="bg-white shadow-lg mx-auto" style={{ 
            width: '210mm', 
            minHeight: '297mm',
            border: '1px solid #ccc',
            boxShadow: '0 0 10px rgba(0,0,0,0.1)'
          }}>
            <div id="print-content">
              {/* 인쇄용 헤더 */}
              <div className="print-header">
                <div className="print-title">패킹리스트 상세보기</div>
                <div className="print-subtitle">
                  출고일자: {selectedDate === 'no-date' ? '날짜 미지정' : selectedDate}
                </div>
              </div>

              {/* 요약 정보 */}
              <div className="print-summary">
                <div className="summary-item">
                  <div className="summary-label">총 상품 수</div>
                  <div className="summary-value">{summary.totalProducts}개</div>
                </div>
                <div className="summary-item">
                  <div className="summary-label">총 박스 수</div>
                  <div className="summary-value">{summary.totalBoxes.toLocaleString()}박스</div>
                </div>
                <div className="summary-item">
                  <div className="summary-label">총 수량</div>
                  <div className="summary-value">{summary.totalQuantity.toLocaleString()}개</div>
                </div>
                <div className="summary-item">
                  <div className="summary-label">물류회사</div>
                  <div className="summary-value">
                    {summary.logisticCompanies.length > 0 ? summary.logisticCompanies.join(', ') : '미지정'}
                  </div>
                </div>
              </div>

              {/* 포장코드별 그룹화된 상품 상세 테이블 */}
              {packingData && packingData.length > 0 ? (
                (() => {
                  // 포장코드별로 그룹화
                  const groupedData = packingData.reduce((acc, item) => {
                    const packingCode = item.packing_code;
                    if (!acc[packingCode]) {
                      acc[packingCode] = {
                        packing_code: packingCode,
                        box_count: item.box_count || 0,
                        logistic_company: item.logistic_company || '미지정',
                        products: []
                      };
                    }
                    acc[packingCode].products.push(item);
                    return acc;
                  }, {});

                  return Object.values(groupedData).map((group, groupIndex) => {
                    const totalQuantity = group.products.reduce((sum, product) => {
                      return sum + ((product.packaging_method || 0) * (product.packaging_count || 0) * (group.box_count || 0));
                    }, 0);

                    return (
                      <div key={group.packing_code} className="packing-group">
                        {/* 포장코드 헤더 */}
                        <div className="packing-group-header">
                          📦 포장코드: {group.packing_code} 
                          <span style={{ marginLeft: '20px', fontSize: '12px', opacity: '0.9' }}>
                            박스수: {group.box_count}개 | 물류회사: {group.logistic_company}
                          </span>
                        </div>
                        
                        {/* 포장코드별 상품 테이블 */}
                        <div className="packing-group-content">
                          <table className="packing-group-table">
                            <thead>
                              <tr>
                                <th className="number-col">번호</th>
                                <th className="product-col">상품명</th>
                                <th className="image-col">상품 이미지</th>
                                <th className="packaging-col">소포장 구성</th>
                                <th className="count-col">포장수</th>
                                <th className="quantity-col">한박스 내 수량</th>
                                <th className="date-col">생성일시</th>
                              </tr>
                            </thead>
                            <tbody>
                              {group.products.map((item, index) => (
                                <tr key={`${group.packing_code}-${index}`}>
                                  <td className="number-col">{index + 1}</td>
                                  <td className="product-col">
                                    <div className="product-name">{item.product_name}</div>
                                    <div className="product-sku">SKU: {item.product_sku}</div>
                                  </td>
                                                          <td className="image-col">
                          {item.product_image ? (
                            <>
                              <img
                                src={item.product_image}
                                alt={item.product_name}
                                className="product-image"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'flex';
                                }}
                              />
                              <div 
                                className="product-image-placeholder"
                                style={{ display: 'none' }}
                              >
                                이미지 없음
                              </div>
                            </>
                          ) : (
                            <div className="product-image-placeholder">
                              이미지 없음
                            </div>
                          )}
                        </td>
                                  <td className="packaging-col">{item.packaging_method || 0}</td>
                                  <td className="count-col">{item.packaging_count || 0}</td>
                                  <td className="quantity-col">
                                    {item.quantity_per_box ? `${item.quantity_per_box.toLocaleString()} 개/박스` : '-'}
                                  </td>
                                  <td className="date-col">
                                    {new Date(item.created_at).toLocaleString('ko-KR', {
                                      year: 'numeric',
                                      month: '2-digit',
                                      day: '2-digit',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          
                          {/* 포장코드별 요약 정보 */}
                          <div className="packing-group-summary">
                            📊 이 포장코드 총 수량: {totalQuantity.toLocaleString()}개 | 상품 수: {group.products.length}개
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()
              ) : (
                <div className="no-data">
                  <p>표시할 데이터가 없습니다.</p>
                </div>
              )}

              {/* 인쇄용 푸터 */}
              <div className="print-footer">
                <p>인쇄일시: {new Date().toLocaleString('ko-KR')}</p>
                <p>MJ 패킹리스트 관리 시스템</p>
              </div>
            </div>
          </div>
        </div>

        {/* 하단 안내 */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center gap-4">
              <span>📄 A4용지 기준 (210mm × 297mm)</span>
              <span>📊 총 {packingData ? packingData.length : 0}개 항목</span>
            </div>
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              <span>미리보기 모드</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PackingListDetailPrints;
