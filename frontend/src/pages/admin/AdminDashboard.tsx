import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  Users, 
  GraduationCap, 
  DollarSign, 
  Megaphone, 
  UserPlus, 
  Plus, 
  Search, 
  FileText, 
  Filter, 
  CheckCircle, 
  TrendingUp, 
  Calendar, 
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Briefcase,
  Layers,
  Percent,
  Check,
  HelpCircle,
  Clock,
  Download,
  Edit2,
  Trash2,
  ShieldAlert,
  Eye,
  Printer,
  Send,
  ChevronDown,
  ChevronRight,
  
} from 'lucide-react';

// Export Utilities
import { exportToExcel, exportToPrintablePDF, printReceiptBill } from '../../utils/exportUtils';
import { formatDate } from '../../utils/dateFormatter';

// Common Components
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import { Loader, Skeleton, DashboardStatsSkeleton, WidgetSkeleton } from '../../components/common/Loader';

// Dashboard Specific Widgets
import StatCard from '../../components/dashboard/StatCard';
import QuickActionCard from '../../components/dashboard/QuickActionCard';
import RecentNotices from '../../components/dashboard/RecentNotices';
import RecentActivities from '../../components/dashboard/RecentActivities';
import FeeCollectionWidget from '../../components/dashboard/FeeCollectionWidget';
import StudentDistribution from '../../components/dashboard/StudentDistribution';
import StudentsByCategory from '../../components/dashboard/StudentsByCategory';
import StudentPromotionModal from './StudentPromotionModal';

// Transport Operations
import { TransportPanel } from './TransportPanel';
import { TransferCertificates } from './TransferCertificates';

// Services/API
import { studentApi } from '../../api/studentApi';
import { teacherApi } from '../../api/teacherApi';
import { noticeApi, dashboardApi } from '../../api/noticeApi';
import { feeStructureApi } from '../../api/feeStructureApi';
import { feeApi } from '../../api/feeApi';
import { transportApi } from '../../modules/transport/api/transportApi';
import { useAuth } from '../../context/AuthContext';
import { AcademicYear, DashboardStats, Notice, Activity, FeeSummary, Student, Teacher, FeeStructure, PromotionHistoryEntry, FinancialHistoryEntry } from '../../types';

interface AdminDashboardProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

interface ReportColumn {
  id: string;
  label: string;
  category: 'Basic Information' | 'Personal Information' | 'Parent Information' | 'Government IDs' | 'Address' | 'Fee Information' | 'Transport' | 'Bank Details';
}

const CURRENT_MONTH_LABEL = new Date().toLocaleString('en-US', { month: 'long' });
const getCurrentCalendarMonth = () => new Date().toLocaleString('en-US', { month: 'long' });
const getCurrentCalendarYear = () => String(new Date().getFullYear());
const sortAcademicYearsDesc = (a: string, b: string) =>
  b.localeCompare(a, undefined, { numeric: true, sensitivity: 'base' });

const normalizeClassFilterLabel = (value: string) => {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^class\s+/, '');

  if (!normalized) {
    return '';
  }

  if (['nursery', 'lkg', 'ukg'].includes(normalized)) {
    return normalized;
  }

  const numericMatch = normalized.match(/^(\d{1,2})(st|nd|rd|th)?$/);
  if (numericMatch) {
    return numericMatch[1];
  }

  return normalized.replace(/\s+/g, ' ');
};

const FINANCIAL_YEAR_MONTHS = [
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
  'January',
  'February',
  'March'
];

const REPORT_COLUMNS: ReportColumn[] = [
  // Basic Information
  { id: 'name', label: 'Student Name', category: 'Basic Information' },
  { id: 'admissionNo', label: 'Admission No', category: 'Basic Information' },
  { id: 'class', label: 'Class', category: 'Basic Information' },
  { id: 'rollNo', label: 'Roll No', category: 'Basic Information' },
  
  // Personal Information
  { id: 'gender', label: 'Gender', category: 'Personal Information' },
  { id: 'dateOfBirth', label: 'Date of Birth', category: 'Personal Information' },
  { id: 'joiningDate', label: 'Joining Date', category: 'Personal Information' },
  { id: 'category', label: 'Category', category: 'Personal Information' },
  
  // Parent Information
  { id: 'fatherName', label: 'Father Name', category: 'Parent Information' },
  { id: 'motherName', label: 'Mother Name', category: 'Parent Information' },
  { id: 'phone', label: 'Phone Number', category: 'Parent Information' },
  
  // Government IDs
  { id: 'aadharNo', label: 'Aadhaar Number', category: 'Government IDs' },
  { id: 'samagraId', label: 'Samagra ID', category: 'Government IDs' },
  { id: 'apaarId', label: 'APAAR ID', category: 'Government IDs' },
  { id: 'panNo', label: 'PAN Number', category: 'Government IDs' },
  
  // Address
  { id: 'village', label: 'Village', category: 'Address' },
  { id: 'postOffice', label: 'Post Office', category: 'Address' },
  { id: 'tehsil', label: 'Tehsil', category: 'Address' },
  { id: 'district', label: 'District', category: 'Address' },
  { id: 'state', label: 'State', category: 'Address' },
  { id: 'pincode', label: 'Pincode', category: 'Address' },
  
  // Fee Information
  { id: 'totalFee', label: 'Total Fee', category: 'Fee Information' },
  { id: 'paidAmount', label: 'Paid Amount', category: 'Fee Information' },
  { id: 'dueAmount', label: 'Due Amount', category: 'Fee Information' },
  { id: 'status', label: 'Fee Status', category: 'Fee Information' },
  
  // Transport
  { id: 'usesTransport', label: 'Uses Transport', category: 'Transport' },

  // Bank Details
  { id: 'bankAccountHolderName', label: 'Account Holder Name', category: 'Bank Details' },
  { id: 'bankName', label: 'Bank Name', category: 'Bank Details' },
  { id: 'bankAccountNumber', label: 'Account Number', category: 'Bank Details' },
  { id: 'bankIfscCode', label: 'IFSC Code', category: 'Bank Details' },
  { id: 'bankBranchName', label: 'Branch Name', category: 'Bank Details' }
];

const DEFAULT_REPORT_COLUMNS = ['name', 'admissionNo', 'class', 'rollNo'];
const LOCAL_STORAGE_REPORT_COLS_KEY = 'school_student_report_selected_columns';

const createDefaultStudentForm = () => ({
  name: '',
  email: '',
  password: 'password123',
  admissionNo: '',
  class: '',
  academicYear: '',
  rollNo: '',
  fatherName: '',
  motherName: '',
  phone: '',
  gender: 'Male',
  dateOfBirth: '',
  joiningDate: '',
  category: 'General' as 'General' | 'OBC' | 'SC' | 'ST',
  aadharNo: '',
  samagraId: '',
  apaarId: '',
  panNo: '',
  usesTransport: 'No' as 'Yes' | 'No',
  address: {
    village: '',
    postOffice: '',
    tehsil: 'Balaghat',
    district: 'Balaghat',
    state: 'Madhya Pradesh',
    pincode: '481551'
  },
  bankDetails: {
    accountHolderName: '',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    branchName: ''
  }
});

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  currentTab, 
  setCurrentTab,
  searchQuery,
  setSearchQuery
}) => {
  // --- STATE SYSTEM ---
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [fees, setFees] = useState<FeeSummary | null>(null);
  const [distribution, setDistribution] = useState<Record<string, number> | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [promotionSuccessMessage, setPromotionSuccessMessage] = useState('');
  const [academicYearSuccessMessage, setAcademicYearSuccessMessage] = useState('');
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState(getCurrentCalendarMonth);
  const [currentCalendarYear, setCurrentCalendarYear] = useState(getCurrentCalendarYear);
  const [isFeeStructureModalOpen, setIsFeeStructureModalOpen] = useState(false);
  const [editingFeeStructureId, setEditingFeeStructureId] = useState<string | null>(null);
  const [selectedFeeStructure, setSelectedFeeStructure] = useState<FeeStructure | null>(null);
  const [feeStructureForm, setFeeStructureForm] = useState({
    class: 'Class 1',
    admissionFee: '',
    tuitionFee: '',
    computerFee: '',
    examFee: '',
    culturalActivityFee: '',
    academicSession: '',
    juneAmount: '',
    septemberAmount: '',
    decemberAmount: '',
    marchAmount: ''
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  // --- CUSTOM STUDENT FEES RECORDS (INR PRESETS) ---
  const [feeRecords, setFeeRecords] = useState<{
    id: string;
    name: string;
    className: string;
    academicYear?: string;
    category?: string;
    village?: string;
    dueAmount: number;
    totalFee: number;
    paidAmount: number;
    status: 'Partial' | 'Paid' | 'Pending';
    admissionNo: string;
    paymentHistory: { date: string; amount: number; receiptNo?: string; academicYear?: string }[];
  }[]>([]);

  const [selectedFeeStudent, setSelectedFeeStudent] = useState<{
    id: string;
    name: string;
    className: string;
    academicYear?: string;
    category?: string;
    village?: string;
    dueAmount: number;
    totalFee: number;
    paidAmount: number;
    status: 'Partial' | 'Paid' | 'Pending';
    admissionNo: string;
    paymentHistory: { date: string; amount: number; receiptNo?: string; academicYear?: string }[];
  } | null>(null);
  const [studentFinancialHistory, setStudentFinancialHistory] = useState<FinancialHistoryEntry[]>([]);
  const [selectedFinancialYear, setSelectedFinancialYear] = useState<string>('');
  const [studentFinancialHistoryLoading, setStudentFinancialHistoryLoading] = useState(false);
  const [studentFinancialHistoryError, setStudentFinancialHistoryError] = useState('');
  
  const [feeSearchQuery, setFeeSearchQuery] = useState('');
  const [feeClassFilter, setFeeClassFilter] = useState('All');
  const [feeStatusFilter, setFeeStatusFilter] = useState('All');
  const [feeAcademicYearFilter, setFeeAcademicYearFilter] = useState('');
  const [studentAcademicYearFilter, setStudentAcademicYearFilter] = useState('');
  const [studentClassFilter, setStudentClassFilter] = useState('All');
  const [studentSectionFilter, setStudentSectionFilter] = useState('All');
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [selectedViewStudent, setSelectedViewStudent] = useState<Student | null>(null);
  const [isViewStudentModalOpen, setIsViewStudentModalOpen] = useState(false);
  const [isPromotionModalOpen, setIsPromotionModalOpen] = useState(false);
  const [feeStructureSearchQuery, setFeeStructureSearchQuery] = useState('');
  const [feeStructureYearFilter, setFeeStructureYearFilter] = useState('');

  const mapFeeLedgerRecords = useCallback((ledgerStudents: any[] = []) => {
    return ledgerStudents.map((s: any) => ({
      id: s.studentId,
      name: s.name,
      className: s.class || s.className || 'General',
      academicYear: s.academicYear || '',
      dueAmount: s.dueAmount != null ? s.dueAmount : 0,
      totalFee: s.totalFee != null ? s.totalFee : 0,
      paidAmount: s.paidAmount != null ? s.paidAmount : 0,
      status: s.status === 'Unpaid' ? 'Pending' : (s.status === 'Paid' ? 'Paid' : (s.status || 'Pending')),
      admissionNo: s.admissionNo || '',
      category: s.category || 'General',
      village: s.address?.village || '',
      paymentHistory: Array.isArray(s.paymentHistory) ? s.paymentHistory.map((ph: any) => ({
        date: ph.date || '',
        amount: ph.amount != null ? ph.amount : 0,
        receiptNo: ph.receiptNo || '',
        academicYear: ph.academicYear || ''
      })) : []
    }));
  }, []);

  const feeClassOptions = useMemo(() => {
    const classSet = new Set<string>();

    feeRecords.forEach((record) => {
      if (record.className) {
        classSet.add(record.className);
      }
    });

    allStudents.forEach((student) => {
      if (student.class) {
        classSet.add(student.class);
      }
    });

    return Array.from(classSet).sort((a, b) => a.localeCompare(b));
  }, [allStudents, feeRecords]);

  const academicYearLabels = useMemo(
    () => Array.from(new Set(academicYears.map((year) => year.label).filter(Boolean))),
    [academicYears]
  );

  const preferredAcademicYearLabel = useMemo(
    () => academicYears.find((year) => year.isCurrent)?.label || academicYears[0]?.label || '',
    [academicYears]
  );
  const activeFeeStructureYearFilter = feeStructureYearFilter || preferredAcademicYearLabel;

  const feeAcademicYearOptions = useMemo(
    () => [...academicYearLabels].sort(sortAcademicYearsDesc),
    [academicYearLabels]
  );

  const studentSectionOptions = useMemo(() => {
    const sectionSet = new Set<string>();

    allStudents.forEach((student) => {
      if (student.section) {
        sectionSet.add(student.section);
      }
    });

    return Array.from(sectionSet).sort((a, b) => a.localeCompare(b));
  }, [allStudents]);
  
  // Backend Filter, Sorting & Pagination States
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [villageFilter, setVillageFilter] = useState("");
  const [sortBy, setSortBy] = useState("admissionNo");
  const [order, setOrder] = useState("asc");
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [pagination, setPagination] = useState<{
    page: number;
    totalPages: number;
    totalStudents: number;
  } | null>(null);
  
  // Custom interactive payment modal states
  const [isCustomPayModalOpen, setIsCustomPayModalOpen] = useState(false);
  const [customPayAmount, setCustomPayAmount] = useState('');
  const [customPayMode, setCustomPayMode] = useState<'Cash' | 'UPI' | 'Bank Transfer'>('Cash');
  const [customPayNotes, setCustomPayNotes] = useState('');
  const [sendingReceiptWhatsapp, setSendingReceiptWhatsapp] = useState(false);
  const [sendingHistoryReceiptWhatsapp, setSendingHistoryReceiptWhatsapp] = useState<string | null>(null);
  const [receiptDetail, setReceiptDetail] = useState<{
    receiptNo: string;
    amount: number;
    studentName: string;
    className?: string;
    academicYear?: string;
    month?: string;
    admissionNo?: string;
    dueAmount?: number;
    totalFee?: number;
    paidAmount?: number;
    paymentMethod?: string;
  } | null>(null);

  // Authentication Context
  const { user: currentUser } = useAuth();

  // Custom Student Report States
  const [isStudentReportModalOpen, setIsStudentReportModalOpen] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportTransports, setReportTransports] = useState<any[]>([]);
  const [selectedColumns, setSelectedColumns] = useState<string[]>(() => {
    const stored = localStorage.getItem(LOCAL_STORAGE_REPORT_COLS_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        return DEFAULT_REPORT_COLUMNS;
      }
    }
    return DEFAULT_REPORT_COLUMNS;
  });

  // EDIT STATE HOLDERS
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [editingStudentOriginalUsesTransport, setEditingStudentOriginalUsesTransport] = useState<boolean | null>(null);
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);
  const [usesTransportPresetStudentId, setUsesTransportPresetStudentId] = useState<string | null>(null);

  // --- FEE HISTORY & REPORTING SYSTEM STATES ---
  const [feeHistory, setFeeHistory] = useState<any[]>([]);
  const [totalCollection, setTotalCollection] = useState<number>(0);
  const [totalPayments, setTotalPayments] = useState<number>(0);
  const [historyMonth, setHistoryMonth] = useState<string>(currentCalendarMonth);
  const [historyYear, setHistoryYear] = useState<string>('');
  const [historyPaymentMethod, setHistoryPaymentMethod] = useState<string>('All');
  const [historyClassFilter, setHistoryClassFilter] = useState<string>('All');
  const [historyStatusFilter, setHistoryStatusFilter] = useState<string>('All');
  const [historyAcademicYearFilter, setHistoryAcademicYearFilter] = useState<string>('All');
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<any | null>(null);
  const [isHistoryDetailModalOpen, setIsHistoryDetailModalOpen] = useState(false);
  const [studentSearchKeyword, setStudentSearchKeyword] = useState('');

  // SECURE DELETE MODAL STATES
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deleteTargetType, setDeleteTargetType] = useState<'student' | 'teacher' | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteTargetName, setDeleteTargetName] = useState<string>('');
  const [deleteKeyword, setDeleteKeyword] = useState<string>('');
  const [deletePasscode, setDeletePasscode] = useState<string>('');
  const [deleteError, setDeleteError] = useState<string>('');

  // Filter lists based on global search bar (case insensitive)
  const query = searchQuery.trim().toLowerCase();

  // --- MODAL STATE HOLDERS ---
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);
  const [isNoticeModalOpen, setIsNoticeModalOpen] = useState(false);
  const [isFeeModalOpen, setIsFeeModalOpen] = useState(false);
  const [feeModalSearchQuery, setFeeModalSearchQuery] = useState('');
  const [isStudentFormErrorModalOpen, setIsStudentFormErrorModalOpen] = useState(false);
  const [studentFormErrorTitle, setStudentFormErrorTitle] = useState('');
  const [studentFormErrorMessages, setStudentFormErrorMessages] = useState<string[]>([]);

  // Form Field States
  const [studentForm, setStudentForm] = useState(createDefaultStudentForm());
  const previousCalendarMonthRef = useRef(currentCalendarMonth);
  
  const [teacherForm, setTeacherForm] = useState({
    name: '',
    email: '',
    password: 'password123',
    subject: '',
    department: 'Science',
    contact: ''
  });

  const [noticeForm, setNoticeForm] = useState({
    title: '',
    content: '',
    priority: 'Medium',
    publishedBy: 'Admin Office'
  });

  const [feeForm, setFeeForm] = useState({
    studentId: '',
    amountPaid: '',
    paymentMethod: 'Cash'
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitLoading, setSubmitLoading] = useState(false);

  // --- FETCH REFRESH ROUTINE (GENERAL DASHBOARD STATS) ---
  useEffect(() => {
    const loadDashboardData = async () => {
      setLoading(true);
      try {
        const [statsRes, noticeRes, activityRes, feeRes, distRes, studentsFullRes, teachersRes, feeStructuresRes, academicYearsRes] = await Promise.all([
          dashboardApi.getStats(),
          noticeApi.getRecentNotices(),
          dashboardApi.getActivities(),
          studentApi.getFeesOverview(),
          studentApi.getStudentDistribution(),
          studentApi.getStudents({ limit: 1000 }), // Retrieve up to 1000 students for complete general school statistics and ledgers
          teacherApi.getTeachers(),
          feeStructureApi.getFeeStructures(),
          studentApi.getAcademicYears()
        ]);

        const studentsFullList = studentsFullRes && 'students' in studentsFullRes ? studentsFullRes.students : (Array.isArray(studentsFullRes) ? studentsFullRes : []);

        setStats(statsRes);
        setNotices(noticeRes);
        setActivities(activityRes);
        setFees(feeRes);
        setDistribution(distRes);
        setAllStudents(studentsFullList);
        setTeachers(teachersRes);
        setFeeStructures(feeStructuresRes);
        setAcademicYears(academicYearsRes);
      } catch (err) {
        console.error('Error synchronizing school logs:', err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [refreshTrigger]);

  useEffect(() => {
    const loadFeeLedger = async () => {
      try {
        const feeLedgerParams: {
          limit: number;
          status: string;
          academicYear?: string;
        } = {
          limit: 1000,
          status: feeStatusFilter
        };

        if (academicYears.length > 0 && feeAcademicYearFilter) {
          feeLedgerParams.academicYear = feeAcademicYearFilter;
        }

        const feeLedgerRes = await feeApi.getFeeLedger(feeLedgerParams);

        const mappedFeeRecords = mapFeeLedgerRecords(feeLedgerRes.students || []);
        setFeeRecords(mappedFeeRecords);
        setSelectedFeeStudent((current) => {
          if (!mappedFeeRecords.length) {
            return null;
          }

          if (current) {
            return mappedFeeRecords.find((item) => item.id === current.id) || mappedFeeRecords[0];
          }

          return mappedFeeRecords[0];
        });
      } catch (err) {
        console.error('Error loading fee ledger:', err);
        setFeeRecords([]);
        setSelectedFeeStudent(null);
      }
    };

    loadFeeLedger();
  }, [academicYears.length, feeStatusFilter, feeAcademicYearFilter, refreshTrigger, mapFeeLedgerRecords]);

  useEffect(() => {
    if (!academicYears.length) {
      return;
    }

    if (!studentAcademicYearFilter || !academicYears.some((year) => year.label === studentAcademicYearFilter)) {
      const currentYear = academicYears.find((year) => year.isCurrent)?.label || academicYears[0]?.label || '';
      setStudentAcademicYearFilter(currentYear);
    }
  }, [academicYears, studentAcademicYearFilter]);

  useEffect(() => {
    if (!academicYears.length) {
      return;
    }

    const preferredAcademicYear =
      academicYears.find((year) => year.isCurrent)?.label ||
      academicYears[0]?.label ||
      '';

    setFeeAcademicYearFilter((current) =>
      current && academicYears.some((year) => year.label === current)
        ? current
        : preferredAcademicYear
    );
    setHistoryYear((current) =>
      current && academicYears.some((year) => year.label === current)
        ? current
        : preferredAcademicYear
    );
    setHistoryAcademicYearFilter((current) =>
      current && academicYears.some((year) => year.label === current)
        ? current
        : preferredAcademicYear
    );
    setFeeStructureForm((current) => (
      current.academicSession && academicYears.some((year) => year.label === current.academicSession)
        ? current
        : { ...current, academicSession: preferredAcademicYear }
    ));
    setFeeStructureYearFilter((current) => {
      if (current && academicYears.some((year) => year.label === current)) {
        return current;
      }
      return preferredAcademicYear;
    });
  }, [academicYears]);

  useEffect(() => {
    const syncCalendarFilters = () => {
      const nextMonth = getCurrentCalendarMonth();
      const nextYear = getCurrentCalendarYear();
      const previousMonth = previousCalendarMonthRef.current;

      setCurrentCalendarMonth(nextMonth);
      setCurrentCalendarYear(nextYear);

      setHistoryMonth((current) => (current === previousMonth ? nextMonth : current));
      previousCalendarMonthRef.current = nextMonth;
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

  // --- FETCH FEE HISTORY & REPORTING ---
  useEffect(() => {
    const fetchFeeHistory = async () => {
      try {
        const params: any = {};
        if (historyMonth !== 'All') {
          params.month = historyMonth;
        }
        if (historyYear && historyYear !== 'All') {
          params.academicYear = historyYear;
        }
        if (historyPaymentMethod !== 'All') {
          params.paymentMethod = historyPaymentMethod;
        }
        if (historyClassFilter !== 'All') {
          params.className = historyClassFilter;
        }
        if (historyStatusFilter !== 'All') {
          params.status = historyStatusFilter;
        }
        if (historyAcademicYearFilter !== 'All') {
          params.academicYear = historyAcademicYearFilter;
        }

        const data = await feeApi.getFeeHistory(params);
        setFeeHistory(data.history || []);
        setTotalCollection(data.totalCollection || 0);
        setTotalPayments(data.totalPayments || 0);
      } catch (err) {
        console.error('Failed to load fee history:', err);
      }
    };

    fetchFeeHistory();
  }, [historyClassFilter, historyMonth, historyYear, historyPaymentMethod, historyStatusFilter, historyAcademicYearFilter, refreshTrigger]);

  useEffect(() => {
    const fetchStudentFinancialHistory = async () => {
      if (!selectedFeeStudent?.id) {
        setStudentFinancialHistory([]);
        setSelectedFinancialYear('');
        setStudentFinancialHistoryError('');
        return;
      }

      setStudentFinancialHistoryLoading(true);
      setStudentFinancialHistoryError('');

      try {
        const history = await studentApi.getStudentFinancialHistory(selectedFeeStudent.id);
        setStudentFinancialHistory(history || []);
        setSelectedFinancialYear((current) => {
          if (current && history.some((entry) => entry.academicYear === current)) {
            return current;
          }

          return history[0]?.academicYear || selectedFeeStudent.academicYear || '';
        });
      } catch (error) {
        console.error('Failed to load student financial history:', error);
        setStudentFinancialHistory([]);
        setSelectedFinancialYear('');
        setStudentFinancialHistoryError('Failed to load academic year history');
      } finally {
        setStudentFinancialHistoryLoading(false);
      }
    };

    fetchStudentFinancialHistory();
  }, [selectedFeeStudent?.id, selectedFeeStudent?.academicYear, refreshTrigger]);

  // --- PAGINATED STUDENT DIRECTORY LOADER ---
  const loadStudents = useCallback(async () => {
    try {
      const res = await studentApi.getStudents({
        page,
        limit,
        category: categoryFilter,
        village: villageFilter,
        class: studentClassFilter,
        section: studentSectionFilter,
        academicYear: studentAcademicYearFilter,
        sortBy,
        order,
        search: studentSearchQuery.trim()
      });

      if (res && 'students' in res) {
        setStudents(res.students);
        setPagination(res.pagination || null);
      } else {
        const rawList = Array.isArray(res) ? res : [];
        setStudents(rawList);
        setPagination({
          page: 1,
          totalPages: 1,
          totalStudents: rawList.length
        });
      }
    } catch (err) {
      console.error('Error loading paginated students:', err);
    }
  }, [page, limit, categoryFilter, villageFilter, studentClassFilter, studentSectionFilter, studentAcademicYearFilter, sortBy, order, studentSearchQuery]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents, refreshTrigger]);

  useEffect(() => {
    const handleAcademicYearUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<{ message?: string }>;
      setAcademicYearSuccessMessage(customEvent.detail?.message || 'Academic year updated');
      triggerDataRefresh();
    };

    window.addEventListener('school:academic-year-updated', handleAcademicYearUpdated as EventListener);
    return () => {
      window.removeEventListener('school:academic-year-updated', handleAcademicYearUpdated as EventListener);
    };
  }, []);

  useEffect(() => {
    setPage(1);
  }, [studentSearchQuery, categoryFilter, villageFilter, studentClassFilter, studentSectionFilter, studentAcademicYearFilter]);

  const triggerDataRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const promotionAcademicYears = useMemo(() => {
    return [...academicYearLabels].sort(sortAcademicYearsDesc);
  }, [academicYearLabels]);

  const activeFinancialEntry = useMemo(() => {
    if (selectedFinancialYear) {
      return studentFinancialHistory.find((entry) => entry.academicYear === selectedFinancialYear) || null;
    }

    return studentFinancialHistory[0] || null;
  }, [selectedFinancialYear, studentFinancialHistory]);

  const paymentLedgerEntry = useMemo(() => {
    if (!selectedFeeStudent) return null;

    return {
      ...selectedFeeStudent,
      academicYear: activeFinancialEntry?.academicYear || selectedFeeStudent.academicYear || '',
      className: activeFinancialEntry?.className || selectedFeeStudent.className,
      totalFee: activeFinancialEntry?.totalFee ?? selectedFeeStudent.totalFee ?? 0,
      paidAmount: activeFinancialEntry?.paidAmount ?? selectedFeeStudent.paidAmount ?? 0,
      dueAmount: activeFinancialEntry?.dueAmount ?? selectedFeeStudent.dueAmount ?? 0,
      status: activeFinancialEntry?.status || selectedFeeStudent.status
    };
  }, [activeFinancialEntry, selectedFeeStudent]);

  const visibleFeeRecords = useMemo(() => {
    const searchTerm = feeSearchQuery.trim().toLowerCase();

    return feeRecords.filter((record) => {
      const matchesSearch =
        !searchTerm ||
        (record.name || '').toLowerCase().includes(searchTerm) ||
        (record.admissionNo || '').toLowerCase().includes(searchTerm);

      const matchesClass =
        feeClassFilter === 'All' ||
        (() => {
          const classParts = (record.className || '').split('-');
          const recordBase = classParts[0].trim().toLowerCase();
          const filterLower = feeClassFilter.trim().toLowerCase();

          const isNurseryMatch = filterLower === 'nursery' && recordBase === 'nursery';
          const isJKGMatch = filterLower === 'jkg' && (recordBase === 'jkg' || recordBase === 'lkg');
          const isSKGMatch = filterLower === 'skg' && (recordBase === 'skg' || recordBase === 'ukg');

          const getNumericValue = (str: string) => str.replace(/(st|nd|rd|th)/g, '');
          const filterNumeric = getNumericValue(filterLower);
          const recordNumeric = getNumericValue(recordBase);

          const isNumericMatch = !!(
            filterNumeric &&
            recordNumeric &&
            (filterNumeric === recordNumeric || filterLower.startsWith(recordBase) || recordBase.startsWith(filterLower))
          );

          return (
            isNurseryMatch ||
            isJKGMatch ||
            isSKGMatch ||
            isNumericMatch ||
            recordBase === filterLower ||
            (record.className || '').toLowerCase().includes(filterLower)
          );
        })();

      const matchesStatus = feeStatusFilter === 'All' || record.status === feeStatusFilter;
      const matchesAcademicYear =
        feeAcademicYearFilter === 'All' || (record.academicYear || '') === feeAcademicYearFilter;

      return matchesSearch && matchesClass && matchesStatus && matchesAcademicYear;
    });
  }, [feeAcademicYearFilter, feeClassFilter, feeRecords, feeSearchQuery, feeStatusFilter]);

  const studentFinancialTimeline = useMemo(
    () =>
      [...studentFinancialHistory].sort(
        (a, b) => (b.academicYear || '').localeCompare(a.academicYear || '')
      ),
    [studentFinancialHistory]
  );

  const selectedStudentSnapshot = useMemo(() => {
    if (!selectedFeeStudent) return null;

    return {
      name: selectedFeeStudent.name,
      admissionNo: selectedFeeStudent.admissionNo,
      currentClass: selectedFeeStudent.className,
      currentAcademicYear: selectedFeeStudent.academicYear || ''
    };
  }, [selectedFeeStudent]);

  const handlePromotionSuccess = (result: {
    promoted: number;
    skipped: number;
    alreadyExisted: number;
    totalSelected: number;
    promoteAllStudents: boolean;
  }, message: string) => {
    void result;
    setPromotionSuccessMessage(message);
    triggerDataRefresh();
  };

  const openStudentFormErrorModal = (title: string, errors: Record<string, string>) => {
    const messages = Object.entries(errors)
      .filter(([, value]) => Boolean(value))
      .map(([field, value]) => {
        const label = field === 'submit'
          ? 'Submission'
          : field
              .replace(/([A-Z])/g, ' $1')
              .replace(/^./, (char) => char.toUpperCase())
              .replace(/_/g, ' ');
        return `${label}: ${value}`;
      });

    setStudentFormErrorTitle(title);
    setStudentFormErrorMessages(messages.length ? messages : [title]);
    setIsStudentFormErrorModalOpen(true);
  };

  const openAddStudentModal = () => {
    setEditingStudentId(null);
    setEditingStudentOriginalUsesTransport(null);
    setStudentForm({
      ...createDefaultStudentForm(),
      academicYear: preferredAcademicYearLabel
    });
    setFormErrors({});
    setStudentFormErrorMessages([]);
    setStudentFormErrorTitle('');
    setIsStudentFormErrorModalOpen(false);
    setIsStudentModalOpen(true);
  };

  const closeStudentModal = () => {
    setIsStudentModalOpen(false);
    setEditingStudentId(null);
    setEditingStudentOriginalUsesTransport(null);
    setFormErrors({});
    setIsStudentFormErrorModalOpen(false);
    setStudentFormErrorMessages([]);
    setStudentFormErrorTitle('');
  };

  const handleDashboardCollectTermFee = () => {
    setCurrentTab('fees');
    const activeRecord =
      (selectedFeeStudent && visibleFeeRecords.some((record) => record.id === selectedFeeStudent.id)
        ? selectedFeeStudent
        : visibleFeeRecords[0] || selectedFeeStudent || feeRecords[0]) || null;
    if (activeRecord) {
      setSelectedFeeStudent(activeRecord);
      setSelectedFinancialYear(activeFinancialEntry?.academicYear || activeRecord.academicYear || '');
      setCustomPayAmount(String(activeFinancialEntry?.dueAmount ?? activeRecord.dueAmount ?? 0));
      setCustomPayMode('Cash');
      setCustomPayNotes('');
      setReceiptDetail(null);
      setIsCustomPayModalOpen(true);
    }
  };

  // --- FORM SUBMISSIONS & EDIT / DELETE TRIGGER HANDLERS ---
  const handleEditStudentClick = (stu: Student) => {
    setEditingStudentId(stu.id);
    setEditingStudentOriginalUsesTransport(Boolean(stu.usesTransport));
    setStudentForm({
      ...createDefaultStudentForm(),
      name: stu.name,
      email: stu.email || 'student@gmail.com',
      password: 'password123',
      admissionNo: stu.admissionNo || stu.rollNumber || '',
      class: stu.class || '',
      academicYear: stu.academicYear || preferredAcademicYearLabel,
      rollNo: String(stu.rollNo || ''),
      fatherName: stu.fatherName || stu.parentName || '',
      motherName: stu.motherName || '',
      phone: stu.phone || stu.contact || '',
      gender: stu.gender || 'Male',
      dateOfBirth: stu.dateOfBirth || '',
      joiningDate: stu.joiningDate || '',
      category: stu.category || 'General',
      aadharNo: stu.aadharNo || '',
      samagraId: stu.samagraId || '',
      apaarId: stu.apaarId || '',
      panNo: stu.panNo || '',
      usesTransport: stu.usesTransport ? 'Yes' : 'No',
      address: {
        village: stu.address?.village || '',
        postOffice: stu.address?.postOffice || '',
        tehsil: stu.address?.tehsil || '',
        district: stu.address?.district || '',
        state: stu.address?.state || '',
        pincode: stu.address?.pincode || ''
      },
      bankDetails: {
        accountHolderName: stu.bankDetails?.accountHolderName || '',
        bankName: stu.bankDetails?.bankName || '',
        accountNumber: stu.bankDetails?.accountNumber || '',
        ifscCode: stu.bankDetails?.ifscCode || '',
        branchName: stu.bankDetails?.branchName || ''
      }
    });
    setFormErrors({});
    setIsStudentModalOpen(true);
  };

  const handleEditTeacherClick = (t: Teacher) => {
    setEditingTeacherId(t.id);
    setTeacherForm({
      name: t.name,
      email: t.email,
      password: 'password123',
      subject: t.subject,
      department: t.department || 'Science',
      contact: t.contact
    });
    setIsTeacherModalOpen(true);
  };

  const handlePrepareDeleteStudent = (stu: Student) => {
    setDeleteTargetType('student');
    setDeleteTargetId(stu.id);
    setDeleteTargetName(stu.name);
    setDeleteKeyword('');
    setDeletePasscode('');
    setDeleteError('');
    setIsDeleteConfirmOpen(true);
  };

  const handlePrepareDeleteTeacher = (t: Teacher) => {
    setDeleteTargetType('teacher');
    setDeleteTargetId(t.id);
    setDeleteTargetName(t.name);
    setDeleteKeyword('');
    setDeletePasscode('');
    setDeleteError('');
    setIsDeleteConfirmOpen(true);
  };

  const executeSecureDelete = async () => {
    setDeleteError('');
    if (deleteKeyword.toUpperCase() !== 'CONFIRM') {
      setDeleteError('Please type CONFIRM exactly to verify your intent.');
      return;
    }
    if (deletePasscode !== 'admin123') {
      setDeleteError('Authorization security code is invalid (Enter: admin123).');
      return;
    }

    setSubmitLoading(true);
    try {
      if (deleteTargetType === 'student' && deleteTargetId) {
        await studentApi.deleteStudent(deleteTargetId);
      } else if (deleteTargetType === 'teacher' && deleteTargetId) {
        await teacherApi.deleteTeacher(deleteTargetId);
      }
      setIsDeleteConfirmOpen(false);
      triggerDataRefresh();
    } catch (err: any) {
      setDeleteError(err.message || 'Purge action failed');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    const errors: Record<string, string> = {};
    if (!studentForm.name) {
      errors.name = 'Student name is required';
    }
    if (!studentForm.email) {
      errors.email = 'Login email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(studentForm.email.trim())) {
      errors.email = 'Enter a valid email address';
    }
    if (!studentForm.password) {
      errors.password = 'Password is required';
    }
    if (!studentForm.admissionNo) {
      errors.admissionNo = 'Admission number is required';
    }
    if (!studentForm.class) {
      errors.class = 'Please select a class';
    }
    if (!studentForm.rollNo) {
      errors.rollNo = 'Roll number is required';
    }
    if (!studentForm.fatherName) {
      errors.fatherName = 'Father name is required';
    }
    if (!studentForm.motherName) {
      errors.motherName = 'Mother name is required';
    }

    // Aadhaar → 12 digits
    if (studentForm.aadharNo && !/^\d{12}$/.test(studentForm.aadharNo)) {
      errors.aadharNo = 'Aadhaar No must be exactly 12 digits';
    }
    // Phone → 10 digits
    const cleanPhone = studentForm.phone.replace(/[\s\-\+\(\)]/g, '');
    if (studentForm.phone && !/^\d{10}$/.test(cleanPhone)) {
      errors.phone = 'Enter 10 digit number';
    }
    // PAN → 10 characters (typically 5 uppercase letters, 4 digits, 1 uppercase letter)
    if (studentForm.panNo && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i.test(studentForm.panNo)) {
      errors.panNo = 'PAN No must be 10 valid characters (e.g., ABCDE1234F)';
    }
    // Pincode → 6 digits
    if (studentForm.address.pincode && !/^\d{6}$/.test(studentForm.address.pincode)) {
      errors.pincode = 'Pincode must be exactly 6 digits';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      openStudentFormErrorModal(
        'Please fix the highlighted student form errors before submitting.',
        errors
      );
      return;
    }

    setSubmitLoading(true);
    try {
      let savedStudent: any;
      const isEditingStudent = Boolean(editingStudentId);
      const shouldOpenTransportAssignment =
        (!isEditingStudent && studentForm.usesTransport === 'Yes') ||
        (isEditingStudent &&
          editingStudentOriginalUsesTransport === false &&
          studentForm.usesTransport === 'Yes');

      if (editingStudentId) {
        savedStudent = await studentApi.updateStudent(editingStudentId, studentForm as any);
        setEditingStudentId(null);
      } else {
        savedStudent = await studentApi.addStudent(studentForm as any);
      }
      setIsStudentModalOpen(false);
      const studentIdForTransport = savedStudent?.id || savedStudent?._id;

      setStudentForm(createDefaultStudentForm());
      setEditingStudentOriginalUsesTransport(null);
      triggerDataRefresh();

      if (shouldOpenTransportAssignment && studentIdForTransport) {
        setUsesTransportPresetStudentId(studentIdForTransport);
        setCurrentTab('transport');
      }
    } catch (err: any) {
      const submitError = err?.response?.data?.message || err.message || 'Admission failed';
      const serverErrors = {
        submit: submitError
      };
      setFormErrors(serverErrors);
      openStudentFormErrorModal('Student admission failed.', serverErrors);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleTeacherSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    if (!teacherForm.name || !teacherForm.subject) {
      setFormErrors({ 
        name: !teacherForm.name ? 'Teacher name is required' : '',
        subject: !teacherForm.subject ? 'Assigned subject is required' : ''
      });
      return;
    }

    setSubmitLoading(true);
    try {
      if (editingTeacherId) {
        await teacherApi.updateTeacher(editingTeacherId, teacherForm as any);
        setEditingTeacherId(null);
      } else {
        await teacherApi.addTeacher(teacherForm as any);
      }
      setIsTeacherModalOpen(false);
      setTeacherForm({ name: '', email: '', password: 'password123', subject: '', department: 'Science', contact: '' });
      triggerDataRefresh();
    } catch (err: any) {
      setFormErrors({ submit: err.response?.data?.message || err.message || 'Onboarding failed' });
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleNoticeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    if (!noticeForm.title || !noticeForm.content) {
      setFormErrors({ 
        title: !noticeForm.title ? 'Announcement header title is required' : '',
        content: !noticeForm.content ? 'Announcement body content is required' : ''
      });
      return;
    }

    setSubmitLoading(true);
    try {
      await noticeApi.createNotice(noticeForm);
      setIsNoticeModalOpen(false);
      setNoticeForm({ title: '', content: '', priority: 'Medium', publishedBy: 'Admin Office' });
      triggerDataRefresh();
    } catch (err: any) {
      setFormErrors({ submit: err.response?.data?.message || err.message || 'Publishing failed' });
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleFeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    if (!feeForm.studentId || !feeForm.amountPaid) {
      setFormErrors({ 
        studentId: !feeForm.studentId ? 'Please select a registered student' : '',
        amountPaid: !feeForm.amountPaid ? 'Specify a ledger settlement amount' : ''
      });
      return;
    }

    setSubmitLoading(true);
    try {
      await studentApi.collectFee({
        studentId: feeForm.studentId,
        amountPaid: parseFloat(feeForm.amountPaid),
        paymentMethod: feeForm.paymentMethod
      });

      // Synchronize with local storage fee history
      const selectedStudent = allStudents.find(s => s.id === feeForm.studentId);
     
      setIsFeeModalOpen(false);
      setFeeForm({ studentId: '', amountPaid: '', paymentMethod: 'Cash' });
      triggerDataRefresh();
    } catch (err: any) {
      setFormErrors({ submit: err.response?.data?.message || err.message || 'Transaction recording failed' });
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleAddFeeStructureClick = () => {
    setEditingFeeStructureId(null);
    setFeeStructureForm({
      class: 'Class 1',
      admissionFee: '',
      tuitionFee: '',
      computerFee: '',
      examFee: '',
      culturalActivityFee: '',
      academicSession: preferredAcademicYearLabel,
      juneAmount: '',
      septemberAmount: '',
      decemberAmount: '',
      marchAmount: ''
    });
    setIsFeeStructureModalOpen(true);
  };

  const handleEditFeeStructureClick = (fs: FeeStructure) => {
    setEditingFeeStructureId((fs as any)._id);;
    setFeeStructureForm({
      class: fs.class || 'Class 1',
      admissionFee: String(fs.admissionFee || ''),
      tuitionFee: String(fs.tuitionFee || ''),
      computerFee: String(fs.computerFee || ''),
      examFee: String(fs.examFee || ''),
      culturalActivityFee: String(fs.culturalActivityFee || ''),
      academicSession: fs.academicYear || fs.academicSession || '',
      juneAmount: String(fs.juneAmount || ''),
      septemberAmount: String(fs.septemberAmount || ''),
      decemberAmount: String(fs.decemberAmount || ''),
      marchAmount: String(fs.marchAmount || '')
    });
    setIsFeeStructureModalOpen(true);
  };

  const handleAutoGenerateInstallments = () => {
    const total = 
      (Number(feeStructureForm.admissionFee) || 0) +
      (Number(feeStructureForm.tuitionFee) || 0) +
      (Number(feeStructureForm.computerFee) || 0) +
      (Number(feeStructureForm.examFee) || 0) +
      (Number(feeStructureForm.culturalActivityFee) || 0);

    const equalAmount = Math.round(total / 4);
    setFeeStructureForm(prev => ({
      ...prev,
      juneAmount: String(equalAmount),
      septemberAmount: String(equalAmount),
      decemberAmount: String(equalAmount),
      marchAmount: String(total - (equalAmount * 3))
    }));
  };

  const handleFeeStructureSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    setSubmitLoading(true);
    try {
    const payload = {
      class: feeStructureForm.class,
      admissionFee: Number(feeStructureForm.admissionFee) || 0,
        tuitionFee: Number(feeStructureForm.tuitionFee) || 0,
        computerFee: Number(feeStructureForm.computerFee) || 0,
        examFee: Number(feeStructureForm.examFee) || 0,
        culturalActivityFee: Number(feeStructureForm.culturalActivityFee) || 0,
        monthlyFee: Math.round(Number(feeStructureForm.tuitionFee) || 0),
        academicYear: feeStructureForm.academicSession,
        academicSession: feeStructureForm.academicSession,
        juneAmount: Number(feeStructureForm.juneAmount) || 0,
        septemberAmount: Number(feeStructureForm.septemberAmount) || 0,
        decemberAmount: Number(feeStructureForm.decemberAmount) || 0,
        marchAmount: Number(feeStructureForm.marchAmount) || 0,
      };

      if (editingFeeStructureId) {
        await feeStructureApi.updateFeeStructure(editingFeeStructureId, payload as any);
        setEditingFeeStructureId(null);
      } else {
        await feeStructureApi.addFeeStructure(payload as any);
      }
      setIsFeeStructureModalOpen(false);
      triggerDataRefresh();
    } catch (err: any) {
      setFormErrors({ submit: err.response?.data?.message || err.message || 'Action failed' });
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDeleteFeeStructureClick = async (id: string) => {
    if (confirm('Are you sure you want to delete this fee structure?')) {
      try {
        await feeStructureApi.deleteFeeStructure(id);
        triggerDataRefresh();
      } catch (err) {
        console.error('Error deleting fee structure:', err);
      }
    }
  };

  const handleExportStudentsExcel = () => {
    const headers = [
      'ID', 'Name', 'Email', 'Admission No', 'Class', 'Roll No', 
      'Gender', 'Date of Birth', 'Joining Date', 'Category', 'Phone', 
      'Father Name', 'Mother Name', 'Aadhaar No', 'Samagra ID', 'APAAR ID', 'PAN No',
      'Village', 'Post Office', 'Tehsil', 'District', 'State', 'Pincode',
      'Account Holder Name', 'Bank Name', 'Account Number', 'IFSC Code', 'Branch Name'
    ];
    const keys = [
      'id', 'name', 'email', 'admissionNo', 'class', 'rollNo',
      'gender', 'dateOfBirth', 'joiningDate', 'category', 'phone',
      'fatherName', 'motherName', 'aadharNo', 'samagraId', 'apaarId', 'panNo',
      'village', 'postOffice', 'tehsil', 'district', 'state', 'pincode',
      'bankAccountHolderName', 'bankName', 'bankAccountNumber', 'bankIfscCode', 'bankBranchName'
    ];
    const dataToExport = filteredStudents.map(student => ({
      ...student,
      dateOfBirth: formatDate(student.dateOfBirth),
      joiningDate: formatDate(student.joiningDate),
      admissionNo: student.admissionNo || student.rollNumber || '',
      class: student.class || 'Nursery',
      rollNo: student.rollNo || '',
      phone: student.phone || student.contact || '',
      fatherName: student.fatherName || student.parentName || '',
      village: student.address?.village || '',
      postOffice: student.address?.postOffice || '',
      tehsil: student.address?.tehsil || '',
      district: student.address?.district || '',
      state: student.address?.state || '',
      pincode: student.address?.pincode || '',
      bankAccountHolderName: student.bankDetails?.accountHolderName || '',
      bankName: student.bankDetails?.bankName || '',
      bankAccountNumber: student.bankDetails?.accountNumber || '',
      bankIfscCode: student.bankDetails?.ifscCode || '',
      bankBranchName: student.bankDetails?.branchName || ''
    }));
    exportToExcel(dataToExport, headers, keys, `Students_Roster_${new Date().toISOString().split('T')[0]}`);
  };

  const getColumnValue = (student: Student, colId: string, transportsList: any[]): string => {
    switch (colId) {
      case 'name': return student.name || '';
      case 'admissionNo': return student.admissionNo || '';
      case 'class': return student.class || '';
      case 'rollNo': return student.rollNo != null ? String(student.rollNo) : '';
      case 'gender': return student.gender || '';
      case 'dateOfBirth': return formatDate(student.dateOfBirth);
      case 'joiningDate': return formatDate(student.joiningDate || student.admissionDate);
      case 'category': return student.category || '';
      case 'fatherName': return student.fatherName || '';
      case 'motherName': return student.motherName || '';
      case 'phone': return student.phone || student.contact || '';
      case 'aadharNo': return student.aadharNo || '';
      case 'samagraId': return student.samagraId || '';
      case 'apaarId': return student.apaarId || '';
      case 'panNo': return student.panNo || '';
      case 'village': return student.address?.village || '';
      case 'postOffice': return student.address?.postOffice || '';
      case 'tehsil': return student.address?.tehsil || '';
      case 'district': return student.address?.district || '';
      case 'state': return student.address?.state || '';
      case 'pincode': return student.address?.pincode || '';
      case 'totalFee': return student.totalFee != null ? `₹${student.totalFee}` : '';
      case 'paidAmount': return student.paidAmount != null ? `₹${student.paidAmount}` : '';
      case 'dueAmount': return student.dueAmount != null ? `₹${student.dueAmount}` : '';
      case 'status': return student.status || '';
      case 'usesTransport': {
        const hasTransport = (transportsList || []).some(t => t.studentId === student.id || (student.admissionNo && t.admissionNo === student.admissionNo));
        return hasTransport ? 'Yes' : 'No';
      }
      case 'bankAccountHolderName': return student.bankDetails?.accountHolderName || '';
      case 'bankName': return student.bankDetails?.bankName || '';
      case 'bankAccountNumber': return student.bankDetails?.accountNumber || '';
      case 'bankIfscCode': return student.bankDetails?.ifscCode || '';
      case 'bankBranchName': return student.bankDetails?.branchName || '';
      default: return '';
    }
  };

  const handleExportStudentsPDF = () => {
    setIsStudentReportModalOpen(true);
  };

  const handlePrintStudentProfile = (student: Student) => {
    const isBankEmpty = !student.bankDetails || (
      !student.bankDetails.accountHolderName &&
      !student.bankDetails.bankName &&
      !student.bankDetails.accountNumber &&
      !student.bankDetails.ifscCode &&
      !student.bankDetails.branchName
    );

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Student Profile: ${student.name}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
            body {
              font-family: 'Inter', sans-serif;
              color: #0f172a;
              padding: 40px;
              margin: 0;
              background-color: #ffffff;
              line-height: 1.5;
            }
            .header {
              display: flex;
              align-items: center;
              border-bottom: 2px solid #e2e8f0;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .header-info {
              margin-left: 10px;
            }
            .school-title {
              font-size: 10px;
              font-weight: 800;
              color: #3b82f6;
              text-transform: uppercase;
              letter-spacing: 0.15em;
            }
            .student-name {
              font-size: 24px;
              font-weight: 800;
              margin: 5px 0;
            }
            .student-meta {
              font-size: 12px;
              color: #64748b;
              font-weight: 600;
            }
            .section {
              margin-bottom: 25px;
            }
            .section-title {
              font-size: 11px;
              font-weight: 800;
              color: #64748b;
              text-transform: uppercase;
              letter-spacing: 0.1em;
              border-bottom: 1px dashed #cbd5e1;
              padding-bottom: 5px;
              margin-bottom: 12px;
            }
            .grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 15px;
            }
            .field {
              font-size: 12px;
              display: flex;
              justify-content: space-between;
              border-bottom: 1px solid #f1f5f9;
              padding-bottom: 4px;
            }
            .label {
              color: #64748b;
              font-weight: 500;
            }
            .value {
              color: #0f172a;
              font-weight: 700;
            }
            .print-btn {
              position: fixed;
              bottom: 20px;
              right: 20px;
              background-color: #2563eb;
              color: white;
              border: none;
              padding: 10px 18px;
              border-radius: 8px;
              font-weight: 600;
              font-size: 12px;
              cursor: pointer;
              box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
            }
            .print-btn:hover {
              background-color: #1d4ed8;
            }
            @media print {
              .print-btn { display: none !important; }
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <button class="print-btn" onclick="window.print()">Print Profile</button>
          
          <div class="header">
            <div class="header-info">
              <div class="school-title">Official Student Registry Dossier</div>
              <div class="student-name">${student.name}</div>
              <div class="student-meta">Class ${student.class || 'N/A'} | Admission No: ${student.admissionNo || 'N/A'} | Roll No: ${student.rollNo || 'N/A'}</div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Academic & Personal Details</div>
            <div class="grid">
              <div class="field"><span class="label">Gender:</span><span class="value">${student.gender || 'Male'}</span></div>
              <div class="field"><span class="label">Date of Birth:</span><span class="value">${formatDate(student.dateOfBirth)}</span></div>
              <div class="field"><span class="label">Joining Date:</span><span class="value">${formatDate(student.joiningDate || student.admissionDate)}</span></div>
              <div class="field"><span class="label">Category:</span><span class="value">${student.category || 'General'}</span></div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Government Identifications</div>
            <div class="grid">
              <div class="field"><span class="label">Aadhaar Number:</span><span class="value">${student.aadharNo || 'N/A'}</span></div>
              <div class="field"><span class="label">Samagra ID:</span><span class="value">${student.samagraId || 'N/A'}</span></div>
              <div class="field"><span class="label">APAAR ID:</span><span class="value">${student.apaarId || 'N/A'}</span></div>
              <div class="field"><span class="label">PAN Number:</span><span class="value">${student.panNo || 'N/A'}</span></div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Parent & Family Contact</div>
            <div class="grid">
              <div class="field"><span class="label">Father's Name:</span><span class="value">${student.fatherName || 'N/A'}</span></div>
              <div class="field"><span class="label">Mother's Name:</span><span class="value">${student.motherName || 'N/A'}</span></div>
              <div class="field"><span class="label">Phone Number:</span><span class="value">${student.phone || 'N/A'}</span></div>
              <div class="field"><span class="label">Email Address:</span><span class="value">${student.email || 'N/A'}</span></div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Residential Address</div>
            <div class="grid">
              <div class="field"><span class="label">Village:</span><span class="value">${student.address?.village || 'N/A'}</span></div>
              <div class="field"><span class="label">Post Office:</span><span class="value">${student.address?.postOffice || 'N/A'}</span></div>
              <div class="field"><span class="label">Tehsil:</span><span class="value">${student.address?.tehsil || 'N/A'}</span></div>
              <div class="field"><span class="label">District:</span><span class="value">${student.address?.district || 'N/A'}</span></div>
              <div class="field"><span class="label">State:</span><span class="value">${student.address?.state || 'N/A'}</span></div>
              <div class="field"><span class="label">Pincode:</span><span class="value">${student.address?.pincode || 'N/A'}</span></div>
            </div>
          </div>

          ${!isBankEmpty ? `
          <div class="section">
            <div class="section-title">Bank Details</div>
            <div class="grid">
              <div class="field"><span class="label">Account Holder Name:</span><span class="value">${student.bankDetails?.accountHolderName || 'N/A'}</span></div>
              <div class="field"><span class="label">Bank Name:</span><span class="value">${student.bankDetails?.bankName || 'N/A'}</span></div>
              <div class="field"><span class="label">Account Number:</span><span class="value">${student.bankDetails?.accountNumber || 'N/A'}</span></div>
              <div class="field"><span class="label">IFSC Code:</span><span class="value">${student.bankDetails?.ifscCode || 'N/A'}</span></div>
              <div class="field"><span class="label">Branch Name:</span><span class="value">${student.bankDetails?.branchName || 'N/A'}</span></div>
            </div>
          </div>
          ` : ''}
          
          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `;
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(htmlContent);
      win.document.close();
    }
  };

  const handleGenerateStudentReport = async (isPrintDirectly: boolean) => {
    if (selectedColumns.length === 0) {
      alert("Please select at least one column to export.");
      return;
    }
    
    setReportLoading(true);
    try {
      // 1. Load active transport records if usesTransport is selected
      let transportsList: any[] = [];
      if (selectedColumns.includes('usesTransport')) {
        try {
          transportsList = await transportApi.getStudents();
          setReportTransports(transportsList);
        } catch (transErr) {
          console.warn("Could not load transports for custom student report", transErr);
        }
      }

      // 2. Load ALL filtered students matching current filter conditions
      const res = await studentApi.getStudents({
        page: 1,
        limit: 10000,
        category: categoryFilter,
        village: villageFilter,
        class: studentClassFilter,
        sortBy,
        order,
        search: searchQuery
      });
      
      const studentsToExport = res.students;

      // 3. Select columns detail objects
      const columnsToInclude = REPORT_COLUMNS.filter(col => selectedColumns.includes(col.id));
      const headers = columnsToInclude.map(col => col.label);
      const rows = studentsToExport.map(student => 
        columnsToInclude.map(col => getColumnValue(student, col.id, transportsList))
      );

      // 4. Gather Active Filters
      const activeFiltersList: string[] = [];
      if (studentClassFilter && studentClassFilter !== 'All') {
        activeFiltersList.push(`Class: ${studentClassFilter}`);
      }
      if (categoryFilter && categoryFilter !== 'All') {
        activeFiltersList.push(`Category: ${categoryFilter}`);
      }
      if (villageFilter && villageFilter.trim() !== '') {
        activeFiltersList.push(`Village: ${villageFilter}`);
      }
      if (searchQuery && searchQuery.trim() !== '') {
        activeFiltersList.push(`Search: "${searchQuery}"`);
      }
      
      const filtersStr = activeFiltersList.length > 0 ? activeFiltersList.join(' | ') : 'All Students';

      // 5. Open and render the print/PDF page in browser pop-up
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Please allow popups to export printable/PDF reports.');
        setReportLoading(false);
        return;
      }

      const currentDateStr = new Date().toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      const generatedByStr = currentUser 
        ? `${currentUser.name} (${currentUser.role.toUpperCase()})` 
        : 'Principal Office Administrator';

      // Orientation (Step 8)
      const isLandscape = selectedColumns.length > 8;
      const orientationCss = isLandscape 
        ? `@page { size: landscape; margin: 10mm 10mm 10mm 10mm; }` 
        : `@page { size: portrait; margin: 15mm 10mm 15mm 10mm; }`;

      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Student Registry Report</title>
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
              
              body {
                font-family: 'Inter', sans-serif;
                color: #0f172a;
                padding: 20px;
                margin: 0;
                background-color: #ffffff;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              
              ${orientationCss}

              .header-container {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                border-bottom: 2px solid #1e3a8a;
                padding-bottom: 12px;
                margin-bottom: 16px;
              }

              .school-title {
                font-size: 20px;
                font-weight: 800;
                color: #1e3a8a;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin: 0;
              }

              .report-subtitle {
                font-size: 13px;
                font-weight: 600;
                color: #475569;
                margin: 4px 0 0 0;
              }

              .meta-box {
                font-size: 11px;
                color: #475569;
                text-align: right;
                line-height: 1.4;
              }

              .filter-bar {
                background-color: #f1f5f9;
                border: 1px solid #e2e8f0;
                padding: 8px 12px;
                border-radius: 6px;
                margin-bottom: 16px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-size: 11px;
                font-weight: 600;
                color: #334155;
              }

              .filter-title {
                color: #64748b;
                font-weight: 500;
                margin-right: 4px;
              }

              .filter-value {
                color: #0f172a;
                font-weight: 700;
              }

              table {
                width: 100%;
                border-collapse: collapse;
                font-size: 10px;
                margin-bottom: 24px;
              }

              th {
                background-color: #1e3a8a;
                color: #ffffff;
                font-weight: 700;
                text-align: left;
                padding: 10px 8px;
                border: 1px solid #1e3a8a;
                text-transform: uppercase;
                font-size: 9px;
                letter-spacing: 0.3px;
                white-space: nowrap;
              }

              td {
                padding: 8px;
                border: 1px solid #e2e8f0;
                color: #334155;
                vertical-align: middle;
              }

              tr:nth-child(even) {
                background-color: #f8fafc;
              }

              .footer-container {
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                display: flex;
                justify-content: space-between;
                font-size: 9px;
                color: #94a3b8;
                border-top: 1px solid #e2e8f0;
                padding-top: 10px;
                background-color: #ffffff;
              }

              .no-print-btn {
                position: fixed;
                bottom: 24px;
                right: 24px;
                background-color: #1e3a8a;
                color: white;
                border: none;
                padding: 10px 20px;
                font-size: 11px;
                font-weight: bold;
                border-radius: 20px;
                cursor: pointer;
                box-shadow: 0 4px 10px rgba(0,0,0,0.15);
                transition: all 0.2s;
                display: flex;
                align-items: center;
                gap: 6px;
                z-index: 9999;
              }

              .no-print-btn:hover {
                background-color: #1d4ed8;
                transform: translateY(-1px);
              }

              @media print {
                body {
                  padding-bottom: 40px;
                }
                .no-print-btn {
                  display: none;
                }
                .footer-container {
                  position: running(footer);
                }
              }
            </style>
          </head>
          <body>
            <button class="no-print-btn" onclick="window.print()">
              Print report / Save as PDF
            </button>

            <div class="header-container">
              <div>
                <h1 class="school-title">The School of Pansy Flowers</h1>
                <h2 class="report-subtitle">Student Registry Report</h2>
              </div>
              <div class="meta-box">
                <div><strong>Generated On:</strong> ${currentDateStr}</div>
                <div><strong>Generated By:</strong> ${generatedByStr}</div>
              </div>
            </div>

            <div class="filter-bar">
              <div>
                <span class="filter-title">Active Filters:</span>
                <span class="filter-value">${filtersStr}</span>
              </div>
              <div>
                <span class="filter-title">Total Students:</span>
                <span class="filter-value">${studentsToExport.length}</span>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  ${headers.map(h => `<th>${h}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                ${rows.map(row => `
                  <tr>
                    ${row.map(val => `<td>${val === null || val === undefined ? '' : val}</td>`).join('')}
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <div class="footer-container">
              <span>The School of Pansy Flowers ERP System • Student Registry Audit</span>
              <span>Page 1 of 1</span>
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
      
      setIsStudentReportModalOpen(false);
    } catch (err) {
      console.error("Error generating student report:", err);
      alert("An error occurred while preparing the student registry report.");
    } finally {
      setReportLoading(false);
    }
  };

  const handleExportTeachersExcel = () => {
    const headers = ['ID', 'Name', 'Email', 'Subject Specialty', 'Department', 'Contact Line', 'Joining Date', 'Status'];
    const keys = ['id', 'name', 'email', 'subject', 'department', 'contact', 'joiningDate', 'status'];
    const formattedTeachers = filteredTeachers.map(t => ({
      ...t,
      joiningDate: formatDate(t.joiningDate)
    }));
    exportToExcel(formattedTeachers, headers, keys, `Teachers_Directory_${new Date().toISOString().split('T')[0]}`);
  };

  const handleExportTeachersPDF = () => {
    const headers = ['ID & Name', 'Email', 'Subject', 'Department', 'Contact', 'Joined', 'Status'];
    const rows = filteredTeachers.map(t => [
      `${t.id} - ${t.name}`,
      t.email,
      t.subject,
      t.department,
      t.contact,
      formatDate(t.joiningDate),
      t.status
    ]);
    exportToPrintablePDF('Faculty & teacher directory report', headers, rows, 'teachers_directory_report');
  };

  const handleExportFeesExcel = () => {
    const headers = ['ID', 'Student Name', 'Admission No', 'Class Name', 'Academic Year', 'Total Billable Fee', 'Paid Fees', 'Left/Due Fees', 'Status'];
    const keys = ['id', 'name', 'admissionNo', 'className', 'academicYear', 'totalFee', 'paidAmount', 'dueAmount', 'status'];
    exportToExcel(visibleFeeRecords, headers, keys, `Fees_Ledger_${new Date().toISOString().split('T')[0]}`);
  };

  const handleExportFeesPDF = () => {
    const headers = ['Student Name', 'Admission No', 'Class', 'Academic Year', 'Total Fee', 'Paid Fees', 'Left/Due Fees', 'Status'];
    const rows = visibleFeeRecords.map(item => [
      item.name || '',
      item.admissionNo || '',
      item.className || '',
      item.academicYear || '',
      `₹${(item.totalFee ?? 0).toLocaleString()}`,
      `₹${(item.paidAmount ?? 0).toLocaleString()}`,
      `₹${(item.dueAmount ?? 0).toLocaleString()}`,
      item.status || ''
    ]);
    exportToPrintablePDF('Financial center ledger summary', headers, rows, 'fees_ledger_report');
  };

  const handleExportFeeHistoryExcel = () => {
    const headers = ['Receipt No', 'Student', 'Admission No', 'Class', 'Amount', 'Payment Method', 'Date'];
    const keys = ['receiptNo', 'name', 'admissionNo', 'className', 'amount', 'paymentMethod', 'date'];
    const formattedHistory = feeHistory.map(item => ({
      ...item,
      date: formatDate(item.date)
    }));
    exportToExcel(formattedHistory, headers, keys, `Fee_History_${new Date().toISOString().split('T')[0]}`);
  };

  const handleExportFeeHistoryPDF = () => {
    const headers = ['Receipt No', 'Student Name', 'Admission No', 'Class', 'Amount', 'Payment Method', 'Date'];
    const rows = feeHistory.map(item => [
      item.receiptNo || '',
      item.name || '',
      item.admissionNo || '',
      `${item.className || ''}`,
      `₹${(item.amount ?? 0).toLocaleString()}`,
      item.paymentMethod || '',
      formatDate(item.date)
    ]);
    exportToPrintablePDF('Fee Payment History & Reports', headers, rows, 'fee_payment_history_report');
  };

  const handlePrintFeeHistory = () => {
    const printContent = `
      <html>
        <head>
          <title>Fee Payment History & Reports</title>
          <style>
            body { font-family: sans-serif; padding: 20px; color: #333; }
            h1 { font-size: 18px; margin-bottom: 5px; }
            p { font-size: 12px; color: #666; margin-top: 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 11px; }
            th { background-color: #f5f5f5; font-weight: bold; }
            .total-info { margin-top: 15px; font-size: 12px; font-weight: bold; text-align: right; }
          </style>
        </head>
        <body>
          <h1>Fee Payment History & Reports</h1>
          <p>Generated on ${formatDate(new Date())}</p>
          <table>
            <thead>
              <tr>
                <th>Receipt No</th>
                <th>Student</th>
                <th>Admission No</th>
                <th>Class</th>
                <th>Amount</th>
                <th>Payment Method</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              ${feeHistory.map(item => `
                <tr>
                  <td>${item.receiptNo || 'N/A'}</td>
                  <td>${item.name || 'N/A'}</td>
                  <td>${item.admissionNo || 'N/A'}</td>
                  <td>${item.className || 'N/A'}</td>
                  <td>₹${(item.amount ?? 0).toLocaleString()}</td>
                  <td>${item.paymentMethod || 'N/A'}</td>
                  <td>${formatDate(item.date)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="total-info">
            Total Collection: ₹${totalCollection.toLocaleString()} | Payments Received: ${totalPayments}
          </div>
        </body>
      </html>
    `;
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(printContent);
      win.document.close();
      win.print();
    }
  };

  const handleExportFeeStructuresExcel = () => {
    const headers = ['ID', 'Class', 'Section', 'Admission Fee', 'Tuition Fee', 'Computer Fee', 'Exam Fee', 'Cultural Activity Fee', 'Academic Year', 'Total Fee', 'June Installment', 'September Installment', 'December Installment', 'March Installment'];
    const keys = ['id', 'class', 'admissionFee', 'tuitionFee', 'computerFee', 'examFee', 'culturalActivityFee', 'academicYear', 'totalFee', 'juneAmount', 'septemberAmount', 'decemberAmount', 'marchAmount'];
    exportToExcel(feeStructures, headers, keys, `Fee_Structures_${new Date().toISOString().split('T')[0]}`);
  };

  const handleExportFeeStructuresPDF = () => {
    const headers = ['Class', 'Section', 'Admission Fee', 'Tuition Fee', 'Computer Fee', 'Exam Fee', 'Cultural Activity Fee', 'Academic Year', 'Total Fee'];
    const rows = feeStructures.map(fs => [
      fs.class,
      `₹${fs.admissionFee}`,
      `₹${fs.tuitionFee}`,
      `₹${fs.computerFee}`,
      `₹${fs.examFee}`,
      `₹${fs.culturalActivityFee}`,
      fs.academicYear || fs.academicSession,
      `₹${fs.totalFee}`
    ]);
    exportToPrintablePDF('Fee Structures Report Policy Matrix', headers, rows, 'fee_structures_policy_matrix');
  };

  // --- FILTERED DIRECTORIES ---
  const filteredStudents = (Array.isArray(students) ? students : []).filter((stu) => {
    const searchTerm = studentSearchQuery.trim().toLowerCase();
    const studentName = (stu.name || '').toLowerCase();
    const studentEmail = (stu.email || '').toLowerCase();
    const studentAdmission = (stu.admissionNo || stu.rollNumber || '').toLowerCase();
    const studentClass = normalizeClassFilterLabel(stu.class || stu.currentEnrollment?.class || '');
    const studentCategory = (stu.category || '').toLowerCase();
    const studentVillage = (stu.address?.village || '').toLowerCase();
    const studentFatherName = (stu.fatherName || '').toLowerCase();
    const studentMotherName = (stu.motherName || '').toLowerCase();
    const studentPhone = (stu.phone || '').toLowerCase();

    const matchesSearch =
      !searchTerm ||
      studentName.includes(searchTerm) ||
      studentEmail.includes(searchTerm) ||
      studentAdmission.includes(searchTerm) ||
      studentClass.includes(searchTerm) ||
      studentCategory.includes(searchTerm) ||
      studentVillage.includes(searchTerm) ||
      studentFatherName.includes(searchTerm) ||
      studentMotherName.includes(searchTerm) ||
      studentPhone.includes(searchTerm);

    const matchesClass =
      studentClassFilter === 'All' ||
      studentClass === normalizeClassFilterLabel(studentClassFilter);

    const matchesCategory =
      categoryFilter === 'All' ||
      studentCategory === categoryFilter.toLowerCase();

    const matchesVillage =
      !villageFilter.trim() ||
      studentVillage.includes(villageFilter.trim().toLowerCase());

    return matchesSearch && matchesClass && matchesCategory && matchesVillage;
  });

  const filteredTeachers = (Array.isArray(teachers) ? teachers : []).filter(t => 
    (t.name || '').toLowerCase().includes(query) ||
    (t.email || '').toLowerCase().includes(query) ||
    (t.subject || '').toLowerCase().includes(query) ||
    (t.department || '').toLowerCase().includes(query)
  );

  const filteredFeeStructures = (Array.isArray(feeStructures) ? feeStructures : []).filter(fs => {
    const matchesSearch = !feeStructureSearchQuery || (fs.class || '').toLowerCase().includes(feeStructureSearchQuery.toLowerCase());
    const matchesYear = activeFeeStructureYearFilter === 'All' || (fs.academicYear || fs.academicSession) === activeFeeStructureYearFilter;
    return matchesSearch && matchesYear;
  });

  const academicSessionOptions = useMemo(() => {
    const labels = new Set<string>(academicYearLabels);

    (Array.isArray(feeStructures) ? feeStructures : []).forEach((fs) => {
      const label = String(fs.academicYear || fs.academicSession || '').trim();
      if (label) {
        labels.add(label);
      }
    });

    return Array.from(labels).sort(sortAcademicYearsDesc);
  }, [academicYearLabels, feeStructures]);

  const historyYearOptions = useMemo(() => {
    const labels = new Set<string>(academicYearLabels);

    feeHistory.forEach((entry) => {
      const label = String(entry?.academicYear || '').trim();
      if (label) {
        labels.add(label);
      }
    });

    return Array.from(labels).sort(sortAcademicYearsDesc);
  }, [academicYearLabels, feeHistory]);

  // Render Skeleton while initial loading is active
  if (loading && !stats) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-7 w-52" />
          <Skeleton className="h-4 w-96 font-medium" />
        </div>
        <DashboardStatsSkeleton />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* --- DASHBOARD HEADER --- */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 select-none pb-2 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight leading-none font-sans">
              {currentTab === 'dashboard' ? 'Administrative Dashboard' : 
               currentTab === 'students' ? 'Student Registry & Roster' :
               currentTab === 'teachers' ? 'Faculty Directories' :
               currentTab === 'fees' ? 'Financial Center' :
               currentTab === 'fee-structure' ? 'Fee Structure Policy Matrix' :
               currentTab === 'transfer-certificates' ? 'Transfer Certificates' :
               currentTab.toUpperCase()}
            </h1>
           
          </div>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            {currentTab === 'dashboard' 
              ? 'Welcome back. Monitoring activity at The School of Pansy Flowers.' 
              : currentTab === 'fee-structure'
              ? 'Configure standard grade-wise default tuition, assessments, and operational levies.'
              : currentTab === 'transfer-certificates'
              ? 'Generate, manage, print and download student transfer certificates.'
              : `Manage operational parameters under The School of Pansy Flowers ${currentTab} directory.`}
          </p>
        </div>

        {/* Dynamic header button if suitable directory */}
        {currentTab === 'students' && (
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => setIsPromotionModalOpen(true)} leftIcon={<ArrowRight size={16} />}>
              Promote Students
            </Button>
            <Button onClick={openAddStudentModal} leftIcon={<Plus size={16} />}>
              Admit Student
            </Button>
          </div>
        )}
        {currentTab === 'teachers' && (
          <Button onClick={() => setIsTeacherModalOpen(true)} leftIcon={<Plus size={16} />}>
            Onboard Faculty
          </Button>
        )}
        {currentTab === 'fees' && (
          <Button onClick={() => setIsFeeModalOpen(true)} leftIcon={<Plus size={16} />}>
            Record Payment
          </Button>
        )}
        {currentTab === 'fee-structure' && (
          <Button onClick={handleAddFeeStructureClick} leftIcon={<Plus size={16} />}>
            Add Fee Structure
          </Button>
        )}
      </div>

      {/* --- RENDER TARGET TAB CONDITIONAL --- */}
      {currentTab === 'dashboard' ? (
        <div className="space-y-6 md:space-y-8">
          
          {/* 1. DIRECTIVE ANALYTICS COUNTS */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
            <StatCard 
              title="Total Students"
              value={stats?.totalStudents || 0}
              growth={stats?.studentsGrowth}
              icon={<Users size={18} />}
              iconBgClass="bg-blue-50 text-blue-600 border border-blue-100"
            />
            <StatCard 
              title="Total Teachers"
              value={stats?.totalTeachers || 0}
              growth={stats?.teachersGrowth}
              icon={<GraduationCap size={18} />}
              iconBgClass="bg-purple-50 text-purple-600 border border-purple-100"
            />
            <StatCard 
              title="Fees Collected"
              value={`₹${(stats?.feesCollected || 0).toLocaleString()}`}
              growth={stats?.feesGrowth}
              icon={<DollarSign size={18} />}
              iconBgClass="bg-emerald-50 text-emerald-600 border border-emerald-100"
            />
            <StatCard 
              title="Active Notices"
              value={stats?.activeNotices || 0}
              icon={<Megaphone size={18} />}
              iconBgClass="bg-amber-50 text-amber-600 border border-amber-100"
            />
          </section>

          {/* 2. DENTED QUICK LAUNCH WORKFLOW ACTIONS */}
          <section className="bg-slate-50 border border-slate-200/60 rounded-2xl p-5 md:p-6">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-4 select-none">
              Command Suite & Fast Actions
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <QuickActionCard
                title="Admit Student"
                description="Formulate standard registry records, profile parameters & group levels."
                actionText="Admit New Student"
                icon={UserPlus}
                onClick={openAddStudentModal}
                accentBgClass="bg-blue-50/70 border border-blue-100/50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white"
                accentTextClass="text-blue-600"
              />
              <QuickActionCard
                title="Onboard Teacher"
                description="Register faculty members, designate specific subject streams & contact lines."
                actionText="Onboard Teacher"
                icon={GraduationCap}
                onClick={() => setIsTeacherModalOpen(true)}
                accentBgClass="bg-purple-50/70 border border-purple-100/50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white"
                accentTextClass="text-purple-600"
              />
              <QuickActionCard
                title="Collect Tuition"
                description="Book term collections, generate automated audit invoices & tracking logs."
                actionText="Collect Term Fee"
                icon={DollarSign}
                onClick={() => setIsFeeModalOpen(true)}
                accentBgClass="bg-emerald-50/70 border border-emerald-100/50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white"
                accentTextClass="text-emerald-700"
              />
              <QuickActionCard
                title="Publish Bulletin"
                description="Distribute bulletin notices with assigned priority parameters."
                actionText="Publish Alert"
                icon={Megaphone}
                onClick={() => setIsNoticeModalOpen(true)}
                accentBgClass="bg-amber-50/70 border border-amber-100/50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white"
                accentTextClass="text-amber-700"
              />
            </div>
          </section>

          {/* 3. MIDDLE SECTION ANALYTICS LAYOUTS */}
          <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            <div className="h-full">
              <FeeCollectionWidget fees={fees} loading={loading} />
            </div>
            <div className="h-full">
              <StudentDistribution distribution={distribution} loading={loading} />
            </div>
            <div className="h-full">
              <StudentsByCategory students={allStudents} loading={loading} />
            </div>
          </section>

          {/* 4. RECENT BULLET BULLETIN AND TIMELINE FEED */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <RecentNotices notices={notices} loading={loading} />
            </div>
            <div>
              <RecentActivities activities={activities} loading={loading} />
            </div>
          </section>
        </div>
      ) : null}

      {/* --- DIRECTORY TAB: STUDENTS --- */}
      {currentTab === 'students' && (
        <Card className="overflow-hidden">
          {promotionSuccessMessage && (
            <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800 text-sm font-semibold">
              {promotionSuccessMessage}
            </div>
          )}
          {academicYearSuccessMessage && (
            <div className="mb-4 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-blue-800 text-sm font-semibold">
              {academicYearSuccessMessage}
            </div>
          )}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-4 border-b border-slate-100 mb-4">
            <div className="flex flex-wrap items-center gap-3 w-full lg:max-w-4xl">
              <div className="relative w-full sm:max-w-xs">
                <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={studentSearchQuery}
                  onChange={(e) => setStudentSearchQuery(e.target.value)}
                  placeholder="Search registered students..."
                  className="w-full text-xs font-semibold pl-9 pr-4 py-2 border border-slate-200 focus:border-blue-500 rounded-lg outline-none bg-slate-50/50"
                />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none whitespace-nowrap">Academic Year:</span>
                  <select
                    value={studentAcademicYearFilter}
                    onChange={(e) => setStudentAcademicYearFilter(e.target.value)}
                    className="px-2.5 py-1.5 bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-bold text-slate-700 focus:border-blue-500 cursor-pointer outline-none min-w-[130px]"
                  >
                    <option value="All">All Sessions</option>
                    {academicYears.map((year) => (
                      <option key={year.id} value={year.label}>
                        {year.label}{year.isCurrent ? ' (Current)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none whitespace-nowrap">Class:</span>
                  <select
                    value={studentClassFilter}
                    onChange={(e) => setStudentClassFilter(e.target.value)}
                    className="px-2.5 py-1.5 bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-bold text-slate-700 focus:border-blue-500 cursor-pointer outline-none min-w-[100px]"
                  >
                    <option value="All">All Classes</option>
                    <option value="Nursery">Nursery</option>
                    <option value="LKG">LKG</option>
                    <option value="UKG">UKG</option>
                    <option value="1st">1st</option>
                    <option value="2nd">2nd</option>
                    <option value="3rd">3rd</option>
                    <option value="4th">4th</option>
                    <option value="5th">5th</option>
                    <option value="6th">6th</option>
                    <option value="7th">7th</option>
                    <option value="8th">8th</option>
                    <option value="9th">9th</option>
                    <option value="10th">10th</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none whitespace-nowrap">Section:</span>
                  <select
                    value={studentSectionFilter}
                    onChange={(e) => setStudentSectionFilter(e.target.value)}
                    className="px-2.5 py-1.5 bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-bold text-slate-700 focus:border-blue-500 cursor-pointer outline-none min-w-[100px]"
                  >
                    <option value="All">All Sections</option>
                    {studentSectionOptions.map((section) => (
                      <option key={section} value={section}>{section}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none whitespace-nowrap">Category:</span>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="px-2.5 py-1.5 bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-bold text-slate-700 focus:border-blue-500 cursor-pointer outline-none min-w-[110px]"
                  >
                    <option value="All">All</option>
                    <option value="General">General</option>
                    <option value="OBC">OBC</option>
                    <option value="SC">SC</option>
                    <option value="ST">ST</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none whitespace-nowrap">Village:</span>
                  <input
                    type="text"
                    value={villageFilter}
                    placeholder="Village Name"
                    onChange={(e) => setVillageFilter(e.target.value)}
                    className="px-2.5 py-1.5 bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-semibold text-slate-700 focus:border-blue-500 outline-none w-28 placeholder:text-slate-400"
                  />
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none whitespace-nowrap">Sort By:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="px-2.5 py-1.5 bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-bold text-slate-700 focus:border-blue-500 cursor-pointer outline-none min-w-[110px]"
                  >
                    <option value="admissionNo">Admission No</option>
                    <option value="name">Student Name</option>
                    <option value="class">Class</option>
                    <option value="joiningDate">Joining Date</option>
                    <option value="category">Category</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => setOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                  className="px-2.5 py-1.5 bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-bold text-slate-700 flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-xs"
                >
                  {order === 'asc' ? '↑ Ascending' : '↓ Descending'}
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-semibold text-slate-400 mr-2 hidden md:inline font-sans">
                Showing {filteredStudents.length} of {pagination?.totalStudents != null ? pagination.totalStudents : filteredStudents.length} students
              </span>
              <button
                onClick={handleExportStudentsExcel}
                title="Export list to Excel (.csv)"
                className="inline-flex items-center gap-1 px-3 py-1.5 border border-slate-200 hover:border-slate-300 rounded-lg bg-white text-xs font-bold text-slate-600 hover:text-slate-800 transition-all select-none active:scale-95 cursor-pointer shadow-xs"
              >
                <Download size={13} className="text-emerald-600" />
                Excel
              </button>
              <button
                onClick={handleExportStudentsPDF}
                title="Print list or Save as PDF"
                className="inline-flex items-center gap-1 px-3 py-1.5 border border-slate-200 hover:border-slate-300 rounded-lg bg-white text-xs font-bold text-slate-600 hover:text-slate-800 transition-all select-none active:scale-95 cursor-pointer shadow-xs"
              >
                <FileText size={13} className="text-indigo-600" />
                PDF Report
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 font-bold text-slate-700 select-none">
                  <th className="p-4 px-6">Student Name</th>
                  <th className="p-4">Admission No</th>
                  <th className="p-4">Class</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Village</th>
                  <th className="p-4">Aadhaar No</th>
                  <th className="p-4">Samagra ID</th>
                  <th className="p-4">APAAR ID</th>
                  <th className="p-4">PAN No</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-8 text-slate-400">
                      No matching student catalogs detected.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((stu) => (
                    <tr key={stu.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="p-4 px-6">
                        <div>
                          <p className="font-extrabold text-slate-900">{stu.name}</p>
                          <p className="text-[10px] text-slate-400 font-bold">{stu.email}</p>
                        </div>
                      </td>
                      <td className="p-4 font-mono font-bold text-slate-500">
                        {stu.admissionNo || stu.rollNumber || 'N/A'}
                      </td>
                      <td className="p-4">
                        <Badge 
                          variant={
                            stu.classCategory === 'Secondary' ? 'info' :
                            stu.classCategory === 'Primary' ? 'success' :
                            stu.classCategory === 'Middle School' ? 'warning' : 'primary'
                          } 
                          size="sm"
                        >
                          {stu.class || stu.classCategory || 'N/A'}
                        </Badge>
                      </td>
                      <td className="p-4 font-bold text-slate-700">{stu.category || 'General'}</td>
                      <td className="p-4 font-semibold text-slate-600">{stu.address?.village || 'N/A'}</td>
                      <td className="p-4 font-mono text-slate-600">{stu.aadharNo || 'N/A'}</td>
                      <td className="p-4 font-mono text-slate-600">{stu.samagraId || 'N/A'}</td>
                      <td className="p-4 font-mono text-slate-600">{stu.apaarId || 'N/A'}</td>
                      <td className="p-4 font-mono text-slate-600">{stu.panNo || 'N/A'}</td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => { setSelectedViewStudent(stu); setIsViewStudentModalOpen(true); }}
                            title="View Student Profile"
                            className="p-1.5 cursor-pointer rounded-lg hover:bg-slate-100 text-slate-500 hover:text-blue-600 transition-all select-none active:scale-95"
                          >
                            <Eye size={13} />
                          </button>
                          <button
                            onClick={() => handleEditStudentClick(stu)}
                            title="Edit Student Roster Details"
                            className="p-1.5 cursor-pointer rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-all select-none active:scale-95"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => handlePrepareDeleteStudent(stu)}
                            title="Delete Student Record"
                            className="p-1.5 cursor-pointer rounded-lg hover:bg-red-50 text-red-500 hover:text-red-700 transition-all select-none active:scale-95"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {pagination && (
            <div className="flex items-center justify-between gap-4 p-4 border-t border-slate-100 bg-slate-50/40 select-none">
              <button
                type="button"
                onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                disabled={page <= 1}
                className="inline-flex items-center gap-1 px-3 py-1.5 border border-slate-200 hover:border-slate-300 rounded-lg bg-white text-xs font-bold text-slate-600 hover:text-slate-800 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-slate-200 disabled:hover:text-slate-600 transition-all select-none active:scale-95 cursor-pointer shadow-xs"
              >
                Previous
              </button>
              <span className="text-xs font-bold text-slate-500 font-sans">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage(prev => Math.min(prev + 1, pagination.totalPages))}
                disabled={page >= pagination.totalPages}
                className="inline-flex items-center gap-1 px-3 py-1.5 border border-slate-200 hover:border-slate-300 rounded-lg bg-white text-xs font-bold text-slate-600 hover:text-slate-800 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-slate-200 disabled:hover:text-slate-600 transition-all select-none active:scale-95 cursor-pointer shadow-xs"
              >
                Next
              </button>
            </div>
          )}
        </Card>
      )}

      {/* --- DIRECTORY TAB: TEACHERS --- */}
      {currentTab === 'teachers' && (
        <Card className="overflow-hidden">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-4 border-b border-slate-100 mb-4">
            <span className="text-xs font-semibold text-slate-500 select-none font-sans">
              The School of Pansy Flowers Academic Stream & Board Officers
            </span>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={handleExportTeachersExcel}
                title="Export list to Excel (.csv)"
                className="inline-flex items-center gap-1 px-3 py-1.5 border border-slate-200 hover:border-slate-300 rounded-lg bg-white text-xs font-bold text-slate-600 hover:text-slate-800 transition-all select-none active:scale-95 cursor-pointer shadow-xs"
              >
                <Download size={13} className="text-emerald-600" />
                Excel
              </button>
              <button
                onClick={handleExportTeachersPDF}
                title="Print list or Save as PDF"
                className="inline-flex items-center gap-1 px-3 py-1.5 border border-slate-200 hover:border-slate-300 rounded-lg bg-white text-xs font-bold text-slate-600 hover:text-slate-800 transition-all select-none active:scale-95 cursor-pointer shadow-xs"
              >
                <FileText size={13} className="text-indigo-600" />
                PDF Report
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 font-bold text-slate-700 select-none">
                  <th className="p-4 px-6">ID & FACULTY STREAM</th>
                  <th className="p-4">SUBJECT EXPERTISE</th>
                  <th className="p-4">DEPARTMENT</th>
                  <th className="p-4">CONTACT LINE</th>
                  <th className="p-4">JOINING DATE</th>
                  <th className="p-4">STATUS</th>
                  <th className="p-4 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredTeachers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-400">
                      No matching teacher faculties onboarded.
                    </td>
                  </tr>
                ) : (
                  filteredTeachers.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="p-4 px-6 flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-extrabold flex-shrink-0">
                          {t.name.split(' ').map(n=>n[0]).join('')}
                        </div>
                        <div>
                          <p className="font-extrabold text-slate-900">{t.name}</p>
                          <p className="text-[10px] text-slate-400 font-bold">{t.email}</p>
                        </div>
                      </td>
                      <td className="p-4 font-semibold text-slate-700">{t.subject}</td>
                      <td className="p-4 font-bold text-slate-400 uppercase tracking-wider">{t.department}</td>
                      <td className="p-4 text-slate-500 font-medium">{t.contact}</td>
                      <td className="p-4 font-semibold text-slate-500">{formatDate(t.joiningDate)}</td>
                      <td className="p-4">
                        <Badge variant={t.status === 'Active' ? 'success' : 'warning'} size="sm">
                          {t.status}
                        </Badge>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleEditTeacherClick(t)}
                            title="Edit Faculty Details"
                            className="p-1.5 cursor-pointer rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-all select-none active:scale-95"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => handlePrepareDeleteTeacher(t)}
                            title="Delete Faculty Record"
                            className="p-1.5 cursor-pointer rounded-lg hover:bg-red-50 text-red-500 hover:text-red-700 transition-all select-none active:scale-95"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* --- FINANCIAL TABS VIEW --- */}
      {currentTab === 'fees' && (() => {
        const activeRecord =
          (selectedFeeStudent && visibleFeeRecords.some((record) => record.id === selectedFeeStudent.id)
            ? selectedFeeStudent
            : visibleFeeRecords[0] || selectedFeeStudent || feeRecords[0]) || null;

        // Resolve a fee structure only within the selected academic year.
        const getMatchingStructureForClass = (studentClass: string, academicYear: string) => {
          const cleanedClass = (studentClass || '').trim().toLowerCase();
          const cleanedYear = (academicYear || '').trim();
          if (!cleanedClass || !cleanedYear) {
            return null;
          }

          const yearStructures = (feeStructures || []).filter(
            (fs) => (fs.academicYear || fs.academicSession || '').trim() === cleanedYear
          );

          let match = yearStructures.find((fs) => (fs.class || '').toLowerCase() === cleanedClass);
          if (match) return match;

          const numPart = cleanedClass.match(/\d+/);
          if (numPart) {
            match = yearStructures.find((fs) => (fs.class || '').toLowerCase().includes(numPart[0]));
            if (match) return match;
          }

          return yearStructures.find(
            (fs) =>
              (fs.class || '').toLowerCase().includes(cleanedClass) ||
              cleanedClass.includes((fs.class || '').toLowerCase())
          ) || null;
        };

        // Determine installment statuses based on recorded cumulative paidAmount
        const getInstallmentStatuses = (paidAmount: number, fs: any) => {
          const J = fs.juneAmount || 0;
          const S = fs.septemberAmount || 0;
          const D = fs.decemberAmount || 0;
          const M = fs.marchAmount || 0;

          let tempPaid = paidAmount;

          const juneStatus = tempPaid >= J ? 'Paid' : tempPaid > 0 ? 'Partial' : 'Pending';
          const junePaid = Math.min(tempPaid, J);
          tempPaid = Math.max(0, tempPaid - J);

          const septemberStatus = tempPaid >= S ? 'Paid' : tempPaid > 0 ? 'Partial' : 'Pending';
          const septemberPaid = Math.min(tempPaid, S);
          tempPaid = Math.max(0, tempPaid - S);

          const decemberStatus = tempPaid >= D ? 'Paid' : tempPaid > 0 ? 'Partial' : 'Pending';
          const decemberPaid = Math.min(tempPaid, D);
          tempPaid = Math.max(0, tempPaid - D);

          const marchStatus = tempPaid >= M ? 'Paid' : tempPaid > 0 ? 'Partial' : 'Pending';
          const marchPaid = Math.min(tempPaid, M);

          return {
            juneStatus,
            junePaid,
            septemberStatus,
            septemberPaid,
            decemberStatus,
            decemberPaid,
            marchStatus,
            marchPaid
          };
        };
        
        // Trigger action to open payment dialog
        const handleOpenPayModal = (record: typeof feeRecords[0], financialYearRecord?: FinancialHistoryEntry | null) => {
          setSelectedFeeStudent(record);
          setSelectedFinancialYear(financialYearRecord?.academicYear || record.academicYear || '');
          setCustomPayAmount(String(financialYearRecord?.dueAmount ?? record.dueAmount ?? 0));
          setCustomPayMode('Cash');
          setCustomPayNotes('');
          setReceiptDetail(null);
          setIsCustomPayModalOpen(true);
        };

        // Complete the payment flow
  const handleSavePaymentSubmit = async (e: React.FormEvent) => {
          e.preventDefault();
          const amountFloat = parseFloat(customPayAmount);
          if (isNaN(amountFloat) || amountFloat <= 0) {
            alert('Please specify a valid payment amount.');
            return;
          }

          if (!activeRecord || !activeRecord.id) {
            alert('No student selected for settlement.');
            return;
          }

          setSubmitLoading(true);
          try {
            const paymentYearRecord = activeFinancialEntry || null;
            const paymentAcademicYear = paymentYearRecord?.academicYear || activeRecord.academicYear || '';
            const paymentClassName = paymentYearRecord?.className || activeRecord.className;
            const apiRes = await studentApi.collectFee({
              studentId: activeRecord.id,
              amountPaid: amountFloat,
              paymentMethod: customPayMode,
              academicYear: paymentAcademicYear,
              className: paymentClassName
            });

            // Synchronize with local storage fee history
         

            // Trigger fetch refresh to fetch everything fresh from database
            triggerDataRefresh();

            // Handle API receipt detail or build robust client fallback
            const fallbackReceiptYearMonth = `${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}`;
            const finalReceiptNo =
              apiRes?.receiptDetail?.receiptNo ||
              apiRes?.receiptNo ||
              `REC-${fallbackReceiptYearMonth}-${String(Math.floor(Date.now() % 100000)).padStart(5, '0')}`;
            const finalStudentName = apiRes?.receiptDetail?.studentName || apiRes?.studentName || activeRecord.name;
            const finalAmountPaid = apiRes?.receiptDetail?.amount || apiRes?.amount || amountFloat;

            setReceiptDetail({
              receiptNo: finalReceiptNo,
              amount: finalAmountPaid,
              studentName: finalStudentName,
              className: apiRes?.receiptDetail?.className || paymentClassName || activeRecord.className,
              academicYear: apiRes?.receiptDetail?.academicYear || paymentAcademicYear || activeRecord.academicYear,
              month: apiRes?.receiptDetail?.month || CURRENT_MONTH_LABEL,
              admissionNo: apiRes?.receiptDetail?.admissionNo || activeRecord.admissionNo,
              dueAmount: apiRes?.receiptDetail?.dueAmount ?? (paymentYearRecord?.dueAmount ?? activeRecord.dueAmount),
              totalFee: apiRes?.receiptDetail?.totalFee ?? (paymentYearRecord?.totalFee ?? activeRecord.totalFee),
              paidAmount: apiRes?.receiptDetail?.paidAmount ?? (paymentYearRecord?.paidAmount ?? activeRecord.paidAmount),
        paymentMethod: apiRes?.receiptDetail?.paymentMethod || customPayMode
            });

            // Log activity event in ERP list
            const newSystemEvent: Activity = {
              id: `ac-${Date.now()}`,
              activity: `Fee collected from ${activeRecord.name} (₹${amountFloat.toLocaleString()}) via ${customPayMode}`,
              user: 'Finance Terminal 1',
              time: 'Just Now',
              type: 'fee'
        };
        setActivities(prev => [newSystemEvent, ...prev]);

      } catch (err: any) {
        console.error('Fees Payment API Error:', err);
        alert(err.response?.data?.error || err.message || 'Fee transaction recording to live backend failed');
      } finally {
        setSubmitLoading(false);
      }
    };

  const handleSendFeeReceiptWhatsapp = async () => {
    if (!receiptDetail?.receiptNo) {
      return;
    }

    setSendingReceiptWhatsapp(true);
    try {
      const response = await feeApi.sendReceiptToWhatsapp(receiptDetail.receiptNo);
      if (!response?.success) {
        throw new Error(response?.message || 'Failed to send fee receipt to WhatsApp');
      }
      alert('Fee receipt sent to WhatsApp.');
    } catch (error: any) {
      console.error('Failed to send fee receipt to WhatsApp:', error);
      alert(error?.response?.data?.message || error?.message || 'Failed to send fee receipt to WhatsApp');
    } finally {
      setSendingReceiptWhatsapp(false);
    }
  };

  const handleSendStoredFeeReceiptWhatsapp = async (receiptNo: string) => {
    if (!receiptNo) {
      return;
    }

    setSendingHistoryReceiptWhatsapp(receiptNo);
    try {
      const response = await feeApi.sendReceiptToWhatsapp(receiptNo);
      if (!response?.success) {
        throw new Error(response?.message || 'Failed to send fee receipt to WhatsApp');
      }
      alert('Fee receipt sent to WhatsApp.');
    } catch (error: any) {
      console.error('Failed to send stored fee receipt to WhatsApp:', error);
      alert(error?.response?.data?.message || error?.message || 'Failed to send fee receipt to WhatsApp');
    } finally {
      setSendingHistoryReceiptWhatsapp(null);
    }
  };

        return (
          <div className="space-y-6 animate-fadeIn select-none">
            
            {/* Main Section Header */}
            <div>
              <h2 className="text-lg font-black text-slate-800 tracking-tight">Fee Management</h2>
              <p className="text-[11px] text-slate-500 font-semibold tracking-wide">
                Perform student lookup, assess active tuition margins & book settlements in real time.
              </p>
            </div>

            {/* Collection Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50/30 p-5 rounded-xl border border-emerald-100/65 shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-600/85">Total Collection</p>
                  <p className="text-2xl font-black text-emerald-950 mt-1">₹{(totalCollection || 0).toLocaleString()}</p>
                </div>
                <div className="p-3 bg-emerald-500/10 rounded-lg text-emerald-600">
                  <DollarSign size={20} />
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50/30 p-5 rounded-xl border border-blue-100/65 shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-blue-600/85">Payments Received</p>
                  <p className="text-2xl font-black text-blue-950 mt-1">{totalPayments || 0}</p>
                </div>
                <div className="p-3 bg-blue-500/10 rounded-lg text-blue-600">
                  <FileText size={20} />
                </div>
              </div>
            </div>

            {/* Top Toolbar Control Bar */}
            <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-4 border border-slate-100 rounded-xl shadow-xs">
              <div className="relative w-full sm:flex-1">
                <Search size={14} className="absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search Student..."
                  value={feeSearchQuery}
                  onChange={(e) => setFeeSearchQuery(e.target.value)}
                  className="w-full text-xs font-semibold pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 text-slate-700"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <div className="relative w-full sm:w-44">
                  <select
                    value={feeClassFilter}
                    onChange={(e) => setFeeClassFilter(e.target.value)}
                    className="w-full text-xs font-bold px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none cursor-pointer focus:bg-white focus:border-blue-500 text-slate-700"
                  >
                    <option value="All">Class: All Filter</option>
                    <option value="Nursery">Nursery</option>
                    <option value="JKG">JKG</option>
                    <option value="SKG">SKG</option>
                    <option value="1st">1st Class</option>
                    <option value="2nd">2nd Class</option>
                    <option value="3rd">3rd Class</option>
                    <option value="4th">4th Class</option>
                    <option value="5th">5th Class</option>
                    <option value="6th">6th Class</option>
                    <option value="7th">7th Class</option>
                    <option value="8th">8th Class</option>
                    <option value="9th">9th Class</option>
                    <option value="10th">10th Class</option>
                  </select>
                </div>

                <div className="relative w-full sm:w-44">
                  <select
                    value={feeStatusFilter}
                    onChange={(e) => setFeeStatusFilter(e.target.value)}
                    className="w-full text-xs font-bold px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none cursor-pointer focus:bg-white focus:border-blue-500 text-slate-700"
                  >
                    <option value="All">Status: All</option>
                    <option value="Paid">Paid</option>
                    <option value="Partial">Partial</option>
                    <option value="Pending">Pending</option>
                  </select>
                </div>

                <div className="relative w-full sm:w-52">
                  <select
                    value={feeAcademicYearFilter}
                    onChange={(e) => setFeeAcademicYearFilter(e.target.value)}
                    className="w-full text-xs font-bold px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none cursor-pointer focus:bg-white focus:border-blue-500 text-slate-700"
                  >
                    {feeAcademicYearOptions.map((year) => (
                      <option key={year} value={year}>
                        Session: {year}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={handleExportFeesExcel}
                  title="Export fees ledger block to Excel (.csv)"
                  className="inline-flex items-center gap-1.5 px-3 py-2.5 border border-slate-200 hover:border-slate-300 rounded-lg bg-white text-xs font-bold text-slate-600 hover:text-slate-800 transition-all select-none active:scale-95 cursor-pointer shadow-xs"
                >
                  <Download size={13} className="text-emerald-500" />
                  <span>Excel</span>
                </button>
                
                <button
                  onClick={handleExportFeesPDF}
                  title="Print fees ledger or Save as PDF"
                  className="inline-flex items-center gap-1.5 px-3 py-2.5 border border-slate-200 hover:border-slate-300 rounded-lg bg-white text-xs font-bold text-slate-600 hover:text-slate-800 transition-all select-none active:scale-95 cursor-pointer shadow-xs"
                >
                  <FileText size={13} className="text-indigo-500" />
                  <span>PDF Ledger</span>
                </button>
              </div>
            </div>

            {/* Split Screen Master-Detail Workspace Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
              
              {/* Left Column: Fees Directory Ledger Table */}
              <Card className="lg:col-span-3 p-0 pb-2 border border-slate-100 overflow-hidden shadow-xs hover:shadow-sm transition-all bg-white rounded-xl">
                <div className="p-4 border-b border-slate-50">
                  <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">Tuition Status Roster</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50/70 text-slate-500 border-b border-slate-100 font-extrabold">
                        <th className="p-3.5 px-5">Name</th>
                        <th className="p-3.5">Class</th>
                        <th className="p-3.5">Due Amount</th>
                        <th className="p-3.5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 font-bold">
                      {visibleFeeRecords.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="text-center py-10 text-slate-400 text-xs font-semibold">
                            No ledger matches found in directories.
                          </td>
                        </tr>
                      ) : (
                        visibleFeeRecords.map((item) => {
                          const isActive = activeRecord?.id === item.id;
                          return (
                            <tr 
                              key={item.id} 
                              onClick={() => setSelectedFeeStudent(item)}
                              className={`cursor-pointer transition-all ${
                                isActive 
                                  ? 'bg-blue-50/50 text-blue-900 border-l-2 border-blue-600' 
                                  : 'hover:bg-slate-50 text-slate-600 border-l-2 border-transparent'
                              }`}
                            >
                              <td className="p-3.5 px-5">
                                <div className="flex items-center gap-2">
                                  <span className={`h-1.5 w-1.5 rounded-full ${
                                    item.status === 'Paid' ? 'bg-emerald-500' :
                                    item.status === 'Partial' ? 'bg-amber-500' : 'bg-red-500'
                                  }`} />
                                  <span className="font-extrabold">{item.name}</span>
                                </div>
                              </td>
                              <td className="p-3.5 text-slate-500 font-semibold">{item.className}</td>
                              <td className="p-3.5 text-slate-900">₹{(item.dueAmount ?? 0).toLocaleString()}</td>
                              <td className="p-3.5">
                                <Badge 
                                  variant={
                                    item.status === 'Paid' ? 'success' :
                                    item.status === 'Partial' ? 'warning' : 'danger'
                                  }
                                  size="sm"
                                >
                                  {item.status}
                                </Badge>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* Right Column: Selected Student Ledger */}
              {activeRecord && (
                <Card className="lg:col-span-2 p-0 bg-white border border-slate-100 rounded-xl shadow-xs overflow-hidden min-w-0">
                  <div className="p-5 border-b border-slate-100 bg-gradient-to-br from-slate-50 to-white">
                    <p className="text-[10px] uppercase tracking-[0.3em] font-black text-slate-400">Selected Student Ledger</p>
                    <div className="flex items-start justify-between gap-3 mt-2">
                      <div className="min-w-0">
                        <h3 className="text-lg font-black text-slate-900 leading-tight truncate">{activeRecord.name}</h3>
                        <div className="flex flex-wrap gap-2 mt-2 text-[10px] font-bold text-slate-500">
                          <span className="px-2 py-1 rounded-full bg-white border border-slate-200">Adm {activeRecord.admissionNo}</span>
                          <span className="px-2 py-1 rounded-full bg-white border border-slate-200">
                            {activeFinancialEntry?.className || activeRecord.className}
                          </span>
                          <span className="px-2 py-1 rounded-full bg-white border border-slate-200">
                            AY {activeFinancialEntry?.academicYear || activeRecord.academicYear || 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Academic Year</p>
                      <div className="relative w-full max-w-[220px]">
                        <select
                          value={selectedFinancialYear || activeFinancialEntry?.academicYear || ''}
                          onChange={(e) => setSelectedFinancialYear(e.target.value)}
                          className="w-full appearance-none text-xs font-bold px-3 py-2.5 bg-white border border-slate-200 rounded-xl outline-none cursor-pointer focus:border-blue-500 text-slate-700"
                        >
                          {studentFinancialTimeline.map((entry) => (
                            <option key={entry.academicYear} value={entry.academicYear}>
                              {entry.academicYear}
                            </option>
                          ))}
                        </select>
                        <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      </div>
                    </div>
                  </div>

                  <div className="p-5 space-y-5 min-w-0">
                    {studentFinancialHistoryLoading ? (
                      <div className="space-y-4 animate-pulse">
                        <div className="h-24 rounded-2xl bg-slate-100" />
                        <div className="grid grid-cols-2 gap-3">
                          <div className="h-20 rounded-2xl bg-slate-100" />
                          <div className="h-20 rounded-2xl bg-slate-100" />
                        </div>
                        <div className="h-44 rounded-2xl bg-slate-100" />
                      </div>
                    ) : studentFinancialHistoryError ? (
                      <div className="p-4 rounded-2xl border border-red-100 bg-red-50 text-xs font-semibold text-red-700">
                        {studentFinancialHistoryError}
                      </div>
                    ) : studentFinancialTimeline.length === 0 ? (
                      <div className="p-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500">
                        No archived financial years are available for this student.
                      </div>
                    ) : (
                      <>
                        {(() => {
                          const selectedYearEntry =
                            activeFinancialEntry ||
                            studentFinancialTimeline.find((entry) => entry.academicYear === (selectedFinancialYear || activeRecord.academicYear)) ||
                            studentFinancialTimeline[0] ||
                            null;
                          const totalFee = selectedYearEntry?.totalFee ?? activeRecord.totalFee ?? 0;
                          const paidAmount = selectedYearEntry?.paidAmount ?? activeRecord.paidAmount ?? 0;
                          const dueAmount = selectedYearEntry?.dueAmount ?? activeRecord.dueAmount ?? 0;
                          const status = selectedYearEntry?.status || activeRecord.status;
                          const className = selectedYearEntry?.className || activeRecord.className;
                          const matchingFS = getMatchingStructureForClass(className, selectedYearEntry?.academicYear || '');
                          const inst = matchingFS ? getInstallmentStatuses(paidAmount, matchingFS) : {
                            junePaid: 0,
                            septemberPaid: 0,
                            decemberPaid: 0,
                            marchPaid: 0,
                            juneStatus: 'Pending',
                            septemberStatus: 'Pending',
                            decemberStatus: 'Pending',
                            marchStatus: 'Pending'
                          };

                          return (
                            <div className="space-y-5">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Fee</p>
                                  <p className="text-base font-black text-slate-900 mt-1 break-words">₹{totalFee.toLocaleString()}</p>
                                </div>
                                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3">
                                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Paid Amount</p>
                                  <p className="text-base font-black text-emerald-700 mt-1 break-words">₹{paidAmount.toLocaleString()}</p>
                                </div>
                                <div className="rounded-2xl border border-red-100 bg-red-50 p-3">
                                  <p className="text-[10px] font-black uppercase tracking-widest text-red-500">Due Amount</p>
                                  <p className="text-base font-black text-red-700 mt-1 break-words">₹{dueAmount.toLocaleString()}</p>
                                </div>
                                <div className="rounded-2xl border border-slate-100 bg-white p-3">
                                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Status</p>
                                  <div className="mt-1">
                                    <Badge variant={status === 'Paid' ? 'success' : status === 'Partial' ? 'warning' : 'danger'} size="sm">
                                      {status === 'Paid' ? 'Fully Paid' : status || 'Pending'}
                                    </Badge>
                                  </div>
                                </div>
                              </div>

                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Installment Plan</h4>
                                  <span className="text-[10px] font-bold text-slate-400">June / September / December / March</span>
                                </div>
                                {!matchingFS && (
                                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] font-semibold text-amber-700">
                                    No fee structure is configured for this academic year.
                                  </div>
                                )}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {[
                                    ['June', matchingFS?.juneAmount || 0, inst.junePaid],
                                    ['September', matchingFS?.septemberAmount || 0, inst.septemberPaid],
                                    ['December', matchingFS?.decemberAmount || 0, inst.decemberPaid],
                                    ['March', matchingFS?.marchAmount || 0, inst.marchPaid]
                                  ].map(([label, target, paid]) => {
                                    const remaining = Math.max(0, Number(target) - Number(paid));
                                    const installmentStatus = Number(paid) >= Number(target) ? 'Paid' : Number(paid) > 0 ? 'Partial' : 'Pending';

                                    return (
                                      <div key={label as string} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                                        <div className="flex items-center justify-between gap-2 min-w-0">
                                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label as string}</p>
                                          <Badge variant={installmentStatus === 'Paid' ? 'success' : installmentStatus === 'Partial' ? 'warning' : 'danger'} size="xs">
                                            {installmentStatus}
                                          </Badge>
                                        </div>
                                        <p className="mt-2 text-[11px] font-bold text-slate-600 break-words">
                                          {installmentStatus === 'Paid'
                                            ? `Paid ₹${Number(target).toLocaleString()}`
                                            : installmentStatus === 'Partial'
                                              ? `Partial ₹${Number(paid).toLocaleString()}`
                                              : 'Pending'}
                                        </p>
                                        <p className="mt-1 text-[10px] text-slate-400 font-semibold">
                                          Due ₹{remaining.toLocaleString()}
                                        </p>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Payment History</h4>
                                  <span className="text-[10px] font-bold text-slate-400">Frozen snapshot records</span>
                                </div>
                                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                  {(selectedYearEntry?.payments || []).length === 0 ? (
                                    <p className="text-[10px] text-slate-400 bg-slate-50 p-4 text-center rounded-lg font-semibold border border-dashed">
                                      No payment transactions archived for this year.
                                    </p>
                                  ) : (
                                    selectedYearEntry?.payments.map((payment) => (
                                      <div key={payment.receiptNo} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50 min-w-0">
                                        <div className="min-w-0">
                                          <p className="text-xs font-black text-slate-900">{formatDate(payment.paymentDate)}</p>
                                          <p className="text-[10px] font-semibold text-slate-500 mt-1 break-words">
                                            Ref {payment.receiptNo} · {payment.className} · {payment.academicYear}
                                          </p>
                                        </div>
                                        <div className="text-right shrink-0">
                                          <p className="text-xs font-black text-slate-900">₹{payment.amount.toLocaleString()}</p>
                                          <Badge variant={payment.status === 'Paid' ? 'success' : payment.status === 'Partial' ? 'warning' : 'danger'} size="xs">
                                            {payment.paymentMethod}
                                          </Badge>
                                        </div>
                                      </div>
                                    ))
                                  )}
                                </div>
                              </div>

                              <div className="pt-1">
                                {(dueAmount ?? 0) > 0 ? (
                                  <Button
                                    fullWidth
                                    onClick={() => handleOpenPayModal(activeRecord, selectedYearEntry)}
                                    leftIcon={<DollarSign size={15} />}
                                  >
                                    Collect Pending Fee
                                  </Button>
                                ) : (
                                  <div className="w-full rounded-xl border border-emerald-100 bg-emerald-50 py-3 text-center text-xs font-black text-emerald-700">
                                    ✓ Academic Year Fully Paid
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </>
                    )}
                  </div>
                </Card>
              )}

            </div>

            {/* --- PAYMENT HISTORY & REPORTING PANEL (NEW SECTION) --- */}
            <div className="bg-white p-6 border border-slate-100 rounded-xl shadow-xs space-y-6 select-none">
              
              {/* Header and Export Controls */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-sm font-black text-slate-800 tracking-tight uppercase">Payment History & Reports</h3>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                    Query full-school transaction histories, filter month-wise reports, and generate print slips.
                  </p>
                </div>
                
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleExportFeeHistoryExcel}
                    title="Export current filtered history to Excel"
                    className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:border-slate-300 rounded-lg bg-white text-xs font-bold text-slate-600 hover:text-slate-800 transition-all select-none active:scale-95 cursor-pointer shadow-xs"
                  >
                    <Download size={13} className="text-emerald-500" />
                    <span>Export Excel</span>
                  </button>
                  
                  <button
                    onClick={handleExportFeeHistoryPDF}
                    title="Export current filtered history as printable PDF"
                    className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:border-slate-300 rounded-lg bg-white text-xs font-bold text-slate-600 hover:text-slate-800 transition-all select-none active:scale-95 cursor-pointer shadow-xs"
                  >
                    <FileText size={13} className="text-indigo-500" />
                    <span>Export PDF</span>
                  </button>

                  <button
                    onClick={handlePrintFeeHistory}
                    title="Print current filtered history ledger"
                    className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:border-slate-300 rounded-lg bg-white text-xs font-bold text-slate-600 hover:text-slate-800 transition-all select-none active:scale-95 cursor-pointer shadow-xs"
                  >
                    <Printer size={13} className="text-blue-500" />
                    <span>Print Reports</span>
                  </button>
                </div>
              </div>

              {/* Advanced Multi-Filter Form */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                
                {/* 1. Month Filter */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Month</label>
                  <select
                    value={historyMonth}
                    onChange={(e) => setHistoryMonth(e.target.value)}
                    className="w-full text-xs font-bold px-3 py-2 bg-white border border-slate-200 rounded-lg outline-none cursor-pointer focus:border-blue-500 text-slate-700 shadow-sm"
                  >
                    <option value="All">All Months</option>
                    <option value="January">January</option>
                    <option value="February">February</option>
                    <option value="March">March</option>
                    <option value="April">April</option>
                    <option value="May">May</option>
                    <option value="June">June</option>
                    <option value="July">July</option>
                    <option value="August">August</option>
                    <option value="September">September</option>
                    <option value="October">October</option>
                    <option value="November">November</option>
                    <option value="December">December</option>
                  </select>
                </div>

                {/* 2. Year Filter */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Year</label>
                  <select
                    value={historyYear}
                    onChange={(e) => setHistoryYear(e.target.value)}
                    className="w-full text-xs font-bold px-3 py-2 bg-white border border-slate-200 rounded-lg outline-none cursor-pointer focus:border-blue-500 text-slate-700 shadow-sm"
                  >
                    <option value="All">All Years</option>
                    {historyYearOptions.map((year) => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>

                {/* 3. Payment Method Filter */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Payment Method</label>
                  <select
                    value={historyPaymentMethod}
                    onChange={(e) => setHistoryPaymentMethod(e.target.value)}
                    className="w-full text-xs font-bold px-3 py-2 bg-white border border-slate-200 rounded-lg outline-none cursor-pointer focus:border-blue-500 text-slate-700 shadow-sm"
                  >
                    <option value="All">All Methods</option>
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                  </select>
                </div>

                {/* 4. Status Filter */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Status</label>
                  <select
                    value={historyStatusFilter}
                    onChange={(e) => setHistoryStatusFilter(e.target.value)}
                    className="w-full text-xs font-bold px-3 py-2 bg-white border border-slate-200 rounded-lg outline-none cursor-pointer focus:border-blue-500 text-slate-700 shadow-sm"
                  >
                    <option value="All">All Status</option>
                    <option value="Paid">Paid</option>
                    <option value="Partial">Partial</option>
                    <option value="Pending">Pending</option>
                  </select>
                </div>

                {/* 5. Academic Year (Session) Filter */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Session</label>
                  <select
                    value={historyAcademicYearFilter}
                    onChange={(e) => setHistoryAcademicYearFilter(e.target.value)}
                    className="w-full text-xs font-bold px-3 py-2 bg-white border border-slate-200 rounded-lg outline-none cursor-pointer focus:border-blue-500 text-slate-700 shadow-sm"
                  >
                    <option value="All">All Sessions</option>
                    {academicYears.map((year) => (
                      <option key={year.id} value={year.label}>
                        {year.label}{year.isCurrent ? ' (Current)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 6. Class Selector */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Class Selector</label>
                  <select
                    value={historyClassFilter}
                    onChange={(e) => setHistoryClassFilter(e.target.value)}
                    className="w-full text-xs font-bold px-3 py-2 bg-white border border-slate-200 rounded-lg outline-none cursor-pointer focus:border-blue-500 text-slate-700 shadow-sm"
                  >
                    <option value="All">All Classes</option>
                    {feeClassOptions.map(className => (
                      <option key={className} value={className}>
                        {className}
                      </option>
                    ))}
                  </select>
                </div>

              </div>

              {/* Payment History Table */}
              <div className="overflow-x-auto border border-slate-100 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 border-b border-slate-100 font-extrabold">
                      <th className="p-3 px-4">Receipt No</th>
                      <th className="p-3">Student</th>
                      <th className="p-3">Admission No</th>
                      <th className="p-3">Class</th>
                      <th className="p-3">Amount</th>
                      <th className="p-3">Payment Method</th>
                      <th className="p-3">Date</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-bold text-slate-700">
                    {feeHistory.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center py-12 text-slate-400 font-semibold">
                          No transactions found for the specified filters.
                        </td>
                      </tr>
                    ) : (
                      feeHistory.map((item) => (
                        <tr 
                          key={item.id}
                          onClick={() => {
                            setSelectedHistoryItem(item);
                            setIsHistoryDetailModalOpen(true);
                          }}
                          className="hover:bg-slate-50/70 transition-all cursor-pointer"
                        >
                          <td className="p-3 px-4 text-blue-600 font-black">{item.receiptNo || 'N/A'}</td>
                          <td className="p-3 text-slate-900 font-extrabold">{item.name || 'N/A'}</td>
                          <td className="p-3 text-slate-500 font-semibold">{item.admissionNo || 'N/A'}</td>
                          <td className="p-3 text-slate-500 font-medium">{item.className || 'N/A'}</td>
                          <td className="p-3 text-emerald-600 font-black">₹{(item.amount ?? 0).toLocaleString()}</td>
                          <td className="p-3">
                            <Badge variant="warning" size="xs">
                              {item.paymentMethod}
                            </Badge>
                          </td>
                          <td className="p-3 text-slate-500 font-semibold">{formatDate(item.date)}</td>
                          <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setSelectedHistoryItem(item);
                                  setIsHistoryDetailModalOpen(true);
                                }}
                                title="View Receipt Details"
                                className="px-2 py-1 text-[10px] font-extrabold rounded-md bg-slate-100 hover:bg-slate-200 text-slate-750 transition-colors flex items-center gap-1 select-none active:scale-95 cursor-pointer"
                              >
                                <span>👁</span> <span>View</span>
                              </button>
                              
                              <button
                                onClick={() => {
                                    printReceiptBill({
                                      receiptNo: item.receiptNo,
                                      studentName: item.name,
                                      amount: item.amount,
                                      paymentMode: item.paymentMethod,
                                      className: item.className,
                                      academicYear: item.academicYear,
                                      month: item.month,
                                      admissionNo: item.admissionNo,
                                      dueAmountRemaining: item.dueAmount ?? 0,
                                      totalFee: item.paidAmount ? item.paidAmount + (item.dueAmount || 0) : item.amount,
                                      paidAmountTotal: item.paidAmount ?? item.amount
                                    });
                                }}
                                title="Print Receipt Slips"
                                className="px-2 py-1 text-[10px] font-extrabold rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 transition-colors flex items-center gap-1 select-none active:scale-95 cursor-pointer"
                              >
                                <span>🖨</span> <span>Print</span>
                              </button>

                              <button
                                onClick={() => void handleSendStoredFeeReceiptWhatsapp(item.receiptNo)}
                                disabled={sendingHistoryReceiptWhatsapp === item.receiptNo}
                                title="Send WhatsApp Receipt"
                                className="px-2 py-1 text-[10px] font-extrabold rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors flex items-center gap-1 select-none active:scale-95 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                              >
                                <span>💬</span>
                                <span>
                                  {sendingHistoryReceiptWhatsapp === item.receiptNo ? 'Sending' : 'WhatsApp'}
                                </span>
                              </button>

                              <button
                                onClick={() => {
                                  const content = `
=============================================
             ACADEMIC FEE RECEIPT
=============================================
Receipt Number : ${item.receiptNo}
Student Name   : ${item.name}
Admission No   : ${item.admissionNo}
Class          : ${item.className}
Academic Year  : ${item.academicYear || 'N/A'}
=============================================
Settled Amount : ₹${item.amount.toLocaleString()}
Payment Method : ${item.paymentMethod}
Payment Date   : ${formatDate(item.date)}
Remaining Due  : ₹${(item.dueAmount || 0).toLocaleString()}
=============================================
         Thank you for your payment!
=============================================
                                  `.trim();
                                  const blob = new Blob([content], { type: 'text/plain' });
                                  const link = document.createElement('a');
                                  link.href = URL.createObjectURL(blob);
                                  link.download = `Receipt_${item.receiptNo}.txt`;
                                  link.click();
                                }}
                                title="Download Receipt"
                                className="px-2 py-1 text-[10px] font-extrabold rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors flex items-center gap-1 select-none active:scale-95 cursor-pointer"
                              >
                                <span>⬇</span> <span>Download</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

            </div>

            {/* CUSTOM PAY INTERACTIVE DIALOG MODAL */}
            {isCustomPayModalOpen && (
              <Modal
                isOpen={isCustomPayModalOpen}
                onClose={() => setIsCustomPayModalOpen(false)}
                title={receiptDetail ? 'Transaction successful' : 'Pay Fee'}
                size="xl"
                footer={null}
              >
                {(() => {
                  const paymentTarget = paymentLedgerEntry || activeRecord;
                  const paymentYear = selectedFinancialYear || paymentTarget?.academicYear || '';
                  const selectedYearEntry =
                    studentFinancialTimeline.find((entry) => entry.academicYear === paymentYear) ||
                    activeFinancialEntry ||
                    null;
                  const dueAmount = selectedYearEntry?.dueAmount ?? paymentTarget?.dueAmount ?? 0;
                  const paidAmount = selectedYearEntry?.paidAmount ?? paymentTarget?.paidAmount ?? 0;
                  const totalFee = selectedYearEntry?.totalFee ?? paymentTarget?.totalFee ?? 0;
                  const selectedClassName = selectedYearEntry?.className || paymentTarget?.className || '';
                  if (!receiptDetail) {
                    return (
                      <form onSubmit={handleSavePaymentSubmit} className="space-y-4 animate-fadeIn">
                        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3 min-w-0">
                          <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">Student</p>
                          <p className="mt-1 text-sm font-black text-slate-900 truncate">{paymentTarget?.name}</p>
                          <p className="text-[11px] font-semibold text-slate-500 mt-1">
                            Adm {paymentTarget?.admissionNo || 'N/A'} · {selectedClassName}
                          </p>
                          <div className="mt-2 inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-bold text-slate-500">
                            Academic Year: <span className="ml-1 text-slate-900">{paymentYear || 'N/A'}</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Fee</p>
                            <p className="mt-1 text-sm font-black text-slate-900">₹{(totalFee || 0).toLocaleString()}</p>
                          </div>
                          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3">
                            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Paid</p>
                            <p className="mt-1 text-sm font-black text-emerald-700">₹{(paidAmount || 0).toLocaleString()}</p>
                          </div>
                          <div className="rounded-2xl border border-red-100 bg-red-50 p-3">
                            <p className="text-[10px] font-black uppercase tracking-widest text-red-500">Due</p>
                            <p className="mt-1 text-sm font-black text-red-700">₹{(dueAmount || 0).toLocaleString()}</p>
                          </div>
                        </div>

                        {(() => {
                          const matchingFS = getMatchingStructureForClass(selectedClassName, paymentYear);
                          const inst = matchingFS ? getInstallmentStatuses(paidAmount, matchingFS) : {
                            junePaid: 0,
                            septemberPaid: 0,
                            decemberPaid: 0,
                            marchPaid: 0,
                            juneStatus: 'Pending',
                            septemberStatus: 'Pending',
                            decemberStatus: 'Pending',
                            marchStatus: 'Pending'
                          };

                          const juneRemaining = Math.max(0, (matchingFS?.juneAmount || 0) - inst.junePaid);
                          const septemberRemaining = Math.max(0, (matchingFS?.septemberAmount || 0) - inst.septemberPaid);
                          const decemberRemaining = Math.max(0, (matchingFS?.decemberAmount || 0) - inst.decemberPaid);
                          const marchRemaining = Math.max(0, (matchingFS?.marchAmount || 0) - inst.marchPaid);

                          const hasDueInstallments = juneRemaining > 0 || septemberRemaining > 0 || decemberRemaining > 0 || marchRemaining > 0;
                          if (!hasDueInstallments) return null;

                          return (
                            <div className="space-y-1.5 p-3 bg-slate-50 border border-slate-100 rounded-xl">
                              <label className="text-[9px] font-black tracking-wider text-slate-400 uppercase">Installment Quick Select</label>
                              {!matchingFS && (
                                <div className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-[10px] font-semibold text-amber-700">
                                  No fee structure is configured for this academic year.
                                </div>
                              )}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                {juneRemaining > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => setCustomPayAmount(juneRemaining.toString())}
                                    className="text-left p-2 bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50/20 rounded-lg flex flex-col justify-between transition-all active:scale-[0.97] cursor-pointer min-w-0"
                                  >
                                    <span className="text-[9px] font-bold text-slate-400 uppercase">June Term</span>
                                    <span className="text-xs font-black text-blue-600 mt-0.5">₹{juneRemaining.toLocaleString()}</span>
                                  </button>
                                )}
                                {septemberRemaining > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => setCustomPayAmount(septemberRemaining.toString())}
                                    className="text-left p-2 bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/20 rounded-lg flex flex-col justify-between transition-all active:scale-[0.97] cursor-pointer min-w-0"
                                  >
                                    <span className="text-[9px] font-bold text-slate-400 uppercase">Sept Term</span>
                                    <span className="text-xs font-black text-indigo-600 mt-0.5">₹{septemberRemaining.toLocaleString()}</span>
                                  </button>
                                )}
                                {decemberRemaining > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => setCustomPayAmount(decemberRemaining.toString())}
                                    className="text-left p-2 bg-white border border-slate-200 hover:border-purple-300 hover:bg-purple-50/20 rounded-lg flex flex-col justify-between transition-all active:scale-[0.97] cursor-pointer min-w-0"
                                  >
                                    <span className="text-[9px] font-bold text-slate-400 uppercase">Dec Term</span>
                                    <span className="text-xs font-black text-purple-600 mt-0.5">₹{decemberRemaining.toLocaleString()}</span>
                                  </button>
                                )}
                                {marchRemaining > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => setCustomPayAmount(marchRemaining.toString())}
                                    className="text-left p-2 bg-white border border-slate-200 hover:border-pink-300 hover:bg-pink-50/20 rounded-lg flex flex-col justify-between transition-all active:scale-[0.97] cursor-pointer min-w-0"
                                  >
                                    <span className="text-[9px] font-bold text-slate-400 uppercase">March Term</span>
                                    <span className="text-xs font-black text-pink-600 mt-0.5">₹{marchRemaining.toLocaleString()}</span>
                                  </button>
                                )}
                              </div>

                              <button
                                type="button"
                                onClick={() => setCustomPayAmount(String(dueAmount || 0))}
                                className="w-full text-center mt-1.5 p-1.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-lg text-[10px] uppercase tracking-wider transition-all cursor-pointer"
                              >
                                Select Full Outstanding (₹{(dueAmount || 0).toLocaleString()})
                              </button>
                            </div>
                          );
                        })()}

                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-bold text-slate-400 uppercase">Amount Paid</label>
                          <input
                            type="number"
                            required
                            value={customPayAmount}
                            onChange={(e) => setCustomPayAmount(e.target.value)}
                            placeholder="Enter amount to pay"
                            max={dueAmount}
                            min="1"
                            className="w-full text-xs font-bold px-3 py-2.5 border border-slate-200 rounded-lg outline-none focus:border-blue-500 transition-colors"
                          />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-bold text-slate-400 uppercase">Payment Mode</label>
                          <select
                            value={customPayMode}
                            onChange={(e) => setCustomPayMode(e.target.value as any)}
                            className="w-full text-xs font-bold px-3 py-2.5 bg-white border border-slate-200 rounded-lg outline-none cursor-pointer focus:border-blue-500 text-slate-700"
                          >
                            <option value="Cash">Cash</option>
                            <option value="UPI">UPI</option>
                            <option value="Bank Transfer">Bank Transfer</option>
                          </select>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-bold text-slate-400 uppercase">Notes</label>
                          <input
                            type="text"
                            value={customPayNotes}
                            onChange={(e) => setCustomPayNotes(e.target.value)}
                            placeholder="Any payment references or check numbers"
                            className="w-full text-xs font-medium px-3 py-2.5 border border-slate-200 rounded-lg outline-none focus:border-blue-500 transition-colors"
                          />
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                          <Button variant="outline" size="sm" type="button" onClick={() => setIsCustomPayModalOpen(false)}>
                            Cancel
                          </Button>
                          <Button size="sm" type="submit">
                            Save Payment
                          </Button>
                        </div>
                      </form>
                    );
                  }

                  return (
                    <div className="space-y-6 text-center py-4 animate-fadeIn select-none">
                      <div className="mx-auto h-12 w-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                        <CheckCircle size={22} className="animate-pulse" />
                      </div>

                      <div className="space-y-1">
                        <h4 className="text-base font-black text-slate-900">Payment Successful</h4>
                        <p className="text-[11px] text-slate-400 font-semibold">
                          Your transaction reference has been verified and settled in ledger!
                        </p>
                      </div>

                      <div className="bg-slate-50 p-4 border border-slate-200 rounded-xl space-y-3.5 text-xs text-left max-w-sm mx-auto shadow-inner">
                        <div className="flex justify-between border-b border-slate-200 pb-2 gap-3">
                          <span className="text-slate-400 font-semibold">Receipt No:</span>
                          <span className="font-extrabold font-mono text-slate-800 text-right break-words">{receiptDetail.receiptNo}</span>
                        </div>

                        <div className="flex justify-between border-b border-slate-200 pb-2 gap-3">
                          <span className="text-slate-400 font-semibold">Student Name:</span>
                          <span className="font-extrabold text-slate-800 text-right break-words">{receiptDetail.studentName}</span>
                        </div>

                        <div className="flex justify-between border-b border-slate-200 pb-2 gap-3">
                          <span className="text-slate-400 font-semibold">Installment Month:</span>
                          <span className="font-extrabold text-slate-800 text-right break-words">{receiptDetail.month || 'N/A'}</span>
                        </div>

                        <div className="flex justify-between pt-1 gap-3">
                          <span className="text-slate-400 font-semibold">Amount Paid:</span>
                          <span className="font-black text-emerald-600 text-sm text-right">₹{(receiptDetail?.amount ?? 0).toLocaleString()}</span>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2 max-w-sm mx-auto pt-4 border-t border-slate-100">
                        <Button
                          size="sm"
                          variant="secondary"
                          isLoading={sendingReceiptWhatsapp}
                          leftIcon={<Send size={14} />}
                          onClick={handleSendFeeReceiptWhatsapp}
                          className="flex-1"
                        >
                          Send PDF to WhatsApp
                        </Button>
                        <button
                          onClick={() => {
                            printReceiptBill({
                              receiptNo: receiptDetail.receiptNo,
                              studentName: receiptDetail.studentName,
                              amount: receiptDetail.amount,
                              paymentMode: receiptDetail.paymentMethod || customPayMode,
                              className: `${receiptDetail.className || paymentTarget?.className || ''}`,
                              admissionNo: receiptDetail.admissionNo || paymentTarget?.admissionNo || '',
                              academicYear: receiptDetail.academicYear,
                              month: receiptDetail.month,
                              dueAmountRemaining: receiptDetail.dueAmount ?? paymentTarget?.dueAmount ?? 0,
                              totalFee: receiptDetail.totalFee ?? paymentTarget?.totalFee ?? 0,
                              paidAmountTotal: receiptDetail.paidAmount ?? paymentTarget?.paidAmount ?? 0,
                              category: paymentTarget?.category,
                              village: paymentTarget?.village
                            });
                          }}
                          className="flex-1 py-2 border rounded-lg text-xs font-bold font-sans text-slate-700 bg-white hover:bg-slate-50 border-slate-200 transition-all shadow-sm active:scale-[0.98] cursor-pointer"
                        >
                          Download / Save PDF
                        </button>
                        <button
                          onClick={() => {
                            printReceiptBill({
                              receiptNo: receiptDetail.receiptNo,
                              studentName: receiptDetail.studentName,
                              amount: receiptDetail.amount,
                              paymentMode: receiptDetail.paymentMethod || customPayMode,
                              className: `${receiptDetail.className || paymentTarget?.className || ''}`,
                              admissionNo: receiptDetail.admissionNo || paymentTarget?.admissionNo || '',
                              academicYear: receiptDetail.academicYear,
                              month: receiptDetail.month,
                              dueAmountRemaining: receiptDetail.dueAmount ?? paymentTarget?.dueAmount ?? 0,
                              totalFee: receiptDetail.totalFee ?? paymentTarget?.totalFee ?? 0,
                              paidAmountTotal: receiptDetail.paidAmount ?? paymentTarget?.paidAmount ?? 0,
                              category: paymentTarget?.category,
                              village: paymentTarget?.village
                            });
                          }}
                          className="flex-1 py-2 border rounded-lg text-xs font-bold font-sans text-slate-700 bg-indigo-50 border-indigo-100 hover:bg-indigo-100 text-indigo-700 transition-all shadow-sm active:scale-[0.98] cursor-pointer"
                        >
                          Print Receipt
                        </button>
                      </div>

                      <div className="pt-2">
                        <button
                          onClick={() => setIsCustomPayModalOpen(false)}
                          className="w-full text-xs font-extrabold text-white py-2 px-4 rounded-lg bg-slate-800 hover:bg-slate-900 transition-colors active:scale-95"
                        >
                          Done & Close
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </Modal>
            )}

            {/* HISTORICAL STUDENT DETAIL / RECEIPT MODAL */}
            {isHistoryDetailModalOpen && selectedHistoryItem && (
              <Modal
                isOpen={isHistoryDetailModalOpen}
                onClose={() => {
                  setIsHistoryDetailModalOpen(false);
                  setSelectedHistoryItem(null);
                }}
                title="Student Payment History Ledger"
                footer={null}
              >
                <div className="space-y-5 animate-fadeIn select-none">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100/60">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Student Profile Summary</p>
                    <h3 className="text-base font-black text-slate-900 mt-1">{selectedHistoryItem.name}</h3>
                    <div className="grid grid-cols-2 gap-3 mt-3 text-xs font-bold text-slate-600">
                      <div>
                        <span className="text-slate-400">Admission No:</span>
                        <p className="text-slate-800">{selectedHistoryItem.admissionNo}</p>
                      </div>
                      <div>
                        <span className="text-slate-400">Class:</span>
                        <p className="text-slate-800">{selectedHistoryItem.className}</p>
                      </div>
                      <div>
                        <span className="text-slate-400">Installment Month:</span>
                        <p className="text-slate-800">{selectedHistoryItem.month || 'N/A'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Archived Receipt Logs</h4>
                    <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                      {(() => {
                        const studentPayments = feeHistory.filter(item => item.studentId === selectedHistoryItem.studentId);
                        if (studentPayments.length === 0) {
                          return (
                            <p className="text-xs text-slate-400 bg-slate-50 p-4 text-center rounded-lg border border-dashed font-semibold">
                              No archived receipt logs found.
                            </p>
                          );
                        }
                        return studentPayments.map((pay, index) => (
                          <div 
                            key={index} 
                            className="bg-white border border-slate-200 p-3.5 rounded-xl shadow-sm space-y-2 flex flex-col justify-between"
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <span className="text-[10px] font-black text-blue-600 tracking-wide uppercase">{pay.receiptNo || 'N/A'}</span>
                                <p className="text-xs text-slate-400 font-bold mt-0.5">{formatDate(pay.date)}</p>
                              </div>
                              <span className="text-sm font-black text-emerald-600">₹{(pay.amount ?? 0).toLocaleString()}</span>
                            </div>
                            <div className="border-t border-dashed border-slate-100 pt-2 flex justify-between items-center text-[10px] font-extrabold text-slate-500 uppercase tracking-wide">
                              <span>Method: {pay.paymentMethod}</span>
                              <button
                                onClick={() => {
                                  printReceiptBill({
                                    receiptNo: pay.receiptNo,
                                    studentName: pay.name,
                                    amount: pay.amount,
                                    paymentMode: pay.paymentMethod,
                                    className: pay.className,
                                    academicYear: pay.academicYear,
                                    month: pay.month,
                                    admissionNo: pay.admissionNo,
                                    dueAmountRemaining: pay.dueAmount ?? 0,
                                    totalFee: pay.paidAmount ? pay.paidAmount + (pay.dueAmount || 0) : pay.amount,
                                    paidAmountTotal: pay.paidAmount ?? pay.amount
                                  });
                                }}
                                className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                              >
                                Print slip 🖨
                              </button>
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>

                  <div className="pt-2">
                    <Button 
                      fullWidth 
                      onClick={() => {
                        setIsHistoryDetailModalOpen(false);
                        setSelectedHistoryItem(null);
                      }}
                    >
                      Close Report
                    </Button>
                  </div>
                </div>
              </Modal>
            )}

          </div>
        );
      })()}

      {/* --- CORE BULLETIN NOTICES TAB --- */}
      {currentTab === 'fee-structure' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left panel: Matrix table with Search & Filters */}
          <div className="lg:col-span-8 space-y-4">
            <Card className="overflow-hidden">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 mb-4 select-none">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:max-w-xl">
                  {/* Search bar */}
                  <div className="relative w-full sm:max-w-xs">
                    <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      value={feeStructureSearchQuery}
                      onChange={(e) => setFeeStructureSearchQuery(e.target.value)}
                      placeholder="Search class (e.g. Class 1)..."
                      className="w-full text-xs font-semibold pl-9 pr-4 py-2 border border-slate-200 focus:border-blue-500 rounded-lg outline-none"
                    />
                  </div>
                  {/* Year Filter */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider select-none whitespace-nowrap">Session:</span>
                    <select
                      value={activeFeeStructureYearFilter}
                      onChange={(e) => setFeeStructureYearFilter(e.target.value)}
                      className="px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-bold text-slate-700 focus:border-blue-500 cursor-pointer outline-none min-w-[110px]"
                    >
                      <option value="All">All Sessions</option>
                      {academicSessionOptions.map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Export actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExportFeeStructuresExcel}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/60 rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer"
                  >
                    <Download size={14} /> <span className="hidden sm:inline">Export Excel</span>
                  </button>
                  <button
                    onClick={handleExportFeeStructuresPDF}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200/60 rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer"
                  >
                    <FileText size={14} /> <span className="hidden sm:inline">Export PDF</span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-wider font-sans">
                      <th className="py-3 px-4 font-black">Class</th>
                      <th className="py-3 px-4 font-black">Admission Fee</th>
                      <th className="py-3 px-4 font-black">Tuition Fee</th>
                      <th className="py-3 px-4 font-black">Computer Fee</th>
                      <th className="py-3 px-4 font-black">Exam Fee</th>
                      <th className="py-3 px-4 font-black">Cultural Activity Fee</th>
                      <th className="py-3 px-4 font-black text-slate-900">Total Fee</th>
                      <th className="py-3 px-4 font-black text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-xs font-semibold text-slate-700 font-sans">
                    {filteredFeeStructures.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-400 font-bold select-none">
                          No fee structures match the current criteria. Click "Add Fee Structure" to establish policy.
                        </td>
                      </tr>
                    ) : (
                      filteredFeeStructures.map((fs) => {
                        const displayStructure = selectedFeeStructure || filteredFeeStructures[0] || null;
                        const isSelected = displayStructure ? displayStructure.id === fs.id : false;
                        return (
                          <tr 
                            key={fs.id} 
                            onClick={() => setSelectedFeeStructure(fs)}
                            className={`transition-all duration-150 cursor-pointer ${
                              isSelected 
                                ? 'bg-blue-50/50 hover:bg-blue-50/70 border-l-2 border-l-blue-600' 
                                : 'hover:bg-slate-50/70 border-l-2 border-l-transparent'
                            }`}
                          >
                            <td className="py-3 px-4 font-extrabold text-slate-900">
                              <span className="flex items-center gap-1.5">
                                {fs.class}
                                {isSelected && <Badge variant="primary" size="sm">Selected</Badge>}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-600">₹{(fs.admissionFee || 0).toLocaleString()}</td>
                            <td className="py-3 px-4 text-emerald-600 font-bold">₹{(fs.tuitionFee || 0).toLocaleString()}</td>
                            <td className="py-3 px-4 text-slate-600">₹{(fs.computerFee || 0).toLocaleString()}</td>
                            <td className="py-3 px-4 text-slate-600">₹{(fs.examFee || 0).toLocaleString()}</td>
                            <td className="py-3 px-4 text-slate-600">₹{(fs.culturalActivityFee || 0).toLocaleString()}</td>
                            <td className="py-3 px-4 font-black text-slate-950 text-sm">
                              ₹{(fs.totalFee || 0).toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => setSelectedFeeStructure(fs)}
                                  className="p-1 px-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                  title="View details breakdown"
                                >
                                  <Eye size={13} />
                                </button>
                                <button
                                  onClick={() => handleEditFeeStructureClick(fs)}
                                  className="p-1 px-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                  title="Edit Policy"
                                >
                                  <Edit2 size={13} />
                                </button>
                                <button
                                  onClick={() => handleDeleteFeeStructureClick(fs._id)}
                                  className="p-1 px-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                  title="Delete Policy"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {/* Right panel: Details Panel */}
          <div className="lg:col-span-4 space-y-4">
            {(() => {
              const displayStructure = selectedFeeStructure || filteredFeeStructures[0] || null;
              if (displayStructure) {
                return (
                  <Card className="border border-slate-100 shadow-sm bg-white overflow-hidden p-0">
                    <div className="p-4 bg-slate-900 text-white select-none">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase">Selected Structure</span>
                        <span className="text-xs bg-blue-600 px-2.5 py-0.5 rounded-full font-black text-white text-[9px] uppercase tracking-wide">
                          {displayStructure.academicYear || displayStructure.academicSession}
                        </span>
                      </div>
                      <h3 className="text-lg font-black mt-1 font-sans">{displayStructure.class}</h3>
                    </div>

                    <div className="p-5 space-y-5">
                      {/* Fee Breakdown */}
                      <div>
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 leading-none">Fee Breakdown</h4>
                        <div className="space-y-2 font-mono text-xs text-slate-600">
                          <div className="flex items-center justify-between border-b border-dashed border-slate-100 pb-2">
                            <span className="font-medium text-slate-500">Admission Fee</span>
                            <span className="font-extrabold text-slate-800">₹{(displayStructure.admissionFee || 0).toLocaleString()}</span>
                          </div>
                          <div className="flex items-center justify-between border-b border-dashed border-slate-100 pb-2">
                            <span className="font-medium text-slate-500">Tuition Fee</span>
                            <span className="font-extrabold text-slate-800">₹{(displayStructure.tuitionFee || 0).toLocaleString()}</span>
                          </div>
                          <div className="flex items-center justify-between border-b border-dashed border-slate-100 pb-2">
                            <span className="font-medium text-slate-500">Computer Fee</span>
                            <span className="font-extrabold text-slate-800">₹{(displayStructure.computerFee || 0).toLocaleString()}</span>
                          </div>
                          <div className="flex items-center justify-between border-b border-dashed border-slate-100 pb-2">
                            <span className="font-medium text-slate-500">Exam Fee</span>
                            <span className="font-extrabold text-slate-800">₹{(displayStructure.examFee || 0).toLocaleString()}</span>
                          </div>
                          <div className="flex items-center justify-between border-b border-dashed border-slate-100 pb-2">
                            <span className="font-medium text-slate-500">Cultural Activity Fee</span>
                            <span className="font-extrabold text-slate-800">₹{(displayStructure.culturalActivityFee || 0).toLocaleString()}</span>
                          </div>
                          <div className="flex items-center justify-between pt-2 font-sans text-sm font-black text-slate-900 select-none">
                            <span>Total Fee</span>
                            <span className="text-emerald-600 text-base">₹{(displayStructure.totalFee || 0).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>

                      {/* Installment Plan */}
                      <div className="pt-3 border-t border-slate-100">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 leading-none">Installment Plan</h4>
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between p-2.5 bg-slate-50/50 hover:bg-slate-50 border border-slate-100 rounded-lg transition-colors">
                            <div className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                              <span className="text-xs font-bold text-slate-800">June</span>
                            </div>
                            <div className="flex items-center gap-2 font-mono">
                              <span className="text-xs font-black text-slate-900">₹{(displayStructure.juneAmount || 0).toLocaleString()}</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between p-2.5 bg-slate-50/50 hover:bg-slate-50 border border-slate-100 rounded-lg transition-colors">
                            <div className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                              <span className="text-xs font-bold text-slate-800">September</span>
                            </div>
                            <div className="flex items-center gap-2 font-mono">
                              <span className="text-xs font-black text-slate-900">₹{(displayStructure.septemberAmount || 0).toLocaleString()}</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between p-2.5 bg-slate-50/50 hover:bg-slate-50 border border-slate-100 rounded-lg transition-colors">
                            <div className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                              <span className="text-xs font-bold text-slate-800">December</span>
                            </div>
                            <div className="flex items-center gap-2 font-mono">
                              <span className="text-xs font-black text-slate-900">₹{(displayStructure.decemberAmount || 0).toLocaleString()}</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between p-2.5 bg-slate-50/50 hover:bg-slate-50 border border-slate-100 rounded-lg transition-colors">
                            <div className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-pink-500"></span>
                              <span className="text-xs font-bold text-slate-800">March</span>
                            </div>
                            <div className="flex items-center gap-2 font-mono">
                              <span className="text-xs font-black text-slate-900">₹{(displayStructure.marchAmount || 0).toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              }
              return (
                <div className="h-full min-h-[300px] border border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center p-6 text-center bg-slate-50/30">
                  <div className="p-3 bg-slate-100 text-slate-400 rounded-full mb-2">
                    <Eye size={18} />
                  </div>
                  <p className="text-xs font-bold text-slate-500">Select any class structure from the ledger to view the installment plan breakups.</p>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* --- CORE TRANSPORT PANEL TAB --- */}
      {['transport', 'transport-students', 'transport-fee-collection', 'transport-payment-history', 'transport-dashboard'].includes(currentTab) && (
        <TransportPanel 
          allStudents={students} 
          refreshTrigger={refreshTrigger} 
          assignStudentIdPreset={usesTransportPresetStudentId}
          onClearPreset={() => setUsesTransportPresetStudentId(null)}
          activeSubTab={currentTab === 'transport' ? 'transport management' : currentTab}
          setActiveSubTab={setCurrentTab}
        />
      )}

      {/* --- TRANSFER CERTIFICATE MODULE TAB --- */}
      {currentTab === 'transfer-certificates' && (
        <TransferCertificates 
          students={students}
          refreshTrigger={refreshTrigger}
          triggerDataRefresh={triggerDataRefresh}
        />
      )}

      {/* =========================================
                     MODALS FORM POPUPS
         ========================================= */}

      {/* CUSTOM STUDENT PRINT / PDF REPORT GENERATION MODAL */}
      <Modal
        isOpen={isStudentReportModalOpen}
        onClose={() => setIsStudentReportModalOpen(false)}
        title="Generate Student Report"
        footer={
          <div className="flex gap-2 w-full sm:w-auto justify-end">
            <Button variant="outline" size="sm" onClick={() => setIsStudentReportModalOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handleGenerateStudentReport(true)}
              isLoading={reportLoading}
            >
              <Printer size={14} className="mr-1 text-slate-500 inline" /> Print Directly
            </Button>
            <Button 
              size="sm" 
              onClick={() => handleGenerateStudentReport(false)}
              isLoading={reportLoading}
            >
              <FileText size={14} className="mr-1 text-white inline" /> Generate PDF
            </Button>
          </div>
        }
      >
        <div className="space-y-6 select-none max-h-[70vh] overflow-y-auto pr-2">
          {/* Top Utility Buttons */}
          <div className="flex flex-wrap gap-2 pb-3 border-b border-slate-100">
            <button
              onClick={() => {
                const allCols = REPORT_COLUMNS.map(c => c.id);
                setSelectedColumns(allCols);
                localStorage.setItem(LOCAL_STORAGE_REPORT_COLS_KEY, JSON.stringify(allCols));
              }}
              className="text-[11px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer"
            >
              Select All
            </button>
            <button
              onClick={() => {
                setSelectedColumns([]);
                localStorage.setItem(LOCAL_STORAGE_REPORT_COLS_KEY, JSON.stringify([]));
              }}
              className="text-[11px] font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer"
            >
              Clear Selection
            </button>
            <button
              onClick={() => {
                setSelectedColumns(DEFAULT_REPORT_COLUMNS);
                localStorage.setItem(LOCAL_STORAGE_REPORT_COLS_KEY, JSON.stringify(DEFAULT_REPORT_COLUMNS));
              }}
              className="text-[11px] font-bold text-slate-600 hover:text-slate-800 border border-slate-200 hover:bg-slate-50 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer"
            >
              Reset to Default
            </button>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            Customize the columns of your professional ERP Student Registry Report. Every selected field will become its own individual column. Portrait layout is applied for 1–8 selected columns; landscape is automatically selected for more than 8 columns.
          </p>

          {/* Grouped Checkboxes Grid */}
          <div className="space-y-5">
            {(['Basic Information', 'Personal Information', 'Parent Information', 'Government IDs', 'Address', 'Fee Information', 'Transport'] as const).map(category => {
              const categoryCols = REPORT_COLUMNS.filter(col => col.category === category);
              return (
                <div key={category} className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-900 border-b border-slate-100 pb-1 tracking-wide uppercase">
                    {category}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {categoryCols.map(col => {
                      const isSelected = selectedColumns.includes(col.id);
                      return (
                        <label
                          key={col.id}
                          className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-blue-50/50 border-blue-200 text-blue-900 shadow-2xs'
                              : 'bg-white border-slate-100 text-slate-600 hover:bg-slate-50 hover:border-slate-200'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              const updated = isSelected
                                ? selectedColumns.filter(c => c !== col.id)
                                : [...selectedColumns, col.id];
                              setSelectedColumns(updated);
                              localStorage.setItem(LOCAL_STORAGE_REPORT_COLS_KEY, JSON.stringify(updated));
                            }}
                            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                          <span>{col.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Modal>

      {/* 0. VIEW STUDENT PROFILE DETAILS MODAL */}
      <Modal
        isOpen={isViewStudentModalOpen}
        onClose={() => { setIsViewStudentModalOpen(false); setSelectedViewStudent(null); }}
        title="Student Profile & Registry Dossier"
        footer={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => { if (selectedViewStudent) handlePrintStudentProfile(selectedViewStudent); }}>
              Print Details
            </Button>
            <Button size="sm" onClick={() => { setIsViewStudentModalOpen(false); setSelectedViewStudent(null); }}>
              Close Dossier
            </Button>
          </div>
        }
      >
        {selectedViewStudent && (
          <div className="space-y-6">
            {/* Header: Avatar & Core Info */}
            <div className="flex items-center gap-4 p-4 bg-slate-50 border border-slate-100 rounded-xl">
              <img
                src={`https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(selectedViewStudent.name)}`}
                alt="Student Avatar"
                className="h-16 w-16 rounded-xl bg-white border border-slate-200 shadow-xs flex-shrink-0"
              />
              <div>
                <span className="text-[10px] bg-blue-100 border border-blue-200 text-blue-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                  {selectedViewStudent.class || 'N/A'}
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-1">{selectedViewStudent.name}</h3>
                <p className="text-xs text-slate-500 font-medium">{selectedViewStudent.email}</p>
              </div>
            </div>

            {/* Grid Layout of parameters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Box 1: Personal & Demographic Info */}
              <div className="p-4 border border-slate-100 rounded-xl space-y-2 bg-white">
                <h5 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-1.5">Demographics & Academic</h5>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-bold">Gender:</span>
                    <span className="font-extrabold text-slate-800">{selectedViewStudent.gender || 'Male'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-bold">Date of Birth:</span>
                    <span className="font-extrabold text-slate-800">{formatDate(selectedViewStudent.dateOfBirth)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-bold">Joining Date:</span>
                    <span className="font-extrabold text-slate-800">{formatDate(selectedViewStudent.joiningDate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-bold">Admission No:</span>
                    <span className="font-extrabold text-slate-800">{selectedViewStudent.admissionNo || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-bold">Roll Number:</span>
                    <span className="font-extrabold text-slate-800">{selectedViewStudent.rollNo || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-bold">Category:</span>
                    <span className="font-extrabold text-blue-700">{selectedViewStudent.category || 'General'}</span>
                  </div>
                </div>
              </div>

              {/* Box 2: Government IDs */}
              <div className="p-4 border border-slate-100 rounded-xl space-y-2 bg-white">
                <h5 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-1.5">Government IDs</h5>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-bold">Aadhaar No:</span>
                    <span className="font-extrabold text-slate-800 font-mono">{selectedViewStudent.aadharNo || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-bold">Samagra ID:</span>
                    <span className="font-extrabold text-slate-800 font-mono">{selectedViewStudent.samagraId || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-bold">APAAR ID:</span>
                    <span className="font-extrabold text-slate-800 font-mono">{selectedViewStudent.apaarId || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-bold">PAN No:</span>
                    <span className="font-extrabold text-slate-800 font-mono">{selectedViewStudent.panNo || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Box 3: Parent & Contact Details */}
              <div className="p-4 border border-slate-100 rounded-xl space-y-2 bg-white">
                <h5 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-1.5">Family & Contact</h5>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-bold">Father's Name:</span>
                    <span className="font-extrabold text-slate-800">{selectedViewStudent.fatherName || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-bold">Mother's Name:</span>
                    <span className="font-extrabold text-slate-800">{selectedViewStudent.motherName || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-bold">Phone No:</span>
                    <span className="font-extrabold text-slate-800">{selectedViewStudent.phone || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Box 4: Address Details */}
              <div className="p-4 border border-slate-100 rounded-xl space-y-2 bg-white">
                <h5 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-1.5">Address Details</h5>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-bold">Village:</span>
                    <span className="font-extrabold text-slate-800">{selectedViewStudent.address?.village || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-bold">Post Office:</span>
                    <span className="font-extrabold text-slate-800">{selectedViewStudent.address?.postOffice || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-bold">Tehsil:</span>
                    <span className="font-extrabold text-slate-800">{selectedViewStudent.address?.tehsil || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-bold">District:</span>
                    <span className="font-extrabold text-slate-800">{selectedViewStudent.address?.district || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-bold">State:</span>
                    <span className="font-extrabold text-slate-800">{selectedViewStudent.address?.state || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-bold">Pincode:</span>
                    <span className="font-extrabold text-slate-800 font-mono">{selectedViewStudent.address?.pincode || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Box 5: Bank Details */}
              <div className="p-4 border border-slate-100 rounded-xl space-y-2 bg-white">
                <h5 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-1.5">Bank Details</h5>
                {(!selectedViewStudent.bankDetails || (
                  !selectedViewStudent.bankDetails.accountHolderName &&
                  !selectedViewStudent.bankDetails.bankName &&
                  !selectedViewStudent.bankDetails.accountNumber &&
                  !selectedViewStudent.bankDetails.ifscCode &&
                  !selectedViewStudent.bankDetails.branchName
                )) ? (
                  <div className="text-xs text-slate-500 italic py-1 text-center">No Bank Details Available</div>
                ) : (
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-bold">Account Holder:</span>
                      <span className="font-extrabold text-slate-800">{selectedViewStudent.bankDetails?.accountHolderName || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-bold">Bank Name:</span>
                      <span className="font-extrabold text-slate-800">{selectedViewStudent.bankDetails?.bankName || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-bold">Account Number:</span>
                      <span className="font-extrabold text-slate-800 font-mono">
                        {selectedViewStudent.bankDetails?.accountNumber
                          ? selectedViewStudent.bankDetails.accountNumber.length > 4
                            ? '*'.repeat(selectedViewStudent.bankDetails.accountNumber.length - 4) + selectedViewStudent.bankDetails.accountNumber.slice(-4)
                            : selectedViewStudent.bankDetails.accountNumber
                          : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-bold">IFSC Code:</span>
                      <span className="font-extrabold text-slate-800 font-mono">{selectedViewStudent.bankDetails?.ifscCode || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-bold">Branch Name:</span>
                      <span className="font-extrabold text-slate-800">{selectedViewStudent.bankDetails?.branchName || 'N/A'}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      <StudentPromotionModal
        isOpen={isPromotionModalOpen}
        onClose={() => setIsPromotionModalOpen(false)}
        students={allStudents}
        academicYears={promotionAcademicYears}
        currentUserName={currentUser?.name}
        onSuccess={handlePromotionSuccess}
      />

      {/* 1. ADMIT STUDENT MODAL */}
      <Modal
        isOpen={isStudentModalOpen}
        onClose={closeStudentModal}
        title={editingStudentId ? 'Edit Student Registry Details' : 'Admit New Student Registry'}
        footer={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={closeStudentModal}>
              Cancel
            </Button>
            <Button size="sm" type="submit" form="student-admit-form" isLoading={submitLoading}>
              {editingStudentId ? 'Save Changes' : 'Save Student Admission'}
            </Button>
          </div>
        }
      >
        <form id="student-admit-form" onSubmit={handleStudentSubmit} className="space-y-5">
          {/* Section 1: Academic & Personal Info */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-4">
            <h5 className="text-xs font-bold text-slate-500 tracking-wider uppercase border-b border-slate-200/60 pb-1.5">Academic & Personal Info</h5>
            
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="FULL NAME"
                placeholder="Enter Full Name"
                value={studentForm.name}
                onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })}
                error={formErrors.name}
                required
              />
              <div className="w-full flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700 tracking-wide select-none">
                  GENDER
                </label>
                <select
                  className="w-full px-3.5 py-2 text-sm text-slate-900 bg-white border border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-lg transition-all duration-200 outline-none cursor-pointer"
                  value={studentForm.gender}
                  onChange={(e) => setStudentForm({ ...studentForm, gender: e.target.value })}
                  required
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="DATE OF BIRTH"
                type="date"
                value={studentForm.dateOfBirth}
                onChange={(e) => setStudentForm({ ...studentForm, dateOfBirth: e.target.value })}
              />
              <Input
                label="JOINING DATE"
                type="date"
                value={studentForm.joiningDate}
                onChange={(e) => setStudentForm({ ...studentForm, joiningDate: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Input
                label="ADMISSION NO"
                placeholder="Enter Admission No."
                value={studentForm.admissionNo}
                onChange={(e) => setStudentForm({ ...studentForm, admissionNo: e.target.value })}
                error={formErrors.admissionNo}
                required
              />
              <div className="w-full flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700 tracking-wide select-none">
                  CLASS
                </label>
                <div className="relative flex items-center w-full">
                  <select
                    className={`w-full px-3.5 py-2 text-sm text-slate-900 bg-white border rounded-lg transition-all duration-200 outline-none cursor-pointer focus:ring-4 focus:ring-blue-500/10 ${formErrors.class ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : 'border-slate-200 hover:border-slate-300 focus:border-blue-500'}`}
                    value={studentForm.class}
                    onChange={(e) => setStudentForm({ ...studentForm, class: e.target.value })}
                    required
                  >
                    <option value="" disabled>Select Class</option>
                    <option value="Nursery">Nursery</option>
                    <option value="LKG">LKG</option>
                    <option value="UKG">UKG</option>
                    <option value="Class 1st">Class 1st</option>
                    <option value="Class 2nd">Class 2nd</option>
                    <option value="Class 3rd">Class 3rd</option>
                    <option value="Class 4th">Class 4th</option>
                    <option value="Class 5th">Class 5th</option>
                    <option value="Class 6th">Class 6th</option>
                    <option value="Class 7th">Class 7th</option>
                    <option value="Class 8th">Class 8th</option>
                    <option value="Class 9th">Class 9th</option>
                    <option value="Class 10th">Class 10th</option>
                  </select>
                </div>
                {formErrors.class && (
                  <span className="text-xs text-red-500 font-medium flex items-center gap-1">
                    {formErrors.class}
                  </span>
                )}
              </div>
              <div className="w-full flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700 tracking-wide select-none">
                  ACADEMIC YEAR / SESSION
                </label>
                <select
                  className={`w-full px-3.5 py-2 text-sm text-slate-900 bg-white border rounded-lg transition-all duration-200 outline-none cursor-pointer focus:ring-4 focus:ring-blue-500/10 ${formErrors.academicYear ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : 'border-slate-200 hover:border-slate-300 focus:border-blue-500'}`}
                  value={studentForm.academicYear}
                  onChange={(e) => setStudentForm({ ...studentForm, academicYear: e.target.value })}
                  required={academicYearLabels.length > 0}
                  disabled={academicYearLabels.length === 0}
                >
                  <option value="" disabled>
                    {academicYearLabels.length > 0 ? 'Select Session' : 'Create a session first'}
                  </option>
                  {academicYearLabels.map((year) => (
                    <option key={year} value={year}>
                      {year}{academicYears.find((entry) => entry.label === year)?.isCurrent ? ' (Current)' : ''}
                    </option>
                  ))}
                </select>
                {formErrors.academicYear && (
                  <span className="text-xs text-red-500 font-medium flex items-center gap-1">
                    {formErrors.academicYear}
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="ROLL NO"
                type="number"
                placeholder="Enter Roll No."
                value={studentForm.rollNo}
                onChange={(e) => setStudentForm({ ...studentForm, rollNo: e.target.value })}
                error={formErrors.rollNo}
                required
              />
              <div className="w-full flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700 tracking-wide select-none">
                  CATEGORY
                </label>
                <select
                  className="w-full px-3.5 py-2 text-sm text-slate-900 bg-white border border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-lg transition-all duration-200 outline-none cursor-pointer"
                  value={studentForm.category}
                  onChange={(e) => setStudentForm({ ...studentForm, category: e.target.value as any })}
                  required
                >
                  <option value="General">General</option>
                  <option value="OBC">OBC</option>
                  <option value="SC">SC</option>
                  <option value="ST">ST</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Government IDs */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-4">
            <h5 className="text-xs font-bold text-slate-500 tracking-wider uppercase border-b border-slate-200/60 pb-1.5">Government IDs</h5>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="AADHAAR NO"
                placeholder="12-digit Aadhaar No"
                value={studentForm.aadharNo}
                onChange={(e) => setStudentForm({ ...studentForm, aadharNo: e.target.value })}
                error={formErrors.aadharNo}
              />
              <Input
                label="SAMAGRA ID"
                placeholder="Samagra ID"
                value={studentForm.samagraId}
                onChange={(e) => setStudentForm({ ...studentForm, samagraId: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="APAAR ID"
                placeholder="APAAR ID"
                value={studentForm.apaarId}
                onChange={(e) => setStudentForm({ ...studentForm, apaarId: e.target.value })}
              />
              <Input
                label="PAN NO"
                placeholder="10-char PAN No"
                value={studentForm.panNo}
                onChange={(e) => setStudentForm({ ...studentForm, panNo: e.target.value.toUpperCase() })}
                error={formErrors.panNo}
              />
            </div>
          </div>

          {/* Section 2.5: Transport & Logistics */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-4">
            <h5 className="text-xs font-bold text-slate-500 tracking-wider uppercase border-b border-slate-200/60 pb-1.5">Transport & Logistics</h5>
            <div className="w-full flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-700 tracking-wide select-none">
                USES TRANSPORT SERVICES?
              </label>
              <select
                className="w-full px-3.5 py-2 text-sm text-slate-900 bg-white border border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-lg transition-all duration-200 outline-none cursor-pointer"
                value={studentForm.usesTransport}
                onChange={(e) => setStudentForm({ ...studentForm, usesTransport: e.target.value as any })}
                required
              >
                <option value="No">No - Independent Travel</option>
                <option value="Yes">Yes - Assign School Bus Route</option>
              </select>
              <p className="text-[10px] text-slate-400 font-semibold">
                Selecting "Yes" will automatically route you to assign a bus route, pickup point, and monthly charge once the student's admission is saved.
              </p>
            </div>
          </div>

          {/* Section 3: Parental Details & Contact */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-4">
            <h5 className="text-xs font-bold text-slate-500 tracking-wider uppercase border-b border-slate-200/60 pb-1.5">Parental & Contact Details</h5>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="FATHER'S NAME"
                placeholder="Enter Father's Name"
                value={studentForm.fatherName}
                onChange={(e) => setStudentForm({ ...studentForm, fatherName: e.target.value })}
                error={formErrors.fatherName}
                required
              />
              <Input
                label="MOTHER'S NAME"
                placeholder="Enter Mother's Name"
                value={studentForm.motherName}
                onChange={(e) => setStudentForm({ ...studentForm, motherName: e.target.value })}
                error={formErrors.motherName}
                required
              />
            </div>
            <Input
              label="PHONE / CONTACT (10 Digits)"
              placeholder="Enter 10 digit Mobile No."
              value={studentForm.phone}
              onChange={(e) => setStudentForm({ ...studentForm, phone: e.target.value })}
              error={formErrors.phone}
              required
            />
          </div>

          {/* Section 4: Address Details */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-4">
            <h5 className="text-xs font-bold text-slate-500 tracking-wider uppercase border-b border-slate-200/60 pb-1.5">Address Details</h5>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="VILLAGE"
                placeholder="Enter Village Name"
                value={studentForm.address.village}
                onChange={(e) => setStudentForm({
                  ...studentForm,
                  address: { ...studentForm.address, village: e.target.value }
                })}
              />
              <Input
                label="POST OFFICE"
                placeholder="Enter Post Office Name"
                value={studentForm.address.postOffice}
                onChange={(e) => setStudentForm({
                  ...studentForm,
                  address: { ...studentForm.address, postOffice: e.target.value }
                })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="TEHSIL"
                placeholder="Enter Tehsil"
                value={studentForm.address.tehsil}
                onChange={(e) => setStudentForm({
                  ...studentForm,
                  address: { ...studentForm.address, tehsil: e.target.value }
                })}
              />
              <Input
                label="DISTRICT"
                placeholder="Enter District"
                value={studentForm.address.district}
                onChange={(e) => setStudentForm({
                  ...studentForm,
                  address: { ...studentForm.address, district: e.target.value }
                })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="STATE"
                placeholder="Madhya Pradesh"
                value={studentForm.address.state}
                onChange={(e) => setStudentForm({
                  ...studentForm,
                  address: { ...studentForm.address, state: e.target.value }
                })}
                error={formErrors.state}
              />
              <Input
                label="PINCODE"
                placeholder="481551"
                value={studentForm.address.pincode}
                onChange={(e) => setStudentForm({
                  ...studentForm,
                  address: { ...studentForm.address, pincode: e.target.value }
                })}
                error={formErrors.pincode}
              />
            </div>
          </div>

          {/* Section: Bank Details */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-4">
            <h5 className="text-xs font-bold text-slate-500 tracking-wider uppercase border-b border-slate-200/60 pb-1.5">Bank Details</h5>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="ACCOUNT HOLDER NAME"
                placeholder="Enter Name"
                value={studentForm.bankDetails?.accountHolderName || ''}
                onChange={(e) => setStudentForm({
                  ...studentForm,
                  bankDetails: { ...(studentForm.bankDetails || {}), accountHolderName: e.target.value }
                })}
              />
              <Input
                label="BANK NAME"
                placeholder="Enter Bank Name"
                value={studentForm.bankDetails?.bankName || ''}
                onChange={(e) => setStudentForm({
                  ...studentForm,
                  bankDetails: { ...(studentForm.bankDetails || {}), bankName: e.target.value }
                })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="ACCOUNT NUMBER"
                placeholder="Enter Acc. No."
                value={studentForm.bankDetails?.accountNumber || ''}
                onChange={(e) => setStudentForm({
                  ...studentForm,
                  bankDetails: { ...(studentForm.bankDetails || {}), accountNumber: e.target.value }
                })}
              />
              <Input
                label="IFSC CODE"
                placeholder="Enter IFSC Code"
                value={studentForm.bankDetails?.ifscCode || ''}
                onChange={(e) => setStudentForm({
                  ...studentForm,
                  bankDetails: { ...(studentForm.bankDetails || {}), ifscCode: e.target.value }
                })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="BRANCH NAME"
                placeholder="Enter Branch Name"
                value={studentForm.bankDetails?.branchName || ''}
                onChange={(e) => setStudentForm({
                  ...studentForm,
                  bankDetails: { ...(studentForm.bankDetails || {}), branchName: e.target.value }
                })}
              />
            </div>
          </div>

          {/* Section 5: Portal Credentials */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-4">
            <h5 className="text-xs font-bold text-slate-500 tracking-wider uppercase border-b border-slate-200/60 pb-1.5">User Portal Login Credentials</h5>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="LOGIN EMAIL"
                type="email"
                placeholder="Enter Email"
                value={studentForm.email}
                onChange={(e) => setStudentForm({ ...studentForm, email: e.target.value })}
                error={formErrors.email}
                required
              />
              <Input
                label="PORTAL PASSWORD"
                type="password"
                placeholder="Enter Password"
                value={studentForm.password}
                onChange={(e) => setStudentForm({ ...studentForm, password: e.target.value })}
                error={formErrors.password}
                required
              />
            </div>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isStudentFormErrorModalOpen}
        onClose={() => setIsStudentFormErrorModalOpen(false)}
        title="Student Form Errors"
        size="sm"
        footer={
          <Button size="sm" onClick={() => setIsStudentFormErrorModalOpen(false)}>
            Close
          </Button>
        }
      >
        <div className="space-y-3">
          <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3">
            <p className="text-sm font-semibold text-red-700">
              {studentFormErrorTitle || 'Please correct the highlighted fields before submitting.'}
            </p>
          </div>
          <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-100 bg-white">
            <ul className="divide-y divide-slate-100">
              {studentFormErrorMessages.map((message, index) => (
                <li key={`${message}-${index}`} className="px-4 py-3 text-sm text-slate-700">
                  {message}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Modal>

      {/* 2. ONBOARD TEACHER MODAL */}
      <Modal
        isOpen={isTeacherModalOpen}
        onClose={() => { setIsTeacherModalOpen(false); setEditingTeacherId(null); }}
        title={editingTeacherId ? 'Edit Faculty Details' : 'Onboard Faculty Officer'}
        footer={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => { setIsTeacherModalOpen(false); setEditingTeacherId(null); }}>
              Cancel
            </Button>
            <Button size="sm" type="submit" form="teacher-onboard-form" isLoading={submitLoading}>
              {editingTeacherId ? 'Save Changes' : 'Onboard Faculty'}
            </Button>
          </div>
        }
      >
        <form id="teacher-onboard-form" onSubmit={handleTeacherSubmit} className="space-y-4">
          <Input
            label="FULL NAME"
            placeholder="Enter Full Name"
            value={teacherForm.name}
            onChange={(e) => setTeacherForm({ ...teacherForm, name: e.target.value })}
            error={formErrors.name}
            required
          />

          <div className="bg-slate-50 p-3 rounded-lg border border-slate-100/80 space-y-3">
            <p className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">User Portal Login Credentials</p>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="LOGIN EMAIL"
                type="email"
                placeholder="Enter Email"
                value={teacherForm.email}
                onChange={(e) => setTeacherForm({ ...teacherForm, email: e.target.value })}
                required
              />
              <Input
                label="PORTAL PASSWORD"
                type="password"
                placeholder="Enter Password"
                value={teacherForm.password}
                onChange={(e) => setTeacherForm({ ...teacherForm, password: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="SUBJECT STREAM SPECIALTY"
              placeholder="Subject"
              value={teacherForm.subject}
              onChange={(e) => setTeacherForm({ ...teacherForm, subject: e.target.value })}
              error={formErrors.subject}
              required
            />
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-700 mb-1.5">DEPARTMENT DELEGATION</label>
              <select
                className="w-full px-3 py-2 text-xs border rounded-lg bg-white border-slate-200 outline-none hover:border-slate-300"
                value={teacherForm.department}
                onChange={(e) => setTeacherForm({ ...teacherForm, department: e.target.value })}
              >
                <option value="Science">Science</option>
                <option value="Mathematics">Mathematics</option>
                <option value="Humanities">Humanities</option>
                <option value="Languages">Languages</option>
                <option value="Fine Arts">Fine Arts</option>
              </select>
            </div>
          </div>
          <Input
            label="CONTACT NUMBER"
            placeholder="Enter Contact No."
            value={teacherForm.contact}
            onChange={(e) => setTeacherForm({ ...teacherForm, contact: e.target.value })}
            required
          />
        </form>
      </Modal>

      {/* 3. TUITION COLLECTION MODAL */}
      <Modal
        isOpen={isFeeModalOpen}
        onClose={() => {
          setIsFeeModalOpen(false);
          setFeeModalSearchQuery('');
        }}
        title="Record Payment - Choose Student"
        footer={
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => {
              setIsFeeModalOpen(false);
              setFeeModalSearchQuery('');
            }}>
              Cancel
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-500 leading-relaxed">
            Search or select a student from the ledger roster to view their personalized payment breakdown, select outstanding term installments, and process payment recordings safely.
          </p>

          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search student by name, class, or admission no..."
              value={feeModalSearchQuery}
              onChange={(e) => setFeeModalSearchQuery(e.target.value)}
              className="w-full text-xs font-semibold pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all placeholder:text-slate-400"
            />
          </div>

          <div className="max-h-[300px] overflow-y-auto pr-1 space-y-2 border-t border-slate-100 pt-3">
            {(() => {
              const filteredForModal = feeRecords.filter(record => {
                const q = feeModalSearchQuery.trim().toLowerCase();
                if (!q) return true;
                return (
                  record.name?.toLowerCase().includes(q) ||
                  record.admissionNo?.toLowerCase().includes(q) ||
                  record.className?.toLowerCase().includes(q)
                );
              });

              if (filteredForModal.length === 0) {
                return (
                  <div className="text-center py-8">
                    <Users className="h-8 w-8 text-slate-300 mx-auto stroke-1" />
                    <p className="text-xs font-bold text-slate-400 mt-2">No matching students found</p>
                  </div>
                );
              }

              return filteredForModal.map(record => {
                const isPaid = (record.dueAmount ?? 0) <= 0;
                return (
                  <button
                    key={record.id}
                    type="button"
                    onClick={() => {
                      setSelectedFeeStudent(record);
                      setCustomPayAmount((record.dueAmount ?? 0).toString());
                      setReceiptDetail(null);
                      setIsFeeModalOpen(false);
                      setFeeModalSearchQuery('');
                      setIsCustomPayModalOpen(true);
                    }}
                    className="w-full text-left flex items-center justify-between p-3 border border-slate-200 hover:border-blue-300 bg-white hover:bg-blue-50/10 rounded-xl transition-all cursor-pointer group active:scale-99"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-slate-100 group-hover:bg-blue-50 text-slate-600 group-hover:text-blue-600 flex items-center justify-center font-bold text-xs transition-colors">
                        {record.name ? record.name.charAt(0) : 'S'}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800 group-hover:text-blue-700 transition-colors">
                          {record.name}
                        </p>
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                          Adm: <span className="font-bold text-slate-600">{record.admissionNo}</span> · Class: <span className="font-bold text-slate-600">{record.className}</span>
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className={`text-xs font-black ${isPaid ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {isPaid ? 'Settled' : `₹${(record.dueAmount ?? 0).toLocaleString()}`}
                      </p>
                      <p className="text-[9px] text-slate-400 font-bold mt-0.5">
                        {isPaid ? 'No Outstanding' : 'Bal Due'}
                      </p>
                    </div>
                  </button>
                );
              });
            })()}
          </div>
        </div>
      </Modal>

      {/* FEE STRUCTURE MODAL */}
      <Modal
        isOpen={isFeeStructureModalOpen}
        onClose={() => { setIsFeeStructureModalOpen(false); setEditingFeeStructureId(null); }}
        title={editingFeeStructureId ? 'Edit Fee Structure Policy' : 'Add Fee Structure Policy'}
        footer={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => { setIsFeeStructureModalOpen(false); setEditingFeeStructureId(null); }}>
              Cancel
            </Button>
            <Button size="sm" type="submit" form="fee-structure-form" isLoading={submitLoading}>
              Save Strategy
            </Button>
          </div>
        }
      >
        {(() => {
          const currentModalTotal =
            (Number(feeStructureForm.admissionFee) || 0) +
            (Number(feeStructureForm.tuitionFee) || 0) +
            (Number(feeStructureForm.computerFee) || 0) +
            (Number(feeStructureForm.examFee) || 0) +
            (Number(feeStructureForm.culturalActivityFee) || 0);

          return (
            <form id="fee-structure-form" onSubmit={handleFeeStructureSubmit} className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="w-full flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-700 tracking-wide select-none uppercase">
                    Class Name
                  </label>
                  <select
                    className="w-full px-3.5 py-2 text-sm text-slate-900 bg-white border border-slate-200 hover:border-slate-300 focus:border-blue-500 rounded-lg transition-all duration-200 cursor-pointer outline-none"
                    value={feeStructureForm.class}
                    onChange={(e) => setFeeStructureForm({ ...feeStructureForm, class: e.target.value })}
                    required
                  >
                    <option value="Class 1st">Class 1st</option>
                    <option value="Class 2nd">Class 2nd</option>
                    <option value="Class 3rd">Class 3rd</option>
                    <option value="Class 4th">Class 4th</option>
                    <option value="Class 5th">Class 5th</option>
                    <option value="Class 6th">Class 6th</option>
                    <option value="Class 7th">Class 7th</option>
                    <option value="Class 8th">Class 8th</option>
                    <option value="Class 9th">Class 9th</option>
                    <option value="Class 10th">Class 10th</option>
                    <option value="Nursery">Nursery</option>
                    <option value="LKG">LKG</option>
                    <option value="UKG">UKG</option>
                  </select>
                </div>
                <div className="w-full flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-700 tracking-wide select-none uppercase">
                    Academic Year
                  </label>
                  <select
                    className="w-full px-3.5 py-2 text-sm text-slate-900 bg-white border border-slate-200 hover:border-slate-300 focus:border-blue-500 rounded-lg transition-all duration-200 cursor-pointer outline-none"
                    value={feeStructureForm.academicSession}
                    onChange={(e) => setFeeStructureForm({ ...feeStructureForm, academicSession: e.target.value })}
                    required
                    disabled={!academicYearLabels.length}
                  >
                    <option value="" disabled>
                      {academicYearLabels.length ? 'Select session' : 'Create a session first'}
                    </option>
                    {academicYearLabels.map((year) => (
                      <option key={year} value={year}>
                        {year}{academicYears.find((entry) => entry.label === year)?.isCurrent ? ' (Current)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="ADMISSION FEE (₹)"
                  type="number"
                  min="0"
                  placeholder="Enter Admission Fee"
                  value={feeStructureForm.admissionFee}
                  onChange={(e) => setFeeStructureForm({ ...feeStructureForm, admissionFee: e.target.value })}
                  required
                />
                <Input
                  label="TUITION FEE (₹)"
                  type="number"
                  min="0"
                  placeholder="Enter Tution Fee"
                  value={feeStructureForm.tuitionFee}
                  onChange={(e) => setFeeStructureForm({ ...feeStructureForm, tuitionFee: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <Input
                  label="COMPUTER FEE (₹)"
                  type="number"
                  min="0"
                  placeholder="Enter Computer Fee"
                  value={feeStructureForm.computerFee}
                  onChange={(e) => setFeeStructureForm({ ...feeStructureForm, computerFee: e.target.value })}
                  required
                />
                <Input
                  label="EXAM FEE (₹)"
                  type="number"
                  min="0"
                  placeholder="Enter Exam Fee"
                  value={feeStructureForm.examFee}
                  onChange={(e) => setFeeStructureForm({ ...feeStructureForm, examFee: e.target.value })}
                  required
                />
                <Input
                  label="CULTURAL ACTIVITY FEE (₹)"
                  type="number"
                  min="0"
                  placeholder="Enter Cultural Activity Fee"
                  value={feeStructureForm.culturalActivityFee}
                  onChange={(e) => setFeeStructureForm({ ...feeStructureForm, culturalActivityFee: e.target.value })}
                  required
                />
              </div>

              {/* Dynamic summation display box */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between select-none">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Automatically Calculated Total Fee</span>
                  <p className="text-[10px] text-slate-500 font-bold">Admission + Tuition + Computer + Exam + Cultural Activity</p>
                </div>
                <div className="text-right">
                  <span className="text-lg font-black text-emerald-600 font-sans">
                    ₹{currentModalTotal.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Installments Section */}
              <div className="pt-3 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wide select-none">Quarterly Installments</h4>
                  <button
                    type="button"
                    onClick={handleAutoGenerateInstallments}
                    className="text-[10px] px-2.5 py-1 text-blue-700 bg-blue-50 border border-blue-100 hover:bg-blue-100 rounded-lg font-black transition-all cursor-pointer active:scale-95 uppercase tracking-wide"
                  >
                    Auto Generate Installments
                  </button>
                </div>

                <p className="text-[11px] text-slate-500 leading-relaxed font-semibold select-none">
                  Divide total fee equally into June, September, December & March amounts.
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Input
                    label="JUNE AMOUNT (₹)"
                    type="number"
                    min="0"
                    placeholder="June"
                    value={feeStructureForm.juneAmount}
                    onChange={(e) => setFeeStructureForm({ ...feeStructureForm, juneAmount: e.target.value })}
                    required
                  />
                  <Input
                    label="SEPTEMBER AMOUNT (₹)"
                    type="number"
                    min="0"
                    placeholder="September"
                    value={feeStructureForm.septemberAmount}
                    onChange={(e) => setFeeStructureForm({ ...feeStructureForm, septemberAmount: e.target.value })}
                    required
                  />
                  <Input
                    label="DECEMBER AMOUNT (₹)"
                    type="number"
                    min="0"
                    placeholder="December"
                    value={feeStructureForm.decemberAmount}
                    onChange={(e) => setFeeStructureForm({ ...feeStructureForm, decemberAmount: e.target.value })}
                    required
                  />
                  <Input
                    label="MARCH AMOUNT (₹)"
                    type="number"
                    min="0"
                    placeholder="March"
                    value={feeStructureForm.marchAmount}
                    onChange={(e) => setFeeStructureForm({ ...feeStructureForm, marchAmount: e.target.value })}
                    required
                  />
                </div>
              </div>

              {formErrors.submit && (
                <p className="text-xs font-bold text-red-500 animate-pulse">{formErrors.submit}</p>
              )}
            </form>
          );
        })()}
      </Modal>

      {/* 5. SECURE DELETE CONFIRMATION MODAL */}
      <Modal
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        title="Security Confirmation: Permanent Record Deletion"
        footer={
          <div className="flex gap-2 w-full justify-end">
            <Button variant="outline" size="sm" onClick={() => setIsDeleteConfirmOpen(false)}>
              Cancel
            </Button>
            <Button 
              size="sm" 
              className="bg-red-600 hover:bg-red-700 text-white cursor-pointer"
              onClick={executeSecureDelete} 
              isLoading={submitLoading}
            >
              Verify & Delete Record Permanently
            </Button>
          </div>
        }
      >
        <div className="space-y-4 text-xs text-slate-600 select-none">
          <div className="p-3 bg-red-50 border border-red-100 rounded-lg flex gap-3 text-red-705">
            <ShieldAlert size={20} className="flex-shrink-0 text-red-650" />
            <div>
              <p className="font-extrabold tracking-wide uppercase text-[10px] text-red-800">Critical Action Warning</p>
              <p className="mt-1 leading-relaxed">
                You are about to delete the {deleteTargetType} profile for <strong className="font-sans font-black text-slate-900">{deleteTargetName}</strong>. This actions removes student or faculty access, schedules, and active credentials permanently.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-[11px] font-bold text-slate-700 uppercase">
              Type <span className="text-red-600 font-extrabold font-mono text-sm leading-none bg-red-50 px-1 border border-red-100 rounded">CONFIRM</span> to verify deletion intent:
            </label>
            <Input
              placeholder="CONFIRM"
              value={deleteKeyword}
              onChange={(e) => setDeleteKeyword(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="block text-[11px] font-bold text-slate-700 uppercase">
              Admin Authorization Passcode:
            </label>
            <Input
              type="password"
              placeholder="Enter passcode (Hint: admin123)"
              value={deletePasscode}
              onChange={(e) => setDeletePasscode(e.target.value)}
              required
            />
          </div>

          {deleteError && (
            <p className="text-xs font-bold text-red-500 animate-pulse">
              ⚠️ {deleteError}
            </p>
          )}

          <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg text-slate-500 leading-relaxed text-[11px]">
            <span className="font-bold text-slate-700">Access Level Verified:</span> Principal Office Administrator (Root Level). General users are not permitted to update or delete student or teacher assets.
          </div>
        </div>
      </Modal>
    </div>
  );
};
export default AdminDashboard;
