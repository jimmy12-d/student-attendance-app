// app/dashboard/_components/DailyStatusDetailsModal.tsx
"use client";

import React, { useEffect, useState, useMemo } from "react"; // Ensure useMemo is imported if used for displayMonthLabel
import { Student } from "../../_interfaces";
import { Timestamp } from "firebase/firestore";
import CardBoxModal from "../../_components/CardBox/Modal";
import { cambodianHolidaysSet } from "../_lib/configForAttendanceLogic"; // Or from attendanceUtils
import { isSchoolDay as checkIsSchoolDay} from "../_lib/attendanceLogic";
import {
  AllClassConfigs,
  STANDARD_ON_TIME_GRACE_MINUTES,
  LATE_WINDOW_DURATION_MINUTES,
  getCurrentYearMonthString, // Assuming you moved this to config or utils
} from "../_lib/configForAttendanceLogic"; // Or your utils path

import Button from "../../_components/Button";
import { mdiChevronLeft, mdiChevronRight } from "@mdi/js";

interface DailyStatusInfo {
  date: string;
  status?: "Present" | "Late" | "Absent" | "Not Applicable (Holiday/Weekend)" | "Not Yet Enrolled" | "Pending" | "Unknown" | "Absent (Config Missing)";
  time?: string;
}

interface CalendarCell {
  dayOfMonth: number | null;
  fullDateStr?: string;
  status?: DailyStatusInfo['status'];
  time?: string;
  isSchoolDayCell?: boolean;
  isToday?: boolean;
  isPast?: boolean;
}

interface Props {
  student: Student;
  attendanceRecords: any[];
  allClassConfigs: AllClassConfigs;
  isActive: boolean;
  onClose: () => void;
  initialMonthValue?: string; // "YYYY-MM"
}

const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const DailyStatusDetailsModal: React.FC<Props> = ({
  student,
  attendanceRecords,
  allClassConfigs,
  isActive,
  onClose,
  initialMonthValue,
}) => {
  const [calendarGrid, setCalendarGrid] = useState<CalendarCell[][]>([]);
  // currentDisplayMonth state is no longer needed if title uses modalSelectedMonth + monthDropdownOptions
  const [isLoading, setIsLoading] = useState(true);

  const [modalSelectedMonth, setModalSelectedMonth] = useState<string>(
    initialMonthValue || getCurrentYearMonthString()
  );

    const handleMonthChange = (direction: 'prev' | 'next') => {
        const [yearStr, monthStr] = modalSelectedMonth.split('-');
        let currentYear = parseInt(yearStr);
        let currentMonth = parseInt(monthStr) - 1; // 0-indexed

        if (direction === 'prev') {
        currentMonth--;
        if (currentMonth < 0) {
            currentMonth = 11;
            currentYear--;
        }
        } else { // 'next'
        currentMonth++;
        if (currentMonth > 11) {
            currentMonth = 0;
            currentYear++;
        }
        }

        const newProposedMonthDate = new Date(currentYear, currentMonth, 1);
        newProposedMonthDate.setHours(0,0,0,0);

        // Boundary Check: Future months
        const now = new Date();
        const currentActualMonthDate = new Date(now.getFullYear(), now.getMonth(), 1);
        currentActualMonthDate.setHours(0,0,0,0);
        if (newProposedMonthDate > currentActualMonthDate) {
        console.log("Cannot navigate to future months beyond the current actual month.");
        return;
        }

        // Boundary Check: Student's enrollment month
        if (student && student.createdAt) {
        const createdAtDate = student.createdAt instanceof Timestamp 
                                ? student.createdAt.toDate() 
                                : student.createdAt;
        const studentEnrollmentMonthDate = new Date(createdAtDate.getFullYear(), createdAtDate.getMonth(), 1);
        studentEnrollmentMonthDate.setHours(0,0,0,0);
        
        if (newProposedMonthDate < studentEnrollmentMonthDate) {
            console.log(`Cannot navigate to months before student enrollment (${studentEnrollmentMonthDate.getFullYear()}-${studentEnrollmentMonthDate.getMonth()+1}). Setting to enrollment month.`);
            // Snap to the student's enrollment month if trying to go before it
            setModalSelectedMonth(`${studentEnrollmentMonthDate.getFullYear()}-${String(studentEnrollmentMonthDate.getMonth() + 1).padStart(2, '0')}`);
            return;
        }
        }
        
        // You could also add a hardcoded earliest year limit, e.g., if (currentYear < 2023) return;

        const newSelectedMonth = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
        setModalSelectedMonth(newSelectedMonth);
    };
  // Main useEffect to build calendarGrid (now depends on modalSelectedMonth)
  useEffect(() => {
    if (!isActive || !student || !allClassConfigs || !modalSelectedMonth) { // Check modalSelectedMonth
      setCalendarGrid([]);
      if (isActive) setIsLoading(false); // Stop loading if modal active but essential data missing
      return;
    }
    setIsLoading(true);

    const [yearStr, monthNumStr] = modalSelectedMonth.split('-'); // Use modalSelectedMonth
    const year = parseInt(yearStr);
    const month = parseInt(monthNumStr) - 1; // 0-indexed

    // setCurrentDisplayMonth(new Date(year, month, 1)); // No longer needed if title uses derived label

    const todayForComparison = new Date();
    todayForComparison.setHours(0, 0, 0, 0);

    const studentCreatedAt = student.createdAt instanceof Timestamp
      ? student.createdAt.toDate()
      : student.createdAt instanceof Date ? student.createdAt : null;
    if (studentCreatedAt) studentCreatedAt.setHours(0,0,0,0);

    // Filter attendanceRecords for the modalSelectedMonth to build the map
    const startDateForFilter = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const lastDayOfFilterMonth = new Date(year, month + 1, 0).getDate();
    const endDateForFilter = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDayOfFilterMonth).padStart(2, '0')}`;

    const attendanceMap = new Map<string, { status: string, timestamp?: Timestamp | Date }>();
    attendanceRecords
      .filter(att => att.date >= startDateForFilter && att.date <= endDateForFilter) // Filter for selected month
      .forEach(att => {
        attendanceMap.set(att.date, { status: att.status, timestamp: att.timestamp });
      });

    const studentClassKey = student.class;
    const classSpecificConfig = studentClassKey ? allClassConfigs[studentClassKey] : undefined;
    const classStudyDays = classSpecificConfig?.studyDays;

    const firstDayOfMonthOfWeek = new Date(year, month, 1).getDay();
    const daysInTargetMonth = new Date(year, month + 1, 0).getDate();

    const grid: CalendarCell[][] = [];
    let week: CalendarCell[] = [];
    let dayCounter = 1;

    for (let i = 0; i < firstDayOfMonthOfWeek; i++) {
      week.push({ dayOfMonth: null });
    }

    while (dayCounter <= daysInTargetMonth) {
      if (week.length === 7) { grid.push(week); week = []; }
      const currentDate = new Date(year, month, dayCounter);
      currentDate.setHours(0,0,0,0);
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayCounter).padStart(2, '0')}`;
        // Initialize cellData
      let cellData: CalendarCell = {
        dayOfMonth: dayCounter,
        fullDateStr: dateStr,
        isSchoolDayCell: false, // Will be determined below
        isToday: currentDate.getTime() === todayForComparison.getTime(),
        isPast: currentDate < todayForComparison,
        status: undefined,
        time: undefined,
      };

      if (studentCreatedAt && currentDate <= studentCreatedAt) { cellData.status = "Not Yet Enrolled"; }
      else {
        const isActualSchoolDayForThisClass = checkIsSchoolDay(currentDate, classStudyDays);
        cellData.isSchoolDayCell = isActualSchoolDayForThisClass;

        if (!isActualSchoolDayForThisClass) {
          cellData.status = "Not Applicable (Holiday/Weekend)";
        } else {
          // It IS a school day for this class, proceed with Present/Late/Absent/Pending logic
          const attendanceRecord = attendanceMap.get(dateStr);
          if (attendanceRecord) {
            cellData.status = attendanceRecord.status === 'present' ? "Present" :
                             attendanceRecord.status === 'late'   ? "Late"    : "Unknown";
            if (attendanceRecord.timestamp) {
              const recordTime = attendanceRecord.timestamp instanceof Timestamp 
                                  ? attendanceRecord.timestamp.toDate() 
                                  : attendanceRecord.timestamp as Date;
              cellData.time = recordTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
            }
          } else { // No attendance record for this school day
            if (cellData.isToday) { // Today
              const currentStudentShiftKey = student.shift; // Use a different var name to avoid conflict if any
              const currentClassConfig = studentClassKey && allClassConfigs ? allClassConfigs[studentClassKey] : undefined;
              const currentShiftConfig = (currentStudentShiftKey && currentClassConfig?.shifts) ? currentClassConfig.shifts[currentStudentShiftKey] : undefined;

              if (currentShiftConfig && currentShiftConfig.startTime) {
                const [startHour, startMinute] = currentShiftConfig.startTime.split(':').map(Number);
                const shiftStartTimeForToday = new Date(todayForComparison);
                shiftStartTimeForToday.setHours(startHour, startMinute,0,0);
                const studentGrace = (student as any).gracePeriodMinutes ?? STANDARD_ON_TIME_GRACE_MINUTES;
                const onTimeDeadlineForToday = new Date(shiftStartTimeForToday);
                onTimeDeadlineForToday.setMinutes(shiftStartTimeForToday.getMinutes() + studentGrace);
                const lateCutOffForToday = new Date(onTimeDeadlineForToday);
                lateCutOffForToday.setMinutes(onTimeDeadlineForToday.getMinutes() + LATE_WINDOW_DURATION_MINUTES);
                const now = new Date();
                if (now > lateCutOffForToday) {
                  cellData.status = "Absent";
                } else {
                  cellData.status = "Pending";
                }
              } else {
                cellData.status = "Absent (Config Missing)";
              }
            } else if (cellData.isPast) { // Past school day
              cellData.status = "Absent";
            } else { // Future school day
               cellData.status = undefined; 
            }
          }
        }
      }
      week.push(cellData);
      dayCounter++;
    }
    while (week.length > 0 && week.length < 7) { week.push({ dayOfMonth: null });}
    if (week.length > 0) grid.push(week);

    setCalendarGrid(grid);
    setIsLoading(false);
  }, [isActive, student, attendanceRecords, allClassConfigs, modalSelectedMonth]); // Key change: use modalSelectedMonth

      const getStatusColor = (status?: DailyStatusInfo['status']): string => {
    switch (status?.toLowerCase()) { // Convert to lowercase for case-insensitive matching
        case "present":
        return "bg-green-200 text-green-800";
        case "late":
        return "bg-yellow-200 text-yellow-800 border border-yellow-300";
        case "absent":
        return "bg-red-200 text-red-800";
        case "pending":
        return "bg-blue-100 text-blue-700 dark:bg-blue-200 dark:text-blue-00"; // Keep or adjust
        case "absent (config missing)": // Note: status in DailyStatusInfo has this as one word.
                                    // If your data might have "Absent (Config Missing)" string,
                                  
                                  
        return "bg-orange-100 text-orange-700 dark:bg-orange-600 dark:text-orange-50"; // Keep or adjust
        
        // For non-pill statuses or less emphasized ones:
        case "not applicable (holiday/weekend)":
        return "text-gray-400 dark:text-slate-500";
        case "not yet enrolled":
        return "text-gray-400 dark:text-slate-500";
        case "unknown":
        return "bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-200"; // Style for Unknown
        default:
        return "text-transparent"; // For future days or undefined status
    }
    };

  // Derived label for modal title
    const currentModalMonthLabel = useMemo(() => {
    if (modalSelectedMonth) {
        const [year, monthNum] = modalSelectedMonth.split('-');
        if (year && monthNum) { // Basic check
        return new Date(parseInt(year), parseInt(monthNum) - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' });
        }
    }
    return "Details"; // Fallback
    }, [modalSelectedMonth]);

    const { isPrevDisabled, isNextDisabled } = useMemo(() => {
        const now = new Date();
        const currentActualYear = now.getFullYear();
        const currentActualMonthIndex = now.getMonth(); // 0-indexed

        const [selectedYear, selectedMonthNum] = modalSelectedMonth.split('-').map(Number);
        const selectedMonthIndex = selectedMonthNum - 1; // 0-indexed

        // Disable "Next" if current modal month is already the current actual month or in the future
        const nextDisabled = selectedYear > currentActualYear ||
                            (selectedYear === currentActualYear && selectedMonthIndex >= currentActualMonthIndex);

        // Disable "Previous" if navigating back would go before student's enrollment month
        // or a hardcoded earliest sensible month (e.g., start of previous year from current options)
        let prevDisabled = false;
        if (student && student.createdAt) {
            const createdAtDate = student.createdAt instanceof Timestamp
                                ? student.createdAt.toDate()
                                : student.createdAt; // Assuming it's a Date object if not Timestamp
            const studentEnrollmentYear = createdAtDate.getFullYear();
            const studentEnrollmentMonthIndex = createdAtDate.getMonth(); // 0-indexed
            
            // Check if the *currently selected* month is already the enrollment month or earlier
            if (selectedYear < studentEnrollmentYear ||
                (selectedYear === studentEnrollmentYear && selectedMonthIndex <= studentEnrollmentMonthIndex)) {
            prevDisabled = true;
            }
        } else {
            // Fallback if no createdAt: limit to a certain range, e.g., based on generated month options
            // For simplicity, let's set a hard limit, e.g., not before 2 years ago from current year
            // This part can be refined based on your monthOptions generation logic for a more dynamic boundary
            if (selectedYear < currentActualYear - 1) { // Example: Don't go more than 1 full year back from current year
                prevDisabled = true;
            }
        }

        return { isPrevDisabled: prevDisabled, isNextDisabled: nextDisabled };
        }, [modalSelectedMonth, student]); 

  return (
    <CardBoxModal
      title={`Attendance: ${student.fullName}`} // Use derived label
      isActive={isActive}
      onConfirm={onClose}
      buttonLabel="Close"
      buttonColor="info"
      modalClassName="w-11/12 md:w-4/5 lg:w-3/5 xl:max-w-3xl"
    >
      {/* VVVV ADD MONTH SELECTOR UI VVVV */}
    <div className="mb-4 flex justify-between items-center px-2 sm:px-4 py-2 border-b dark:border-slate-700">
      <Button
        icon={mdiChevronLeft}
        onClick={() => handleMonthChange('prev')}
        small
        outline
        color="lightDark"
        aria-label="Previous Month"
        disabled={isPrevDisabled}
        // Optionally disable if you reach a minimum month limit
      />
      <h3 className="text-md sm:text-lg font-semibold text-gray-700 dark:text-gray-200">
        {currentModalMonthLabel}
      </h3>
      <Button
        icon={mdiChevronRight}
        onClick={() => handleMonthChange('next')}
        small
        outline
        color="lightDark"
        aria-label="Next Month"
        // Optionally disable if current month is the max allowed (e.g., current actual month)
        disabled={
          parseInt(modalSelectedMonth.split('-')[0]) === new Date().getFullYear() &&
          parseInt(modalSelectedMonth.split('-')[1]) -1 === new Date().getMonth()
        }
      />
    </div>
    {/* ^^^^ END OF REVISED MONTH NAVIGATION UI ^^^^ */}

      {isLoading ? (
        <p className="p-4 text-center">Loading details...</p>
      ) : calendarGrid.length === 0 ? (
        <p className="p-4 text-center">No attendance details to display for this period.</p>
      ) : (
        <div className="pr-2">
        <div className="text-sm p-1 md:p-2">
          {/* VVVV CALENDAR TABLE JSX VVVV */}
            <table className="w-full table-fixed border-collapse text-center">
              <thead>
                <tr>
                  {daysOfWeek.map(day => (
                    <th key={day} className="py-2 px-1 border dark:border-slate-600 font-semibold text-xs text-center">{day}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {calendarGrid.map((week, weekIndex) => (
                  <tr key={weekIndex}>
                    {week.map((cell, dayIndex) => (
                      <td
                        key={dayIndex}
                        className={`
                          py-1 px-1 border dark:border-slate-700 
                          h-16 md:h-20 relative align-top text-left 
                          transition-colors duration-150 ease-in-out
                          ${cell.isToday 
                            ? 'bg-sky-100 dark:bg-sky-600/50' // Your "today" background
                            : !cell.isSchoolDayCell && cell.dayOfMonth 
                            ? 'bg-gray-100 dark:bg-slate-900 opacity-70' 
                            : cell.dayOfMonth && !cell.isToday && cell.isPast 
                            ? 'bg-white dark:bg-slate-700/50' 
                            : cell.dayOfMonth && !cell.isToday && !cell.isPast 
                            ? 'bg-slate-50 dark:bg-slate-800/80' 
                            : 'bg-gray-50 dark:bg-slate-900'
                          }
                        `}
                      >
                        {cell.dayOfMonth && (
                          <>
                            {/* Day Number Display (your updated text color logic) */}
                            <div className={`
                                absolute top-1 left-1 text-xs p-0.5 
                                ${cell.isToday
                                    ? 'font-bold text-white-600 dark:text-white-100' 
                                    : (cell.isPast || cell.status) 
                                    ? 'text-gray-800 dark:text-gray-100 font-medium' 
                                    : 'text-gray-400 dark:text-slate-500'
                                }
                            `}>
                                {cell.dayOfMonth}
                            </div>

                            {/* VVVV REFINED STATUS DISPLAY AREA VVVV */}
                            {/* Position the status block below the day number */}
                            <div className="absolute inset-0 top-5 md:top-6 flex flex-col items-center justify-start pt-0.5 px-0.5 text-center">
                              {/* Display Present, Late, Absent, Pending as pills */}
                              {cell.status && ["Present", "Late", "Absent", "Pending", "Absent (Config Missing)", "Unknown"].includes(cell.status) && (
                                <span 
                                  className={`
                                    px-1.5 py-0.5 text-xxs sm:text-s rounded-full 
                                    leading-tight whitespace-nowrap font-semibold 
                                    ${getStatusColor(cell.status)}
                                  `}
                                >
                                  {cell.status === "Absent (Config Missing)" 
                                    ? "Absent*" 
                                    : cell.status // Display the status text directly
                                  }
                                </span>
                              )}
                              {/* Display time underneath if Present or Late */}
                              {(cell.status === "Present" || cell.status === "Late") && cell.time && (
                                <span 
                                  className={`
                                    block text-xxs mt-0.5 leading-tight 
                                    ${cell.isToday ? 'text-sky-700 dark:text-sky-200 pt-1' : 'text-gray-500 dark:text-gray-400 pt-1'}
                                  `}
                                >
                                  {cell.time ? `(${cell.time})` : ''}
                                </span>
                              )}

                              {/* Display "Not Applicable" or "Not Enrolled" more subtly */}
                              {(cell.status === "Not Applicable (Holiday/Weekend)" || cell.status === "Not Yet Enrolled") && (
                                 <span 
                                   className={`
                                     text-xxs leading-tight opacity-70 
                                     ${getStatusColor(cell.status)} 
                                     ${cell.isToday ? 'font-medium' : ''}
                                   `}
                                 >
                                     {cell.status === "Not Applicable (Holiday/Weekend)" 
                                       ? "No School" 
                                       : (cell.status === "Not Yet Enrolled" ? "Not Enrolled" : "")}
                                 </span>
                              )}
                              {/* For FUTURE school days where cell.status is undefined (no explicit status to show), 
                                  this block will render nothing for status. */}
                            </div>
                            {/* ^^^^ END OF REFINED STATUS DISPLAY AREA ^^^^ */}
                          </>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </CardBoxModal>
  );
};

export default DailyStatusDetailsModal;