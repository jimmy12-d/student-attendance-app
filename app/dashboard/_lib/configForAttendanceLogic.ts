// app/dashboard/_lib/attendanceUtils.ts
export const STANDARD_ON_TIME_GRACE_MINUTES = 15;
export const LATE_WINDOW_DURATION_MINUTES = 60;

export const cambodianHolidaysSet = new Set([
  "2025-01-01", "2025-01-07", "2025-03-08", "2025-05-01",
  "2025-05-14", "2025-05-15", "2025-05-16",
  "2025-06-18",
  "2025-09-24",
  "2025-10-07", "2025-10-08", "2025-10-09",
  "2025-10-15",
  "2025-10-29",
  "2025-11-09",
  "2025-11-20", "2025-11-21", "2025-11-22",
]);

export const getMonthDetails = (year: number, month: number) => { // month is 0-indexed
  
  const endDateObj = new Date(year, month + 1, 0); // Last day of the month
  const today = new Date();

  let daysToConsiderInMonth: number;
  let effectiveEndDateString: string;

  if (year === today.getFullYear() && month === today.getMonth()) {
    daysToConsiderInMonth = today.getDate();
    effectiveEndDateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  } else {
    daysToConsiderInMonth = endDateObj.getDate();
    effectiveEndDateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(endDateObj.getDate()).padStart(2, '0')}`;
  }
  const monthStartDateString = `${year}-${String(month + 1).padStart(2, '0')}-01`;

  return {
    year,
    month, // 0-indexed
    monthStartDateString,
    monthEndDateStringUsedForQuery: effectiveEndDateString,
    daysInMonthToConsider: daysToConsiderInMonth,
  };
};

export const getCurrentYearMonthString = (date = new Date()): string => {
    const year = date.getFullYear();
    const monthString = String(date.getMonth() + 1).padStart(2, '0'); // getMonth() is 0-indexed
    // VVVV CORRECTED VVVV
    return `${year}-${monthString}`; // Should return "YYYY-MM"
};
// Interfaces for Class Configs (can also live here or in _interfaces)
export interface ShiftConfig {
  startTime: string; // "HH:MM"
}
export interface ClassShiftConfigs {
  [shiftName: string]: ShiftConfig;  
}
export interface ClassConfigData { // Renamed for clarity, represents the data within each class doc
  name?: string;
  shifts: ClassShiftConfigs;
  studyDays?: number[]; // Array of numbers (0=Sun, 1=Mon, ..., 6=Sat)
}

export interface AllClassConfigs {
  [className: string]: ClassConfigData;
}
// You can also move StudentAttendanceWarning here from page.tsx if it's shared
export interface StudentAttendanceWarning {
  id: string;
  fullName: string;
  class?: string;
  shift?: string;
  warningType: "consecutiveAbsence" | "totalAbsence" | "totalLate";
  value: number;
  details?: string;
}