import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  FileText, 
  Plus, 
  Search, 
  Filter, 
  Eye, 
  Printer, 
  Download, 
  Trash2, 
  X, 
  CheckCircle, 
  AlertCircle, 
  ArrowLeft,
  Calendar,
  User,
  Activity,
  Award,
  Users,
  ShieldCheck,
  Building
} from 'lucide-react';
import { tcApi, TransferCertificate } from '../../api/tcApi';
import { Student } from '../../types';
import { exportToExcel, exportToPrintablePDF } from '../../utils/exportUtils';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import { SchoolLogo } from '../../components/common/SchoolLogo';
import { formatDate } from '../../utils/dateFormatter';

interface TransferCertificatesProps {
  students: Student[];
  refreshTrigger: number;
  triggerDataRefresh: () => void;
}

export const TransferCertificates: React.FC<TransferCertificatesProps> = ({
  students = [],
  refreshTrigger,
  triggerDataRefresh
}) => {
  // Core Data State
  const [tcs, setTcs] = useState<TransferCertificate[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filter States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [yearFilter, setYearFilter] = useState<string>('All');
  const [classFilter, setClassFilter] = useState<string>('All');

  // Modal / Screen States
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState<boolean>(false);
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState<boolean>(false);
  const [selectedTC, setSelectedTC] = useState<TransferCertificate | null>(null);
  const [viewingTC, setViewingTC] = useState<TransferCertificate | null>(null);

  // Form States for Generate TC
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [formReason, setFormReason] = useState<string>('Transfer');
  const [formLastAttendance, setFormLastAttendance] = useState<string>(new Date().toISOString().split('T')[0]);
  const [formConduct, setFormConduct] = useState<string>('Excellent');
  const [formPromotedTo, setFormPromotedTo] = useState<string>('Class 11');
  const [formRemarks, setFormRemarks] = useState<string>('');
  const [formIssuedBy, setFormIssuedBy] = useState<string>('Principal');

  // Custom Alert/Toast states
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Standard lists for dropdowns
  const reasonsList = ['Transfer', 'Parent Request', 'Migration', 'Higher Education', 'Others'];
  const conductList = ['Excellent', 'Very Good', 'Good', 'Average'];
  
  const classesList = [
    'Nursery', 'LKG', 'UKG', 'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 
    'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12'
  ];

  // Load all Transfer Certificates
  const fetchTCs = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await tcApi.getAllTCs();
      setTcs(data);
    } catch (err: any) {
      console.error('Failed to load TCs:', err);
      setError('Unable to load transfer certificates.');
      showToast('error', 'Unable to load transfer certificates.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTCs();
  }, [refreshTrigger]);

  // Utility to show temporary toast messages
  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast(null);
    }, 5000);
  };

  // Derived selected student details
  const selectedStudentDetails = useMemo(() => {
    if (!selectedStudentId) return null;
    return students.find(s => s.id === selectedStudentId) || null;
  }, [selectedStudentId, students]);

  // Handle Form Submission
  const handleGenerateTC = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || !selectedStudentDetails) {
      showToast('error', 'Student not found');
      return;
    }

    try {
      const payload = {
        studentId: selectedStudentDetails.id,
        name: selectedStudentDetails.name,
        admissionNo: selectedStudentDetails.admissionNo || 'ADM-2026-' + Math.floor(1000 + Math.random() * 9000),
        fatherName: selectedStudentDetails.fatherName || 'Not Specified',
        motherName: selectedStudentDetails.motherName || 'Not Specified',
        className: selectedStudentDetails.class || 'General',
        section: selectedStudentDetails.section || 'A',
        joiningDate: '2024-04-10', // Default / Fallback joining date
        category: 'General', // Fallback
        reason: formReason,
        lastAttendanceDate: formLastAttendance,
        conduct: formConduct,
        promotedTo: formPromotedTo,
        remarks: formRemarks,
        issuedBy: formIssuedBy
      };

      const newTC = await tcApi.generateTC(payload);
      showToast('success', 'Transfer Certificate Generated Successfully');
      setIsGenerateModalOpen(false);
      
      // Reset Form fields
      setSelectedStudentId('');
      setFormReason('Transfer');
      setFormLastAttendance(new Date().toISOString().split('T')[0]);
      setFormConduct('Excellent');
      setFormPromotedTo('Class 11');
      setFormRemarks('');
      setFormIssuedBy('Principal');

      triggerDataRefresh();
      fetchTCs();
    } catch (err: any) {
      console.error('Failed to generate TC:', err);
      if (err.message && err.message.includes('already exists')) {
        showToast('error', 'TC already exists');
      } else {
        showToast('error', 'Unable to generate TC');
      }
    }
  };

  // Handle Cancel TC confirmation
  const handleCancelTC = async () => {
    if (!selectedTC) return;
    try {
      await tcApi.cancelTC(selectedTC.id);
      showToast('success', 'Transfer Certificate Cancelled');
      setIsCancelConfirmOpen(false);
      setSelectedTC(null);
      
      // If we are currently viewing the certificate, update its state
      if (viewingTC && viewingTC.id === selectedTC.id) {
        setViewingTC(prev => prev ? { ...prev, status: 'Cancelled' } : null);
      }

      triggerDataRefresh();
      fetchTCs();
    } catch (err: any) {
      console.error('Failed to cancel TC:', err);
      showToast('error', 'Failed to cancel Transfer Certificate');
    }
  };

  // Statistics Computations
  const stats = useMemo(() => {
    const total = tcs.length;
    const issued = tcs.filter(tc => tc.status === 'Issued').length;
    const cancelled = tcs.filter(tc => tc.status === 'Cancelled').length;
    
    // Calculated for the current month
    const currentMonthStr = new Date().toISOString().substring(0, 7); // "2026-07"
    const thisMonth = tcs.filter(tc => tc.issueDate.startsWith(currentMonthStr) && tc.status === 'Issued').length;

    return { total, issued, cancelled, thisMonth };
  }, [tcs]);

  // Filtering Logic
const filteredTCs = useMemo(() => {
  return tcs.filter((tc) => {
    const search = searchQuery.toLowerCase();

    const matchesSearch =
      (tc.studentName ?? "").toLowerCase().includes(search) ||
      (tc.admissionNo ?? "").toLowerCase().includes(search) ||
      (tc.tcNumber ?? "").toLowerCase().includes(search);

    const matchesStatus =
      statusFilter === "All" || tc.status === statusFilter;

    const matchesYear =
      yearFilter === "All" ||
      (tc.issueDate ?? "").startsWith(yearFilter);

    const matchesClass =
      classFilter === "All" ||
      (tc.classLeaving ?? "")
        .toLowerCase()
        .includes(classFilter.toLowerCase());

    return (
      matchesSearch &&
      matchesStatus &&
      matchesYear &&
      matchesClass
    );
  });
}, [tcs, searchQuery, statusFilter, yearFilter, classFilter]);
  // Export to Excel handler
  const handleExportExcel = () => {
    const headers = ['TC Number', 'Student Name', 'Admission No', 'Class', 'Issue Date', 'Reason', 'Status'];
    const keys = ['tcNumber', 'name', 'admissionNo', 'className', 'issueDate', 'reason', 'status'];
    const formattedData = filteredTCs.map(tc => ({
      ...tc,
      issueDate: formatDate(tc.issueDate)
    }));
    exportToExcel(formattedData, headers, keys, `Transfer_Certificates_${new Date().toISOString().split('T')[0]}`);
  };

  // Export to PDF handler
  const handleExportPDF = () => {
    const headers = ['TC Number', 'Student Name', 'Admission No', 'Class', 'Issue Date', 'Reason', 'Status'];
    const rows = filteredTCs.map(tc => [
      tc.tcNumber,
      tc.studentName,
      tc.admissionNo,
      tc.classLeaving,
      formatDate(tc.issueDate),
      tc.reason,
      tc.status
    ]);
    exportToPrintablePDF('Transfer Certificates Registry', headers, rows, 'transfer_certificates_report');
  };

  // Standalone Certificate Print function
  const printCertificateDirectly = (tc: TransferCertificate) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to print the Transfer Certificate.');
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Transfer Certificate - ${tc.tcNumber}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700;800&family=Inter:wght@400;500;600;700&display=swap');
            body {
              font-family: 'Inter', sans-serif;
              color: #1e293b;
              padding: 40px;
              margin: 0;
              background-color: #ffffff;
            }
            .certificate-border {
              border: 12px double #1e293b;
              padding: 40px;
              position: relative;
              background-color: #fff;
              box-sizing: border-box;
              min-height: 800px;
            }
            .certificate-cancelled-watermark {
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%) rotate(-30deg);
              font-size: 80px;
              font-weight: 950;
              color: rgba(239, 68, 68, 0.12);
              text-transform: uppercase;
              letter-spacing: 15px;
              pointer-events: none;
              user-select: none;
              border: 15px solid rgba(239, 68, 68, 0.12);
              padding: 10px 30px;
              border-radius: 20px;
              z-index: 5;
            }
            .header-block {
              text-align: center;
              border-bottom: 2px solid #0f172a;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .school-name {
              font-family: 'Cinzel', serif;
              font-size: 26px;
              font-weight: 800;
              margin: 0;
              color: #0f172a;
              letter-spacing: 1px;
            }
            .school-sub {
              font-size: 11px;
              font-weight: bold;
              color: #64748b;
              text-transform: uppercase;
              letter-spacing: 2px;
              margin-top: 5px;
            }
            .doc-title {
              font-family: 'Cinzel', serif;
              font-size: 18px;
              font-weight: 700;
              border: 2px solid #0f172a;
              display: inline-block;
              padding: 6px 20px;
              margin-top: 20px;
              background-color: #f8fafc;
              letter-spacing: 3px;
              text-transform: uppercase;
            }
            .top-meta-row {
              display: flex;
              justify-content: space-between;
              font-size: 12px;
              font-weight: bold;
              color: #475569;
              margin-bottom: 35px;
              padding: 0 10px;
            }
            .grid-list {
              display: grid;
              grid-template-columns: 1fr;
              gap: 16px;
              margin-bottom: 60px;
            }
            .grid-row {
              display: flex;
              border-bottom: 1px dotted #cbd5e1;
              padding-bottom: 4px;
              font-size: 13px;
              line-height: 1.6;
            }
            .field-lbl {
              width: 250px;
              color: #475569;
              font-weight: 600;
              text-transform: uppercase;
              font-size: 11px;
              letter-spacing: 0.5px;
            }
            .field-val {
              flex: 1;
              color: #0f172a;
              font-weight: bold;
            }
            .signatures-block {
              display: flex;
              justify-content: space-between;
              margin-top: 80px;
              padding: 0 20px;
            }
            .sig-box {
              text-align: center;
              width: 180px;
            }
            .sig-line {
              border-top: 1.5px solid #475569;
              margin-bottom: 8px;
            }
            .sig-lbl {
              font-size: 11px;
              font-weight: bold;
              text-transform: uppercase;
              color: #64748b;
              letter-spacing: 1px;
            }
            .seal-box {
              border: 2px dashed #94a3b8;
              border-radius: 50%;
              width: 90px;
              height: 90px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 9px;
              font-weight: bold;
              color: #94a3b8;
              text-transform: uppercase;
              margin: 0 auto;
              line-height: 1.2;
            }
            .print-btn {
              position: fixed;
              bottom: 30px;
              right: 30px;
              background-color: #0f172a;
              color: white;
              border: none;
              padding: 12px 24px;
              font-size: 12px;
              font-weight: bold;
              border-radius: 30px;
              cursor: pointer;
              box-shadow: 0 4px 12px rgba(0,0,0,0.15);
              transition: all 0.2s;
              z-index: 100;
            }
            .print-btn:hover {
              background-color: #1e293b;
              transform: translateY(-2px);
            }
            @media print {
              .no-print { display: none !important; }
              body { padding: 0; }
              .certificate-border { border: 10px double #000; min-height: 95vh; }
            }
          </style>
        </head>
        <body>
          <button class="print-btn no-print" onclick="window.print()">
            Print Document / Save as PDF
          </button>

          <div class="certificate-border">
            ${tc.status === 'Cancelled' ? `<div class="certificate-cancelled-watermark">CANCELLED</div>` : ''}

            <div class="header-block">
              <h1 class="school-name">THE SCHOOL OF PANSY FLOWERS</h1>
              <div class="school-sub">Affiliated to Academic School Board • Changotola, Balaghat</div>
              <div><span class="doc-title">Transfer Certificate</span></div>
            </div>

            <div class="top-meta-row">
              <span>TC Number: <strong>${tc.tcNumber}</strong></span>
              <span>Issue Date: <strong>${formatDate(tc.issueDate)}</strong></span>
            </div>

            <div class="grid-list">
              <div class="grid-row">
                <span class="field-lbl">1. Name of Student:</span>
                <span class="field-val">${tc.studentName}</span>
              </div>
              <div class="grid-row">
                <span class="field-lbl">2. Admission Number:</span>
                <span class="field-val">${tc.admissionNo}</span>
              </div>
              <div class="grid-row">
                <span class="field-lbl">3. Father's / Guardian's Name:</span>
                <span class="field-val">${tc.fatherName}</span>
              </div>
              <div class="grid-row">
                <span class="field-lbl">4. Mother's Name:</span>
                <span class="field-val">${tc.motherName}</span>
              </div>
              <div class="grid-row">
                <span class="field-lbl">5. Student Category:</span>
                <span class="field-val">${tc.category}</span>
              </div>
              <div class="grid-row">
                <span class="field-lbl">6. Class & Section:</span>
                <span class="field-val">${tc.classLeaving} - Section ${tc.section}</span>
              </div>
              <div class="grid-row">
                <span class="field-lbl">7. Admission Date in School:</span>
                <span class="field-val">${formatDate(tc.joiningDate)}</span>
              </div>
              <div class="grid-row">
                <span class="field-lbl">8. Last Attendance Date:</span>
                <span class="field-val">${formatDate(tc.lastAttendanceDate)}</span>
              </div>
              <div class="grid-row">
                <span class="field-lbl">9. Reason for leaving school:</span>
                <span class="field-val">${tc.reason}</span>
              </div>
              <div class="grid-row">
                <span class="field-lbl">10. General Conduct:</span>
                <span class="field-val">${tc.conduct}</span>
              </div>
              <div class="grid-row">
                <span class="field-lbl">11. Promoted to Class:</span>
                <span class="field-val">${tc.promotedTo}</span>
              </div>
              <div class="grid-row flex-col border-b-0 pb-0">
                <span class="field-lbl mb-2">12. Any Specific Remarks:</span>
                <span class="field-val" style="font-weight: normal; font-style: italic; color: #475569;">
                  ${tc.remarks || 'No specific remarks reported.'}
                </span>
              </div>
            </div>

            <div class="signatures-block">
              <div class="sig-box">
                <div class="sig-line"></div>
                <span class="sig-lbl">Prepared By</span>
              </div>
              <div class="sig-box" style="margin-top: -15px;">
                <div class="seal-box">School<br>Seal</div>
              </div>
              <div class="sig-box">
                <div class="sig-line"></div>
                <span class="sig-lbl">Principal Signature</span>
              </div>
            </div>

          </div>

          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 500);
            }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // Download High-Fidelity Certificate HTML / Text File
  const downloadCertificateText = (tc: TransferCertificate) => {
    const textContent = `
================================================================================
                    THE SCHOOL OF PANSY FLOWERS
             Changotola, Balaghat, Madhya Pradesh, India
                        TRANSFER CERTIFICATE
================================================================================
TC Number    : ${tc.tcNumber}                          Issue Date: ${formatDate(tc.issueDate)}
================================================================================
1. Name of Student                : ${tc.studentName}
2. Admission Number               : ${tc.admissionNo}
3. Father's / Guardian's Name     : ${tc.fatherName}
4. Mother's Name                  : ${tc.motherName}
5. Student Category               : ${tc.category}
6. Class & Section                : ${tc.classLeaving} - ${tc.section}
7. Date of Admission in School    : ${formatDate(tc.joiningDate)}
8. Last Attendance Date           : ${formatDate(tc.lastAttendanceDate)}
9. Reason for Leaving School      : ${tc.reason}
10. General Conduct               : ${tc.conduct}
11. Promoted to Class             : ${tc.promotedTo}
12. Specific Remarks              : ${tc.remarks || 'N/A'}
================================================================================
Status: ${tc.status.toUpperCase()}
Issued By: ${tc.issuedBy}

This is a computer-generated transfer certificate. Verified under school record entries.
================================================================================
    `.trim();

    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${tc.tcNumber}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // If viewing a certificate, render the beautiful "View TC Page" full layout!
  if (viewingTC) {
    return (
      <div className="space-y-6 animate-fadeIn select-none print:bg-white print:p-0">
        
        {/* View Header with back buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100 select-none print:hidden">
          <button 
            onClick={() => setViewingTC(null)}
            className="inline-flex items-center gap-2 text-xs font-extrabold text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft size={14} />
            <span>BACK TO REGISTRY</span>
          </button>
          
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => printCertificateDirectly(viewingTC)}
              disabled={viewingTC.status === 'Cancelled'}
              className={`inline-flex items-center gap-1.5 px-3 py-2 border rounded-lg text-xs font-bold transition-all select-none active:scale-95 shadow-2xs cursor-pointer
                ${viewingTC.status === 'Cancelled' 
                  ? 'bg-slate-50 text-slate-400 border-slate-150 cursor-not-allowed opacity-60' 
                  : 'bg-white text-slate-600 hover:text-slate-800 border-slate-200 hover:border-slate-300'
                }
              `}
            >
              <Printer size={13} className="text-blue-500" />
              <span>Print Slip</span>
            </button>

            <button
              onClick={() => downloadCertificateText(viewingTC)}
              disabled={viewingTC.status === 'Cancelled'}
              className={`inline-flex items-center gap-1.5 px-3 py-2 border rounded-lg text-xs font-bold transition-all select-none active:scale-95 shadow-2xs cursor-pointer
                ${viewingTC.status === 'Cancelled' 
                  ? 'bg-slate-50 text-slate-400 border-slate-150 cursor-not-allowed opacity-60' 
                  : 'bg-white text-slate-600 hover:text-slate-800 border-slate-200 hover:border-slate-300'
                }
              `}
            >
              <Download size={13} className="text-emerald-500" />
              <span>Download PDF (Text)</span>
            </button>

            {viewingTC.status === 'Issued' && (
              <button
                onClick={() => {
                  setSelectedTC(viewingTC);
                  setIsCancelConfirmOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-red-50 hover:bg-red-100 border border-red-200/50 rounded-lg text-xs font-bold text-red-650 hover:text-red-800 transition-all select-none active:scale-95 shadow-2xs cursor-pointer"
              >
                <Trash2 size={13} />
                <span>Cancel TC</span>
              </button>
            )}
          </div>
        </div>

        {/* Certificate Display Screen */}
        <div className="max-w-3xl mx-auto bg-white border border-slate-150 rounded-2xl shadow-md p-6 sm:p-12 md:p-16 relative overflow-hidden print:border-none print:shadow-none print:p-0">
          
          {/* Diagonal Cancelled Watermark */}
          {viewingTC.status === 'Cancelled' && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-[35deg] font-black text-6xl sm:text-8xl text-red-650/10 tracking-widest uppercase border-8 border-red-650/10 p-4 sm:p-8 rounded-3xl pointer-events-none select-none z-10">
              CANCELLED
            </div>
          )}

          {/* Certificate Board Frame double border */}
          <div className="border-4 border-slate-900 p-4 sm:p-8 rounded-xl relative">
            <div className="border border-slate-300 p-4 sm:p-8 rounded-lg space-y-8">
              
              {/* Header */}
              <div className="text-center space-y-2 border-b-2 border-slate-950 pb-6">
                <div className="flex justify-center mb-2">
                  <SchoolLogo size={60} />
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-serif uppercase">
                  THE SCHOOL OF PANSY FLOWERS
                </h2>
                <p className="text-[10px] sm:text-xs text-slate-450 uppercase tracking-widest font-extrabold">
                  Affiliated Academic Institution • Changotola, Balaghat, MP, India
                </p>
                <div className="pt-2">
                  <span className="inline-block border-2 border-slate-950 bg-slate-50 px-5 py-1 text-xs font-bold uppercase tracking-widest text-slate-800">
                    TRANSFER CERTIFICATE
                  </span>
                </div>
              </div>

              {/* Meta row */}
              <div className="flex flex-col sm:flex-row sm:justify-between gap-2 text-xs font-extrabold text-slate-500 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-1.5">
                  <span>Certificate No:</span>
                  <span className="text-blue-600 font-black font-mono">{viewingTC.tcNumber}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span>Issue Date:</span>
                  <span className="text-slate-800">{formatDate(viewingTC.issueDate)}</span>
                </div>
              </div>

              {/* Core Details Content list */}
              <div className="space-y-4 text-xs sm:text-sm font-bold text-slate-700 leading-relaxed">
                
                <div className="flex flex-col sm:flex-row sm:items-center border-b border-dashed border-slate-100 pb-2.5">
                  <span className="sm:w-60 text-[10px] text-slate-400 uppercase tracking-wider">1. Name of Student:</span>
                  <span className="text-slate-900 font-extrabold uppercase">{viewingTC.studentName}</span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center border-b border-dashed border-slate-100 pb-2.5">
                  <span className="sm:w-60 text-[10px] text-slate-400 uppercase tracking-wider">2. Admission Number:</span>
                  <span className="text-slate-900 font-mono font-black">{viewingTC.admissionNo}</span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center border-b border-dashed border-slate-100 pb-2.5">
                  <span className="sm:w-60 text-[10px] text-slate-400 uppercase tracking-wider">3. Father's / Guardian's Name:</span>
                  <span className="text-slate-900 uppercase">{viewingTC.fatherName}</span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center border-b border-dashed border-slate-100 pb-2.5">
                  <span className="sm:w-60 text-[10px] text-slate-400 uppercase tracking-wider">4. Mother's Name:</span>
                  <span className="text-slate-900 uppercase">{viewingTC.motherName}</span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center border-b border-dashed border-slate-100 pb-2.5">
                  <span className="sm:w-60 text-[10px] text-slate-400 uppercase tracking-wider">5. Student Category:</span>
                  <span className="text-slate-900">{viewingTC.category}</span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center border-b border-dashed border-slate-100 pb-2.5">
                  <span className="sm:w-60 text-[10px] text-slate-400 uppercase tracking-wider">6. Academic Class & Section:</span>
                  <span className="text-slate-900">{viewingTC.classLeaving} - Section {viewingTC.section}</span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center border-b border-dashed border-slate-100 pb-2.5">
                  <span className="sm:w-60 text-[10px] text-slate-400 uppercase tracking-wider">7. Admission Date in School:</span>
                  <span className="text-slate-800">{formatDate(viewingTC.joiningDate)}</span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center border-b border-dashed border-slate-100 pb-2.5">
                  <span className="sm:w-60 text-[10px] text-slate-400 uppercase tracking-wider">8. Last Attendance Date:</span>
                  <span className="text-slate-800">{formatDate(viewingTC.lastAttendanceDate)}</span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center border-b border-dashed border-slate-100 pb-2.5">
                  <span className="sm:w-60 text-[10px] text-slate-400 uppercase tracking-wider">9. Reason for leaving school:</span>
                  <span className="text-slate-900">{viewingTC.reason}</span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center border-b border-dashed border-slate-100 pb-2.5">
                  <span className="sm:w-60 text-[10px] text-slate-400 uppercase tracking-wider">10. General Conduct:</span>
                  <span className="text-slate-900 font-extrabold">{viewingTC.conduct}</span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center border-b border-dashed border-slate-100 pb-2.5">
                  <span className="sm:w-60 text-[10px] text-slate-400 uppercase tracking-wider">11. Promoted to Class:</span>
                  <span className="text-slate-900 font-extrabold">{viewingTC.promotedTo}</span>
                </div>

                <div className="flex flex-col pt-2">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider mb-1.5">12. Specific Remarks:</span>
                  <span className="text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-100 font-medium italic">
                    {viewingTC.remarks || 'No specific remarks filed.'}
                  </span>
                </div>

              </div>

              {/* Signatures and seals */}
              <div className="flex justify-between items-end pt-12 text-[10px] uppercase font-black tracking-wider text-slate-400">
                <div className="text-center w-36">
                  <div className="border-t border-slate-300 pt-2 text-slate-600">Prepared By</div>
                </div>
                <div className="text-center">
                  <div className="h-16 w-16 border-2 border-dashed border-slate-200 rounded-full flex items-center justify-center text-[8px] font-bold text-slate-300">
                    SCHOOL SEAL
                  </div>
                </div>
                <div className="text-center w-36">
                  <div className="border-t border-slate-300 pt-2 text-slate-600">Principal Signature</div>
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* Cancel Confirmation Modal */}
        {isCancelConfirmOpen && (
          <Modal
            isOpen={isCancelConfirmOpen}
            onClose={() => setIsCancelConfirmOpen(false)}
            title="Cancel Transfer Certificate"
          >
            <div className="space-y-4 text-center py-4 select-none animate-fadeIn">
              <div className="p-3 bg-red-100 text-red-650 rounded-full w-14 h-14 mx-auto flex items-center justify-center">
                <AlertCircle size={30} />
              </div>
              <h3 className="text-base font-black text-slate-800">Are you sure?</h3>
              <p className="text-xs text-slate-505 leading-relaxed">
                This Transfer Certificate will be marked as <strong className="text-red-500">Cancelled</strong>. This action is permanent and will audit log historical changes.
              </p>
              <div className="flex gap-2.5 pt-2">
                <Button variant="outline" fullWidth onClick={() => setIsCancelConfirmOpen(false)}>
                  Cancel
                </Button>
                <Button variant="danger" fullWidth onClick={handleCancelTC}>
                  Confirm
                </Button>
              </div>
            </div>
          </Modal>
        )}

      </div>
    );
  }

  return (
    <div className="space-y-6 select-none animate-fadeIn">
      
      {/* Toast notifications */}
      {toast && (
        <div 
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4.5 py-3.5 rounded-xl shadow-lg border transition-all duration-300 animate-slideUp text-xs font-bold
            ${toast.type === 'success' 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
              : 'bg-red-50 border-red-200 text-red-800'
            }
          `}
        >
          {toast.type === 'success' ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* --- STATISTICS CARDS PANEL --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
        <Card className="p-5 border border-slate-100 hover:border-slate-200/80 transition-all shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Total Certificates</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{stats.total}</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl text-slate-500 border border-slate-100">
            <FileText size={18} />
          </div>
        </Card>

        <Card className="p-5 border border-slate-100 hover:border-slate-200/80 transition-all shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-600/80">Issued</p>
            <p className="text-2xl font-black text-emerald-950 mt-1">{stats.issued}</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
            <ShieldCheck size={18} />
          </div>
        </Card>

        <Card className="p-5 border border-slate-100 hover:border-slate-200/80 transition-all shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-red-600/80">Cancelled</p>
            <p className="text-2xl font-black text-red-950 mt-1">{stats.cancelled}</p>
          </div>
          <div className="p-3 bg-red-50 text-red-600 rounded-xl border border-red-100">
            <X size={18} />
          </div>
        </Card>

        <Card className="p-5 border border-slate-100 hover:border-slate-200/80 transition-all shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-blue-600/80">This Month</p>
            <p className="text-2xl font-black text-blue-950 mt-1">{stats.thisMonth}</p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
            <Activity size={18} />
          </div>
        </Card>
      </div>

      {/* --- TOP TOOLBAR SECTION --- */}
      <div className="flex flex-col lg:flex-row items-center gap-3.5 bg-white p-4 border border-slate-100 rounded-2xl shadow-2xs">
        
        {/* Search */}
        <div className="relative w-full lg:flex-1">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
            <Search size={14} />
          </span>
          <input
            type="text"
            placeholder="Search by Student Name, Admission No, TC No..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs font-bold pl-9.5 pr-4 py-2.5 bg-slate-50 hover:bg-slate-50/50 border border-slate-150 rounded-xl outline-none transition-colors focus:border-blue-500 focus:bg-white text-slate-700 shadow-2xs placeholder-slate-400"
          />
        </div>

        {/* Filters and Buttons Row */}
        <div className="flex flex-wrap items-center w-full lg:w-auto gap-2.5">
          
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs font-extrabold px-3.5 py-2.5 bg-white border border-slate-150 rounded-xl outline-none cursor-pointer focus:border-blue-500 text-slate-600 shadow-2xs"
          >
            <option value="All">All Statuses</option>
            <option value="Issued">Issued</option>
            <option value="Cancelled">Cancelled</option>
          </select>

          {/* Issue Year Filter */}
          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="text-xs font-extrabold px-3.5 py-2.5 bg-white border border-slate-150 rounded-xl outline-none cursor-pointer focus:border-blue-500 text-slate-600 shadow-2xs"
          >
            <option value="All">All Years</option>
            <option value="2026">2026</option>
            <option value="2025">2025</option>
            <option value="2024">2024</option>
          </select>

          {/* Class Filter */}
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="text-xs font-extrabold px-3.5 py-2.5 bg-white border border-slate-150 rounded-xl outline-none cursor-pointer focus:border-blue-500 text-slate-600 shadow-2xs"
          >
            <option value="All">All Classes</option>
            {classesList.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {/* Export and Actions */}
          <div className="h-6 w-px bg-slate-200 hidden sm:block" />

          <button
            onClick={handleExportExcel}
            title="Export filtered TCs to Excel"
            className="p-2.5 border border-slate-200 hover:border-slate-300 hover:bg-slate-55 bg-white rounded-xl text-slate-500 hover:text-slate-700 transition-colors select-none active:scale-95 cursor-pointer shadow-2xs flex items-center justify-center"
          >
            <Download size={14} className="text-emerald-500" />
          </button>

          <button
            onClick={handleExportPDF}
            title="Export filtered TCs registry PDF"
            className="p-2.5 border border-slate-200 hover:border-slate-300 hover:bg-slate-55 bg-white rounded-xl text-slate-500 hover:text-slate-700 transition-colors select-none active:scale-95 cursor-pointer shadow-2xs flex items-center justify-center"
          >
            <Printer size={14} className="text-indigo-500" />
          </button>

          <Button
            onClick={() => setIsGenerateModalOpen(true)}
            leftIcon={<Plus size={14} />}
          >
            Generate TC
          </Button>

        </div>
      </div>

      {/* --- TC TABLE OF RECORDS --- */}
      <Card className="overflow-hidden border border-slate-100 shadow-2xs">
        {loading ? (
          <div className="py-24 text-center space-y-3">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-3 border-blue-500 border-t-transparent" />
            <p className="text-xs text-slate-450 font-bold uppercase tracking-wider animate-pulse">Loading TCs...</p>
          </div>
        ) : filteredTCs.length === 0 ? (
          <div className="py-24 text-center space-y-4">
            <div className="p-3 bg-slate-50 text-slate-400 rounded-full w-14 h-14 mx-auto flex items-center justify-center border border-dashed border-slate-200">
              <FileText size={26} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-700 uppercase tracking-tight">No Transfer Certificates Found</h3>
              <p className="text-[11px] text-slate-400 font-semibold mt-1 max-w-sm mx-auto">
                No archived certificate logs match the specified query filters. Generate the first Transfer Certificate.
              </p>
            </div>
            <Button
              onClick={() => setIsGenerateModalOpen(true)}
              leftIcon={<Plus size={14} />}
              size="sm"
            >
              Generate TC
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-extrabold border-b border-slate-100 uppercase tracking-wider">
                  <th className="p-3.5 px-4">TC Number</th>
                  <th className="p-3.5">Student</th>
                  <th className="p-3.5">Admission No</th>
                  <th className="p-3.5">Class</th>
                  <th className="p-3.5">Issue Date</th>
                  <th className="p-3.5">Reason</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right px-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-slate-700 font-bold">
                {filteredTCs.map((tc) => (
                  <tr 
                    key={tc.id}
                    onClick={() => setViewingTC(tc)}
                    className="hover:bg-slate-50/70 transition-all cursor-pointer"
                  >
                    <td className="p-3.5 px-4 text-blue-600 font-black">{tc.tcNumber}</td>
                    <td className="p-3.5 text-slate-900 font-extrabold uppercase">{tc.studentName}</td>
                    <td className="p-3.5 text-slate-500 font-mono">{tc.admissionNo}</td>
                    <td className="p-3.5 text-slate-500">{tc.classLeaving}</td>
                    <td className="p-3.5 text-slate-550">{formatDate(tc.issueDate)}</td>
                    <td className="p-3.5 text-slate-450 font-medium">{tc.reason}</td>
                    <td className="p-3.5">
                      <Badge 
                        variant={tc.status === 'Issued' ? 'success' : 'danger'}
                        size="xs"
                      >
                        {tc.status}
                      </Badge>
                    </td>
                    <td className="p-3.5 text-right px-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setViewingTC(tc)}
                          title="View Certificate Profile"
                          className="p-1 px-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                        >
                          <Eye size={13} />
                        </button>
                        
                        <button
                          onClick={() => printCertificateDirectly(tc)}
                          disabled={tc.status === 'Cancelled'}
                          title={tc.status === 'Cancelled' ? 'Cannot print cancelled certificate' : 'Print Certificate'}
                          className={`p-1 px-1.5 rounded-lg transition-colors cursor-pointer
                            ${tc.status === 'Cancelled' 
                              ? 'text-slate-300 cursor-not-allowed' 
                              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                            }
                          `}
                        >
                          <Printer size={13} />
                        </button>

                        <button
                          onClick={() => downloadCertificateText(tc)}
                          disabled={tc.status === 'Cancelled'}
                          title={tc.status === 'Cancelled' ? 'Cannot download cancelled certificate' : 'Download Certificate Text'}
                          className={`p-1 px-1.5 rounded-lg transition-colors cursor-pointer
                            ${tc.status === 'Cancelled' 
                              ? 'text-slate-300 cursor-not-allowed' 
                              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                            }
                          `}
                        >
                          <Download size={13} />
                        </button>

                        {tc.status === 'Issued' ? (
                          <button
                            onClick={() => {
                              setSelectedTC(tc);
                              setIsCancelConfirmOpen(true);
                            }}
                            title="Cancel Certificate"
                            className="p-1 px-1.5 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer"
                          >
                            <X size={13} />
                          </button>
                        ) : (
                          <div className="w-6 h-6" /> // spacer
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* --- GENERATE TC MODAL --- */}
      {isGenerateModalOpen && (
        <Modal
          isOpen={isGenerateModalOpen}
          onClose={() => setIsGenerateModalOpen(false)}
          title="Generate Transfer Certificate"
        >
          <form onSubmit={handleGenerateTC} className="space-y-4 animate-fadeIn select-none text-xs font-bold text-slate-700">
            
            {/* Student Dropdown Selector */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400">Select Student</label>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                required
                className="w-full text-xs font-bold px-3 py-2.5 bg-slate-50 hover:bg-slate-50/80 border border-slate-150 rounded-xl outline-none cursor-pointer focus:border-blue-500 focus:bg-white text-slate-705 shadow-2xs"
              >
                <option value="">-- Choose Student Record --</option>
                {students.map(student => (
                  <option key={student.id} value={student.id}>
                    {student.name} ({student.class || 'N/A'} - {student.admissionNo || 'N/A'})
                  </option>
                ))}
              </select>
            </div>

            {/* Read-Only Auto-filled Section */}
            {selectedStudentDetails && (
              <div className="bg-slate-50 p-4.5 rounded-xl border border-slate-150/60 grid grid-cols-2 gap-3.5 text-[11px]">
                <div className="col-span-2 pb-1 border-b border-slate-150/40">
                  <p className="text-[9px] font-extrabold text-blue-600 tracking-wide uppercase">Student Information Profile</p>
                </div>
                
                <div>
                  <span className="text-slate-400">Admission No:</span>
                  <p className="text-slate-800 font-mono font-black mt-0.5">{selectedStudentDetails.admissionNo || 'N/A'}</p>
                </div>

                <div>
                  <span className="text-slate-400">Class & Section:</span>
                  <p className="text-slate-800 mt-0.5">{selectedStudentDetails.class || 'N/A'} - {selectedStudentDetails.section || 'A'}</p>
                </div>

                <div>
                  <span className="text-slate-400">Father's Name:</span>
                  <p className="text-slate-850 uppercase mt-0.5">{selectedStudentDetails.fatherName || 'Not Specified'}</p>
                </div>

                <div>
                  <span className="text-slate-400">Mother's Name:</span>
                  <p className="text-slate-850 uppercase mt-0.5">{selectedStudentDetails.motherName || 'Not Specified'}</p>
                </div>

                <div>
                  <span className="text-slate-400">Joining Date:</span>
                  <p className="text-slate-800 mt-0.5">2024-04-10</p>
                </div>

                <div>
                  <span className="text-slate-400">Category:</span>
                  <p className="text-slate-800 mt-0.5">General</p>
                </div>
              </div>
            )}

            {/* Editable Fields Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Reason */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400">Reason for leaving</label>
                <select
                  value={formReason}
                  onChange={(e) => setFormReason(e.target.value)}
                  className="w-full text-xs font-bold px-3 py-2 bg-white border border-slate-150 rounded-xl outline-none cursor-pointer focus:border-blue-500 text-slate-700 shadow-2xs"
                >
                  {reasonsList.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              {/* Last Attendance Date */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400">Last Attendance Date</label>
                <input
                  type="date"
                  value={formLastAttendance}
                  onChange={(e) => setFormLastAttendance(e.target.value)}
                  required
                  className="w-full text-xs font-bold px-3 py-1.5 bg-white border border-slate-150 rounded-xl outline-none focus:border-blue-500 text-slate-700 shadow-2xs"
                />
              </div>

              {/* General Conduct */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400">General Conduct</label>
                <select
                  value={formConduct}
                  onChange={(e) => setFormConduct(e.target.value)}
                  className="w-full text-xs font-bold px-3 py-2 bg-white border border-slate-150 rounded-xl outline-none cursor-pointer focus:border-blue-500 text-slate-700 shadow-2xs"
                >
                  {conductList.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Promoted To */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400">Promoted to Class</label>
                <select
                  value={formPromotedTo}
                  onChange={(e) => setFormPromotedTo(e.target.value)}
                  className="w-full text-xs font-bold px-3 py-2 bg-white border border-slate-150 rounded-xl outline-none cursor-pointer focus:border-blue-500 text-slate-700 shadow-2xs"
                >
                  {classesList.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                  <option value="None">None</option>
                </select>
              </div>

              {/* Issued By (ReadOnly placeholder / editable if needed) */}
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Input
                  label="ISSUED AUTHORITY"
                  value={formIssuedBy}
                  onChange={(e) => setFormIssuedBy(e.target.value)}
                  required
                  placeholder="Principal"
                />
              </div>

              {/* Remarks Textarea */}
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400">Remarks / Extra Notes</label>
                <textarea
                  value={formRemarks}
                  onChange={(e) => setFormRemarks(e.target.value)}
                  rows={3}
                  placeholder="E.g. A well-behaved, disciplined and bright student throughout the academic session."
                  className="w-full text-xs font-semibold px-3.5 py-2.5 bg-white border border-slate-150 rounded-xl outline-none focus:border-blue-500 text-slate-700 shadow-2xs placeholder-slate-400 resize-none"
                />
              </div>

            </div>

            {/* Action buttons */}
            <div className="flex gap-2.5 pt-3 select-none">
              <Button
                variant="outline"
                fullWidth
                onClick={() => setIsGenerateModalOpen(false)}
                type="button"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                fullWidth
                disabled={!selectedStudentId}
              >
                Generate TC
              </Button>
            </div>

          </form>
        </Modal>
      )}

      {/* Cancel Confirmation Modal (Dashboard Table Actions context) */}
      {isCancelConfirmOpen && !viewingTC && (
        <Modal
          isOpen={isCancelConfirmOpen}
          onClose={() => {
            setIsCancelConfirmOpen(false);
            setSelectedTC(null);
          }}
          title="Cancel Transfer Certificate"
        >
          <div className="space-y-4 text-center py-4 select-none animate-fadeIn">
            <div className="p-3 bg-red-100 text-red-650 rounded-full w-14 h-14 mx-auto flex items-center justify-center">
              <AlertCircle size={30} />
            </div>
            <h3 className="text-base font-black text-slate-800">Are you sure?</h3>
            <p className="text-xs text-slate-505 leading-relaxed">
              This Transfer Certificate will be marked as <strong className="text-red-500">Cancelled</strong>. This action is permanent and will audit log historical changes.
            </p>
            <div className="flex gap-2.5 pt-2">
              <Button 
                variant="outline" 
                fullWidth 
                onClick={() => {
                  setIsCancelConfirmOpen(false);
                  setSelectedTC(null);
                }}
              >
                Cancel
              </Button>
              <Button variant="danger" fullWidth onClick={handleCancelTC}>
                Confirm
              </Button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
};
export default TransferCertificates;
