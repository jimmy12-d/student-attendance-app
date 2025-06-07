"use client";

import React, { useState, useEffect, useCallback } from "react";
import { mdiMagnify, mdiChevronLeft, mdiChevronRight, mdiClipboardListOutline } from "@mdi/js";
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
import { collection, getDocs, query, where, orderBy, CollectionReference, DocumentData} from "firebase/firestore";
import { AttendanceRecord } from "../record/TableAttendance";
import { AllClassConfigs, getCurrentYearMonthString, ClassShiftConfigs } from "../_lib/configForAttendanceLogic"; // Assuming you have a file that exports all class configurations
import { getStudentDailyStatus } from "../_lib/attendanceLogic"; // Assuming you have a utility function to get status

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

  //const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [studentStatuses, setStudentStatuses] = useState<DailyStudentStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null); 

  const shiftList = ["Morning", "Afternoon", "Evening"]; // Your 3 shifts
  const shiftOptions: MultiSelectOption[] = shiftList.map(s => ({ value: s, label: s }));
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentYearMonthString()); // Defined here
  const [isDetailModalActive, setIsDetailModalActive] = useState(false);
  const [studentForDetailModal, setStudentForDetailModal] = useState<Student | null>(null);
  const [attendanceForDetailModal, setAttendanceForDetailModal] = useState<any[]>([]);
  const [allClassConfigs, setAllClassConfigs] = useState<AllClassConfigs | null>(null);
  useEffect(() => {
    const fetchAllClassData = async () => {
     // setLoadingConfigs(true); 
      
      try {
        const classesCollectionRef = collection(db, "classes");
        // We order by name to ensure a consistent order, which is good practice.
        // This requires a single-field index on 'name' in your 'classes' collection if you enforce indexes.
        const q = query(classesCollectionRef, orderBy("name")); 
        const querySnapshot = await getDocs(q);

        const allClassConfigs: AllClassConfigs = {};
        if (querySnapshot.empty) {
          console.warn("No documents found in 'classes' collection.");
        }
        
        querySnapshot.forEach(docSnap => {
          allClassConfigs[docSnap.id] = docSnap.data() as { name?: string; shifts: ClassShiftConfigs; studyDays?: number[] };
        });
        setAllClassConfigs(allClassConfigs);

      } catch (error) {
        console.error("Failed to fetch class configurations:", error);
        setError("Critical error: Could not load class time configurations."); // Set an error state
        setAllClassConfigs({}); // Set to empty object on error
      } finally {
        // This block executes regardless of success or failure
       // setLoadingConfigs(false);
      }
    };

    fetchAllClassData();
  }, []);
 
//   const showFeedback = useCallback((type: 'error' | 'info', text: string) => {
//   // The if(type === 'error') check is fine. The info check is what caused the dependency.
//   // We can just call setError directly for both.
//   setError(text);
//   setTimeout(() => setError(null), FEEDBACK_DISPLAY_MS + 2000);
// }, []);

const showFeedback = useCallback((type: 'error' | 'info', text: string) => {
  if (type === 'error') {
    setError(text);
    setTimeout(() => setError(null), FEEDBACK_DISPLAY_MS + 2000);
  }
  if (type === 'info') {
    setInfo(text); // Use the new info state
    setTimeout(() => setInfo(null), FEEDBACK_DISPLAY_MS);
  }
}, []); 


  useEffect(() => {
  const fetchClasses = async () => {
    setLoadingClasses(true);
    try {
      const classesCollectionRef = collection(db, "classes");
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

  const fetchAttendanceData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setStudentStatuses([]);
    setAttendance([]);

    const studentsCol = collection(db, "students") as CollectionReference<DocumentData>;
    const attendanceCol = collection(db, "attendance") as CollectionReference<DocumentData>;
  
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
    // It's okay if no classes or shifts are selected; it means "all" for that filter.

    try {
      // 1. Get all students matching the selected classes and shifts (the roster)
      let rosterStudents: Student[] = [];
    if (selectedClasses.length > 0) {
        
        const studentQuery = query(collection(db, "students"), where("class", "in", selectedClasses));
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
        showFeedback('info', "Please select at least one class or shift.");
        setLoading(false);
        return;
      }

      if (rosterStudents.length === 0) {
        showFeedback('info', `No students match the selected class/shift criteria.`);
        setLoading(false);
        return;
      }

      const rosterStudentIds = rosterStudents.map(s => s.id);

      if (rosterStudentIds.length > 0) {
        // Batch rosterStudentIds for "in" queries if necessary (max 30 per query)
        const attendancePromises: Promise<import("firebase/firestore").QuerySnapshot<DocumentData>>[] = [];
        const sixtyDaysAgo = new Date();
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
        const sixtyDaysAgoStr = `${sixtyDaysAgo.getFullYear()}-${String(sixtyDaysAgo.getMonth() + 1).padStart(2, '0')}-${String(sixtyDaysAgo.getDate()).padStart(2, '0')}`;
        
        for (let i = 0; i < rosterStudentIds.length; i += 30) {
          const studentIdBatch = rosterStudentIds.slice(i, i + 30);
          if (studentIdBatch.length > 0) {
            const q = query(collection(db, "attendance"),
                where("studentId", "in", studentIdBatch),
                where("date", ">=", sixtyDaysAgoStr) // Fetch last 60 days
            );
            attendancePromises.push(getDocs(q));
          }
        }
        const attendanceSnapshots = await Promise.all(attendancePromises);
        const allFetchedAttendanceForRoster: AttendanceRecord[] = [];
        attendanceSnapshots.forEach(snapshot => {
          snapshot.docs.forEach(docSnap => {
            allFetchedAttendanceForRoster.push({ id: docSnap.id, ...docSnap.data() } as AttendanceRecord);
          });
        });
        setAttendance(allFetchedAttendanceForRoster);

    const attendanceForSelectedDateMap = new Map<string, any>();
    allFetchedAttendanceForRoster
        .filter(att => att.date === selectedDate)
        .forEach(att => attendanceForSelectedDateMap.set(att.studentId, att));

    // --- Determine status for each student in the roster using the logic function ---
    let dailyStatusesResult = rosterStudents.map(student => {
      const attendanceRecord = attendanceForSelectedDateMap.get(student.id);
      
      // VVVV THIS IS THE CORRECTED LOGIC VVVV
      // Call the centralized function to get the calculated status and time
      const calculatedStatus = getStudentDailyStatus(
          student,
          selectedDate,      // The date we are checking
          attendanceRecord,    // The attendance record for that day (or undefined if none)
          allClassConfigs    // The class configuration data
      );
      
      return {
          ...student, // Spreads all properties from the student object
          attendanceDate: selectedDate,
          attendanceStatus: calculatedStatus.status, // Use the status returned from the function
          actualTimestamp: attendanceRecord?.timestamp, // Use timestamp from the original record for time display
      } as DailyStudentStatus;
      // ^^^^ END OF CORRECTED LOGIC ^^^^
    });

      if (searchName.trim() !== "") {
        dailyStatusesResult = dailyStatusesResult.filter(record =>
          record.fullName.toLowerCase().includes(searchName.toLowerCase())
        );
      }
      setStudentStatuses(dailyStatusesResult);
    }
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

    setStudentForDetailModal(studentDetail);

    // Filter the main `attendance` state using the student's ID.
    // Ensure you are using `att.studentId` for comparison.
    const studentSpecificAttendance = attendance.filter(
      att => att.studentId === studentDetail.id
    );
    
    setAttendanceForDetailModal(studentSpecificAttendance);
    setIsDetailModalActive(true); // Open the modal

  }, [attendance]);

  const handleDateArrowChange = (offset: number) => {
    // The current selectedDate is a "YYYY-MM-DD" string.
    const parts = selectedDate.split('-').map(part => parseInt(part, 10));
    const currentDate = new Date(parts[0], parts[1] - 1, parts[2]);

    // Add the offset (+1 for next day, -1 for previous day)
    currentDate.setDate(currentDate.getDate() + offset);
    
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');
    
    // This sets the state to the "YYYY-MM-DD" format required by the <input type="date">
    setSelectedDate(`${year}-${month}-${day}`);
  };

//   useEffect(() => {
//   // Don't fetch on the very first render if filters aren't selected yet.
//   // You can add a guard if you want.
//   if ((selectedClasses.length > 0 || selectedShifts.length >0) && !error) {
//     fetchAttendanceData();
//   }
// }, [selectedDate, fetchAttendanceData]);

useEffect(() => {
  // This effect now runs whenever a relevant filter changes.
  if (selectedClasses.length > 0 || selectedShifts.length > 0) {
    fetchAttendanceData();
  } else {
    // If all class/shift filters are cleared, also clear the results table
    setStudentStatuses([]);
    setAttendance([]);
  }
}, [selectedDate, selectedClasses, selectedShifts, fetchAttendanceData]);

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
          {(fd) => (
            <div className="flex items-center space-x-1">
              <Button
                icon={mdiChevronLeft}
                onClick={() => handleDateArrowChange(-1)}
                color="lightDark"
                small
                outline
                aria-label="Previous Day"
              />
              <input
                type="date"
                id="checkDate"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className={`${fd.className} flex-grow`} // flex-grow makes the input take available space
              />
              <Button
                icon={mdiChevronRight}
                onClick={() => handleDateArrowChange(1)}
                color="lightDark"
                small
                outline
                aria-label="Next Day"
              />
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
           <NotificationBar color="info">Please select a date and at least one class or shift, then click Check Status.</NotificationBar>
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