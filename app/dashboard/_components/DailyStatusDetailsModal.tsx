// app/dashboard/_components/DailyStatusDetailsModal.tsx
"use client";

import React, { useEffect, useState, useMemo } from "react"; // Ensure useMemo is imported if used for displayMonthLabel
import { Student, DailyStatusInfo } from "../../_interfaces";
import { Timestamp } from "firebase/firestore";
import CardBoxModal from "../../_components/CardBox/Modal";
import {getStudentDailyStatus} from "../_lib/attendanceLogic";
import {
  AllClassConfigs,
  getCurrentYearMonthString, // Assuming you moved this to config or utils
} from "../_lib/configForAttendanceLogic"; // Or your utils path
import { RawAttendanceRecord } from "../_lib/attendanceLogic";
import { PermissionRecord } from "../../_interfaces";
import Button from "../../_components/Button";
import { mdiChevronLeft, mdiChevronRight } from "@mdi/js";

// This interface is for the internal state of the calendar grid
interface CalendarCell {
  dayOfMonth: number | null;
  fullDateStr?: string;
  status?: DailyStatusInfo['status'];
  time?: string;
  isSchoolDayCell?: boolean;
  isToday?: boolean;
  isPast?: boolean;
}

// Props that this component accepts
interface Props {
  student: Student;
  attendanceRecords: RawAttendanceRecord[]; // Use the main AttendanceRecord type
  allClassConfigs: AllClassConfigs;
  approvedPermissions: PermissionRecord[];
  isActive: boolean;
  onClose: () => void;
  initialMonthValue?: string;
}

const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const DailyStatusDetailsModal: React.FC<Props> = ({
  student,
  attendanceRecords,
  allClassConfigs,
  approvedPermissions,
  isActive,
  onClose,
  initialMonthValue,
}) => {
  const [calendarGrid, setCalendarGrid] = useState<CalendarCell[][]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalSelectedMonth, setModalSelectedMonth] = useState<string>(
    initialMonthValue || getCurrentYearMonthString()
  );

  const handleMonthChange = (direction: 'prev' | 'next') => {
    const [yearStr, monthStr] = modalSelectedMonth.split('-');
    let currentYear = parseInt(yearStr);
    let currentMonth = parseInt(monthStr) - 1;

    if (direction === 'prev') {
      currentMonth--;
      if (currentMonth < 0) { currentMonth = 11; currentYear--; }
    } else {
      currentMonth++;
      if (currentMonth > 11) { currentMonth = 0; currentYear++; }
    }
    const newProposedMonthDate = new Date(currentYear, currentMonth, 1);
    const now = new Date();
    const currentActualMonthDate = new Date(now.getFullYear(), now.getMonth(), 1);
    if (newProposedMonthDate > currentActualMonthDate) return;

    if (student.createdAt) {
      const createdAtDate = student.createdAt instanceof Timestamp ? student.createdAt.toDate() : student.createdAt;
      const studentEnrollmentMonthDate = new Date(createdAtDate.getFullYear(), createdAtDate.getMonth(), 1);
      if (newProposedMonthDate < studentEnrollmentMonthDate) return;
    }
    
    setModalSelectedMonth(`${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`);
  };

  useEffect(() => {
    if (!isActive || !student || !allClassConfigs || !modalSelectedMonth) {
      setCalendarGrid([]);
      if (isActive) setIsLoading(false);
      return;
    }
    setIsLoading(true);

    const [yearStr, monthNumStr] = modalSelectedMonth.split('-');
    const year = parseInt(yearStr);
    const month = parseInt(monthNumStr) - 1;

    const todayForComparison = new Date();
    todayForComparison.setHours(0, 0, 0, 0);

    const attendanceMap = new Map<string, RawAttendanceRecord>();
    attendanceRecords
      .filter(att => att.date?.startsWith(modalSelectedMonth))
      .forEach(att => attendanceMap.set(att.date, att));

    const firstDayOfMonthOfWeek = new Date(year, month, 1).getDay();
    const daysInTargetMonth = new Date(year, month + 1, 0).getDate();
    const grid: CalendarCell[][] = [];
    let week: CalendarCell[] = [];
    let dayCounter = 1;

    for (let i = 0; i < firstDayOfMonthOfWeek; i++) { week.push({ dayOfMonth: null }); }

    while (dayCounter <= daysInTargetMonth) {
      if (week.length === 7) {
        grid.push(week);
        week = [];
      }
      
      const currentDate = new Date(year, month, dayCounter);
      currentDate.setHours(0,0,0,0);
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayCounter).padStart(2, '0')}`;
      
      const attendanceRecord = attendanceMap.get(dateStr);
      
      const calculatedStatus = getStudentDailyStatus(
        student,
        dateStr,
        attendanceRecord,
        allClassConfigs,
        approvedPermissions
      );

      const cellData: CalendarCell = {
        dayOfMonth: dayCounter,
        fullDateStr: dateStr,
        isToday: currentDate.getTime() === todayForComparison.getTime(),
        isPast: currentDate < todayForComparison,
        status: calculatedStatus.status,
        time: calculatedStatus.time,
        isSchoolDayCell: !["Not Applicable (Holiday/Weekend)", "Not Yet Enrolled", "No School"].includes(calculatedStatus.status || ""),
      };
      
      week.push(cellData);
      dayCounter++;
    }
    while (week.length > 0 && week.length < 7) { week.push({ dayOfMonth: null }); }
    if (week.length > 0) grid.push(week);

    setCalendarGrid(grid);
    setIsLoading(false);
  }, [isActive, student, attendanceRecords, allClassConfigs, approvedPermissions, modalSelectedMonth]);

  const getStatusColor = (status?: DailyStatusInfo['status']): string => {
    switch (status) {
      case "Present": return "bg-green-200 text-green-800";
      case "Late": return "bg-yellow-200 text-yellow-800";
      case "Absent": return "bg-red-200 text-red-800";
      case "Permission": return "bg-purple-200 text-purple-800";
      case "Pending": return "bg-blue-100 text-blue-700";
      case "Absent (Config Missing)": return "bg-orange-100 text-orange-700";
      case "Not Applicable (Holiday/Weekend)": return "text-gray-400";
      case "Not Yet Enrolled": return "text-gray-400 dark:text-slate-500";
      case "Unknown": return "bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-200";
      default: return "text-transparent";
    }
  };

  const currentModalMonthLabel = useMemo(() => {
    if (modalSelectedMonth) {
      const [year, monthNum] = modalSelectedMonth.split('-');
      if (year && monthNum) {
        return new Date(parseInt(year), parseInt(monthNum) - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' });
      }
    }
    return "Details";
  }, [modalSelectedMonth]);

  const { isPrevDisabled, isNextDisabled } = useMemo(() => {
    const now = new Date();
    const currentActualYear = now.getFullYear();
    const currentActualMonthIndex = now.getMonth();
    const [selectedYear, selectedMonthNum] = modalSelectedMonth.split('-').map(Number);
    const selectedMonthIndex = selectedMonthNum - 1;

    const nextDisabled = selectedYear > currentActualYear || (selectedYear === currentActualYear && selectedMonthIndex >= currentActualMonthIndex);
    
    let prevDisabled = false;
    if (student.createdAt) {
        const createdAtDate = student.createdAt instanceof Timestamp ? student.createdAt.toDate() : student.createdAt;
        const studentEnrollmentYear = createdAtDate.getFullYear();
        const studentEnrollmentMonthIndex = createdAtDate.getMonth();
        if (selectedYear < studentEnrollmentYear || (selectedYear === studentEnrollmentYear && selectedMonthIndex <= studentEnrollmentMonthIndex)) {
            prevDisabled = true;
        }
    } else if (selectedYear < currentActualYear - 2) { // Fallback: limit to 2 years back
        prevDisabled = true;
    }
    return { isPrevDisabled: prevDisabled, isNextDisabled: nextDisabled };
  }, [modalSelectedMonth, student.createdAt]); 

  return (
    <CardBoxModal
      title={`Attendance: ${student.fullName}`}
      isActive={isActive}
      onConfirm={onClose}
      buttonLabel="Close"
      buttonColor="info"
      modalClassName="w-11/12 md:w-4/5 lg:w-3/5 xl:max-w-4xl"
    >
      <div className="mb-4 flex justify-between items-center px-2 sm:px-4 py-2 border-b dark:border-slate-700">
        <Button icon={mdiChevronLeft} onClick={() => handleMonthChange('prev')} small outline color="lightDark" aria-label="Previous Month" disabled={isPrevDisabled} />
        <h3 className="text-md sm:text-lg font-semibold text-gray-700 dark:text-gray-200">{currentModalMonthLabel}</h3>
        <Button icon={mdiChevronRight} onClick={() => handleMonthChange('next')} small outline color="lightDark" aria-label="Next Month" disabled={isNextDisabled} />
      </div>

      {isLoading ? ( <p className="p-4 text-center">Loading details...</p> ) :
      calendarGrid.length === 0 ? ( <p className="p-4 text-center">No attendance details to display.</p> ) : (
        <div className="text-sm p-1 md:p-2">
          <table className="w-full table-fixed border-collapse text-center">
            <thead>
              <tr>
                {daysOfWeek.map(day => (
                  <th key={day} className="py-2 px-1 border dark:border-slate-700 font-semibold text-xs text-center">{day}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {calendarGrid.map((week, weekIndex) => (
                <tr key={weekIndex}>
                  {week.map((cell, dayIndex) => (
                    <td key={dayIndex} className={`py-1 px-1 border dark:border-slate-700 h-16 md:h-20 relative align-top text-left transition-colors duration-150 ease-in-out
                      ${cell.isToday ? 'bg-sky-100 dark:bg-sky-700/60' : !cell.isSchoolDayCell && cell.dayOfMonth ? 'bg-gray-100 dark:bg-slate-800 opacity-70' : cell.dayOfMonth && cell.isPast ? 'bg-white dark:bg-slate-700/50' : cell.dayOfMonth && !cell.isPast ? 'bg-slate-50 dark:bg-slate-800/80' : 'bg-gray-50 dark:bg-slate-900'}`}>
                      {cell.dayOfMonth && (
                        <>
                          <div className={`absolute top-1 left-1 text-s p-0.5 
                            ${cell.isToday ? 'font-bold text-sky-600 dark:text-sky-200' : (cell.isPast || cell.status) ? 'text-gray-800 dark:text-gray-100 font-medium' : 'text-gray-400 dark:text-slate-500'}`}>
                            {cell.dayOfMonth}
                          </div>
                          <div className="absolute inset-0 top-5 md:top-6 flex flex-col items-center justify-start pt-1 px-0.5 text-center">
                            {cell.status && ["Present", "Late", "Absent", "Pending", "Permission", "Absent (Config Missing)", "Unknown"].includes(cell.status) && (
                              <span className={`px-1.5 py-0.5 text-xs sm:text-xs rounded-full leading-tight whitespace-nowrap font-semibold ${getStatusColor(cell.status)}`}>
                                {cell.status === "Absent (Config Missing)" ? "Absent*" : cell.status}
                              </span>
                            )}
                            {(cell.status === "Present" || cell.status === "Late") && cell.time && (
                              <span className={`block text-xxs mt-0.5 pt-1 leading-tight ${cell.isToday ? 'text-sky-700 dark:text-sky-200' : 'text-gray-500 dark:text-gray-400'}`}>
                                {cell.time ? `(${cell.time})` : ''}
                              </span>
                            )}
                            {(cell.status === "Not Applicable (Holiday/Weekend)" || cell.status === "Not Yet Enrolled") && (
                               <span className={`text-xxs leading-tight opacity-70 ${getStatusColor(cell.status)} ${cell.isToday ? 'font-medium' : ''}`}>
                                   {cell.status === "Not Applicable (Holiday/Weekend)" ? "Non-School" : "Not Enrolled"}
                               </span>
                            )}
                          </div>
                        </>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </CardBoxModal>
  );
};

export default DailyStatusDetailsModal;