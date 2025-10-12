import React, { useState, useEffect } from 'react';
import { X, Printer, Download, Eye } from 'lucide-react';

const PackingCodeDetailPrint = ({ 
  isOpen, 
  onClose, 
  packingData, 
  selectedDate, 
  summary 
}) => {
  const [isPrinting, setIsPrinting] = useState(false);
  const [includeArrivalCost, setIncludeArrivalCost] = useState(false); // 도착원가 포함 여부

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
          <title>제품별 리스트 - ${selectedDate}</title>
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
              flex-wrap: wrap;
              margin-bottom: 30px;
              padding: 15px;
              background-color: #f8f9fa;
              border: 1px solid #dee2e6;
              gap: 10px;
            }
            .summary-item {
              text-align: center;
              min-width: 120px;
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
            .arrival-cost-info {
              background-color: rgba(255, 255, 255, 0.2);
              padding: 8px 12px;
              border-radius: 6px;
              text-align: right;
            }
            .product-group {
              margin-bottom: 25px;
              border: 2px solid #28a745;
              border-radius: 8px;
              overflow: hidden;
            }
            .product-group-header {
              background-color: #28a745;
              color: white;
              padding: 12px 16px;
              font-weight: bold;
              font-size: 14px;
            }
            .product-group-content {
              background-color: white;
            }
            .product-group-table {
              width: 100%;
              border-collapse: collapse;
              margin: 0;
            }
            .product-group-table th,
            .product-group-table td {
              border: 1px solid #000 !important;
              padding: 8px;
              text-align: left;
              vertical-align: top;
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
              background-color: transparent;
              border: none;
              border-radius: 4px;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .product-group-table th {
              background-color: #f8f9fa !important;
              font-weight: bold;
              text-align: center;
              border-bottom: 2px solid #000 !important;
            }
            .product-group-table tbody tr {
              border-bottom: 1px solid #000 !important;
            }
            .product-group-table tbody tr:nth-child(even) {
              background-color: #f9f9f9 !important;
            }
            .product-group-summary {
              background-color: #e8f5e8;
              padding: 10px 16px;
              border-top: 1px solid #000 !important;
              font-size: 12px;
              color: #28a745;
              font-weight: bold;
            }
            .product-name {
              font-weight: bold;
              margin-bottom: 5px;
            }
            .product-sku {
              font-size: 10px;
              color: #666;
            }
            .packing-code {
              display: inline-block;
              background-color: #e3f2fd;
              color: #1976d2;
              padding: 2px 6px;
              border-radius: 3px;
              font-size: 10px;
              font-weight: bold;
              margin: 2px;
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
              .product-group-table {
                border-collapse: collapse !important;
              }
              .product-group-table th,
              .product-group-table td {
                border: 1px solid #000 !important;
                -webkit-print-color-adjust: exact !important;
                color-adjust: exact !important;
              }
              .product-group-table th {
                background-color: #f8f9fa !important;
                -webkit-print-color-adjust: exact !important;
                color-adjust: exact !important;
              }
              .product-group {
                border: 2px solid #000 !important;
                -webkit-print-color-adjust: exact !important;
                color-adjust: exact !important;
              }
              .product-group-header {
                background-color: #28a745 !important;
                -webkit-print-color-adjust: exact !important;
                color-adjust: exact !important;
              }
              .product-group-summary {
                background-color: #e8f5e8 !important;
                -webkit-print-color-adjust: exact !important;
                color-adjust: exact !important;
              }
              .arrival-cost-info {
                background-color: rgba(255, 255, 255, 0.2) !important;
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
                background-color: transparent !important;
                border: none !important;
                border-radius: 4px !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
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
            <h2 className="text-xl font-semibold text-gray-900">제품별 리스트 인쇄 미리보기</h2>
            <p className="text-sm text-gray-600">
              {selectedDate} 출고일자 - A4용지 기준 미리보기
            </p>
            {/* 도착원가 포함 옵션 */}
            <div className="mt-3 flex items-center">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeArrivalCost}
                  onChange={(e) => setIncludeArrivalCost(e.target.checked)}
                  className="rounded border-gray-300 text-teal-600 focus:ring-teal-500 mr-2"
                />
                <span className="text-sm font-medium text-gray-700">
                  도착원가 정보 포함
                </span>
                <span className="ml-2 text-xs text-gray-500">
                  (물류비 + 제품비 단가)
                </span>
              </label>
            </div>
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
                <div className="print-title">
                  제품별 리스트{includeArrivalCost && ' (도착원가 포함)'}
                </div>
                <div className="print-subtitle">
                  출고일자: {selectedDate === 'no-date' ? '날짜 미지정' : selectedDate}
                </div>
              </div>

              {/* 요약 정보 */}
              <div className="print-summary">
                <div className="summary-item">
                  <div className="summary-label">총 제품수</div>
                  <div className="summary-value">{summary.totalProducts}개</div>
                </div>
                <div className="summary-item">
                  <div className="summary-label">총 수량</div>
                  <div className="summary-value">{summary.totalQuantity.toLocaleString()}개</div>
                </div>
                <div className="summary-item">
                  <div className="summary-label">총 박스수</div>
                  <div className="summary-value">{summary.totalBoxes.toLocaleString()}박스</div>
                </div>
                <div className="summary-item">
                  <div className="summary-label">포장코드 수</div>
                  <div className="summary-value">{summary.totalPackingCodes}개</div>
                </div>
                {includeArrivalCost && summary.commonLogisticCostPerUnit > 0 && (
                  <div className="summary-item">
                    <div className="summary-label">공통 물류비 단가</div>
                    <div className="summary-value" style={{ color: '#0d9488' }}>¥{summary.commonLogisticCostPerUnit.toFixed(2)}/개</div>
                  </div>
                )}
              </div>

              {/* 도착원가 계산 안내 */}
              {includeArrivalCost && summary.dateTotalLogisticFee > 0 && (
                <div style={{ 
                  marginBottom: '20px', 
                  padding: '15px', 
                  backgroundColor: '#e0f2fe', 
                  border: '1px solid #0ea5e9',
                  borderRadius: '6px'
                }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#0c4a6e' }}>
                    💰 도착원가 계산 방식
                  </div>
                  <div style={{ fontSize: '11px', color: '#0c4a6e' }}>
                    <div style={{ marginBottom: '4px' }}>
                      • 해당 날짜 총 물류비: ¥{summary.dateTotalLogisticFee.toLocaleString()}
                    </div>
                    <div style={{ marginBottom: '4px' }}>
                      • 해당 날짜 총 수량: {summary.totalQuantity.toLocaleString()}개
                    </div>
                    <div style={{ fontWeight: 'bold', color: '#0d9488' }}>
                      • 공통 물류비 단가: ¥{summary.commonLogisticCostPerUnit?.toFixed(2) || '0.00'}/개 (모든 제품에 동일 적용)
                    </div>
                    <div style={{ marginTop: '8px', fontStyle: 'italic' }}>
                      → 도착원가 = 공통 물류비 단가 + (프로젝트 최종금액 ÷ 주문수량)
                    </div>
                  </div>
                </div>
              )}

              {/* 제품별 그룹화된 상품 상세 테이블 */}
              {packingData && packingData.length > 0 ? (
                packingData.map((item, index) => {
                  // 해당 제품이 포함된 총 박스수 계산
                  const totalBoxes = item.packing_codes.reduce((sum, pc) => sum + pc.box_count, 0);
                  
                  return (
                    <div key={item.product_key} className="product-group">
                      {/* 제품 헤더 */}
                      <div className="product-group-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <div style={{ marginRight: '15px' }}>
                            {item.product_image ? (
                              <img
                                src={item.product_image}
                                alt={item.product_name}
                                className="product-image"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                }}
                              />
                            ) : (
                              <div 
                                className="product-image-placeholder"
                                style={{ 
                                  width: '40px', 
                                  height: '40px', 
                                  backgroundColor: 'transparent',
                                  border: 'none'
                                }}
                              >
                              </div>
                            )}
                          </div>
                          <div>
                            <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
                              📦 {item.product_name}
                            </div>
                            <div style={{ fontSize: '12px', opacity: '0.9', marginTop: '4px' }}>
                              SKU: {item.product_sku} | 총 수량: {item.total_quantity.toLocaleString()}개 | 포함 박스수: {totalBoxes}박스
                            </div>
                          </div>
                        </div>
                        {includeArrivalCost && item.arrival_cost > 0 && (
                          <div style={{ 
                            backgroundColor: 'rgba(255, 255, 255, 0.2)', 
                            padding: '8px 12px', 
                            borderRadius: '6px',
                            textAlign: 'right'
                          }}>
                            <div style={{ fontSize: '11px', opacity: '0.9' }}>도착원가</div>
                            <div style={{ fontSize: '18px', fontWeight: 'bold' }}>¥{item.arrival_cost.toFixed(2)}</div>
                            <div style={{ fontSize: '9px', opacity: '0.8', marginTop: '2px' }}>
                              {item.logistic_cost_per_unit > 0 && `물류비 ¥${item.logistic_cost_per_unit.toFixed(2)}`}
                              {item.product_cost_per_unit > 0 && item.logistic_cost_per_unit > 0 && ' + '}
                              {item.product_cost_per_unit > 0 && `제품비 ¥${item.product_cost_per_unit.toFixed(2)}`}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* 제품별 포장코드 테이블 */}
                      <div className="product-group-content">
                        <table className="product-group-table">
                          <thead>
                            <tr>
                              <th style={{ width: '10%' }}>번호</th>
                              <th style={{ width: '25%' }}>포장코드</th>
                              <th style={{ width: '15%' }}>박스수</th>
                              <th style={{ width: '20%' }}>포장코드별 수량</th>
                              <th style={{ width: '15%' }}>물류회사</th>
                              <th style={{ width: '15%' }}>생성일시</th>
                            </tr>
                          </thead>
                          <tbody>
                            {item.packing_codes.map((packingCode, pcIndex) => (
                              <tr key={pcIndex}>
                                <td style={{ textAlign: 'center' }}>{pcIndex + 1}</td>
                                <td>
                                  <div className="packing-code">{packingCode.packing_code}</div>
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                  {packingCode.box_count.toLocaleString()}박스
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                  {packingCode.calculated_quantity.toLocaleString()}개
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                  {/* 물류회사 정보는 packingData에서 가져와야 함 */}
                                  -
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                  {/* 생성일시 정보는 packingData에서 가져와야 함 */}
                                  -
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        
                        {/* 제품별 요약 정보 */}
                        <div className="product-group-summary">
                          📊 이 제품 총 수량: {item.total_quantity.toLocaleString()}개 | 포함 포장코드: {item.packing_codes.length}개 | 총 박스수: {totalBoxes}박스
                          {includeArrivalCost && item.arrival_cost > 0 && (
                            <span style={{ marginLeft: '15px', color: '#0d9488', fontWeight: 'bold' }}>
                              | 💰 도착원가: ¥{item.arrival_cost.toFixed(2)}/개
                              {item.logistic_cost_per_unit > 0 && ` (물류비 ¥${item.logistic_cost_per_unit.toFixed(2)}`}
                              {item.product_cost_per_unit > 0 && ` + 제품비 ¥${item.product_cost_per_unit.toFixed(2)}`}
                              {(item.logistic_cost_per_unit > 0 || item.product_cost_per_unit > 0) && ')'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="no-data">
                  <p>표시할 데이터가 없습니다.</p>
                </div>
              )}

              {/* 인쇄용 푸터 */}
              <div className="print-footer">
                <p>인쇄일시: {new Date().toLocaleString('ko-KR')}</p>
                <p>MJ 패킹리스트 관리 시스템 - 제품별 리스트</p>
              </div>
            </div>
          </div>
        </div>

        {/* 하단 안내 */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center gap-4">
              <span>📄 A4용지 기준 (210mm × 297mm)</span>
              <span>📊 총 {packingData ? packingData.length : 0}개 제품</span>
              {includeArrivalCost && (
                <span className="text-teal-600 font-medium">💰 도착원가 포함</span>
              )}
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

export default PackingCodeDetailPrint;
