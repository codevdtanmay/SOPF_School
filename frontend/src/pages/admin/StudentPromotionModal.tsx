import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, Check, CheckSquare, Clock3, Filter, Search, Users } from 'lucide-react';
import Modal from '../../components/common/Modal';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Badge from '../../components/common/Badge';
import { Student } from '../../types';
import { studentApi } from '../../api/studentApi';

type PromotionMode = 'entire' | 'selective';

interface PromotionResult {
  promoted: number;
  skipped: number;
  alreadyExisted: number;
  totalSelected: number;
  promoteAllStudents: boolean;
}

interface StudentPromotionModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  academicYears: string[];
  currentUserName?: string;
  onSuccess: (result: PromotionResult, message: string) => void;
}

const CLASS_ORDER = [
  'Nursery',
  'LKG',
  'UKG',
  '1st',
  '2nd',
  '3rd',
  '4th',
  '5th',
  '6th',
  '7th',
  '8th',
  '9th',
  '10th',
  '11th',
  '12th'
];

const academicYearFallback = () => {
  const year = new Date().getFullYear();
  return `${year}-${String(year + 1).slice(-2)}`;
};

const normalizeClassLabel = (value?: string) =>
  String(value || '').trim().replace(/\s+/g, ' ');

const normalizeAcademicYear = (value?: string) =>
  String(value || '').trim().replace(/\s+/g, ' ');

const classSortValue = (value: string) => {
  const normalized = normalizeClassLabel(value).toLowerCase();
  const directIndex = CLASS_ORDER.findIndex((item) => item.toLowerCase() === normalized);
  if (directIndex >= 0) {
    return directIndex;
  }

  const match = normalized.match(/(\d{1,2})/);
  if (match) {
    return Number(match[1]) + 50;
  }

  return 1000;
};

export const StudentPromotionModal: React.FC<StudentPromotionModalProps> = ({
  isOpen,
  onClose,
  students = [],
  academicYears = [],
  currentUserName = '',
  onSuccess
}) => {
  const academicYearOptions = useMemo(() => {
    const fallback = academicYearFallback();
    const merged = new Set([fallback, ...academicYears.filter(Boolean)]);
    return Array.from(merged);
  }, [academicYears]);

  const classOptions = useMemo(() => {
    const roster = students;
    const map = new Map<string, { className: string; section: string; academicYear: string }>();

    roster.forEach((student) => {
      const className = normalizeClassLabel(student.class);
      const section = normalizeClassLabel(student.section);
      const academicYear = normalizeAcademicYear(student.academicYear) || academicYearFallback();
      if (!className) return;
      const key = `${academicYear}::${className}::${section}`;
      if (!map.has(key)) {
        map.set(key, { className, section, academicYear });
      }
    });

    return Array.from(map.values()).sort((a, b) => {
      const yearDiff = b.academicYear.localeCompare(a.academicYear, undefined, { numeric: true, sensitivity: 'base' });
      if (yearDiff !== 0) return yearDiff;
      const classDiff = classSortValue(a.className) - classSortValue(b.className);
      if (classDiff !== 0) return classDiff;
      return a.section.localeCompare(b.section, undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [students]);

  const destinationClassOptions = useMemo(() => {
    const uniqueClasses = Array.from(
      new Set(
        students
          .map((student) => normalizeClassLabel(student.class))
          .filter(Boolean)
      )
    );

    return uniqueClasses.sort((a, b) => classSortValue(a) - classSortValue(b));
  }, [students]);

  const [step, setStep] = useState<1 | 2>(1);
  const [currentAcademicYear, setCurrentAcademicYear] = useState('');
  const [destinationAcademicYear, setDestinationAcademicYear] = useState('');
  const [currentClass, setCurrentClass] = useState('');
  const [currentSection, setCurrentSection] = useState('');
  const [destinationClass, setDestinationClass] = useState('');
  const [destinationSection, setDestinationSection] = useState('');
  const [promotionMode, setPromotionMode] = useState<PromotionMode>('entire');
  const [searchQuery, setSearchQuery] = useState('');
  const [sectionFilter, setSectionFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [reason, setReason] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const selectClassName = 'w-full px-3.5 py-2 text-sm text-slate-900 bg-white border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all';

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const initialClass = classOptions[0];
    const initialAcademicYear = initialClass?.academicYear || academicYearOptions[0] || academicYearFallback();
    const initialDestinationYear = academicYearOptions.find((year) => year !== initialAcademicYear)
      || academicYearOptions[0]
      || academicYearFallback();
    const currentClassIndex = CLASS_ORDER.findIndex(
      (item) => item.toLowerCase() === normalizeClassLabel(initialClass?.className).toLowerCase()
    );
    const nextClass = currentClassIndex >= 0 ? CLASS_ORDER[currentClassIndex + 1] || CLASS_ORDER[currentClassIndex] : (destinationClassOptions[0] || '');

    setStep(1);
    setPromotionMode('entire');
    setCurrentAcademicYear(initialAcademicYear);
    setDestinationAcademicYear(initialDestinationYear);
    setCurrentClass(initialClass?.className || '');
    setCurrentSection(initialClass?.section || '');
    setDestinationClass(nextClass);
    setDestinationSection('');
    setSearchQuery('');
    setSectionFilter('All');
    setStatusFilter('All');
    setSelectedStudentIds([]);
    setReason('');
    setShowConfirm(false);
    setSubmitting(false);
    setError('');
  }, [academicYearOptions, classOptions, destinationClassOptions, isOpen]);

  const currentRoster = useMemo(() => {
    return students.filter((student) => {
      const classMatches = normalizeClassLabel(student.class).toLowerCase() === currentClass.toLowerCase();
      const academicYearMatches = normalizeAcademicYear(student.academicYear || academicYearFallback()) === currentAcademicYear;
      const sectionMatches = currentSection
        ? normalizeClassLabel(student.section).toLowerCase() === currentSection.toLowerCase()
        : true;

      return classMatches && academicYearMatches && sectionMatches;
    });
  }, [students, currentAcademicYear, currentClass, currentSection]);

  const visibleRoster = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return currentRoster.filter((student) => {
      const matchesSearch =
        !query ||
        student.name?.toLowerCase().includes(query) ||
        student.admissionNo?.toLowerCase().includes(query) ||
        String(student.rollNo || '').toLowerCase().includes(query);

      const matchesSection =
        sectionFilter === 'All' || normalizeClassLabel(student.section).toLowerCase() === sectionFilter.toLowerCase();

      const matchesStatus =
        statusFilter === 'All' || (student.lifecycleStatus || 'Active') === statusFilter;

      return matchesSearch && matchesSection && matchesStatus;
    });
  }, [currentRoster, searchQuery, sectionFilter, statusFilter]);

  const activeVisibleRoster = useMemo(
    () => visibleRoster.filter((student) => (student.lifecycleStatus || 'Active') === 'Active'),
    [visibleRoster]
  );

  const activeCurrentRoster = useMemo(
    () => currentRoster.filter((student) => (student.lifecycleStatus || 'Active') === 'Active'),
    [currentRoster]
  );

  const ignoredCount = useMemo(
    () => currentRoster.filter((student) => (student.lifecycleStatus || 'Active') !== 'Active').length,
    [currentRoster]
  );

  const selectedVisibleCount = useMemo(
    () => visibleRoster.filter((student) => selectedStudentIds.includes(student.id)).length,
    [selectedStudentIds, visibleRoster]
  );

  const remainingCount = promotionMode === 'entire'
    ? 0
    : Math.max(activeVisibleRoster.length - selectedVisibleCount, 0);

  useEffect(() => {
    if (promotionMode === 'entire') {
      setSelectedStudentIds(
        currentRoster
          .filter((student) => (student.lifecycleStatus || 'Active') === 'Active')
          .map((student) => student.id)
      );
    }
  }, [currentRoster, promotionMode]);

  useEffect(() => {
    if (promotionMode === 'selective') {
      setSelectedStudentIds((prev) =>
        prev.filter((id) => currentRoster.some((student) => student.id === id && (student.lifecycleStatus || 'Active') === 'Active'))
      );
    }
  }, [currentRoster, promotionMode]);

  const currentClassLabel = currentClass ? `${currentClass}${currentSection ? `-${currentSection}` : ''}` : 'Not selected';
  const destinationClassLabel = destinationClass ? `${destinationClass}${destinationSection ? `-${destinationSection}` : ''}` : 'Not selected';
  const studentsSelectedCount = promotionMode === 'entire' ? activeCurrentRoster.length : selectedVisibleCount;

  const canContinue = Boolean(
    currentAcademicYear &&
    destinationAcademicYear &&
    currentClass &&
    destinationClass &&
    currentAcademicYear !== destinationAcademicYear &&
    currentClass !== destinationClass
  );

  const toggleStudent = (studentId: string) => {
    if (promotionMode === 'entire') {
      return;
    }

    setSelectedStudentIds((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleSelectAllVisible = () => {
    const ids = activeVisibleRoster.map((student) => student.id);
    setSelectedStudentIds(ids);
  };

  const handleContinue = () => {
    if (!canContinue) {
      setError('Select valid academic years and classes before continuing.');
      return;
    }

    setError('');
    setStep(2);
  };

  const handlePromote = async () => {
    if (!selectedStudentIds.length) {
      setError('Select at least one active student to promote.');
      return;
    }

    setShowConfirm(true);
  };

  const executePromotion = async () => {
    setSubmitting(true);
    setError('');

    try {
      const response = await studentApi.promoteStudents({
        currentAcademicYear,
        destinationAcademicYear,
        currentClass,
        currentSection,
        destinationClass,
        destinationSection,
        selectedStudentIds: promotionMode === 'entire'
          ? currentRoster
              .filter((student) => (student.lifecycleStatus || 'Active') === 'Active')
              .map((student) => student.id)
          : selectedStudentIds,
        promoteAllStudents: promotionMode === 'entire',
        reason
      });

      onSuccess(
        response.summary,
        `${response.message}. ${response.summary.promoted} students promoted. ${response.summary.skipped} students skipped. ${response.summary.alreadyExisted} students already existed in destination class.`
      );
      setShowConfirm(false);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Promotion failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Promote Students"
      size="xl"
      footer={null}
    >
      <div className="space-y-5">
        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-400">Promotion Flow</p>
              <h4 className="text-lg font-extrabold text-slate-900 tracking-tight">Step {step} of 2</h4>
            </div>
            <Badge variant="info" size="sm">{promotionMode === 'entire' ? 'Entire Class' : 'Selective'}</Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="rounded-xl bg-white border border-slate-200 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Current Year</p>
              <p className="text-sm font-extrabold text-slate-900 mt-1">{currentAcademicYear || 'Select year'}</p>
            </div>
            <div className="rounded-xl bg-white border border-slate-200 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Destination Year</p>
              <p className="text-sm font-extrabold text-slate-900 mt-1">{destinationAcademicYear || 'Select year'}</p>
            </div>
            <div className="rounded-xl bg-white border border-slate-200 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Current Class</p>
              <p className="text-sm font-extrabold text-slate-900 mt-1">{currentClassLabel}</p>
            </div>
            <div className="rounded-xl bg-white border border-slate-200 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Destination Class</p>
              <p className="text-sm font-extrabold text-slate-900 mt-1">{destinationClassLabel}</p>
            </div>
            <div className="rounded-xl bg-white border border-slate-200 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Selected</p>
              <p className="text-sm font-extrabold text-slate-900 mt-1">{studentsSelectedCount} students</p>
            </div>
          </div>
        </div>

        {step === 1 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-2">
                <Clock3 size={16} className="text-blue-600" />
                <h4 className="text-sm font-extrabold text-slate-900">Select Promotion Context</h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="space-y-1.5">
                  <span className="text-xs font-semibold text-slate-700 tracking-wide select-none">Current Academic Year</span>
                  <select
                    value={currentAcademicYear}
                    onChange={(e) => setCurrentAcademicYear(e.target.value)}
                    className={selectClassName}
                  >
                    {academicYearOptions.map((year) => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-semibold text-slate-700 tracking-wide select-none">Promote To Academic Year</span>
                  <select
                    value={destinationAcademicYear}
                    onChange={(e) => setDestinationAcademicYear(e.target.value)}
                    className={selectClassName}
                  >
                    {academicYearOptions.map((year) => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1.5 sm:col-span-2">
                  <span className="text-xs font-semibold text-slate-700 tracking-wide select-none">Current Class</span>
                  <select
                    value={`${currentClass}||${currentSection}`}
                    onChange={(e) => {
                      const [cls, sec] = e.target.value.split('||');
                      setCurrentClass(cls || '');
                      setCurrentSection(sec || '');
                    }}
                    className={selectClassName}
                  >
                    {classOptions.map((option) => (
                      <option key={`${option.academicYear}-${option.className}-${option.section}`} value={`${option.className}||${option.section}`}>
                        {option.className}{option.section ? ` - ${option.section}` : ''}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-semibold text-slate-700 tracking-wide select-none">Destination Class</span>
                  <select
                    value={destinationClass}
                    onChange={(e) => setDestinationClass(e.target.value)}
                    className={selectClassName}
                  >
                    <option value="">Select class</option>
                    {destinationClassOptions.map((className) => (
                      <option key={className} value={className}>{className}</option>
                    ))}
                  </select>
                </label>
                <Input
                  label="Destination Section"
                  placeholder="Optional"
                  value={destinationSection}
                  onChange={(e) => setDestinationSection(e.target.value)}
                  className="h-11"
                />
              </div>

              <div className="flex items-center justify-between gap-3 pt-2">
                <p className="text-xs font-semibold text-slate-500">
                  Promotion updates only class, section, and academic year. Fees, transport, and historical records remain unchanged.
                </p>
                <Button onClick={handleContinue} disabled={!canContinue}>Continue</Button>
              </div>
            </div>

            <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-emerald-600" />
                <h4 className="text-sm font-extrabold text-slate-900">Promotion Modes</h4>
              </div>

              <label className={`flex items-start gap-3 rounded-xl border p-4 cursor-pointer transition-all ${promotionMode === 'entire' ? 'border-blue-300 bg-blue-50/70' : 'border-slate-200 bg-white'}`}>
                <input
                  type="radio"
                  name="promotionMode"
                  checked={promotionMode === 'entire'}
                  onChange={() => setPromotionMode('entire')}
                  className="mt-1"
                />
                <div className="space-y-1">
                  <p className="text-sm font-extrabold text-slate-900">Promote Entire Class</p>
                  <p className="text-xs text-slate-500">All active students from the selected class are selected automatically. Left, Alumni, and Transferred students are ignored.</p>
                </div>
              </label>

              <label className={`flex items-start gap-3 rounded-xl border p-4 cursor-pointer transition-all ${promotionMode === 'selective' ? 'border-blue-300 bg-blue-50/70' : 'border-slate-200 bg-white'}`}>
                <input
                  type="radio"
                  name="promotionMode"
                  checked={promotionMode === 'selective'}
                  onChange={() => setPromotionMode('selective')}
                  className="mt-1"
                />
                <div className="space-y-1">
                  <p className="text-sm font-extrabold text-slate-900">Select Students</p>
                  <p className="text-xs text-slate-500">Choose only the students who should move to the next class.</p>
                </div>
              </label>

              <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-400">Preview</p>
                    <p className="text-sm font-extrabold text-slate-900">Promotion summary</p>
                  </div>
                  <Badge variant="slate" size="sm">{currentUserName || 'Admin'} will perform this action</Badge>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-slate-400 font-bold uppercase tracking-wide">Students Selected</p>
                    <p className="text-slate-900 font-extrabold mt-1">{studentsSelectedCount}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-slate-400 font-bold uppercase tracking-wide">Students Remaining</p>
                    <p className="text-slate-900 font-extrabold mt-1">{remainingCount}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-slate-400 font-bold uppercase tracking-wide">Students Ignored</p>
                    <p className="text-slate-900 font-extrabold mt-1">{ignoredCount}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-slate-400 font-bold uppercase tracking-wide">Mode</p>
                    <p className="text-slate-900 font-extrabold mt-1">{promotionMode === 'entire' ? 'Entire Class' : 'Selective'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <div className="relative lg:col-span-2">
                <Input
                  leftIcon={<Search size={14} />}
                  placeholder="Search by student name, admission number, or roll number"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1.5">
                  <span className="text-xs font-semibold text-slate-700 tracking-wide select-none">Section</span>
                  <select
                    value={sectionFilter}
                    onChange={(e) => setSectionFilter(e.target.value)}
                    className={selectClassName}
                  >
                    <option value="All">All</option>
                    {Array.from(new Set(currentRoster.map((student) => normalizeClassLabel(student.section)).filter(Boolean))).map((section) => (
                      <option key={section} value={section}>{section}</option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-semibold text-slate-700 tracking-wide select-none">Status</span>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className={selectClassName}
                  >
                    <option value="All">All</option>
                    <option value="Active">Active</option>
                    <option value="Left">Left</option>
                    <option value="Alumni">Alumni</option>
                    <option value="Transferred">Transferred</option>
                  </select>
                </label>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 overflow-hidden">
              <div className="flex items-center justify-between gap-3 bg-slate-50 px-4 py-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <CheckSquare size={16} className="text-blue-600" />
                  <p className="text-sm font-extrabold text-slate-900">Student Roster</p>
                  <Badge variant="slate" size="sm">{visibleRoster.length} visible</Badge>
                </div>
                {promotionMode === 'selective' && (
                  <Button variant="secondary" size="sm" onClick={handleSelectAllVisible}>
                    Select Visible Active
                  </Button>
                )}
              </div>

              <div className="max-h-[360px] overflow-auto bg-white">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-white border-b border-slate-200">
                    <tr className="text-[10px] uppercase tracking-wider text-slate-400">
                      <th className="p-3 w-10">
                        <input
                          type="checkbox"
                          checked={activeVisibleRoster.length > 0 && activeVisibleRoster.every((student) => selectedStudentIds.includes(student.id))}
                          onChange={() => handleSelectAllVisible()}
                          disabled={promotionMode === 'entire'}
                        />
                      </th>
                      <th className="p-3">Admission No</th>
                      <th className="p-3">Student Name</th>
                      <th className="p-3">Current Class</th>
                      <th className="p-3">Current Section</th>
                      <th className="p-3">Roll No</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {visibleRoster.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-400">
                          No students match the selected filters.
                        </td>
                      </tr>
                    ) : (
                      visibleRoster.map((student) => {
                        const isActive = (student.lifecycleStatus || 'Active') === 'Active';
                        const checked = selectedStudentIds.includes(student.id);

                        return (
                          <tr key={student.id} className={`${checked ? 'bg-blue-50/40' : ''} ${!isActive ? 'opacity-60' : ''}`}>
                            <td className="p-3">
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={promotionMode === 'entire' || !isActive}
                                onChange={() => toggleStudent(student.id)}
                              />
                            </td>
                            <td className="p-3 font-mono text-xs text-slate-500">{student.admissionNo || 'N/A'}</td>
                            <td className="p-3">
                              <div className="font-bold text-slate-900">{student.name}</div>
                              <div className="text-[10px] text-slate-400">{student.rollNo != null ? `Roll ${student.rollNo}` : 'No roll number'}</div>
                            </td>
                            <td className="p-3 text-slate-700 font-semibold">{student.class || 'N/A'}</td>
                            <td className="p-3 text-slate-700 font-semibold">{student.section || 'N/A'}</td>
                            <td className="p-3 font-mono text-slate-500">{student.rollNo != null ? student.rollNo : 'N/A'}</td>
                            <td className="p-3">
                              <Badge variant={isActive ? 'success' : 'warning'} size="sm">
                                {student.lifecycleStatus || 'Active'}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Filter size={15} className="text-slate-500" />
                  <p className="text-sm font-extrabold text-slate-900">Final Summary</p>
                </div>
                <Badge variant="info" size="sm">{studentsSelectedCount} students selected</Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                <div className="rounded-xl bg-white border border-slate-200 p-3">
                  <p className="text-slate-400 font-bold uppercase tracking-wide">Current Academic Year</p>
                  <p className="text-slate-900 font-extrabold mt-1">{currentAcademicYear}</p>
                </div>
                <div className="rounded-xl bg-white border border-slate-200 p-3">
                  <p className="text-slate-400 font-bold uppercase tracking-wide">Destination Academic Year</p>
                  <p className="text-slate-900 font-extrabold mt-1">{destinationAcademicYear}</p>
                </div>
                <div className="rounded-xl bg-white border border-slate-200 p-3">
                  <p className="text-slate-400 font-bold uppercase tracking-wide">Current Class</p>
                  <p className="text-slate-900 font-extrabold mt-1">{currentClassLabel}</p>
                </div>
                <div className="rounded-xl bg-white border border-slate-200 p-3">
                  <p className="text-slate-400 font-bold uppercase tracking-wide">Destination Class</p>
                  <p className="text-slate-900 font-extrabold mt-1">{destinationClassLabel}</p>
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700 text-xs font-semibold">
                  <AlertTriangle size={14} className="mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex flex-col gap-3 md:flex-row md:items-end">
                <div className="flex-1">
                  <Input
                    label="Reason (optional)"
                    placeholder="Add a note for the audit log"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="secondary" onClick={() => setStep(1)}>
                    Back
                  </Button>
                  <Button
                    onClick={handlePromote}
                    disabled={!selectedStudentIds.length || submitting}
                    isLoading={submitting}
                    leftIcon={<ArrowRight size={15} />}
                  >
                    Promote
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {error && step === 1 && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700 text-sm font-semibold">
            {error}
          </div>
        )}

        {showConfirm && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/45 p-4">
            <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
              <div className="border-b border-slate-100 px-5 py-4">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Confirmation</p>
                <h3 className="text-xl font-black text-slate-900 tracking-tight mt-1">Proceed with promotion?</h3>
              </div>
              <div className="space-y-4 px-5 py-5 text-sm">
                <p className="text-slate-600">You are about to promote {promotionMode === 'entire' ? activeVisibleRoster.length : selectedStudentIds.length} students from {currentClassLabel} academic year {currentAcademicYear} to {destinationClassLabel} academic year {destinationAcademicYear}.</p>
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800 font-semibold">
                  This action cannot be undone.
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-5 py-4">
                <Button variant="secondary" onClick={() => setShowConfirm(false)} disabled={submitting}>
                  Cancel
                </Button>
                <Button onClick={executePromotion} isLoading={submitting} leftIcon={<Check size={15} />}>
                  Promote Students
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default StudentPromotionModal;
