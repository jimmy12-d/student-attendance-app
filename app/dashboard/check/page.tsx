"use client";

import React, { useState, useEffect, useCallback } from "react";
import { mdiMagnify, mdiReload, mdiClipboardListOutline } from "@mdi/js";
import SectionMain from "../../_components/Section/Main";
import SectionTitleLineWithButton from "../../_components/Section/TitleLineWithButton";
import CardBox from "../../_components/CardBox";
import NotificationBar from "../../_components/NotificationBar";
import Button from "../../_components/Button";
import FormField from "../../_components/FormField";
import CustomMultiSelectDropdown, { MultiSelectOption } from "../_components/CustomMultiSelectDropdown"; 
import TableDailyStatus, { DailyStudentStatus } from "./TableDailyStatus"; // Or "../record/TableDailyStatus"

import { db } from "../../../firebase-config";
import { collection, getDocs, query, where, orderBy, Timestamp,doc, CollectionReference, DocumentData} from "firebase/firestore";
import { Student } from "../../_interfaces";

const getTodayDateString = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const FEEDBACK_DISPLAY_MS = 3000;

export default function CheckAttendancePage() {
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  // MODIFIED: State for multi-select
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [selectedShifts, setSelectedShifts] = useState<string[]>([]);
  const [searchName, setSearchName] = useState<string>("");

  const [studentStatuses, setStudentStatuses] = useState<DailyStudentStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Options for the custom dropdowns
  const classList = ["10A", "10B", "11A", "11B", "12A", "12B", "Class C1", "Class C2", "Class C3"];
  const classOptions: MultiSelectOption[] = classList.map(c => ({ value: c, label: c }));

  const shiftList = ["Morning", "Afternoon", "Evening"]; // Your 3 shifts
  const shiftOptions: MultiSelectOption[] = shiftList.map(s => ({ value: s, label: s }));

  const showFeedback = useCallback((type: 'error' | 'info', text: string) => {
    if (type === 'error') setError(text);
    if (type === 'info' && !error) setError(text);
    setTimeout(() => setError(null), FEEDBACK_DISPLAY_MS + 2000);
  }, [error]);

  const fetchAttendanceData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setStudentStatuses([]);
    const attendanceCol = collection(db, "attendance") as CollectionReference<DocumentData>; 
    if (!selectedDate) {
      showFeedback('error', "Please select a date.");
      setLoading(false);
      return;
    }
    // It's okay if no classes or shifts are selected; it means "all" for that filter.

    try {
      // 1. Get all students matching the selected classes and shifts (the roster)
      let rosterStudents: Student[] = [];
    if (selectedClasses.length > 0) {
        
        let studentQuery = query(collection(db, "students"), where("class", "in", selectedClasses));
        const studentsSnapshot = await getDocs(studentQuery);
        rosterStudents = studentsSnapshot.docs.map(docSnap => ({id: docSnap.id, ...docSnap.data()} as Student));
        if (selectedShifts.length > 0) {
             rosterStudents = rosterStudents.filter(s => s.shift && selectedShifts.includes(s.shift));
        }
    } else if (selectedShifts.length > 0) { // If only shifts are selected
        const studentsQuery = query(collection(db, "students"), where("shift", "in", selectedShifts));
        const studentsSnapshot = await getDocs(studentsQuery);
        rosterStudents = studentsSnapshot.docs.map(docSnap => ({id: docSnap.id, ...docSnap.data()} as Student));
    }
      if (selectedClasses.length > 0 && selectedShifts.length > 0) {
        // Query by class, then filter by shift client-side (or vice-versa)
        // This could be inefficient if selectedClasses is very broad.
        // Alternative: If you expect few combinations, make separate queries and merge.
        // For now, let's fetch all students then filter (less ideal for large student bases but works for ~400)
        // This example fetches by class then filters by shift on client:
        const studentsByClassQuery = query(collection(db, "students"), where("class", "in", selectedClasses));
        const studentsSnapshot = await getDocs(studentsByClassQuery);
        rosterStudents = studentsSnapshot.docs.map(docSnap => ({id: docSnap.id, ...docSnap.data()} as Student))
                                         .filter(student => selectedShifts.includes(student.shift || ""));
      } else if (selectedClasses.length > 0) {
        const studentsQuery = query(collection(db, "students"), where("class", "in", selectedClasses));
        const studentsSnapshot = await getDocs(studentsQuery);
        rosterStudents = studentsSnapshot.docs.map(docSnap => ({id: docSnap.id, ...docSnap.data()} as Student));
      } else if (selectedShifts.length > 0) {
        const studentsQuery = query(collection(db, "students"), where("shift", "in", selectedShifts));
        const studentsSnapshot = await getDocs(studentsQuery);
        rosterStudents = studentsSnapshot.docs.map(docSnap => ({id: docSnap.id, ...docSnap.data()} as Student));
      } else {
        // No class or shift selected, fetch all students (could be large)
        // For an "absentee" report, you usually need at least a class or shift.
        // Let's require at least one class OR one shift for this report.
        showFeedback('info', "Please select at least one class or shift.");
        setLoading(false);
        return;
      }


      if (rosterStudents.length === 0) {
        showFeedback('info', `No students match the selected class/shift criteria.`);
        setLoading(false);
        return;
      }

      // 2. Get attendance records for the selected date and the rostered students
      const presentStudentIds = new Set<string>();
      const presentRecordsMap = new Map<string, any>();
      const rosterStudentIds = rosterStudents.map(s => s.id);

      if (rosterStudentIds.length > 0) {
        // Batch rosterStudentIds for "in" queries if necessary (max 30 per query)
        const attendancePromises: Promise<import("firebase/firestore").QuerySnapshot<DocumentData>>[] = [];
        for (let i = 0; i < rosterStudentIds.length; i += 30) {
            const studentIdBatch = rosterStudentIds.slice(i, i + 30);
            if (studentIdBatch.length > 0) {
                const q = query(collection(db, "attendance"),
                    where("date", "==", selectedDate),
                    where("status", "==", "present"),
                    where("studentId", "in", studentIdBatch)
                );
                attendancePromises.push(getDocs(q));
            }
        }
        const snapshots = await Promise.all(attendancePromises);
        snapshots.forEach(snapshot => {
            snapshot.docs.forEach(docSnap => {
                const data = docSnap.data();
                presentStudentIds.add(data.studentId);
                presentRecordsMap.set(data.studentId, data);
            });
        });
      }

      // 3. Determine status for each student in the roster
      let dailyStatusesResult = rosterStudents.map(student => {
        const isPresent = presentStudentIds.has(student.id);
        const attendanceRecord = presentRecordsMap.get(student.id);
        return {
          ...student,
          attendanceDate: selectedDate,
          attendanceStatus: isPresent ? "Present" : "Absent",
          actualTimestamp: attendanceRecord?.timestamp,
        } as DailyStudentStatus;
      });

      if (searchName.trim() !== "") {
        dailyStatusesResult = dailyStatusesResult.filter(record =>
          record.fullName.toLowerCase().includes(searchName.toLowerCase())
        );
      }
      setStudentStatuses(dailyStatusesResult);

    } catch (err: any) {
      console.error("Error fetching attendance data: ", err);
      if (err.code === 'failed-precondition' && err.message.includes('index')) {
        setError(`Query requires a new index. Check console for Firebase link.`);
      } else {
        setError("Failed to fetch data. Please try again.");
      }
    }
    setLoading(false);
  }, [selectedDate, selectedClasses, selectedShifts, searchName, showFeedback]);

  const handleSearch = () => {
    fetchAttendanceData();
  };

  return (
    <SectionMain>
      <SectionTitleLineWithButton
        icon={mdiMagnify}
        title="Check Daily Attendance Status"
        main
      />

      <CardBox className="mb-6 pl-2 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-2 items-start">
          <FormField label="Date" labelFor="checkDate">
            {(fd) => <input type="date" id="checkDate" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className={fd.className} />}
          </FormField>

          <FormField label="Class" labelFor="checkClassMulti">
            {(fd) => (
              <CustomMultiSelectDropdown
                id="checkClassMulti"
                options={classOptions}
                selectedValues={selectedClasses}
                onChange={setSelectedClasses}
                placeholder="Select Class"
                fieldData={fd} // Allows FormField to pass its calculated className
              />
            )}
          </FormField>

          <FormField label="Shift" labelFor="checkShiftMulti">
            {(fd) => (
              <CustomMultiSelectDropdown
                id="checkShiftMulti"
                options={shiftOptions}
                selectedValues={selectedShifts}
                onChange={setSelectedShifts}
                placeholder="Select Shift"
                fieldData={fd}
              />
            )}
          </FormField>

          <FormField label="Student Name (Filter)" labelFor="checkName">
            {(fd) => <input type="text" id="checkName" placeholder="Search by name..." value={searchName} onChange={(e) => setSearchName(e.target.value)} className={fd.className}/>}
          </FormField>
        </div>
        <div className="flex justify-start">
          <Button
            label="Check Status"
            color="info"
            icon={mdiMagnify}
            onClick={handleSearch}
            disabled={loading || !selectedDate || (selectedClasses.length === 0 && selectedShifts.length === 0) } // Require date and at least one class or shift
          />
        </div>
      </CardBox>

      {error && (
        <NotificationBar color={error.startsWith("Query requires") ? "warning" : "danger"} icon={mdiClipboardListOutline} className="mb-4">
          {error}
        </NotificationBar>
      )}

      <CardBox className="mb-6 rounded-lg shadow" hasTable>
        {loading ? (
          <p className="p-6 text-center">Loading student statuses...</p>
        ) : studentStatuses.length > 0 ? (
          <TableDailyStatus statuses={studentStatuses} />
        ) : (selectedDate && (selectedClasses.length > 0 || selectedShifts.length > 0) && !error) ? ( // Only show "no records" if a search was actually made
             <NotificationBar color="info" icon={mdiMagnify}>
                No students found for the selected criteria, or no attendance data to compare.
             </NotificationBar>
        ) : (
           <NotificationBar color="info">Please select a date and at least one class or shift, then click "Check Status".</NotificationBar>
        )}
      </CardBox>
    </SectionMain>
  );
}