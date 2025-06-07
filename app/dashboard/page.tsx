// app/dashboard/page.tsx
"use client";

import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import {
  mdiAccountMultiple, mdiChevronDown, mdiClockAlertOutline, mdiAccountOff, mdiTimerSand,
  mdiCalendarMonth, mdiChartTimelineVariant, mdiAlertOctagonOutline, mdiReload,
  // Add any other icons used by your new section titles
} from "@mdi/js";
import Button from "../_components/Button";
import SectionMain from "../_components/Section/Main";
import SectionTitleLineWithButton from "../_components/Section/TitleLineWithButton";
import CardBoxWidget from "../_components/CardBox/Widget";
import NotificationBar from "../_components/NotificationBar";
import Icon from "../_components/Icon"; // <--- ADD THIS IMPORT STATEMENT

import { db } from "../../firebase-config";
import { collection, getDocs, query, orderBy, where, Timestamp } from "firebase/firestore";
import { Student } from "../_interfaces";

// Import the new section components
import MonthlyAbsencesSection from "./_components/MonthlyAbsencesSection"; // Adjust path
import MonthlyLatesSection from "./_components/MonthlyLatesSection";     // Adjust path
import ConsecutiveAbsencesSection from "./_components/ConsecutiveAbsencesSection"; // Adjust path

// Import utils
import { AllClassConfigs, ClassShiftConfigs, getCurrentYearMonthString,LATE_WINDOW_DURATION_MINUTES } from "./_lib/configForAttendanceLogic";
import { isSchoolDay, RawAttendanceRecord } from "./_lib/attendanceLogic";

// Interface for processed student warning data - can move to _interfaces or attendanceUtils
export interface StudentAttendanceWarning {
  id: string;
  fullName: string;
  class?: string;
  shift?: string;
  warningType: "consecutiveAbsence" | "totalAbsence" | "totalLate";
  value: number;
  details?: string;
}

export default function DashboardPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<RawAttendanceRecord[]>([]); // Raw attendance records for a relevant period
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for Month Selection Dropdown
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentYearMonthString());// "YYYY-MM"
  const [monthOptions, setMonthOptions] = useState<{ value: string; label: string }[]>([]);
  const [isMonthDropdownOpen, setIsMonthDropdownOpen] = useState(false);
  const monthDropdownRef = useRef<HTMLDivElement>(null);

  const [allClassConfigs, setAllClassConfigs] = useState<AllClassConfigs | null>(null);
  const [loadingConfigs, setLoadingConfigs] = useState(true); // Specific loading for configs

  // Generate Month Options
  useEffect(() => {
    console.clear();
    const options: { value: string; label: string }[] = [];
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonthIndex = now.getMonth();
    for (let m = 0; m <= currentMonthIndex; m++) {
      const date = new Date(currentYear, m, 1);
      options.push({
        value: `${currentYear}-${String(m + 1).padStart(2, '0')}`,
        label: date.toLocaleString('default', { month: 'long', year: 'numeric' }),
        
      });
    }
    setMonthOptions(options.reverse()); // Show most recent first
  }, []);

  // Click outside for month dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (monthDropdownRef.current && !monthDropdownRef.current.contains(event.target as Node)) {
        setIsMonthDropdownOpen(false);
      }
    };
    if (isMonthDropdownOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMonthDropdownOpen]);


  const fetchData = useCallback(async () => {
    setLoading(true);
    setLoadingConfigs(true); // Also set this loading true
    setError(null);
    try {
      const studentSnapshotPromise = getDocs(query(collection(db, "students"), orderBy("fullName")));
      
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
      const sixtyDaysAgoStr = `${sixtyDaysAgo.getFullYear()}-${String(sixtyDaysAgo.getMonth() + 1).padStart(2, '0')}-${String(sixtyDaysAgo.getDate()).padStart(2, '0')}`;
      const attendanceSnapshotPromise = getDocs(
        query(collection(db, "attendance"), where("date", ">=", sixtyDaysAgoStr), orderBy("date", "desc"))
      );

      const classesSnapshotPromise = getDocs(query(collection(db, "classes"), orderBy("name"))); // Assuming 'name' field exists and you want to order

      const [studentSnapshot, attendanceSnapshot, classesSnapshot] = await Promise.all([
        studentSnapshotPromise,
        attendanceSnapshotPromise,
        classesSnapshotPromise,
      ]);

      const studentList = studentSnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data(), createdAt: docSnap.data().createdAt } as Student));
      setStudents(studentList);

      const attendanceList = attendanceSnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
      setAttendance(attendanceList);

      const configs: AllClassConfigs = {};
      if (classesSnapshot.empty) {
        console.warn("No documents found in 'classes' collection for dashboard.");
      }
      classesSnapshot.forEach(docSnap => {
        configs[docSnap.id] = docSnap.data() as { name?: string; shifts: ClassShiftConfigs };
      });
      setAllClassConfigs(configs);
      setLoadingConfigs(false); // Configs loaded

    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      setError("Failed to load dashboard data.");
      if (err.code === 'failed-precondition' && err.message.includes('index')) {
        setError(`Query requires a new index. Check console for link.`);
      }
      setLoadingConfigs(false); // Also set to false on error
    }
    setLoading(false); // General loading false
  }, []); // Empty dependency array, runs once

  useEffect(() => {
    fetchData();
  }, [fetchData]); 

  // Calculate "Today's" stats for widgets
  const todayStrForWidgets = getCurrentYearMonthString(new Date()).substring(0, 7) + '-' + String(new Date().getDate()).padStart(2, '0');
  const presentTodayCount = useMemo(() => attendance.filter(a => a.date === todayStrForWidgets && a.status === 'present').length, [attendance, todayStrForWidgets]);
  const lateTodayCount = useMemo(() => attendance.filter(a => a.date === todayStrForWidgets && a.status === 'late').length, [attendance, todayStrForWidgets]);
  
  const absentTodayCount = useMemo(() => {
    if (!allClassConfigs || students.length === 0) return 0; // Wait for configs

    const now = new Date(); // Current time to check against shift windows
    const todayDateObjForComparison = new Date(todayStrForWidgets); // Already YYYY-MM-DD string for today
    todayDateObjForComparison.setHours(0, 0, 0, 0); // Normalize for date comparisons

    return students.filter(student => {
      const studentCreatedAt = student.createdAt instanceof Timestamp
        ? student.createdAt.toDate()
        : student.createdAt instanceof Date
        ? student.createdAt
        : null;
      if (studentCreatedAt) studentCreatedAt.setHours(0,0,0,0);

      // Get class-specific study days for this student
      const studentClassKey = student.class;
      const classConfigData = studentClassKey ? allClassConfigs[studentClassKey] : undefined;
      const classStudyDays = classConfigData?.studyDays;

      // Not a school day for this student's class OR student not yet enrolled today
      if (!isSchoolDay(todayDateObjForComparison, classStudyDays) || 
          (studentCreatedAt && studentCreatedAt > todayDateObjForComparison)) {
        return false; // Not an applicable day for this student to be absent
      }

      // Check if already attended today (present or late)
      const attendedToday = attendance.find(
        att => att.studentId === student.id &&
              att.date === todayStrForWidgets && 
              (att.status === 'present' || att.status === 'late')
      );
      if (attendedToday) {
        return false; // Attended, so not absent
      }

      // If not attended, check if their shift window for today has closed
      const studentShiftKey = student.shift;
      const shiftConfig = (studentClassKey && studentShiftKey && classConfigData?.shifts)
                          ? classConfigData.shifts[studentShiftKey]
                          : undefined;

      if (shiftConfig && shiftConfig.startTime) {
        const [startHour, startMinute] = shiftConfig.startTime.split(':').map(Number);
        
        const shiftStartTimeForToday = new Date(todayDateObjForComparison); // Use normalized today
        shiftStartTimeForToday.setHours(startHour, startMinute);
        
        const onTimeDeadlineForToday = new Date(shiftStartTimeForToday);
        onTimeDeadlineForToday.setMinutes(shiftStartTimeForToday.getMinutes());
        
        const lateCutOffForToday = new Date(onTimeDeadlineForToday);
        lateCutOffForToday.setMinutes(onTimeDeadlineForToday.getMinutes() + LATE_WINDOW_DURATION_MINUTES);

        if (now > lateCutOffForToday) {
          return true; // Shift window closed and no attendance = Absent
        } else {
          return false; // Shift window still open = Pending, not yet absent
        }
      } else {
        // No shift config for this student/shift today, but it's a school day for their class
        // and they haven't attended. Consider them absent (config issue).
        console.warn(`No shift config for ${student.fullName} (Class: ${studentClassKey}, Shift: ${studentShiftKey}) on ${todayStrForWidgets}. Marking as absent if no attendance.`);
        return true; // Or handle as "Unknown/Config Missing" if you prefer not to count as absent
      }
    }).length;
  // Add allClassConfigs to the dependency array
  }, [students, attendance, todayStrForWidgets, allClassConfigs, isSchoolDay]);

  const pendingTodayCount = useMemo(() => {
    if (!allClassConfigs || students.length === 0) return 0; // Ensure configs and students are loaded

    const now = new Date();
    const todayDateObj = new Date();
    todayDateObj.setHours(0, 0, 0, 0);
    const todayDateStr = `<span class="math-inline">\{todayDateObj\.getFullYear\(\)\}\-</span>{String(todayDateObj.getMonth() + 1).padStart(2, '0')}-${String(todayDateObj.getDate()).padStart(2, '0')}`;

    return students.filter(student => {
      const studentCreatedAt = student.createdAt instanceof Timestamp 
                              ? student.createdAt.toDate() 
                              : student.createdAt instanceof Date
                              ? student.createdAt
                              : null;
      if (studentCreatedAt) studentCreatedAt.setHours(0,0,0,0);

      // Ignore if not a school day for this student's class or if student not yet enrolled
      const studentClassKey = student.class;
      const classConfigData = studentClassKey ? allClassConfigs[studentClassKey] : undefined;
      const classStudyDays = classConfigData?.studyDays;
      if (!isSchoolDay(todayDateObj, classStudyDays) || (studentCreatedAt && studentCreatedAt > todayDateObj)) {
        return false;
      }

      // Check if already attended today
      const attendedToday = attendance.find(
        att => att.studentId === student.id && 
              att.date === todayDateStr &&
              (att.status === 'present' || att.status === 'late')
      );
      if (attendedToday) {
        return false; // Not pending if already attended
      }

      // Check if shift window is still open
      const studentShiftKey = student.shift;
      const shiftConfig = (studentClassKey && studentShiftKey && classConfigData?.shifts) 
                          ? classConfigData.shifts[studentShiftKey] 
                          : undefined;

      if (shiftConfig && shiftConfig.startTime) {
        const [startHour, startMinute] = shiftConfig.startTime.split(':').map(Number);
        const shiftStartTimeForToday = new Date(todayDateObj);
        shiftStartTimeForToday.setHours(startHour, startMinute);
        
        const onTimeDeadlineForToday = new Date(shiftStartTimeForToday);
        onTimeDeadlineForToday.setMinutes(shiftStartTimeForToday.getMinutes());
        
        const lateCutOffForToday = new Date(onTimeDeadlineForToday);
        lateCutOffForToday.setMinutes(onTimeDeadlineForToday.getMinutes() + LATE_WINDOW_DURATION_MINUTES); // From your config

        if (now <= lateCutOffForToday) {
          return true; // Shift window open and not attended = Pending
        }
      }
      return false; // Shift window closed or no config = Not pending (would be absent if not attended)
    }).length;
  }, [students, attendance, allClassConfigs]);

  const currentSelectedMonthLabel = useMemo(() => {
    return monthOptions.find(m => m.value === selectedMonth)?.label || selectedMonth;
  }, [monthOptions, selectedMonth]);

  if ((loading && students.length === 0) || loadingConfigs) { // Show full page loader only on initial load
    return <SectionMain><p className="text-center p-6">Loading dashboard data...</p></SectionMain>;
  }

  return (
    <SectionMain>
      <SectionTitleLineWithButton icon={mdiChartTimelineVariant} title="Overview" main>
        <Button onClick={fetchData} icon={mdiReload} label="Refresh Data" color="info" small />
      </SectionTitleLineWithButton>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6 mb-6">
        <CardBoxWidget label="Total Students" number={students.length} icon={mdiAccountMultiple} iconColor="info" />
        <CardBoxWidget label="Present Today" number={presentTodayCount} icon={mdiAccountMultiple} iconColor="success" />
        {/* Add Permission Here */}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        <CardBoxWidget label="Late Today" number={lateTodayCount} icon={mdiClockAlertOutline} iconColor="warning" />
        <CardBoxWidget label="Absent Today" number={absentTodayCount} icon={mdiAccountOff} iconColor="danger" />
        <CardBoxWidget label="Pending Today" number={pendingTodayCount} icon={mdiTimerSand} iconColor="info" trendLabel="Shift Open"/>
        {/* Add Permission Here */}
      </div>

      {error && <NotificationBar color="danger" icon={mdiAlertOctagonOutline}>{error}</NotificationBar>}

      {/* Pass data to the new section components */}
      {/* Note: ConsecutiveAbsencesSection might need its own way of determining 'recent' if not tied to selectedMonth */}
      <ConsecutiveAbsencesSection 
        students={students} 
        attendanceRecords={attendance} 
        allClassConfigs={allClassConfigs} // Pass allClassConfigs
      />

      {/* Wrapper for Monthly Reports to include the Month Selector */}
      <SectionTitleLineWithButton icon={mdiCalendarMonth} title="Monthly Reports" main>
        <div className="relative w-56" ref={monthDropdownRef}> {/* Adjusted width */}
          <button type="button" onClick={() => setIsMonthDropdownOpen(!isMonthDropdownOpen)}
              className="text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-slate-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm px-4 py-2 inline-flex justify-between items-center w-full hover:bg-gray-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500 dark:focus:ring-offset-slate-800"
          >
              <span>{monthOptions.find(m => m.value === selectedMonth)?.label || "Select Month"}</span>
              <Icon path={mdiChevronDown} w="h-4 w-4" className={`ml-2 text-gray-400 transform transition-transform duration-200 ${isMonthDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          {isMonthDropdownOpen && monthOptions.length > 0 && (
          <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white dark:bg-slate-700 ring-1 ring-black dark:ring-gray-600 ring-opacity-5 focus:outline-none z-10">
              <ul className="py-1 max-h-60 overflow-y-auto" role="menu">
              {monthOptions.map(option => (
                  <li key={option.value}>
                  <button type="button"
                      className={`block w-full text-left px-4 py-2 text-sm ${selectedMonth === option.value ? 'bg-gray-100 dark:bg-gray-600 text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-200'} hover:bg-gray-100 dark:hover:bg-gray-600`}
                      onClick={() => { setSelectedMonth(option.value); setIsMonthDropdownOpen(false); }}
                  >
                      {option.label}
                  </button>
                  </li>
              ))}
              </ul>
          </div>
          )}
        </div>
      </SectionTitleLineWithButton>

      
        {/* Pass selectedMonth to components that need it */}
        {!loading && (
            <>
            <MonthlyAbsencesSection 
                students={students} 
                attendanceRecords={attendance} 
                selectedMonthValue={selectedMonth}
                selectedMonthLabel={currentSelectedMonthLabel}
                allClassConfigs={allClassConfigs}
                // allClassConfigs is not directly needed by this version of MonthlyAbsencesSection's calculate function
            />
            <MonthlyLatesSection 
                students={students} 
                attendanceRecords={attendance} 
                selectedMonthValue={selectedMonth}
                selectedMonthLabel={currentSelectedMonthLabel}
                allClassConfigs={allClassConfigs}
                // allClassConfigs is not directly needed by this version of MonthlyLatesSection's calculate function
            />
            </>
        )}


    </SectionMain>
  );
}