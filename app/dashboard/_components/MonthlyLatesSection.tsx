// app/dashboard/_components/MonthlyLatesSection.tsx
"use client";

import React, { useEffect, useState } from "react";
import { Student } from "../../_interfaces";
import { StudentAttendanceWarning, AllClassConfigs } from "../_lib/configForAttendanceLogic"; // Import from shared config
import SectionTitleLineWithButton from "../../_components/Section/TitleLineWithButton";
import CardBoxAttendanceWarning from "./CardBoxAttendanceWarning";
import NotificationBar from "../../_components/NotificationBar";
import { mdiClockAlertOutline } from "@mdi/js";
// Import the calculation function
import { calculateMonthlyLates, getMonthDetailsForLogic } from "../_lib/attendanceLogic";

interface Props {
  students: Student[];
  attendanceRecords: any[];
  selectedMonthValue: string;   // "YYYY-MM"
  selectedMonthLabel: string;
  allClassConfigs: AllClassConfigs | null;
}

const MonthlyLatesSection: React.FC<Props> = ({
  students,
  attendanceRecords,
  selectedMonthValue,
  selectedMonthLabel,
  allClassConfigs,
}) => {
  const [monthlyLateWarningList, setMonthlyLateWarningList] = useState<StudentAttendanceWarning[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!students || !attendanceRecords || !selectedMonthValue) {
      setIsLoading(false);
      setMonthlyLateWarningList([]);
      return;
    }
    setIsLoading(true);

    const [yearStr, monthStr] = selectedMonthValue.split('-');
    const year = parseInt(yearStr);
    const monthIndex = parseInt(monthStr) - 1;
    const { monthStartDateString, monthEndDateStringUsedForQuery } = getMonthDetailsForLogic(year, monthIndex);

    const warnings: StudentAttendanceWarning[] = [];

    students.forEach(student => {
      // Filter attendance for this student AND for the selected month period
      const studentAttendanceInMonth = attendanceRecords.filter(
        att => att.studentId === student.id &&
               att.date >= monthStartDateString &&
               att.date <= monthEndDateStringUsedForQuery
      );
      
      const lateData = calculateMonthlyLates(student, studentAttendanceInMonth, selectedMonthValue);
      
      if (lateData.count >= 5) { // Your threshold for lates
        warnings.push({
          id: student.id, fullName: student.fullName, class: student.class, shift: student.shift,
          warningType: "totalLate", value: lateData.count, 
          details: lateData.details
        });
      }
    });

    setMonthlyLateWarningList(warnings.sort((a,b) => b.value - a.value).slice(0,5));
    setIsLoading(false);

  }, [students, attendanceRecords, selectedMonthValue, selectedMonthLabel, allClassConfigs]);// Added isSchoolDayFn for consistency if used later


  if (isLoading) {
    return (
      <div className="mb-6"> {/* Changed mb-4 to mb-6 for consistency with other dashboard sections */}
        <SectionTitleLineWithButton icon={mdiClockAlertOutline} title={`5+ Lates (${selectedMonthLabel || 'Selected Month'})`} />
        <p className="text-center p-4">Calculating monthly lates...</p>
      </div>
    );
  }
  
  return (
    <div className="mb-6"> {/* Changed mb-4 to mb-6 */}
      <SectionTitleLineWithButton icon={mdiClockAlertOutline} title={`5+ Lates (${selectedMonthLabel || 'Selected Month'})`}>
        {/* Month dropdown is in the parent page.tsx */}
      </SectionTitleLineWithButton>
        {monthlyLateWarningList.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {monthlyLateWarningList.map((warningItem) => {
              // Find the full student object for this warning
              const studentDetails = students.find(s => s.id === warningItem.id);
              // Filter attendance records for this specific student (can be further optimized if needed)
              const studentSpecificAttendance = attendanceRecords.filter(att => att.studentId === warningItem.id);

              if (!studentDetails) return null; // Should not happen if warningItem.id comes from students list

              return (
                <CardBoxAttendanceWarning 
                  key={`${warningItem.id}-totallate`} 
                  warning={warningItem}
                  student={studentDetails} // <-- PASS THE FULL STUDENT OBJECT
                  allAttendanceRecordsForStudent={studentSpecificAttendance} // <-- PASS STUDENT-SPECIFIC ATTENDANCE
                  allClassConfigs={allClassConfigs} // <-- PASS ALL CLASS CONFIGS
                />
              );
            })}
          </div>
        ) : (
        <NotificationBar color="info" icon={mdiClockAlertOutline}>
          No students with 5+ lates for {selectedMonthLabel || 'the selected period'}.
        </NotificationBar>
      )}
    </div>
  );
};

export default MonthlyLatesSection;