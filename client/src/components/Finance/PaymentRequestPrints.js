import React, { useState } from 'react';
import { X, Printer, Download, Eye, DollarSign, Calendar, Package, Truck, Building, Tag, Percent, MapPin } from 'lucide-react';

const PaymentRequestPrints = ({ 
  isOpen, 
  onClose, 
  request, 
  detailData,
  selectedDate 
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
          <title>지급요청 목록 - ${selectedDate}</title>
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
            .section {
              margin-bottom: 30px;
              border: 2px solid #000;
              border-radius: 8px;
              overflow: hidden;
            }
            .section-header {
              padding: 12px 16px;
              font-weight: bold;
              font-size: 14px;
              color: white;
            }
            .section-header.advance {
              background-color: #dc2626;
            }
            .section-header.balance {
              background-color: #2563eb;
            }
            .section-header.shipping {
              background-color: #ea580c;
            }
            .section-content {
              background-color: white;
            }
            .print-table {
              width: 100%;
              border-collapse: collapse;
              margin: 0;
            }
            .print-table th,
            .print-table td {
              border: 1px solid #000;
              padding: 8px;
              text-align: left;
              vertical-align: top;
            }
            .print-table th {
              background-color: #f8f9fa;
              font-weight: bold;
              text-align: center;
              border-bottom: 2px solid #000;
            }
            .print-table tbody tr {
              border-bottom: 1px solid #000;
            }
            .print-table tbody tr:nth-child(even) {
              background-color: #f9f9f9;
            }
            .print-table .image-col {
              width: 15%;
              text-align: center;
            }
            .print-table .product-col {
              width: 25%;
            }
            .print-table .quantity-col {
              width: 10%;
              text-align: center;
            }
            .print-table .price-col {
              width: 15%;
              text-align: right;
            }
            .print-table .amount-col {
              width: 15%;
              text-align: right;
            }
            .print-table .date-col {
              width: 15%;
              text-align: center;
            }
            .print-table .fee-col {
              width: 10%;
              text-align: center;
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
            }
            .product-name {
              font-weight: bold;
              margin-bottom: 5px;
            }
            .product-id {
              font-size: 10px;
              color: #666;
            }
            .amount {
              font-weight: bold;
            }
            .amount.advance {
              color: #dc2626;
            }
            .amount.balance {
              color: #2563eb;
            }
            .amount.shipping {
              color: #ea580c;
            }
            .no-data {
              text-align: center;
              padding: 40px;
              color: #666;
              font-style: italic;
            }
            .print-footer {
              margin-top: 30px;
              text-align: center;
              font-size: 10px;
              color: #666;
              border-top: 1px solid #dee2e6;
              padding-top: 10px;
            }
            @media print {
              .no-print {
                display: none !important;
              }
              .print-table {
                border-collapse: collapse !important;
              }
              .print-table th,
              .print-table td {
                border: 1px solid #000 !important;
                -webkit-print-color-adjust: exact !important;
                color-adjust: exact !important;
              }
              .print-table th {
                background-color: #f8f9fa !important;
                -webkit-print-color-adjust: exact !important;
                color-adjust: exact !important;
              }
              .section {
                border: 2px solid #000 !important;
                -webkit-print-color-adjust: exact !important;
                color-adjust: exact !important;
              }
              .section-header.advance {
                background-color: #dc2626 !important;
                -webkit-print-color-adjust: exact !important;
                color-adjust: exact !important;
              }
              .section-header.balance {
                background-color: #2563eb !important;
                -webkit-print-color-adjust: exact !important;
                color-adjust: exact !important;
              }
              .section-header.shipping {
                background-color: #ea580c !important;
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

  const advanceData = detailData?.advance || [];
  const balanceData = detailData?.balance || [];
  const shippingData = detailData?.shipping || [];

  const totalAdvanceAmount = Number(request?.advance?.total_amount || 0);
  const totalBalanceAmount = Number(request?.balance?.total_amount || 0);
  const totalShippingAmount = Number(request?.shipping?.total_amount || 0);
  const totalAmount = totalAdvanceAmount + totalBalanceAmount + totalShippingAmount;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">지급요청 목록 인쇄 미리보기</h2>
            <p className="text-sm text-gray-600">
              {selectedDate} - A4용지 기준 미리보기
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
                <div className="print-title">지급요청 목록</div>
                <div className="print-subtitle">
                  요청일자: {selectedDate}
                </div>
              </div>

              {/* 요약 정보 */}
              <div className="print-summary">
                <div className="summary-item">
                  <div className="summary-label">선금 요청</div>
                  <div className="summary-value">
                    {Number(request?.advance?.count || 0)}건
                    {totalAdvanceAmount > 0 && ` (¥${totalAdvanceAmount.toLocaleString()})`}
                  </div>
                </div>
                <div className="summary-item">
                  <div className="summary-label">잔금 요청</div>
                  <div className="summary-value">
                    {Number(request?.balance?.count || 0)}건
                    {totalBalanceAmount > 0 && ` (¥${totalBalanceAmount.toLocaleString()})`}
                  </div>
                </div>
                <div className="summary-item">
                  <div className="summary-label">배송비 요청</div>
                  <div className="summary-value">
                    {Number(request?.shipping?.count || 0)}건
                    {totalShippingAmount > 0 && ` (¥${totalShippingAmount.toLocaleString()})`}
                  </div>
                </div>
                <div className="summary-item">
                  <div className="summary-label">총 요청 금액</div>
                  <div className="summary-value">¥{totalAmount.toLocaleString()}</div>
                </div>
              </div>

              {/* 선금 지급 요청 섹션 */}
              {request?.advance && (
                <div className="section">
                  <div className="section-header advance">
                    💰 선금 지급 요청 ({Number(request.advance.count || 0)}건)
                  </div>
                  <div className="section-content">
                    {advanceData.length > 0 ? (
                      <table className="print-table">
                        <thead>
                          <tr>
                            <th className="image-col">제품사진</th>
                            <th className="product-col">프로젝트명</th>
                            <th className="quantity-col">수량</th>
                            <th className="price-col">단가</th>
                            <th className="amount-col">선금 금액</th>
                            <th className="date-col">등록일</th>
                          </tr>
                        </thead>
                        <tbody>
                          {advanceData.map((payment, index) => (
                            <tr key={payment.id || index}>
                              <td className="image-col">
                                {payment.representative_image ? (
                                  <img
                                    src={`/api/warehouse/image/${payment.representative_image}`}
                                    alt={payment.project_name}
                                    className="product-image"
                                    onError={(e) => {
                                      e.target.style.display = 'none';
                                    }}
                                  />
                                ) : (
                                  <div className="product-image-placeholder">
                                    📦
                                  </div>
                                )}
                              </td>
                              <td className="product-col">
                                <div className="product-name">{payment.project_name || '프로젝트명 없음'}</div>
                                <div className="product-id">ID: {payment.project_id}</div>
                              </td>
                              <td className="quantity-col">{payment.quantity || 0}개</td>
                              <td className="price-col">¥{Number(payment.unit_price || 0).toLocaleString()}</td>
                              <td className="amount-col">
                                <span className="amount advance">¥{Number(payment.amount || 0).toLocaleString()}</span>
                              </td>
                              <td className="date-col">
                                {payment.created_at ? new Date(payment.created_at).toLocaleDateString('ko-KR') : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="no-data">선금 지급 예정 항목이 없습니다.</div>
                    )}
                  </div>
                </div>
              )}

              {/* 잔금 지급 요청 섹션 */}
              {request?.balance && (
                <div className="section">
                  <div className="section-header balance">
                    💳 잔금 지급 요청 ({Number(request.balance.count || 0)}건)
                  </div>
                  <div className="section-content">
                    {balanceData.length > 0 ? (
                      <table className="print-table">
                        <thead>
                          <tr>
                            <th className="image-col">제품사진</th>
                            <th className="product-col">프로젝트명</th>
                            <th className="quantity-col">수량</th>
                            <th className="price-col">단가</th>
                            <th className="fee-col">수수료율</th>
                            <th className="amount-col">잔금 금액</th>
                            <th className="date-col">등록일</th>
                          </tr>
                        </thead>
                        <tbody>
                          {balanceData.map((payment, index) => (
                            <tr key={payment.id || index}>
                              <td className="image-col">
                                {payment.representative_image ? (
                                  <img
                                    src={`/api/warehouse/image/${payment.representative_image}`}
                                    alt={payment.project_name}
                                    className="product-image"
                                    onError={(e) => {
                                      e.target.style.display = 'none';
                                    }}
                                  />
                                ) : (
                                  <div className="product-image-placeholder">
                                    📦
                                  </div>
                                )}
                              </td>
                              <td className="product-col">
                                <div className="product-name">{payment.project_name || '프로젝트명 없음'}</div>
                                <div className="product-id">ID: {payment.project_id}</div>
                              </td>
                              <td className="quantity-col">{payment.quantity || 0}개</td>
                              <td className="price-col">¥{Number(payment.unit_price || 0).toLocaleString()}</td>
                              <td className="fee-col">{payment.fee_rate ? `${payment.fee_rate}%` : '-'}</td>
                              <td className="amount-col">
                                <span className="amount balance">¥{Number(payment.amount || 0).toLocaleString()}</span>
                              </td>
                              <td className="date-col">
                                {payment.created_at ? new Date(payment.created_at).toLocaleDateString('ko-KR') : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="no-data">잔금 지급 예정 항목이 없습니다.</div>
                    )}
                  </div>
                </div>
              )}

              {/* 배송비 지급 요청 섹션 */}
              {request?.shipping && (
                <div className="section">
                  <div className="section-header shipping">
                    🚚 배송비 지급 요청 ({Number(request.shipping.count || 0)}건)
                  </div>
                  <div className="section-content">
                    {shippingData.length > 0 ? (
                      <table className="print-table">
                        <thead>
                          <tr>
                            <th className="date-col">출고일</th>
                            <th className="quantity-col">박스 수</th>
                            <th className="amount-col">총 배송비</th>
                            <th className="product-col">포장코드</th>
                            <th className="product-col">물류회사</th>
                          </tr>
                        </thead>
                        <tbody>
                          {shippingData.map((payment, index) => (
                            <tr key={payment.id || index}>
                              <td className="date-col">{payment.pl_date || '미정'}</td>
                              <td className="quantity-col">{payment.total_boxes || 0}박스</td>
                              <td className="amount-col">
                                <span className="amount shipping">¥{Number(payment.total_amount || 0).toLocaleString()}</span>
                              </td>
                              <td className="product-col">{payment.packing_codes || '-'}</td>
                              <td className="product-col">{payment.logistic_companies || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="no-data">배송비 지급 예정 항목이 없습니다.</div>
                    )}
                  </div>
                </div>
              )}

              {/* 인쇄용 푸터 */}
              <div className="print-footer">
                <p>인쇄일시: {new Date().toLocaleString('ko-KR')}</p>
                <p>MJ 지급요청 관리 시스템</p>
              </div>
            </div>
          </div>
        </div>

        {/* 하단 안내 */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center gap-4">
              <span>📄 A4용지 기준 (210mm × 297mm)</span>
              <span>💰 총 요청 금액: ¥{Number(totalAmount).toLocaleString()}</span>
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

export default PaymentRequestPrints;
