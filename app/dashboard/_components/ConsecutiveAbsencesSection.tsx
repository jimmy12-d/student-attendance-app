// app/dashboard/_components/ConsecutiveAbsencesSection.tsx
"use client";

import React, { useEffect, useState } from "react";
import { Student } from "../../_interfaces";
// StudentAttendanceWarning might come from a shared interface file or configForAttendanceLogic
import { AllClassConfigs } from "../_lib/configForAttendanceLogic"; 
import { StudentAttendanceWarning } from "../_lib/configForAttendanceLogic";
import SectionTitleLineWithButton from "../../_components/Section/TitleLineWithButton";
import CardBoxAttendanceWarning from "./CardBoxAttendanceWarning";
import NotificationBar from "../../_components/NotificationBar";
import { mdiCalendarRemoveOutline } from "@mdi/js";
// Import the calculation function
import { calculateConsecutiveAbsences, RawAttendanceRecord } from "../_lib/attendanceLogic";

interface Props {
  students: Student[];
  attendanceRecords: RawAttendanceRecord[]; // Raw attendance records (e.g., last 60-90 days)
  allClassConfigs: AllClassConfigs | null;
}

const ConsecutiveAbsencesSection: React.FC<Props> = ({ students, attendanceRecords, allClassConfigs }) => {
  const [consecutiveAbsenceWarningList, setConsecutiveAbsenceWarningList] = useState<StudentAttendanceWarning[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!students || !attendanceRecords || !allClassConfigs) {
      setIsLoading(false);
      setConsecutiveAbsenceWarningList([]);
      return;
    }
    setIsLoading(true);
    const warnings: StudentAttendanceWarning[] = [];

    students.forEach(student => {
      // Pre-filter attendance for the current student to pass to the calculation function
      const studentAttendance = attendanceRecords.filter(att => att.studentId === student.id);
      const result = calculateConsecutiveAbsences(student, studentAttendance, allClassConfigs, 14); // Check last 14 days
      
      if (result.count >= 2) {
        warnings.push({
          id: student.id, fullName: student.fullName, class: student.class, shift: student.shift,
          warningType: "consecutiveAbsence", value: result.count, 
          details: result.details
        });
      }
    });

    setConsecutiveAbsenceWarningList(warnings.sort((a,b) => b.value - a.value).slice(0,5));
    setIsLoading(false);
  }, [students, attendanceRecords, allClassConfigs]);

  if (isLoading || !allClassConfigs) {
    return (
      <div className="mb-6">
        <SectionTitleLineWithButton icon={mdiCalendarRemoveOutline} title="Recent Consecutive Absences (2+)" />
        <p className="text-center p-4">Calculating...</p>
      </div>
    );
  }
  return (
    <div className="mb-6">
      <SectionTitleLineWithButton icon={mdiCalendarRemoveOutline} title="Recent Consecutive Absences (2+)" />
      {consecutiveAbsenceWarningList.length > 0 ? (
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {consecutiveAbsenceWarningList.map((studentWarning) => {
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
        <NotificationBar color="info" icon={mdiCalendarRemoveOutline}>
          No students with 2+ recent consecutive school day absences.
        </NotificationBar>
      )}
    </div>
  );
};

export default ConsecutiveAbsencesSection;