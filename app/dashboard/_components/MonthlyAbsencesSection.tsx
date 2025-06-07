"use client";

import React, { useEffect, useState } from "react";
import { Student } from "../../_interfaces"; // Adjust path
import { StudentAttendanceWarning } from "../page"; // Assuming defined in dashboard/page.tsx or move to _interfaces
import SectionTitleLineWithButton from "../../_components/Section/TitleLineWithButton";
import CardBoxAttendanceWarning from "./CardBoxAttendanceWarning"; // Assuming it's in the same _components folder
import NotificationBar from "../../_components/NotificationBar";
import { mdiAlertOctagonOutline } from "@mdi/js";
import { getMonthDetailsForLogic, calculateMonthlyAbsencesLogic } from "../_lib/attendanceLogic";
import { AllClassConfigs } from "../_lib/configForAttendanceLogic";

interface Props {
  students: Student[];
  attendanceRecords: any[];
  selectedMonthValue: string; // e.g., "2025-06"
  selectedMonthLabel: string; // <--- NEW PROP (e.g., "June 2025")
  allClassConfigs: AllClassConfigs | null;
}

const MonthlyAbsencesSection: React.FC<Props> = ({ students, attendanceRecords, selectedMonthValue, selectedMonthLabel, allClassConfigs }) => {
  const [monthlyAbsenceWarningList, setMonthlyAbsenceWarningList] = useState<StudentAttendanceWarning[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!students || !attendanceRecords || !selectedMonthValue ) { // Removed allClassConfigs from this specific guard
      setIsLoading(false);
      setMonthlyAbsenceWarningList([]);
      return;
    }
    setIsLoading(true);

    const warnings: StudentAttendanceWarning[] = [];
    const [yearStr, monthStr] = selectedMonthValue.split('-');
    const year = parseInt(yearStr);
    const monthIndex = parseInt(monthStr) - 1;
    const { monthStartDateString, monthEndDateStringUsedForQuery } = getMonthDetailsForLogic(year, monthIndex);


    students.forEach(student => {
      // Filter attendance for this specific student and for the selected month period
      const studentAttendanceInMonth = attendanceRecords.filter(
        att => att.studentId === student.id &&
               att.date >= monthStartDateString &&
               att.date <= monthEndDateStringUsedForQuery
      );

      const absenceData = calculateMonthlyAbsencesLogic(student, studentAttendanceInMonth, selectedMonthValue, allClassConfigs);
      
      if (absenceData.count >= 5) { // Your threshold
        warnings.push({
          id: student.id, fullName: student.fullName, class: student.class, shift: student.shift,
          warningType: "totalAbsence", value: absenceData.count, 
          details: absenceData.details // Use details from calculation
        });
      }
    });

    setMonthlyAbsenceWarningList(warnings.sort((a,b) => b.value - a.value).slice(0,5));
    setIsLoading(false);

  }, [students, attendanceRecords, selectedMonthValue, selectedMonthLabel]);

  if (isLoading) {
    return (
      <div className="mb-4">
        <SectionTitleLineWithButton icon={mdiAlertOctagonOutline} title="5+ Absences This Month" />
        <p className="text-center p-4">Calculating monthly absences...</p>
      </div>
    );
  }

  return (
    <div className="mb-4">
      <SectionTitleLineWithButton icon={mdiAlertOctagonOutline} title={`5+ Absences (${selectedMonthLabel || 'Selected Month'})`}>
        {/* The month dropdown will be in page.tsx */}
      </SectionTitleLineWithButton>
      {monthlyAbsenceWarningList.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {monthlyAbsenceWarningList.map((studentWarning) => {
            const studentSpecificAttendance = attendanceRecords.filter(att => att.studentId === studentWarning.id);
            const studentObj = students.find(s => s.id === studentWarning.id);
            if (!studentObj) return null;
            return (
              <CardBoxAttendanceWarning
                key={`${studentWarning.id}-consecutive`}
                warning={studentWarning}
                student={studentObj}
                allClassConfigs={allClassConfigs}
                allAttendanceRecordsForStudent={studentSpecificAttendance}
              />
            );
          })}
        </div>
      ) : (
        <NotificationBar color="info" icon={mdiAlertOctagonOutline}>
          No students with 5+ absences for the selected month.
        </NotificationBar>
      )}
    </div>
  );
};

export default MonthlyAbsencesSection;
