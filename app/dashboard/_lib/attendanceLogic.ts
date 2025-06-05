// app/dashboard/_lib/attendanceLogic.ts
import { Timestamp } from "firebase/firestore";
import { Student } from "../../_interfaces"; // Adjust path as needed
import { 
    AllClassConfigs, 
    ClassConfigData,
    STANDARD_ON_TIME_GRACE_MINUTES, 
    LATE_WINDOW_DURATION_MINUTES,
    cambodianHolidaysSet
} from "./configForAttendanceLogic"; // Import shared configs

// Interface for raw attendance data structure from Firestore
interface RawAttendanceRecord {
  studentId: string;
  date: string; // YYYY-MM-DD
  status: 'present' | 'late' | string; // Allow other statuses if any
  timestamp?: Timestamp;
  class?: string;
  shift?: string;
}

export const isSchoolDay = (
  date: Date,
  classStudyDays: number[] | undefined // e.g., [1, 2, 3, 4] for Mon-Thu
): boolean => {
  const dayOfWeek = date.getDay(); // 0 for Sunday, 1 for Monday, etc.

  // 1. Check if it's a holiday
  const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  if (cambodianHolidaysSet.has(dateString)) {
    return false; // It's a holiday
  }

  // 2. Check if the day is in the class's specific study days
  if (classStudyDays && classStudyDays.includes(dayOfWeek)) {
    return true; // It's a study day for this class and not a holiday
  }

  // Otherwise, it's not a school day for this class
  return false;
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

export const calculateConsecutiveAbsences = (
  student: Student,
  allAttendanceRecordsForStudent: RawAttendanceRecord[], // Pre-filter for the student for efficiency
  allClassConfigs: AllClassConfigs | null,
  lookBackDays: number = 14 // Default to 14 days as per your sample, adjust if needed
): { count: number; details: string } => {

  if (!allClassConfigs) return { count: 0, details: "Class config not loaded" };

  const todayDateObj = new Date();
  todayDateObj.setHours(0, 0, 0, 0);

  const studentCreatedAt = student.createdAt instanceof Timestamp
    ? student.createdAt.toDate()
    : student.createdAt instanceof Date ? student.createdAt : null;
  if (studentCreatedAt) studentCreatedAt.setHours(0,0,0,0);

  const attendedDates = new Set<string>();
  allAttendanceRecordsForStudent
    .filter(att => att.status === 'present' || att.status === 'late')
    .forEach(att => attendedDates.add(att.date));

  let currentConsecutive = 0;
  let maxConsecutiveFoundInLoop = 0;

  // console.log(`Name: ${student.fullName}`);

  for (let i = 0; i < lookBackDays; i++) {
    const checkDate = new Date(todayDateObj);
    checkDate.setDate(todayDateObj.getDate() - i);
    checkDate.setHours(0,0,0,0);
    const dateStr = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;

    // console.log(`  Checking date: ${dateStr}`);

    if (studentCreatedAt && checkDate <= studentCreatedAt) {
      // console.log(`    Date ${dateStr} is before student creation. Finalizing streak before this point.`);
      maxConsecutiveFoundInLoop = Math.max(maxConsecutiveFoundInLoop, currentConsecutive);
      break;
    }

    if (studentCreatedAt && checkDate.getTime() === studentCreatedAt.getTime()) {
        maxConsecutiveFoundInLoop = Math.max(maxConsecutiveFoundInLoop, currentConsecutive);
        currentConsecutive = 0;
        continue;
    }

    const studentClassKey = student.class;
    const classConfig = studentClassKey && allClassConfigs ? allClassConfigs[studentClassKey] : undefined;
    const classStudyDays = classConfig?.studyDays; 
    if (isSchoolDay(checkDate, classStudyDays)) {
      let isConfirmedAbsentThisDay = false;
      let breakStreakLoop = false; // Flag to break outer loop if attendance is found

      if (i === 0) { // Special handling for "today"
        const studentClassKey = student.class;
        const studentShiftKey = student.shift;
        const classConfig = studentClassKey && allClassConfigs ? allClassConfigs[studentClassKey] : undefined;
        const shiftConfig = (studentShiftKey && classConfig?.shifts) ? classConfig.shifts[studentShiftKey] : undefined;

        if (shiftConfig && shiftConfig.startTime) {
          const [startHour, startMinute] = shiftConfig.startTime.split(':').map(Number);
          const shiftStartTimeForToday = new Date(todayDateObj);
          shiftStartTimeForToday.setHours(startHour, startMinute);

          const studentGrace = (student as any).gracePeriodMinutes ?? STANDARD_ON_TIME_GRACE_MINUTES;

          const onTimeDeadlineForToday = new Date(shiftStartTimeForToday);
          onTimeDeadlineForToday.setMinutes(shiftStartTimeForToday.getMinutes() + studentGrace);

          const lateCutOffForToday = new Date(onTimeDeadlineForToday);
          lateCutOffForToday.setMinutes(onTimeDeadlineForToday.getMinutes() + LATE_WINDOW_DURATION_MINUTES);
          
          const now = new Date();
          
          if (now > lateCutOffForToday) { // Shift window for today is closed
            if (!attendedDates.has(dateStr)) {
              isConfirmedAbsentThisDay = true;
            } else {
              breakStreakLoop = true; // Attended today, break any prior streak count
            }
          } else {
            // Still within today's attendance window. Today is NOT counted as an absence for this calculation.
            // Any streak from previous days effectively ends here for "leading up to today".
            //console.log("Class not start yet");
            isConfirmedAbsentThisDay = false; 
            //breakStreakLoop = true; // Treat as if attended for purpose of breaking past streak
          }
        } else { 
          // No shift config for today, cannot confirm absence for today
          isConfirmedAbsentThisDay = false;
          breakStreakLoop = true; // Treat as if attended if config is missing
        }
      } else { // For past days (yesterday and before)
        if (!attendedDates.has(dateStr)) {
          isConfirmedAbsentThisDay = true;
          //console.log("absent: ", currentConsecutive+1);
        } else {
          breakStreakLoop = true; // Attended this past school day, streak ends
        }
      }

      if (isConfirmedAbsentThisDay) {
        currentConsecutive++;
      }
      
      if (breakStreakLoop) { // If attended or today not yet confirmable as absent
        maxConsecutiveFoundInLoop = Math.max(maxConsecutiveFoundInLoop, currentConsecutive);
        // Since we are looking for the single most recent streak ending before an attendance,
        // or the streak if today is a confirmed absence, we break the loop.
        break;
      }
    } else {
      // Non-school days do not break a streak of school day absences, nor do they add to it.
    }
  }

  const finalConsecutiveCount = currentConsecutive; // The loop breaks when streak is broken.

  return { 
    count: finalConsecutiveCount, 
    details: `${finalConsecutiveCount} consecutive absences` 
  };
};

export const calculateMonthlyLates = (
  student: Student,
  allAttendanceRecordsForStudent: RawAttendanceRecord[], // Pre-filter for the student
  selectedMonthValue: string // "YYYY-MM"
): { count: number; details: string } => {

  const [yearStr, monthStr] = selectedMonthValue.split('-');
  const year = parseInt(yearStr);
  const monthIndex = parseInt(monthStr) - 1;
  const monthLabel = new Date(year, monthIndex).toLocaleString('default', { month: 'long', year: 'numeric' });
  const { monthStartDateString, monthEndDateStringUsedForQuery } = getMonthDetailsForLogic(year, monthIndex);

  const studentCreatedAt = student.createdAt instanceof Timestamp 
    ? student.createdAt.toDate() 
    : student.createdAt instanceof Date ? student.createdAt : null;
  if (studentCreatedAt) studentCreatedAt.setHours(0,0,0,0);

  const lateCount = allAttendanceRecordsForStudent.filter(att => {
    const attDateObj = new Date(att.date); attDateObj.setHours(0,0,0,0);
    return att.status === 'late' &&
           att.date >= monthStartDateString && 
           att.date <= monthEndDateStringUsedForQuery &&
           (!studentCreatedAt || studentCreatedAt <= attDateObj);
  }).length;
  
  return { count: lateCount, details: `${lateCount} lates in ${monthLabel}` };
};

// You would also have calculateMonthlyAbsences here, similar to how it was in page.tsx
// but taking pre-filtered attendance for the student and month as input for efficiency.
export const calculateMonthlyAbsencesLogic = (
  student: Student,
  attendanceForStudentInSelectedMonth: RawAttendanceRecord[],
  selectedMonthValue: string, // "YYYY-MM"
  allClassConfigs: AllClassConfigs | null // <-- ADD THIS PROP
): { count: number; details: string } => {
  const [yearStr, monthStr] = selectedMonthValue.split('-');
  const year = parseInt(yearStr);
  const monthIndex = parseInt(monthStr) - 1;
  const { daysInMonthToConsider, monthStartDateString, monthEndDateStringUsedForQuery } = getMonthDetailsForLogic(year, monthIndex);
  const monthLabel = new Date(year, monthIndex).toLocaleString('default', { month: 'long', year: 'numeric' });

  const studentCreatedAt = student.createdAt instanceof Timestamp
    ? student.createdAt.toDate()
    : student.createdAt instanceof Date ? student.createdAt : null;
  if (studentCreatedAt) studentCreatedAt.setHours(0,0,0,0);

  const attendedSchoolDayStringsInMonth = new Set<string>();
  attendanceForStudentInSelectedMonth
    .filter(att => (att.status === 'present' || att.status === 'late'))
    .forEach(att => {
        if (att.date >= monthStartDateString && att.date <= monthEndDateStringUsedForQuery) {
            attendedSchoolDayStringsInMonth.add(att.date);
        }
    });

  let applicableSchoolDays = 0;
  const absentSchoolDayStringsInMonth: string[] = [];

  const todayDateObj = new Date(); // For checking if checkDate is "today"
  todayDateObj.setHours(0, 0, 0, 0);

  for (let day = 1; day <= daysInMonthToConsider; day++) {
    const currentDateInLoop = new Date(year, monthIndex, day);
    currentDateInLoop.setHours(0,0,0,0);
    const currentDateStr = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    const studentClassKey = student.class;
    const classConfig = studentClassKey && allClassConfigs ? allClassConfigs[studentClassKey] : undefined;
    const classStudyDays = classConfig?.studyDays;
    if (isSchoolDay(currentDateInLoop, classStudyDays)) { // Check if this is a school day for the student's class
      if (!studentCreatedAt || studentCreatedAt < currentDateInLoop) { // Applicable day for student
        applicableSchoolDays++;
        
        let isConfirmedAbsentThisDay = false;
        if (currentDateInLoop.getTime() === todayDateObj.getTime()) { // Is the day being checked "today"?
          if (!allClassConfigs) { // Guard if configs are not loaded
            console.warn("Cannot determine today's absence status accurately: class configs not loaded.");
            isConfirmedAbsentThisDay = false; // Conservatively assume not absent if config missing
          } else {
            const studentClassKey = student.class;
            const studentShiftKey = student.shift;
            const classConfig = studentClassKey ? allClassConfigs[studentClassKey] : undefined;
            const shiftConfig = (studentShiftKey && classConfig?.shifts) ? classConfig.shifts[studentShiftKey] : undefined;

            if (shiftConfig && shiftConfig.startTime) {
              const [startHour, startMinute] = shiftConfig.startTime.split(':').map(Number);
              const shiftStartTimeForToday = new Date(todayDateObj);
              shiftStartTimeForToday.setHours(startHour, startMinute);
                            
              const onTimeDeadlineForToday = new Date(shiftStartTimeForToday);
              onTimeDeadlineForToday.setMinutes(shiftStartTimeForToday.getMinutes());
              const lateCutOffForToday = new Date(onTimeDeadlineForToday);
              lateCutOffForToday.setMinutes(onTimeDeadlineForToday.getMinutes() + LATE_WINDOW_DURATION_MINUTES);
              
              const now = new Date();
              if (now > lateCutOffForToday) { // Today's shift window is closed
                if (!attendedSchoolDayStringsInMonth.has(currentDateStr)) {
                  isConfirmedAbsentThisDay = true;
                }
              } else {
                // Window not closed yet for today, so not counted as absent for *this calculation*
                isConfirmedAbsentThisDay = false;
              }
            } else { // No shift config for today
              isConfirmedAbsentThisDay = false; // Cannot confirm absence
            }
          }
        } else { // For past days
          if (!attendedSchoolDayStringsInMonth.has(currentDateStr)) {
            isConfirmedAbsentThisDay = true;
          }
        }

        if (isConfirmedAbsentThisDay) {
          absentSchoolDayStringsInMonth.push(currentDateStr);
        }
      }
    }
  }
  
  const absentCount = absentSchoolDayStringsInMonth.length;
   
  if (student.fullName === "John Doe haha") {
    console.log(`   Calculated absent count for ${student.fullName} in ${monthLabel}: ${absentCount}`);
    if (absentCount > 0) {
        console.log(`   Dates counted as absent for ${student.fullName} in ${monthLabel}:`, absentSchoolDayStringsInMonth.sort());
    }
  }
  
  return { count: absentCount, details: `${absentCount} absences in ${monthLabel}` };
};