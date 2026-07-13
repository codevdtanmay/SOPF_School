export const TRANSPORT_BILLING_MONTHS = [
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
  'January',
  'February',
  'March',
  'April'
];

export const CALENDAR_MONTHS = [
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

export const getCurrentTransportBillingMonth = () => {
  const currentMonth = CALENDAR_MONTHS[new Date().getMonth()];
  return currentMonth === 'May' ? 'April' : currentMonth;
};

export const getTransportAcademicYearFromBillingMonth = (month: string, year: string | number) => {
  const monthIndex = CALENDAR_MONTHS.indexOf(month) + 1;
  const yearNumber = Number(year);

  if (!monthIndex || Number.isNaN(yearNumber) || monthIndex === 5) {
    return '';
  }

  if (monthIndex >= 6) {
    return `${yearNumber}-${String(yearNumber + 1).slice(-2)}`;
  }

  return `${yearNumber - 1}-${String(yearNumber).slice(-2)}`;
};
