"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { mdiMagnify, mdiReload, mdiClipboardListOutline, mdiChevronLeft, mdiChevronRight } from "@mdi/js";
import SectionMain from "../../_components/Section/Main";
import SectionTitleLineWithButton from "../../_components/Section/TitleLineWithButton";
import CardBox from "../../_components/CardBox";
import NotificationBar from "../../_components/NotificationBar";
import Button from "../../_components/Button";
import FormField from "../../_components/FormField";
import CustomMultiSelectDropdown, { MultiSelectOption } from "../_components/CustomMultiSelectDropdown"; 
import TableDailyStatus, { DailyStudentStatus } from "./TableDailyStatus";
import DailyStatusDetailsModal from "../_components/DailyStatusDetailsModal";
import { Student, PermissionRecord } from "../../_interfaces";
import { RawAttendanceRecord } from "../_lib/attendanceLogic";
import { db } from "../../../firebase-config";
import { collection, getDocs, query, where, orderBy, Timestamp, CollectionReference, DocumentData, QuerySnapshot } from "firebase/firestore";
import { AllClassConfigs, getCurrentYearMonthString, ClassShiftConfigs } from "../_lib/configForAttendanceLogic";
import { getStudentDailyStatus } from "../_lib/attendanceLogic";

const getTodayDateString = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const FEEDBACK_DISPLAY_MS = 3000;

export default function CheckAttendancePage() {
  // Filter States
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [selectedShifts, setSelectedShifts] = useState<string[]>([]);
  const [searchName, setSearchName] = useState<string>("");

  // Data & UI States
  const [availableClasses, setAvailableClasses] = useState<MultiSelectOption[]>([]);
  const [allClassConfigs, setAllClassConfigs] = useState<AllClassConfigs | null>(null);
  const [attendance, setAttendance] = useState<RawAttendanceRecord[]>([]);
  const [permissions, setPermissions] = useState<PermissionRecord[]>([]);
  const [studentStatuses, setStudentStatuses] = useState<DailyStudentStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal States
  const [isDetailModalActive, setIsDetailModalActive] = useState(false);
  const [studentForDetailModal, setStudentForDetailModal] = useState<Student | null>(null);
  
  // Static shift options
  const shiftOptions: MultiSelectOption[] = ["Morning", "Afternoon", "Evening"].map(s => ({ value: s, label: s }));

  const showFeedback = useCallback((type: 'error' | 'info', text: string) => {
    setError(text);
    setTimeout(() => setError(null), FEEDBACK_DISPLAY_MS + 2000);
  }, []);

  // Effect to fetch initial, non-changing data (class list and configs)
  useEffect(() => {
    const fetchInitialData = async () => {
      setLoadingClasses(true);
      try {
        const classesCol = collection(db, "classes") as CollectionReference<DocumentData>;
        const q = query(classesCol, orderBy("name"));
        const querySnapshot = await getDocs(q);

        const fetchedClassesForDropdown: MultiSelectOption[] = [];
        const fetchedConfigs: AllClassConfigs = {};

        querySnapshot.docs.forEach(doc => {
          const data = doc.data();
          fetchedClassesForDropdown.push({ value: data.name as string, label: data.name as string });
          fetchedConfigs[doc.id] = data as any;
        });
        
        setAvailableClasses(fetchedClassesForDropdown);
        setAllClassConfigs(fetchedConfigs);
      } catch (error) {
        console.error("Error fetching initial class data:", error);
        showFeedback('error', 'Failed to load class list.');
      }
      setLoadingClasses(false);
    };
    fetchInitialData();
  }, [showFeedback]);


  // Main data fetching function when "Check Status" is clicked
  const fetchAndProcessData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setStudentStatuses([]);
    setAttendance([]);
    setPermissions([]);

    if (!selectedDate) {
      showFeedback('error', "Please select a date.");
      setLoading(false);
      return;
    }
    if (selectedClasses.length === 0 && selectedShifts.length === 0) {
      showFeedback('info', "Please select at least one class or shift to generate a report.");
      setLoading(false);
      return;
    }

    try {
      const studentsCol = collection(db, "students") as CollectionReference<DocumentData>;
      const attendanceCol = collection(db, "attendance") as CollectionReference<DocumentData>;
      const permsCol = collection(db, "permissions") as CollectionReference<DocumentData>;

      // 1. Fetch Students based on filters
      let studentQueryConstraints: import("firebase/firestore").QueryConstraint[] = [];
      if (selectedClasses.length > 0) {
        studentQueryConstraints.push(where("class", "in", selectedClasses));
      } else {
        studentQueryConstraints.push(where("shift", "in", selectedShifts));
      }
      const studentsQuery = query(studentsCol, ...studentQueryConstraints);
      const studentsSnapshot = await getDocs(studentsQuery);

      let fetchedStudents = studentsSnapshot.docs.map(docSnap => ({id: docSnap.id, ...docSnap.data()} as Student));
      let rosterStudents = (selectedClasses.length > 0 && selectedShifts.length > 0)
          ? fetchedStudents.filter(s => s.shift && selectedShifts.includes(s.shift))
          : fetchedStudents;
      
      if (rosterStudents.length === 0) {
        showFeedback('info', `No students match the selected criteria.`);
        setStudentStatuses([]);
        setLoading(false);
        return;
      }
      const rosterStudentIds = rosterStudents.map(s => s.id);

      // 2. Fetch Attendance and Permissions for the roster concurrently
      let allFetchedAttendance: RawAttendanceRecord[] = [];
      let allFetchedPermissions: PermissionRecord[] = [];

      if (rosterStudentIds.length > 0) {
        const sixtyDaysAgo = new Date();
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
        const sixtyDaysAgoStr = `${sixtyDaysAgo.getFullYear()}-${String(sixtyDaysAgo.getMonth() + 1).padStart(2, '0')}-${String(sixtyDaysAgo.getDate()).padStart(2, '0')}`;
        
        const attendancePromises: Promise<QuerySnapshot<DocumentData>>[] = [];
        const permissionsPromises: Promise<QuerySnapshot<DocumentData>>[] = [];

        for (let i = 0; i < rosterStudentIds.length; i += 30) {
          const studentIdBatch = rosterStudentIds.slice(i, i + 30);
          const attendanceQuery = query(attendanceCol, where("studentId", "in", studentIdBatch), where("date", ">=", sixtyDaysAgoStr));
          const permissionsQuery = query(permsCol, where("studentId", "in", studentIdBatch), where("status", "==", "approved"));
          attendancePromises.push(getDocs(attendanceQuery));
          permissionsPromises.push(getDocs(permissionsQuery));
        }

        const [attendanceSnapshots, permsSnapshots] = await Promise.all([
          Promise.all(attendancePromises),
          Promise.all(permissionsPromises),
        ]);

        attendanceSnapshots.flat().forEach(snapshot => snapshot.docs.forEach(docSnap => {
          allFetchedAttendance.push({ id: docSnap.id, studentId: docSnap.data().studentId, ...docSnap.data() } as RawAttendanceRecord);
        }));
        setAttendance(allFetchedAttendance);

        permsSnapshots.flat().forEach(snapshot => snapshot.docs.forEach(docSnap => {
          allFetchedPermissions.push({ id: docSnap.id, ...docSnap.data() } as PermissionRecord);
        }));
        setPermissions(allFetchedPermissions);
      }

      // 3. Determine daily status for the table
      const attendanceForSelectedDateMap = new Map<string, any>();
      allFetchedAttendance.filter(att => att.date === selectedDate).forEach(att => attendanceForSelectedDateMap.set(att.studentId, att));

      const dailyStatusesResult = rosterStudents.map(student => {
        const attendanceRecord = attendanceForSelectedDateMap.get(student.id);
        const approvedPermissionsForStudent = allFetchedPermissions.filter(p => p.studentId === student.id);
        const calculatedStatus = getStudentDailyStatus(student, selectedDate, attendanceRecord, allClassConfigs, approvedPermissionsForStudent);
        
        return {
            ...student,
            attendanceDate: selectedDate,
            attendanceStatus: calculatedStatus.status,
            actualTimestamp: attendanceRecord?.timestamp,
        } as DailyStudentStatus;
      });

      const finalResult = searchName.trim() !== ""
        ? dailyStatusesResult.filter(r => r.fullName.toLowerCase().includes(searchName.toLowerCase()))
        : dailyStatusesResult;

      setStudentStatuses(finalResult);

    } catch (err) {
      console.error("Error fetching data:", err);
      if (err instanceof Error && 'code' in err) {
        const firebaseError = err as { code: string, message: string };
        if (firebaseError.code === 'failed-precondition' && firebaseError.message.includes('index')) {
          setError(`Query requires a new index. Please check the browser console for a link to create it.`);
        } else {
          setError("Failed to fetch data. Please try again.");
        }
      } else {
        setError("An unknown error occurred.");
      }
    }
    setLoading(false);
  }, [selectedDate, selectedClasses, selectedShifts, searchName, showFeedback, allClassConfigs]);


  const handleSearch = () => {
    fetchAndProcessData();
  };

  const handleOpenDetailsModal = useCallback((statusEntry: DailyStudentStatus) => {
    const studentDetail: Student = statusEntry;
    setStudentForDetailModal(studentDetail);
    setIsDetailModalActive(true);
  }, []);

  const handleDateArrowChange = (offset: number) => {
    const parts = selectedDate.split('-').map(part => parseInt(part, 10));
    const currentDate = new Date(parts[0], parts[1] - 1, parts[2]);
    currentDate.setDate(currentDate.getDate() + offset);
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');
    setSelectedDate(`${year}-${month}-${day}`);
  };

  useEffect(() => {
    if (selectedClasses.length > 0 || selectedShifts.length > 0) {
      fetchAndProcessData();
    } else {
      setStudentStatuses([]);
      setAttendance([]);
      setPermissions([]);
    }
  }, [selectedDate, selectedClasses, selectedShifts, fetchAndProcessData]);

  return (
    <SectionMain>
      <SectionTitleLineWithButton icon={mdiMagnify} title="Check Daily Attendance Status" main />
      
      <CardBox className="mb-6 px-4 pt-2 pb-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-4 items-start">
          <FormField label="Date" labelFor="checkDate">
            {(fd) => (
              <div className="flex items-center space-x-1">
                <Button icon={mdiChevronLeft} onClick={() => handleDateArrowChange(-1)} color="lightDark" small outline />
                <input type="date" id="checkDate" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className={`${fd.className} flex-grow`} />
                <Button icon={mdiChevronRight} onClick={() => handleDateArrowChange(1)} color="lightDark" small outline />
              </div>
            )}
          </FormField>
          <FormField label="Class" labelFor="checkClassMulti">
            {(fd) => (
              <CustomMultiSelectDropdown
                id="checkClassMulti"
                options={availableClasses}
                selectedValues={selectedClasses}
                onChange={setSelectedClasses}
                placeholder={loadingClasses ? "Loading classes..." : (availableClasses.length === 0 ? "No classes available" : "Select Class")}
                fieldData={fd}
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
            disabled={loading || !selectedDate || (selectedClasses.length === 0 && selectedShifts.length === 0) }
          />
        </div>
      </CardBox>
      
      {error && <NotificationBar color="danger" icon={mdiClipboardListOutline} className="mb-4">{error}</NotificationBar>}
      
      <CardBox className="mb-6 rounded-lg shadow" hasTable>
        {loading ? (
          <p className="p-6 text-center">Loading student statuses...</p>
        ) : studentStatuses.length > 0 ? (
          <TableDailyStatus statuses={studentStatuses} onViewDetails={handleOpenDetailsModal}/>
        ) : (selectedDate && (selectedClasses.length > 0 || selectedShifts.length > 0) && !error) ? (
             <NotificationBar color="info" icon={mdiMagnify}>
                No students found for the selected criteria.
             </NotificationBar>
        ) : (
           <NotificationBar color="info">Please select a date and at least one class or shift to get a report.</NotificationBar>
        )}
      </CardBox>

      {isDetailModalActive && studentForDetailModal && allClassConfigs && (
        <DailyStatusDetailsModal
          student={studentForDetailModal}
          attendanceRecords={attendance.filter(att => att.studentId === studentForDetailModal.id)}
          approvedPermissions={permissions.filter(p => p.studentId === studentForDetailModal.id)}
          allClassConfigs={allClassConfigs}
          isActive={isDetailModalActive}
          onClose={() => {
            setIsDetailModalActive(false);
            setStudentForDetailModal(null);
          }}
          initialMonthValue={getCurrentYearMonthString(new Date(selectedDate))}
        />
      )}
    </SectionMain>
  );
}