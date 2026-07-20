const deepClone = (value) => JSON.parse(JSON.stringify(value ?? null));
const normalizeKeyList = (value) => {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || "").trim()).filter(Boolean);
};

const isNumericComponentKey = (key, value) =>
  typeof value === "number" &&
  Number.isFinite(value) &&
  !["totalFee", "monthlyFee"].includes(key) &&
  /Fee$/i.test(key);

const getAcademicYearKey = (academicYear) => {
  if (!academicYear) return null;
  if (typeof academicYear === "object") {
    return String(academicYear._id || academicYear.id || academicYear.label || "").trim() || null;
  }
  return String(academicYear).trim() || null;
};

const resolveAppliedKeys = (concession, componentKeys) => {
  const appliedTo = normalizeKeyList(concession?.appliesTo);

  if (appliedTo.includes("all") || appliedTo.length === 0) {
    return componentKeys;
  }

  return appliedTo.filter((key) => componentKeys.includes(key));
};

const applyFlatDiscount = (components, targetKeys, amount) => {
  let remaining = Math.max(0, Number(amount) || 0);
  let deducted = 0;

  for (const key of targetKeys) {
    if (remaining <= 0) break;
    const current = Number(components[key] || 0);
    const deduction = Math.min(current, remaining);
    components[key] = Math.max(0, current - deduction);
    remaining -= deduction;
    deducted += deduction;
  }

  return deducted;
};

const applyPercentageDiscount = (components, targetKeys, percent) => {
  const rate = Math.max(0, Number(percent) || 0) / 100;
  let deducted = 0;

  for (const key of targetKeys) {
    const current = Number(components[key] || 0);
    const deduction = current * rate;
    components[key] = Math.max(0, current - deduction);
    deducted += deduction;
  }

  return deducted;
};

export const calculateStudentFee = async (student, feeStructure, academicYear) => {
  const studentDoc = student?.toObject ? student.toObject() : (student || {});
  const structureDoc = feeStructure?.toObject ? feeStructure.toObject() : (feeStructure || {});
  const academicYearKey = getAcademicYearKey(academicYear);

  const feeStructureSnapshot = deepClone(structureDoc);
  const componentKeys = Object.keys(feeStructureSnapshot).filter((key) =>
    isNumericComponentKey(key, feeStructureSnapshot[key])
  );

  const components = componentKeys.reduce((acc, key) => {
    acc[key] = Number(feeStructureSnapshot[key] || 0);
    return acc;
  }, {});

  if (studentDoc.admissionType === "old" && Object.prototype.hasOwnProperty.call(components, "admissionFee")) {
    components.admissionFee = 0;
  }

  const resolvedConcessions = Array.isArray(studentDoc.concessions)
    ? studentDoc.concessions.filter((concession) => {
        const concessionYear = getAcademicYearKey(concession?.academicYear);
        return academicYearKey && concessionYear
          ? concessionYear === academicYearKey
          : concessionYear === academicYearKey;
      })
    : [];

  const concessionsApplied = [];

  for (const concession of resolvedConcessions) {
    const targetKeys = resolveAppliedKeys(concession, componentKeys);
    let amountDeducted = 0;

    if (targetKeys.length === 0) {
      concessionsApplied.push({
        type: concession?.type || "OTHER",
        discountType: concession?.discountType || "flat",
        value: Number(concession?.value || 0),
        amountDeducted: 0
      });
      continue;
    }

    if (concession.discountType === "full_waiver") {
      for (const key of targetKeys) {
        const current = Number(components[key] || 0);
        amountDeducted += current;
        components[key] = 0;
      }
    } else if (concession.discountType === "percentage") {
      amountDeducted = applyPercentageDiscount(components, targetKeys, concession.value);
    } else {
      amountDeducted = applyFlatDiscount(components, targetKeys, concession.value);
    }

    concessionsApplied.push({
      type: concession?.type || "OTHER",
      discountType: concession?.discountType || "flat",
      value: Number(concession?.value || 0),
      amountDeducted: Number(amountDeducted.toFixed(2))
    });
  }

  const totalBeforeDiscount = componentKeys.reduce((sum, key) => sum + Number((studentDoc.admissionType === "old" && key === "admissionFee") ? 0 : (feeStructureSnapshot[key] || 0)), 0);
  const finalAmount = componentKeys.reduce((sum, key) => sum + Number(components[key] || 0), 0);
  const totalDiscount = Math.max(0, totalBeforeDiscount - finalAmount);

  return {
    academicYear: academicYearKey,
    className: String(studentDoc.class || "").trim(),
    section: String(studentDoc.section || "").trim(),
    feeStructureId: structureDoc?._id || null,
    feeStructureSnapshot,
    admissionType: studentDoc.admissionType || "new",
    feeCategory: String(studentDoc.feeCategory || "REGULAR").trim().toUpperCase(),
    concessionsApplied,
    concessions: concessionsApplied.map((item) => ({
      type: item.type,
      discountType: item.discountType,
      value: item.value,
      amountDeducted: item.amountDeducted
    })),
    totalBeforeDiscount: Number(totalBeforeDiscount.toFixed(2)),
    totalDiscount: Number(totalDiscount.toFixed(2)),
    finalAmount: Number(finalAmount.toFixed(2)),
    componentBreakdown: Object.fromEntries(
      componentKeys.map((key) => [
        key,
        {
          original: Number(feeStructureSnapshot[key] || 0),
          final: Number(components[key] || 0)
        }
      ])
    )
  };
};

export default calculateStudentFee;
