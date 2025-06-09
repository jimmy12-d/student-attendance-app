import { Timestamp } from "firebase/firestore";
import { Student, PermissionRecord } from "../../_interfaces";
import { 
    AllClassConfigs, 
    STANDARD_ON_TIME_GRACE_MINUTES, // This will be needed by getStudentDailyStatus
    LATE_WINDOW_DURATION_MINUTES,
    cambodianHolidaysSet
} from "./configForAttendanceLogic";

// Interface for raw attendance data structure from Firestore
export interface RawAttendanceRecord {
  studentId: string;
  date: string; // YYYY-MM-DD
  status: 'present' | 'late' | string; // Allow other statuses if any
  timestamp?: Timestamp;
  class?: string;
  shift?: string;
  id?: string; // Firestore document ID, optional
}

// Interfaces (can be moved to a shared file later)
export interface CalculatedStatus {
  status?: "Present" | "Late" | "Absent" | "Permission" | "No School" | "Not Applicable (Holiday/Weekend)" | "Not Yet Enrolled" | "Pending" | "Unknown" | "Absent (Config Missing)";
  time?: string;
}

// --- Primary Logic Functions (as before, no changes needed here) ---
export const isSchoolDay = (date: Date, classStudyDays?: number[] | null): boolean => {
  const dayOfWeek = date.getDay();
  const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  if (cambodianHolidaysSet.has(dateString)) return false;
  if (classStudyDays && classStudyDays.length > 0) return classStudyDays.includes(dayOfWeek);
  return dayOfWeek !== 0; 
};

export const getMonthDetailsForLogic = (year: number, month: number) => { // month is 0-indexed
  const today = new Date();
  let daysInMonthToConsider: number;
  let effectiveEndDateString: string;

  if (year === today.getFullYear() && month === today.getMonth()) {
    daysInMonthToConsider = today.getDate();
    effectiveEndDateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  } else {
    const lastDay = new Date(year, month + 1, 0).getDate();
    daysInMonthToConsider = lastDay;
    effectiveEndDateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  }
  const monthStartDateString = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  return { year, month, monthStartDateString, monthEndDateStringUsedForQuery: effectiveEndDateString, daysInMonthToConsider };
};
// --- The Authoritative Status Calculation Function ---
export const getStudentDailyStatus = (
    student: Student,
    checkDateStr: string,
    attendanceRecord: RawAttendanceRecord | undefined,
    allClassConfigs: AllClassConfigs | null,
    approvedPermissionsForStudent?: PermissionRecord[]
): CalculatedStatus => {
    const checkDate = new Date(checkDateStr);
    checkDate.setHours(0,0,0,0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const studentCreatedAt = student.createdAt instanceof Timestamp ? student.createdAt.toDate() : student.createdAt instanceof Date ? student.createdAt : null;
    if (studentCreatedAt) studentCreatedAt.setHours(0,0,0,0);

    const studentClassKey = student.class;
    const classConfig = studentClassKey && allClassConfigs ? allClassConfigs[studentClassKey] : undefined;
    const classStudyDays = classConfig?.studyDays;

    if (studentCreatedAt && checkDate <= studentCreatedAt) return { status: "Not Yet Enrolled" };
    if (!isSchoolDay(checkDate, classStudyDays)) return { status: "No School" };

    if (attendanceRecord) {
        const status = attendanceRecord.status === 'present' ? "Present" :
                       attendanceRecord.status === 'late'   ? "Late"    : "Unknown";
        let time;
        if (attendanceRecord.timestamp) {
            const recordTime = attendanceRecord.timestamp instanceof Timestamp ? attendanceRecord.timestamp.toDate() : attendanceRecord.timestamp as Date;
            time = recordTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
        }
        return { status, time };
    } else { // No attendance record
        if (approvedPermissionsForStudent && approvedPermissionsForStudent.some(p => checkDateStr >= p.permissionStartDate && checkDateStr <= p.permissionEndDate)) {
            return { status: "Permission" };
        }

        if (checkDate.getTime() === today.getTime()) {
            const studentShiftKey = student.shift;
            const shiftConfig = (studentClassKey && classConfig?.shifts) ? classConfig.shifts[studentShiftKey] : undefined;
            if (shiftConfig && shiftConfig.startTime) {
                const [startHour, startMinute] = shiftConfig.startTime.split(':').map(Number);
                const shiftStartTimeForToday = new Date(today);
                shiftStartTimeForToday.setHours(startHour, startMinute);
                const studentGrace = (student as any).gracePeriodMinutes ?? STANDARD_ON_TIME_GRACE_MINUTES;
                const onTimeDeadlineForToday = new Date(shiftStartTimeForToday);
                onTimeDeadlineForToday.setMinutes(shiftStartTimeForToday.getMinutes() + studentGrace);
                const lateCutOffForToday = new Date(onTimeDeadlineForToday);
                lateCutOffForToday.setMinutes(onTimeDeadlineForToday.getMinutes() + LATE_WINDOW_DURATION_MINUTES);
                if (new Date() > lateCutOffForToday) return { status: "Absent" };
                else return { status: "Pending" };
            } else return { status: "Absent (Config Missing)" };
        } else if (checkDate < today) return { status: "Absent" };
        else return { status: undefined };
    }
};

// VVVV REFACTORED CALCULATION FUNCTIONS VVVV
export const calculateConsecutiveAbsences = (
  student: Student,
  allAttendanceRecordsForStudent: RawAttendanceRecord[],
  allClassConfigs: AllClassConfigs | null,
  approvedPermissions: PermissionRecord[],
  lookBackDays: number = 7 // Let's default to a 7-day lookback for recent streaks
): { count: number; details: string } => {
    
    let consecutiveAbsences = 0;
    const today = new Date();
    today.setHours(0,0,0,0);

    const attendanceMap = new Map(allAttendanceRecordsForStudent.map(att => [att.date, att]));

    // Iterate backwards from today
    for (let i = 0; i < lookBackDays; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(today.getDate() - i);
        const dateStr = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;
        
        const attendanceRecord = attendanceMap.get(dateStr);
        
        // Get the definitive status for the day using your central logic function
        const result = getStudentDailyStatus(
          student, 
          dateStr, 
          attendanceRecord, 
          allClassConfigs, 
          approvedPermissions
        );

        if (result.status === "Absent") {
            consecutiveAbsences++;
            // Continue the loop to check the previous day
        } else if (result.status === "Present" || result.status === "Late" || result.status === "Permission") {
            // A "Present", "Late", or "Permission" day definitively BREAKS the streak.
            break; 
        }
        // If the status is "No School", "Not Applicable", or "Not Yet Enrolled", we skip counting those days
    }

    return { 
      count: consecutiveAbsences, 
      details: `${consecutiveAbsences} consecutive day absences` 
    };
};

export const calculateMonthlyAbsencesLogic = (
  student: Student,
  attendanceForStudentInMonth: RawAttendanceRecord[],
  selectedMonthValue: string,
  allClassConfigs: AllClassConfigs | null,
  approvedPermissions: PermissionRecord[]
): { count: number; details: string } => {
    const [year, monthIndex] = selectedMonthValue.split('-').map(Number).map((n, i) => i === 1 ? n - 1 : n);
    const { daysInMonthToConsider } = getMonthDetailsForLogic(year, monthIndex);
    const monthLabel = new Date(year, monthIndex).toLocaleString('default', { month: 'long', year: 'numeric' });

    let absentCount = 0;
    const attendanceMap = new Map(attendanceForStudentInMonth.map(att => [att.date, att]));

    for (let day = 1; day <= daysInMonthToConsider; day++) {
        const dateStr = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const attendanceRecord = attendanceMap.get(dateStr);
        const result = getStudentDailyStatus(student, dateStr, attendanceRecord, allClassConfigs, approvedPermissions);

        if (result.status === "Absent") {
            absentCount++;
        }
    }
    return { count: absentCount, details: `${absentCount} absences in ${monthLabel}` };
};

export const calculateMonthlyLates = (
  student: Student,
  attendanceForStudentInMonth: RawAttendanceRecord[],
  selectedMonthValue: string
): { count: number; details: string } => {
    const monthLabel = new Date(parseInt(selectedMonthValue.split('-')[0]), parseInt(selectedMonthValue.split('-')[1]) - 1).toLocaleString('default', { month: 'long', year: 'numeric' });
    let lateCount = 0;
    attendanceForStudentInMonth.forEach(record => {
        if (record.status === 'late') {
            lateCount++;
        }
    });
    return { count: lateCount, details: `${lateCount} lates in ${monthLabel}` };
};