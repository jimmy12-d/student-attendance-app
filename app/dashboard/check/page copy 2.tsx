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
import DailyStatusDetailsModal from "../_components/DailyStatusDetailsModal"; // Adjust path as needed
import { Student } from "../../_interfaces";
import { db } from "../../../firebase-config";
import { QuerySnapshot,collection, getDocs, query, where, orderBy, Timestamp,doc, CollectionReference, DocumentData} from "firebase/firestore";
import { AttendanceRecord } from "../record/TableAttendance";
import { AllClassConfigs, getCurrentYearMonthString, ClassShiftConfigs } from "../_lib/configForAttendanceLogic"; // Assuming you have a file that exports all class configurations

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

  const [availableClasses, setAvailableClasses] = useState<MultiSelectOption[]>([]);
  const [loadingClasses, setLoadingClasses] = useState<boolean>(true); // To show loading state for class dropdown

  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [studentStatuses, setStudentStatuses] = useState<DailyStudentStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const shiftList = ["Morning", "Afternoon", "Evening"]; // Your 3 shifts
  const shiftOptions: MultiSelectOption[] = shiftList.map(s => ({ value: s, label: s }));
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentYearMonthString()); // Defined here
  const [isDetailModalActive, setIsDetailModalActive] = useState(false);
  const [studentForDetailModal, setStudentForDetailModal] = useState<Student | null>(null);
  const [attendanceForDetailModal, setAttendanceForDetailModal] = useState<any[]>([]);
  const [allClassConfigs, setAllClassConfigs] = useState<AllClassConfigs | null>(null);

  const showFeedback = useCallback((type: 'error' | 'info', text: string) => {
    if (type === 'error') setError(text);
    if (type === 'info' && !error) setError(text);
    setTimeout(() => setError(null), FEEDBACK_DISPLAY_MS + 2000);
  }, [error]);


  useEffect(() => {
  const fetchClasses = async () => {
    setLoadingClasses(true);
    try {
      const classesCollectionRef = collection(db, "classes");
   //    const studentsCol = collection(db, "students") as CollectionReference<DocumentData>;
   //   const attendanceCol = collection(db, "attendance") as CollectionReference<DocumentData>;
   //   const classesCol = collection(db, "classes") as CollectionReference<DocumentData>;
      // Optionally order them, e.g., by name
      const q = query(classesCollectionRef, orderBy("name"));
      const querySnapshot = await getDocs(q);
      const fetchedClasses = querySnapshot.docs.map(doc => ({
        value: doc.data().name as string, // Assuming your documents have a 'name' field
        label: doc.data().name as string,
      }));
      setAvailableClasses(fetchedClasses);
    } catch (error) {
      console.error("Error fetching classes: ", error);
      // Use your existing showFeedback or setError for user feedback
      showFeedback('error', 'Failed to load class list.');
      setAvailableClasses([]); // Set to empty array on error
    }
    setLoadingClasses(false);
  };

  fetchClasses();
}, [showFeedback]); 

// Inside CheckAttendancePage component in app/dashboard/check/page.tsx

  const fetchAttendanceData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setStudentStatuses([]); // Clear previous results
    setAttendance([]); // Clear previous full attendance list

    const studentsCol = collection(db, "students") as CollectionReference<DocumentData>;
    const attendanceCol = collection(db, "attendance") as CollectionReference<DocumentData>;
    // --- 1. Validate Filters ---
    if (!selectedDate) {
      showFeedback('error', "Please select a date.");
      setLoading(false);
      return;
    }
    if (selectedClasses.length === 0 && selectedShifts.length === 0) {
      showFeedback('info', "Please select at least one class or shift.");
      setLoading(false);
      return;
    }

    try {
      // --- 2. Get Roster of Students Based on Filters ---
      let rosterStudents: Student[] = [];
      let studentQueryConstraints = [];

      if (selectedClasses.length > 0) {
        studentQueryConstraints.push(where("class", "in", selectedClasses));
      }
      // Note: Firestore does not support multiple 'in' queries on different fields.
      // This logic queries by class, then filters by shift on the client-side.
      
      const studentsQuery = query(collection(db, "students"), ...studentQueryConstraints);
      const studentsSnapshot = await getDocs(studentsQuery);
      
      let fetchedStudents = studentsSnapshot.docs.map(docSnap => ({id: docSnap.id, ...docSnap.data()} as Student));
      
      // Client-side filter for shifts if selected
      if (selectedShifts.length > 0) {
        rosterStudents = fetchedStudents.filter(s => s.shift && selectedShifts.includes(s.shift));
      } else {
        rosterStudents = fetchedStudents;
      }
      
      if (rosterStudents.length === 0) {
        showFeedback('info', `No students match the selected class/shift criteria.`);
        setLoading(false);
        return;
      }

      const rosterStudentIds = rosterStudents.map(s => s.id);

      // --- 3. Fetch Broad Range of Attendance for Roster ---
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
      const sixtyDaysAgoStr = `${sixtyDaysAgo.getFullYear()}-${String(sixtyDaysAgo.getMonth() + 1).padStart(2, '0')}-${String(sixtyDaysAgo.getDate()).padStart(2, '0')}`;
      
      const attendancePromises = [];
      const attendanceCol = collection(db, "attendance") as CollectionReference<DocumentData>;
      
      // Batch student IDs for 'in' query (max 30 per query)
      for (let i = 0; i < rosterStudentIds.length; i += 30) {
        const studentIdBatch = rosterStudentIds.slice(i, i + 30);
        if (studentIdBatch.length > 0) {
          const q = query(attendanceCol,
              where("studentId", "in", studentIdBatch),
              where("date", ">=", sixtyDaysAgoStr) // Fetch last 60 days of records
          );
          attendancePromises.push(getDocs(q));
        }
      }
      
      const attendanceSnapshots = await Promise.all(attendancePromises);
      const allFetchedAttendanceForRoster: AttendanceRecord[] = [];
      attendanceSnapshots.forEach(snapshot => {
        snapshot.docs.forEach(docSnap => {
          const data = docSnap.data();
          allFetchedAttendanceForRoster.push({ id: docSnap.id, ...data } as AttendanceRecord);
        });
      });

      // Update the main 'attendance' state so it's available for the details modal
      setAttendance(allFetchedAttendanceForRoster);

      // --- 4. Determine Status for the selectedDate using the fetched data ---
      const attendanceForSelectedDateMap = new Map<string, any>();
      allFetchedAttendanceForRoster
          .filter(att => att.date === selectedDate) // Filter for the specific date for this report
          .forEach(att => attendanceForSelectedDateMap.set(att.studentId, att));
      
      let dailyStatusesResult = rosterStudents.map(student => {
        const attendanceRecord = attendanceForSelectedDateMap.get(student.id);
        let status: "Present" | "Late" | "Absent" | "Unknown" = "Absent"; // Default to Absent

        if (attendanceRecord) {
            if (attendanceRecord.status === "late") status = "Late";
            else if (attendanceRecord.status === "present") status = "Present";
            else status = "Unknown";
        }
        return {
            ...student,
            attendanceDate: selectedDate,
            attendanceStatus: status,
            actualTimestamp: attendanceRecord?.timestamp,
        } as DailyStudentStatus;
      });

      // --- 5. Apply Name Search and Finalize State ---
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

  const handleOpenDetailsModal = useCallback((statusEntry: DailyStudentStatus) => {
    // The `statusEntry` object from the table IS the student object with added properties.
    // We can use it directly.
    const studentDetail: Student = statusEntry;
    
    console.log("Opening details for:", studentDetail.fullName);
    console.log(isDetailModalActive);

    //Start Debugging
        // --- START OF DEBUGGING ---
    console.log("--- Opening Details Modal ---");
    console.log("For Student:", studentDetail.fullName, `(ID: ${studentDetail.id})`);
    
    // Log the entire attendance array to see what we're filtering through
    console.log(`Filtering through ${attendance.length} total attendance records...`);
    // Log the first record to check its structure, especially the 'studentId' field
    //setAttendance(attendanceCol); // Ensure attendance state is set before filtering
    if (attendance.length > 0) {
      console.log("Sample record from 'attendance' state:", attendance[0]);
    }
    //End

    setStudentForDetailModal(studentDetail);

    // Filter the main `attendance` state using the student's ID.
    // Ensure you are using `att.studentId` for comparison.
    const studentSpecificAttendance = attendance.filter(
      att => att.studentId === studentDetail.id
    );

    console.log(`Result: Found ${studentSpecificAttendance.length} attendance records for this student.`);
    if (studentSpecificAttendance.length === 0) {
      console.log("This is why the modal is empty. Check if the student ID exists in the full attendance list shown above.");
    }    setAttendanceForDetailModal(studentSpecificAttendance);
    setIsDetailModalActive(true); // Open the modal

  }, [attendance]);

  return (
    <SectionMain>
      <SectionTitleLineWithButton
        icon={mdiMagnify}
        title="Check Daily Attendance Status"
        main
      />

      <CardBox className="mb-6 px-4 pt-2 pb-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-4 items-start">
          <FormField label="Date" labelFor="checkDate">
            {(fd) => <input type="date" id="checkDate" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className={fd.className} />}
          </FormField>

          <FormField label="Class" labelFor="checkClassMulti">
            {(fd) => (
              <CustomMultiSelectDropdown
                id="checkClassMulti"
                options={availableClasses}
                selectedValues={selectedClasses}
                onChange={setSelectedClasses}
                placeholder={loadingClasses ? "Loading classes..." : (availableClasses.length === 0 ? "No classes available" : "Select Class")}
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
          <TableDailyStatus statuses={studentStatuses} onViewDetails={handleOpenDetailsModal}/>
        ) : (selectedDate && (selectedClasses.length > 0 || selectedShifts.length > 0) && !error) ? ( // Only show "no records" if a search was actually made
             <NotificationBar color="info" icon={mdiMagnify}>
                No students found for the selected criteria, or no attendance data to compare.
             </NotificationBar>
        ) : (
           <NotificationBar color="info">Please select a date and at least one class or shift, then click "Check Status".</NotificationBar>
        )}
      </CardBox>
        {isDetailModalActive && studentForDetailModal && allClassConfigs && (
        <DailyStatusDetailsModal
          student={studentForDetailModal} // Uses studentForDetailModal
          attendanceRecords={attendanceForDetailModal}
          allClassConfigs={allClassConfigs}
          isActive={isDetailModalActive}
          onClose={() => {
            setIsDetailModalActive(false);
            setStudentForDetailModal(null);
            setAttendanceForDetailModal([]);
        }}
          initialMonthValue={selectedMonth} 
        />
      )}
    </SectionMain>
  );
}