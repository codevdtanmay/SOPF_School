import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Bus,
  CheckCircle2,
  FileCheck,
  FileSpreadsheet,
  Printer,
  Send,
  Route as RouteIcon,
  TrendingUp,
  Users
} from 'lucide-react';

import { transportFeeApi, TransportFeePayment } from '../../api/transportFeeApi';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import Input from '../../components/common/Input';
import Modal from '../../components/common/Modal';
import { transportApi } from '../../modules/transport/api/transportApi';
import CollectTransportFeeModal from '../../modules/transport/components/CollectTransportFeeModal';
import TransportFeeCollection from '../../modules/transport/components/TransportFeeCollection';
import TransportPaymentHistory from '../../modules/transport/components/TransportPaymentHistory';
import TransportStudents from '../../modules/transport/components/TransportStudents';
import {
  PendingTransportStudent,
  Transport,
  TransportDashboard
} from '../../modules/transport/types/transport.types';
import { Student } from '../../types';
import { formatDate } from '../../utils/dateFormatter';
import { exportToExcel, exportToPrintablePDF } from '../../utils/exportUtils';

interface TransportPanelProps {
  allStudents: Student[];
  refreshTrigger: number;
  assignStudentIdPreset?: string | null;
  onClearPreset?: () => void;
  activeSubTab?: string;
  setActiveSubTab?: (tab: string) => void;
}

type TransportStatus = 'Active' | 'Inactive';
type ReportType = 'monthly' | 'pending' | 'route' | 'student';
type PendingReportRow = {
  name: string;
  admissionNo: string;
  className: string;
  routeName: string;
  monthlyCharge: number;
};
type RouteReportRow = {
  route: string;
  studentsCount: number;
  collection: number;
};

const DEFAULT_ROUTES = ['Ugli', 'Lamta'];
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
];

const CURRENT_MONTH = MONTHS[new Date().getMonth()];
const CURRENT_YEAR = String(new Date().getFullYear());
const getCurrentCalendarMonth = () => MONTHS[new Date().getMonth()];
const getCurrentCalendarYear = () => String(new Date().getFullYear());

export const TransportPanel: React.FC<TransportPanelProps> = ({
  allStudents,
  refreshTrigger,
  assignStudentIdPreset,
  onClearPreset,
  activeSubTab,
  setActiveSubTab
}) => {
  const [currentTab, setCurrentTab] = useState('transport-students');
  const [transports, setTransports] = useState<Transport[]>([]);
  const [payments, setPayments] = useState<TransportFeePayment[]>([]);
  const [dashboard, setDashboard] = useState<TransportDashboard | null>(null);
  const [monthlyReport, setMonthlyReport] = useState<TransportFeePayment[]>([]);
  const [pendingStudents, setPendingStudents] = useState<PendingTransportStudent[]>([]);
  const [selectedTransport, setSelectedTransport] = useState<Transport | null>(null);
interface RouteReportRow {
  route: string;
  studentsCount: number;
  collection: number;
}

const [routeReport, setRouteReport] = useState<RouteReportRow[]>([]);
const [routeLoading, setRouteLoading] = useState(false);
const [routeError, setRouteError] = useState("");
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [monthlyLoading, setMonthlyLoading] = useState(true);
  const [pendingLoading, setPendingLoading] = useState(true);

  const [studentsError, setStudentsError] = useState('');
  const [historyError, setHistoryError] = useState('');
  const [dashboardError, setDashboardError] = useState('');
  const [monthlyError, setMonthlyError] = useState('');
  const [pendingError, setPendingError] = useState('');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isCollectFeeOpen, setIsCollectFeeOpen] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  const [editingTransport, setEditingTransport] = useState<Transport | null>(null);
  const [deletingTransport, setDeletingTransport] = useState<Transport | null>(null);
  const [feeStudent, setFeeStudent] = useState<Transport | null>(null);
  const [activeReceipt, setActiveReceipt] = useState<TransportFeePayment | null>(null);
  const [collectFeeAmount, setCollectFeeAmount] = useState<number | undefined>(undefined);

  const [formStudentId, setFormStudentId] = useState('');
  const [formRouteName, setFormRouteName] = useState(DEFAULT_ROUTES[0]);
  const [formPickupPoint, setFormPickupPoint] = useState('');
  const [formMonthlyCharge, setFormMonthlyCharge] = useState('');
  const [formJoiningDate, setFormJoiningDate] = useState(new Date().toISOString().split('T')[0]);
  const [formStatus, setFormStatus] = useState<TransportStatus>('Active');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const [collectLoading, setCollectLoading] = useState(false);
  const [collectSuccessMessage, setCollectSuccessMessage] = useState('');
  const [sendingReceiptWhatsapp, setSendingReceiptWhatsapp] = useState(false);
  const [sendingHistoryReceiptWhatsapp, setSendingHistoryReceiptWhatsapp] = useState<string | null>(null);

  const [reportType, setReportType] = useState<ReportType>('monthly');
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState(getCurrentCalendarMonth);
  const [currentCalendarYear, setCurrentCalendarYear] = useState(getCurrentCalendarYear);
  const previousCalendarRef = useRef({ month: currentCalendarMonth, year: currentCalendarYear });
  const [reportMonth, setReportMonth] = useState(currentCalendarMonth);
  const [reportYear, setReportYear] = useState(currentCalendarYear);
  const [reportClassFilter, setReportClassFilter] = useState('All');
  const [collectFeeMonth, setCollectFeeMonth] = useState(currentCalendarMonth);
  const [collectFeeYear, setCollectFeeYear] = useState(currentCalendarYear);

  const getReceiptPaidNow = (receipt: TransportFeePayment) =>
    receipt.currentPaidAmount ?? receipt.paidAmount;

  useEffect(() => {
    if (activeSubTab) {
      setCurrentTab(activeSubTab);
    }
  }, [activeSubTab]);

  const routeOptions = useMemo(() => {
    const seen = new Set<string>();
    return [...DEFAULT_ROUTES, ...transports.map((transport) => transport.routeName)]
      .filter(Boolean)
      .filter((route) => {
        if (seen.has(route)) {
          return false;
        }
        seen.add(route);
        return true;
      });
  }, [transports]);

  const yearOptions = useMemo(() => {
    const currentYearNumber = Number(currentCalendarYear);
    const paymentYears = payments.map((payment) => Number(payment.year)).filter((year) => !Number.isNaN(year));
    const maxYear = 2035;
    const years = new Set<number>([
      currentYearNumber - 1,
      currentYearNumber,
      ...Array.from({ length: Math.max(0, maxYear - currentYearNumber) }, (_, index) => currentYearNumber + index + 1),
      ...paymentYears
    ]);
    return Array.from(years).sort((a, b) => b - a).map(String);
  }, [payments, currentCalendarYear]);

  useEffect(() => {
    const syncCalendarFilters = () => {
      const nextMonth = getCurrentCalendarMonth();
      const nextYear = getCurrentCalendarYear();
      const previous = previousCalendarRef.current;

      setCurrentCalendarMonth(nextMonth);
      setCurrentCalendarYear(nextYear);

      setReportMonth((current) => (current === previous.month ? nextMonth : current));
      setCollectFeeMonth((current) => (current === previous.month ? nextMonth : current));
      setReportYear((current) => (current === previous.year ? nextYear : current));
      setCollectFeeYear((current) => (current === previous.year ? nextYear : current));

      previousCalendarRef.current = { month: nextMonth, year: nextYear };
    };

    const now = new Date();
    const nextMidnight = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
      0,
      0,
      1,
      0
    );
    const timeout = window.setTimeout(syncCalendarFilters, nextMidnight.getTime() - now.getTime());

    return () => window.clearTimeout(timeout);
  }, [currentCalendarMonth, currentCalendarYear]);

  const resetAssignmentForm = useCallback((presetStudentId = '') => {
    setFormStudentId(presetStudentId);
    setFormRouteName(routeOptions[0] || DEFAULT_ROUTES[0]);
    setFormPickupPoint('');
    setFormMonthlyCharge('');
    setFormJoiningDate(new Date().toISOString().split('T')[0]);
    setFormStatus('Active');
    setFormErrors({});
  }, [routeOptions]);

  const loadTransportStudents = useCallback(async () => {
    setStudentsLoading(true);
    setStudentsError('');

    try {
      const transportList = await transportApi.getStudents();
      setTransports(transportList);
      setSelectedTransport((previous) => {
        if (!transportList.length) {
          return null;
        }

        if (!previous) {
          return transportList[0];
        }

        return transportList.find((transport) => transport.id === previous.id) || transportList[0];
      });
    } catch (error) {
      console.error('Failed to load transport students:', error);
      setStudentsError('Failed to load transport students');
    } finally {
      setStudentsLoading(false);
    }
  }, []);

  const loadTransportPayments = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError('');

    try {
      const historyList = await transportFeeApi.getHistory();
      setPayments(historyList);
    } catch (error) {
      console.error('Failed to load transport payment history:', error);
      setHistoryError('Failed to load payment history');
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const loadDashboard = useCallback(async () => {
    setDashboardLoading(true);
    setDashboardError('');

    try {
      const dashboardData = await transportApi.getDashboard();
      setDashboard(dashboardData);
    } catch (error) {
      console.error('Failed to load transport dashboard:', error);
      setDashboardError('Failed to load dashboard');
    } finally {
      setDashboardLoading(false);
    }
  }, []);

  const loadMonthlyReport = useCallback(async (month: string, year: string) => {
    setMonthlyLoading(true);
    setMonthlyError('');

    try {
      const monthlyData = await transportApi.getMonthlyReport(month, year);
      setMonthlyReport(monthlyData);
    } catch (error) {
      console.error('Failed to load monthly transport report:', error);
      setMonthlyError('Failed to load monthly report');
    } finally {
      setMonthlyLoading(false);
    }
  }, []);
const loadRouteReport = useCallback(
  async (month: string, year: string) => {
    setRouteLoading(true);
    setRouteError("");

    try {
      const data = await transportApi.getRouteReport(month, year);
      setRouteReport(data);
    } catch (error) {
      console.error("Failed to load route report:", error);
      setRouteError("Failed to load route report");
    } finally {
      setRouteLoading(false);
    }
  },
  []
);
  const loadPendingStudents = useCallback(async () => {
    setPendingLoading(true);
    setPendingError('');

    try {
      const pendingData = await transportApi.getPending();
      setPendingStudents(pendingData);
    } catch (error) {
      console.error('Failed to load pending transport students:', error);
      setPendingError('Failed to load pending students');
    } finally {
      setPendingLoading(false);
    }
  }, []);

  const refreshTransportPanelData = useCallback(async (month: string, year: string) => {
  await Promise.all([
    loadTransportStudents(),
    loadTransportPayments(),
    loadDashboard(),
    loadMonthlyReport(month, year),
    loadPendingStudents(),
    loadRouteReport(month, year)   // <-- Add this
  ]);
}, [
  loadDashboard,
  loadMonthlyReport,
  loadPendingStudents,
  loadRouteReport,                 // <-- Add this dependency
  loadTransportPayments,
  loadTransportStudents
]);

  useEffect(() => {
    refreshTransportPanelData(reportMonth, reportYear);
  }, [refreshTransportPanelData, refreshTrigger]);

  useEffect(() => {
    if (reportType === 'monthly') {
      loadMonthlyReport(reportMonth, reportYear);
    }
  }, [loadMonthlyReport, reportMonth, reportType, reportYear]);

  useEffect(() => {
  if (reportType === "route") {
    loadRouteReport(reportMonth, reportYear);
  }
}, [loadRouteReport, reportMonth, reportType, reportYear]);

  useEffect(() => {
    if (!assignStudentIdPreset) {
      return;
    }

    resetAssignmentForm(assignStudentIdPreset);
    setIsAddModalOpen(true);
  }, [assignStudentIdPreset, resetAssignmentForm]);

  const matchedStudent = useMemo(
    () => allStudents.find((student) => student.id === formStudentId) || null,
    [allStudents, formStudentId]
  );

  const unassignedStudents = useMemo(() => {
    const assignedIds = new Set(transports.map((transport) => transport.studentId));
    return allStudents.filter((student) => student.id === formStudentId || !assignedIds.has(student.id));
  }, [allStudents, transports, formStudentId]);

  const combinedRosterLoading = studentsLoading || historyLoading;

  const transportErrors = useMemo(
    () => [studentsError, historyError, dashboardError, monthlyError, pendingError].filter(Boolean),
    [dashboardError, historyError, monthlyError, pendingError, studentsError]
  );

  const pendingReportRows = useMemo<PendingReportRow[]>(
    () =>
      pendingStudents.map((student) => ({
        name: student.student,
        admissionNo: student.admissionNo,
        className: '',
        routeName: student.route,
        monthlyCharge: student.monthlyCharge
      })),
    [pendingStudents]
  );

  const classOptions = useMemo(() => {
    const classSet = new Set<string>();

    transports.forEach((transport) => {
      if (transport.className) {
        classSet.add(transport.className);
      }
    });

    payments.forEach((payment) => {
      if (payment.className) {
        classSet.add(payment.className);
      }
    });

    return Array.from(classSet).sort((a, b) => a.localeCompare(b));
  }, [payments, transports]);

  const reportRows = useMemo(() => {
    if (reportType === 'monthly') {
      return monthlyReport;
    }

    if (reportType === 'pending') {
      return pendingReportRows;
    }

    if (reportType === 'route') {
  return routeReport;
}

    return payments.filter((payment) =>
      reportClassFilter === 'All' || payment.className === reportClassFilter
    );
  }, [monthlyReport, payments, pendingReportRows, reportClassFilter, reportType, routeOptions, transports]);

  const handleTabChange = (tab: string) => {
    setCurrentTab(tab);
    setActiveSubTab?.(tab);
  };

  const handleOpenAddModal = () => {
    resetAssignmentForm();
    setIsAddModalOpen(true);
  };

  const handleCloseAddModal = () => {
    setIsAddModalOpen(false);
    onClearPreset?.();
  };

  const validateTransportForm = (requireStudentSelection: boolean) => {
    const nextErrors: Record<string, string> = {};

    if (requireStudentSelection && !formStudentId) {
      nextErrors.studentId = 'Please select a student';
    }
    if (!formPickupPoint.trim()) {
      nextErrors.pickupPoint = 'Pickup point is required';
    }
    if (!formMonthlyCharge || Number(formMonthlyCharge) <= 0) {
      nextErrors.monthlyCharge = 'Enter a valid monthly charge';
    }

    setFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleAddSubmit = async (event?: React.FormEvent) => {
    event?.preventDefault();

    if (!validateTransportForm(true)) {
      return;
    }

    try {
      const createdTransport = await transportApi.addStudent({
        studentId: formStudentId,
        routeName: formRouteName,
        pickupPoint: formPickupPoint.trim(),
        monthlyCharge: Number(formMonthlyCharge),
        joiningDate: formJoiningDate,
        status: formStatus
      });

      setSelectedTransport(createdTransport);
      await refreshTransportPanelData(reportMonth, reportYear);
      handleCloseAddModal();
    } catch (error) {
      console.error('Failed to add transport student:', error);
    }
  };

  const handleEditSubmit = async (event?: React.FormEvent) => {
    event?.preventDefault();

    if (!editingTransport || !validateTransportForm(false)) {
      return;
    }

    try {
      const updatedTransport = await transportApi.updateStudent(editingTransport.id, {
        routeName: formRouteName,
        pickupPoint: formPickupPoint.trim(),
        monthlyCharge: Number(formMonthlyCharge),
        joiningDate: formJoiningDate,
        status: formStatus
      });

      setSelectedTransport(updatedTransport);
      await refreshTransportPanelData(reportMonth, reportYear);
      setIsEditModalOpen(false);
      setEditingTransport(null);
    } catch (error) {
      console.error('Failed to update transport student:', error);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingTransport) {
      return;
    }

    try {
      await transportApi.deleteStudent(deletingTransport.id);
      setSelectedTransport((previous) => (previous?.id === deletingTransport.id ? null : previous));
      await refreshTransportPanelData(reportMonth, reportYear);
      setDeletingTransport(null);
      setIsDeleteConfirmOpen(false);
    } catch (error) {
      console.error('Failed to delete transport student:', error);
    }
  };

  const handleOpenEditModal = (transport: Transport) => {
    setEditingTransport(transport);
    setFormStudentId(transport.studentId);
    setFormRouteName(transport.routeName);
    setFormPickupPoint(transport.pickupPoint);
    setFormMonthlyCharge(String(transport.monthlyCharge));
    setFormJoiningDate(transport.joiningDate);
    setFormStatus(transport.status);
    setFormErrors({});
    setIsEditModalOpen(true);
  };

  const handleOpenCollectFee = (
    transport: Transport,
    month?: string,
    year?: string,
    amountToCollect?: number
  ) => {
    setFeeStudent(transport);
    setCollectFeeMonth(month || reportMonth);
    setCollectFeeYear(year || reportYear);
    setCollectFeeAmount(amountToCollect);
    setCollectSuccessMessage('');
    setIsCollectFeeOpen(true);
  };

  const handleCollectTransportFee = async (data: {
    month: string;
    year: number;
    paidAmount: number;
    paymentMethod: string;
    remarks: string;
  }) => {
    if (!feeStudent) {
      return;
    }

    setCollectLoading(true);
    try {
      const collectedPayment = await transportFeeApi.collectFee({
        studentId: feeStudent.studentId,
        month: data.month,
        year: String(data.year),
        paidAmount: Number(data.paidAmount),
        paymentMethod: data.paymentMethod as TransportFeePayment["paymentMethod"],
        remarks: data.remarks.trim() || undefined
      });

      await refreshTransportPanelData(reportMonth, reportYear);
      setActiveReceipt(collectedPayment);
      setIsCollectFeeOpen(false);
      setIsReceiptOpen(true);
      setCollectSuccessMessage('Transport fee collected successfully.');
      window.setTimeout(() => setCollectSuccessMessage(''), 2500);
    } catch (error: any) {
      console.error('Failed to collect transport fee:', error);
      alert(error?.response?.data?.message || 'Failed to collect transport fee');
    } finally {
      setCollectLoading(false);
    }
  };

  const handleSendTransportReceiptWhatsapp = useCallback(async () => {
    if (!activeReceipt?.receiptNo) {
      return;
    }

    setSendingReceiptWhatsapp(true);
    try {
      const response = await transportFeeApi.sendReceiptToWhatsapp(activeReceipt.receiptNo);
      if (!response?.success) {
        throw new Error(response?.message || 'Failed to send transport receipt to WhatsApp');
      }
      alert('Transport receipt sent to WhatsApp.');
    } catch (error: any) {
      console.error('Failed to send transport receipt to WhatsApp:', error);
      alert(error?.response?.data?.message || error?.message || 'Failed to send transport receipt to WhatsApp');
    } finally {
      setSendingReceiptWhatsapp(false);
    }
  }, [activeReceipt]);

  const handleSendStoredTransportReceiptWhatsapp = useCallback(async (receiptNo: string) => {
    if (!receiptNo) {
      return;
    }

    setSendingHistoryReceiptWhatsapp(receiptNo);
    try {
      const response = await transportFeeApi.sendReceiptToWhatsapp(receiptNo);
      if (!response?.success) {
        throw new Error(response?.message || 'Failed to send transport receipt to WhatsApp');
      }
      alert('Transport receipt sent to WhatsApp.');
    } catch (error: any) {
      console.error('Failed to send stored transport receipt to WhatsApp:', error);
      alert(error?.response?.data?.message || error?.message || 'Failed to send transport receipt to WhatsApp');
    } finally {
      setSendingHistoryReceiptWhatsapp(null);
    }
  }, []);

  const triggerPrintReceipt = (receipt: TransportFeePayment) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to print receipts.');
      return;
    }

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt - ${receipt.receiptNo}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              color: #1e293b;
              padding: 32px;
              max-width: 600px;
              margin: 0 auto;
            }
            .header {
              text-align: center;
              border-bottom: 2px dashed #cbd5e1;
              padding-bottom: 16px;
              margin-bottom: 20px;
            }
            .header h1 {
              margin: 0;
              font-size: 22px;
              color: #1d4ed8;
            }
            .meta {
              font-size: 12px;
              color: #64748b;
              margin-top: 6px;
            }
            .row {
              display: flex;
              justify-content: space-between;
              gap: 16px;
              padding: 10px 0;
              border-bottom: 1px solid #e2e8f0;
              font-size: 13px;
            }
            .label {
              color: #64748b;
              font-weight: 600;
            }
            .value {
              color: #0f172a;
              font-weight: 700;
              text-align: right;
            }
            .amount {
              margin-top: 20px;
              padding: 14px 16px;
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 10px;
              display: flex;
              justify-content: space-between;
              font-size: 18px;
              font-weight: 800;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>The School of Pansy Flowers</h1>
            <div class="meta">Transport Service Receipt • ${receipt.receiptNo}</div>
          </div>
          <div class="row"><span class="label">Student Name</span><span class="value">${receipt.studentName}</span></div>
          <div class="row"><span class="label">Admission No</span><span class="value">${receipt.admissionNo}</span></div>
          <div class="row"><span class="label">Class</span><span class="value">${receipt.className}</span></div>
          <div class="row"><span class="label">Route</span><span class="value">${receipt.routeName}</span></div>
          <div class="row"><span class="label">Pickup Point</span><span class="value">${receipt.pickupPoint}</span></div>
          <div class="row"><span class="label">Billing Cycle</span><span class="value">${receipt.month} ${receipt.year}</span></div>
          <div class="row"><span class="label">Payment Method</span><span class="value">${receipt.paymentMethod}</span></div>
          <div class="row"><span class="label">Payment Date</span><span class="value">${formatDate(receipt.date)}</span></div>
          ${receipt.remarks ? `<div class="row"><span class="label">Remarks</span><span class="value">${receipt.remarks}</span></div>` : ''}
          <div class="row">
  <span class="label">Monthly Charge</span>
  <span class="value">₹${receipt.monthlyCharge}</span>
</div>

<div class="row">
  <span class="label">Paid Amount This Time</span>
  <span class="value">₹${getReceiptPaidNow(receipt)}</span>
</div>

<div class="row">
  <span class="label">Due Amount</span>
  <span class="value">₹${receipt.dueAmount}</span>
</div>

<div class="row">
  <span class="label">Status</span>
  <span class="value">${receipt.status}</span>
</div>
          <script>window.onload = function() { window.print(); };</script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handleExportReportExcel = () => {
    if (reportType === 'monthly') {
      exportToExcel(
        reportRows.map((row: any) => ({ ...row, date: formatDate(row.date) })),
        ['Student Name', 'Admission No', 'Route Name', 'Amount', 'Payment Date'],
        ['studentName', 'admissionNo', 'routeName', 'paidAmount', 'date'],
        `transport_monthly_${reportMonth}_${reportYear}`
      );
      return;
    }

    if (reportType === 'pending') {
      exportToExcel(
        reportRows as PendingReportRow[],
        ['Student Name', 'Admission No', 'Class', 'Route Name', 'Monthly Charge'],
        ['name', 'admissionNo', 'className', 'routeName', 'monthlyCharge'],
        `transport_pending_${reportMonth}_${reportYear}`
      );
      return;
    }

    if (reportType === 'route') {
      exportToExcel(
        reportRows as RouteReportRow[],
        ['Route Name', 'Active Students Count', 'Collection'],
        ['route', 'studentsCount', 'collection'],
        `transport_route_${reportMonth}_${reportYear}`
      );
      return;
    }

    exportToExcel(
      (reportRows as any[]).map((row) => ({
        ...row,
        servicePeriod: `${row.month} ${row.year}`,
        date: formatDate(row.date)
      })),
      ['Receipt No', 'Service Period', 'Amount', 'Payment Method', 'Payment Date'],
      ['receiptNo', 'servicePeriod', 'paidAmount', 'paymentMethod', 'date'],
      'transport_student_ledger'
    );
  };

  const handleExportReportPDF = () => {
    if (reportType === 'monthly') {
      exportToPrintablePDF(
        `Monthly Transport Collection Report: ${reportMonth} ${reportYear}`,
        ['Student Name', 'Admission No', 'Route Name', 'Amount', 'Payment Date'],
        (reportRows as TransportFeePayment[]).map((row) => [
          row.studentName,
          row.admissionNo,
          row.routeName,
          `₹${row.paidAmount}`,
          formatDate(row.date)
        ]),
        'transport_report'
      );
      return;
    }

    if (reportType === 'pending') {
      exportToPrintablePDF(
        `Pending Transport Report: ${reportMonth} ${reportYear}`,
        ['Student Name', 'Admission No', 'Class', 'Route Name', 'Monthly Charge'],
        (reportRows as PendingReportRow[]).map((row) => [
          row.name,
          row.admissionNo,
          row.className,
          row.routeName,
          `₹${row.monthlyCharge}`
        ]),
        'transport_report'
      );
      return;
    }

    if (reportType === 'route') {
      exportToPrintablePDF(
        `Route Performance Report: ${reportMonth} ${reportYear}`,
        ['Route Name', 'Active Students', 'Collection'],
        (reportRows as RouteReportRow[]).map((row) => [
          row.route,
          String(row.studentsCount),
          `₹${row.collection}`
        ]),
        'transport_report'
      );
      return;
    }

    exportToPrintablePDF(
      'Student Transport Ledger',
      ['Receipt No', 'Service Month', 'Amount Paid', 'Payment Method', 'Payment Date'],
      (reportRows as TransportFeePayment[]).map((row) => [
        row.receiptNo,
        `${row.month} ${row.year}`,
        `₹${row.paidAmount}`,
        row.paymentMethod,
        formatDate(row.date)
      ]),
      'transport_report'
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-extrabold tracking-tight text-slate-800">
            <Bus className="h-5 w-5 text-blue-600" />
            Transport Services Hub
          </h2>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            Manage route assignments, collect transport fees, print receipts, and review reports.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-slate-200/60 bg-slate-100 p-1">
          {[
            ['transport-students', 'Transport Students'],
            ['transport-fee-collection', 'Fee Collection'],
            ['transport-payment-history', 'Payment History'],
            ['transport-dashboard', 'Dashboard & Reports']
          ].map(([tab, label]) => (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                currentTab === tab
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {collectSuccessMessage && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          <CheckCircle2 size={16} className="text-emerald-600" />
          {collectSuccessMessage}
        </div>
      )}

      {transportErrors.map((error) => (
        <div key={error} className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
          {error}
        </div>
      ))}

      {currentTab === 'transport-dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card hoverEffect className="flex items-center gap-4 rounded-xl border border-slate-200/80 bg-white p-5 shadow-2xs">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-blue-600">
                <Users size={20} />
              </div>
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Students</span>
                <span className="mt-0.5 block text-xl font-extrabold text-slate-800">
                  {dashboardLoading ? '...' : `${dashboard?.totalStudents ?? 0} Students`}
                </span>
              </div>
            </Card>

            <Card hoverEffect className="flex items-center gap-4 rounded-xl border border-slate-200/80 bg-white p-5 shadow-2xs">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 text-emerald-600">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Collection</span>
                <span className="mt-0.5 block text-xl font-extrabold text-slate-800">
                  {dashboardLoading ? '...' : `₹${(dashboard?.totalCollection ?? 0).toLocaleString()}`}
                </span>
              </div>
            </Card>

            <Card hoverEffect className="flex items-center gap-4 rounded-xl border border-slate-200/80 bg-white p-5 shadow-2xs">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-violet-100 bg-violet-50 text-violet-600">
                <TrendingUp size={20} />
              </div>
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-widest text-slate-400">Monthly Collection</span>
                <span className="mt-0.5 block text-xl font-extrabold text-slate-800">
                  {dashboardLoading ? '...' : `₹${(dashboard?.currentMonthCollection ?? 0).toLocaleString()}`}
                </span>
              </div>
            </Card>

            <Card hoverEffect className="flex items-center gap-4 rounded-xl border border-slate-200/80 bg-white p-5 shadow-2xs">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-rose-100 bg-rose-50 text-rose-600">
                <AlertTriangle size={20} />
              </div>
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-widest text-slate-400">Pending Students</span>
                <span className="mt-0.5 block text-xl font-extrabold text-slate-800">
                  {pendingLoading ? '...' : pendingStudents.length}
                </span>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card className="rounded-xl border border-slate-200 bg-white p-5">
              <h3 className="mb-1 flex items-center gap-1.5 text-sm font-bold text-slate-800">
                <TrendingUp size={16} className="text-blue-600" />
                Monthly Revenue Performance ({CURRENT_YEAR})
              </h3>
              <p className="mb-6 text-[11px] font-semibold text-slate-400">
                Collections aggregated by billing cycle.
              </p>

              <div className="flex h-[200px] items-end justify-between border-b border-slate-200 px-2 pt-2">
               {(() => {
  const chartMonths = MONTHS.slice(0, 7);
const collections = chartMonths.map((month, index) =>
  payments
    .filter((payment) => {
      const paymentMonth =
        Number(payment.month) ||
        MONTHS.indexOf(String(payment.month)) + 1;

      return (
        paymentMonth === index + 1 &&
        String(payment.year) === CURRENT_YEAR
      );
    })
    .reduce(
      (sum, payment) => sum + Number(payment.paidAmount || 0),
      0
    )
);

  const maxCollection = Math.max(...collections, 1);

  return chartMonths.map((month, index) => {
    const total = collections[index];

    let height = 8;

    if (total > 0) {
      height = Math.max(20, (total / maxCollection) * 150);
    }

    return (
      <div key={month} className="group flex flex-1 flex-col items-center justify-end">
        <span className="mb-2 text-[10px] font-extrabold text-blue-600 opacity-0 transition-opacity group-hover:opacity-100">
          ₹{total}
        </span>

        <div
          style={{ height: `${height}px` }}
          className="w-8 rounded-t-md bg-blue-500 transition-all duration-300 hover:bg-blue-600"
        />

        <span className="mt-2 text-[10px] font-bold text-slate-500">
          {month.slice(0, 3)}
        </span>
      </div>
    );
  });
})()}
              </div>
            </Card>

            <Card className="rounded-xl border border-slate-200 bg-white p-5">
              <h3 className="mb-1 flex items-center gap-1.5 text-sm font-bold text-slate-800">
                <RouteIcon size={16} className="text-violet-600" />
                Route Wise Commuter Density & Yield
              </h3>
              <p className="mb-6 text-[11px] font-semibold text-slate-400">
                Active commuters and lifetime collections by route.
              </p>

              <div className="space-y-4">
                {routeOptions.map((route) => {
                  const routeStudents = transports.filter(
                    (transport) => transport.routeName === route && transport.status === 'Active'
                  );
                 const routeRevenue = payments
  .filter((payment) => payment.routeName === route)
  .reduce((sum, payment) => sum + payment.paidAmount, 0);
                  const maxRevenue = Math.max(
                    1,
                    ...routeOptions.map((name) =>
                      payments
                        .filter((payment) => payment.routeName === name)
                        .reduce((sum, payment) => sum + payment.paidAmount, 0)
                    )
                  );
                  const width = Math.max(5, (routeRevenue / maxRevenue) * 100);

                  return (
                    <div key={route} className="space-y-1.5">
                      <div className="flex justify-between text-xs font-bold text-slate-700">
                        <span>{route} ({routeStudents.length} Active Students)</span>
                        <span>₹{routeRevenue.toLocaleString()}</span>
                      </div>
                      <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                        <div style={{ width: `${width}%` }} className="h-full rounded-full bg-violet-500" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>

          <Card className="rounded-xl border border-slate-200 bg-white p-6">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-extrabold text-slate-800">
              <FileCheck className="text-blue-600" />
              Dynamic Report Compiler
            </h3>
            <p className="mb-6 text-xs font-medium text-slate-500">
              Filter, preview, and export transport reports directly from current live data.
            </p>

            <div className="grid grid-cols-1 gap-4 border-b border-slate-100 pb-5 md:grid-cols-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Report Subject</label>
                <select
                  value={reportType}
                  onChange={(event) => setReportType(event.target.value as ReportType)}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="monthly">Monthly Collection</option>
                  <option value="pending">Pending Commuters</option>
                  <option value="route">Route Performance</option>
                  <option value="student">Student Ledger</option>
                </select>
              </div>

              {reportType !== 'student' ? (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Select Month</label>
                    <select
                      value={reportMonth}
                      onChange={(event) => setReportMonth(event.target.value)}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500 cursor-pointer"
                    >
                      {MONTHS.map((month) => (
                        <option key={month} value={month}>{month}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Academic Year</label>
                    <select
                      value={reportYear}
                      onChange={(event) => setReportYear(event.target.value)}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500 cursor-pointer"
                    >
                      {yearOptions.map((year) => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>
                </>
              ) : (
                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Select Class</label>
                  <select
                    value={reportClassFilter}
                    onChange={(event) => setReportClassFilter(event.target.value)}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="All">All Classes</option>
                    {classOptions.map((className) => (
                      <option key={className} value={className}>{className}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-end gap-2">
                <Button
                  onClick={handleExportReportExcel}
                  variant="outline"
                  size="sm"
                  className="flex-1 text-slate-700"
                  leftIcon={<FileSpreadsheet size={14} className="text-emerald-600" />}
                >
                  Excel
                </Button>
                <Button
                  onClick={handleExportReportPDF}
                  size="sm"
                  className="flex-1"
                  leftIcon={<Printer size={14} />}
                >
                  Print / PDF
                </Button>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-extrabold uppercase tracking-wide text-slate-700">
                  Live Report Preview ({reportRows.length} matches)
                </h4>
                <span className="text-[10px] font-bold text-slate-400">
                  Preview reflects current report filters only
                </span>
              </div>

              <div className="max-h-[300px] overflow-x-auto overflow-y-auto rounded-xl border border-slate-200">
                <table className="w-full border-collapse text-left text-xs">
                  <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50">
                    <tr className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">
                      {reportType === 'monthly' && (
                        <>
                          <th className="p-3">Student Name</th>
                          <th className="p-3">Admission No</th>
                          <th className="p-3">Route</th>
                          <th className="p-3">Amount Paid</th>
                          <th className="p-3">Payment Date</th>
                        </>
                      )}
                      {reportType === 'pending' && (
                        <>
                          <th className="p-3">Student Name</th>
                          <th className="p-3">Admission No</th>
                          <th className="p-3">Class</th>
                          <th className="p-3">Route</th>
                          <th className="p-3">Monthly Charge</th>
                        </>
                      )}
                      {reportType === 'route' && (
                        <>
                          <th className="p-3">Route Name</th>
                          <th className="p-3">Active Commuters</th>
                          <th className="p-3">Collection</th>
                        </>
                      )}
                      {reportType === 'student' && (
                        <>
                          <th className="p-3">Receipt No</th>
                          <th className="p-3">Service Month</th>
                          <th className="p-3">Amount Paid</th>
                          <th className="p-3">Payment Method</th>
                          <th className="p-3">Date</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans">
                    {reportRows.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-xs font-bold text-slate-400">
                          No matching records found.
                        </td>
                      </tr>
                    ) : (
                      reportRows.map((row: any, index) => (
                        <tr key={`${reportType}-${index}`} className="hover:bg-slate-50/50">
                          {reportType === 'monthly' && (
                            <>
                              <td className="p-3 font-bold text-slate-800">{row.studentName}</td>
                              <td className="p-3 font-mono text-slate-600">{row.admissionNo}</td>
                              <td className="p-3 text-slate-500">{row.routeName}</td>
                              <td className="p-3 font-bold text-slate-800">₹{row.paidAmount}</td>
                              <td className="p-3 font-medium text-slate-400">{formatDate(row.date)}</td>
                            </>
                          )}
                          {reportType === 'pending' && (
                            <>
                              <td className="p-3 font-bold text-slate-800">{row.name}</td>
                              <td className="p-3 font-mono text-slate-600">{row.admissionNo}</td>
                              <td className="p-3 text-slate-500">{row.className}</td>
                              <td className="p-3 text-slate-500">{row.routeName}</td>
                              <td className="p-3 font-bold text-rose-600">₹{row.monthlyCharge}</td>
                            </>
                          )}
                          {reportType === 'route' && (
                            <>
                              <td className="p-3 font-bold text-slate-800">{row.route}</td>
                              <td className="p-3 text-slate-600">{row.studentsCount}</td>
                              <td className="p-3 font-bold text-emerald-600">₹{row.collection}</td>
                            </>
                          )}
                          {reportType === 'student' && (
                            <>
                              <td className="p-3 font-mono font-bold text-slate-850">{row.receiptNo}</td>
                              <td className="p-3 text-slate-600">{row.month} {row.year}</td>
                              <td className="p-3 font-extrabold text-slate-850">₹{row.paidAmount}</td>
                              <td className="p-3 font-bold text-slate-500">{row.paymentMethod}</td>
                              <td className="p-3 text-slate-400">{formatDate(row.date)}</td>
                            </>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>
        </div>
      )}

      {currentTab === 'transport-students' && (
        <TransportStudents
          loading={studentsLoading}
          transports={transports}
          onAddStudent={handleOpenAddModal}
          onEditStudent={handleOpenEditModal}
          onDeleteStudent={(transport) => {
            setDeletingTransport(transport);
            setIsDeleteConfirmOpen(true);
          }}
          onCollectFee={handleOpenCollectFee}
          onSelectStudent={setSelectedTransport}
        />
      )}

      {currentTab === 'transport-fee-collection' && (
        <TransportFeeCollection
          loading={combinedRosterLoading}
          transports={transports}
          payments={payments}
          onCollectFee={handleOpenCollectFee}
        />
      )}

      {currentTab === 'transport-payment-history' && (
        <TransportPaymentHistory
          loading={historyLoading}
          payments={payments}
          onViewReceipt={(payment) => {
            setActiveReceipt(payment);
            setIsReceiptOpen(true);
          }}
          onPrintReceipt={triggerPrintReceipt}
          onSendReceiptWhatsapp={(payment) => void handleSendStoredTransportReceiptWhatsapp(payment.receiptNo)}
          sendingReceiptNo={sendingHistoryReceiptWhatsapp}
        />
      )}

      <CollectTransportFeeModal
        isOpen={isCollectFeeOpen}
        transport={feeStudent}
        initialMonth={collectFeeMonth}
        initialYear={collectFeeYear}
        initialAmount={collectFeeAmount}
        loading={collectLoading}
        onClose={() => {
          setIsCollectFeeOpen(false);
          setFeeStudent(null);
          setCollectFeeAmount(undefined);
        }}
        onSubmit={handleCollectTransportFee}
      />

      <Modal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        title="Transport Receipt View"
        footer={
          <div className="flex w-full justify-between">
            <Button
              variant="secondary"
              size="sm"
              isLoading={sendingReceiptWhatsapp}
              leftIcon={<Send size={14} />}
              onClick={() => void handleSendTransportReceiptWhatsapp()}
            >
              Send PDF to WhatsApp
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (activeReceipt) {
                  triggerPrintReceipt(activeReceipt);
                }
              }}
              leftIcon={<Printer size={14} />}
            >
              Print Receipt
            </Button>
            <Button size="sm" onClick={() => setIsReceiptOpen(false)}>
              Close
            </Button>
          </div>
        }
      >
        {activeReceipt && (
          <div className="space-y-4 rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
            <div className="border-b border-dashed border-slate-200 pb-4 text-center">
              <h3 className="text-sm font-black uppercase tracking-wide text-blue-700">The School of Pansy Flowers</h3>
              <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-400">Changotola, Balaghat, MP</p>
              <div className="mt-3 inline-block rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-700">
                Receipt No: <span className="font-mono font-black text-blue-600">{activeReceipt.receiptNo}</span>
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-600">
              {[
                ['Student Name', activeReceipt.studentName],
                ['Admission No', activeReceipt.admissionNo],
                ['Route', activeReceipt.routeName],
                ['Month', activeReceipt.month],
                ['Year', activeReceipt.year],
                ['Monthly Charge', `₹${activeReceipt.monthlyCharge}`],
                ['Paid Amount This Time', `₹${getReceiptPaidNow(activeReceipt)}`],
                ['Due Amount', `₹${activeReceipt.dueAmount}`],
                ['Status', activeReceipt.status],
                ['Payment Method', activeReceipt.paymentMethod],
                ['Receipt Number', activeReceipt.receiptNo],
                ['Date', formatDate(activeReceipt.date)],
                ['Class & Section', activeReceipt.className],
                ['Pickup Location', activeReceipt.pickupPoint],
                ['Remarks', activeReceipt.remarks]
              ]
                .filter(([, value]) => value)
                .map(([label, value]) => (
                  <div key={label} className="flex justify-between border-b border-slate-100 py-1">
                    <span className="font-semibold text-slate-400">{label}</span>
                    <span className="font-extrabold text-slate-800">{value}</span>
                  </div>
                ))}
            </div>

            <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4">
              <span className="text-xs font-bold uppercase text-slate-500">Total Paid</span>
              <span className="text-xl font-black text-emerald-600">₹{activeReceipt.paidAmount}</span>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={isAddModalOpen}
        onClose={handleCloseAddModal}
        title="Assign Student to Route"
        footer={
          <div className="flex w-full justify-end gap-2">
            <Button variant="outline" size="sm" onClick={handleCloseAddModal}>
              Cancel
            </Button>
            <Button size="sm" onClick={() => void handleAddSubmit()}>
              Assign Route
            </Button>
          </div>
        }
      >
        <form onSubmit={handleAddSubmit} className="space-y-4 select-none">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold tracking-wide text-slate-700">SELECT STUDENT</label>
            <select
              value={formStudentId}
              onChange={(event) => setFormStudentId(event.target.value)}
              disabled={Boolean(assignStudentIdPreset)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none transition-all hover:border-slate-300 focus:border-blue-500 cursor-pointer"
            >
              <option value="">-- Choose a Student --</option>
              {unassignedStudents.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name} ({student.admissionNo || student.rollNumber || 'N/A'}) - Class {student.class || 'N/A'}
                </option>
              ))}
            </select>
            {formErrors.studentId && (
              <span className="text-[10px] font-bold text-red-500">{formErrors.studentId}</span>
            )}
            {matchedStudent && (
              <span className="text-[11px] font-semibold text-slate-500">
                Selected: {matchedStudent.name} • {matchedStudent.class || 'N/A'}-{matchedStudent.section || 'A'}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold tracking-wide text-slate-700">ROUTE</label>
              <select
                value={formRouteName}
                onChange={(event) => setFormRouteName(event.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none hover:border-slate-300 focus:border-blue-500 cursor-pointer"
              >
                {routeOptions.map((route) => (
                  <option key={route} value={route}>{route}</option>
                ))}
              </select>
            </div>

            <Input
              label="MONTHLY CHARGE (₹)"
              type="number"
              value={formMonthlyCharge}
              onChange={(event) => setFormMonthlyCharge(event.target.value)}
              error={formErrors.monthlyCharge}
              helperText="Enter the transport fee manually."
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="PICKUP POINT"
              value={formPickupPoint}
              onChange={(event) => setFormPickupPoint(event.target.value)}
              error={formErrors.pickupPoint}
              required
            />
            <Input
              label="SERVICE START DATE"
              type="date"
              value={formJoiningDate}
              onChange={(event) => setFormJoiningDate(event.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold tracking-wide text-slate-700">SERVICE STATUS</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                <input
                  type="radio"
                  name="addStatus"
                  checked={formStatus === 'Active'}
                  onChange={() => setFormStatus('Active')}
                  className="h-4 w-4 cursor-pointer rounded-full border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                Active Service
              </label>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                <input
                  type="radio"
                  name="addStatus"
                  checked={formStatus === 'Inactive'}
                  onChange={() => setFormStatus('Inactive')}
                  className="h-4 w-4 cursor-pointer rounded-full border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                Suspended / Inactive
              </label>
            </div>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Commuter Roster Settings"
        footer={
          <div className="flex w-full justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={() => void handleEditSubmit()}>
              Save Changes
            </Button>
          </div>
        }
      >
        <form onSubmit={handleEditSubmit} className="space-y-4 select-none">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold tracking-wide text-slate-700">ROUTE</label>
              <select
                value={formRouteName}
                onChange={(event) => setFormRouteName(event.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none hover:border-slate-300 focus:border-blue-500 cursor-pointer"
              >
                {routeOptions.map((route) => (
                  <option key={route} value={route}>{route}</option>
                ))}
              </select>
            </div>

            <Input
              label="MONTHLY CHARGE (₹)"
              type="number"
              value={formMonthlyCharge}
              onChange={(event) => setFormMonthlyCharge(event.target.value)}
              error={formErrors.monthlyCharge}
              helperText="Enter the transport fee manually."
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="PICKUP POINT"
              value={formPickupPoint}
              onChange={(event) => setFormPickupPoint(event.target.value)}
              error={formErrors.pickupPoint}
              required
            />
            <Input
              label="SERVICE START DATE"
              type="date"
              value={formJoiningDate}
              onChange={(event) => setFormJoiningDate(event.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold tracking-wide text-slate-700">SERVICE STATUS</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                <input
                  type="radio"
                  name="editStatus"
                  checked={formStatus === 'Active'}
                  onChange={() => setFormStatus('Active')}
                  className="h-4 w-4 cursor-pointer rounded-full border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                Active Service
              </label>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                <input
                  type="radio"
                  name="editStatus"
                  checked={formStatus === 'Inactive'}
                  onChange={() => setFormStatus('Inactive')}
                  className="h-4 w-4 cursor-pointer rounded-full border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                Suspended / Inactive
              </label>
            </div>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        title="Unassign Student from Transport"
        footer={
          <div className="flex w-full justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsDeleteConfirmOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" className="bg-rose-600 text-white hover:bg-rose-700" onClick={handleDeleteConfirm}>
              Remove Student
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <p className="text-xs leading-relaxed text-slate-600">
            Are you sure you want to stop transport services for{' '}
            <strong className="text-slate-800">{deletingTransport?.name}</strong>?
          </p>
          <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800">
            <AlertTriangle size={16} className="shrink-0 text-amber-700" />
            <span>Historical payment records will remain available after the transport assignment is removed.</span>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default TransportPanel;
