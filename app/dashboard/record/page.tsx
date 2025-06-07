"use client";

import React, { useState, useEffect, useCallback } from "react";
import { mdiClipboardListOutline } from "@mdi/js"; // Added mdiTrashCan for modal if needed
import SectionMain from "../../_components/Section/Main";
import SectionTitleLineWithButton from "../../_components/Section/TitleLineWithButton";
import CardBox from "../../_components/CardBox";
import CardBoxModal from "../../_components/CardBox/Modal"; // Import Modal
import NotificationBar from "../../_components/NotificationBar";
import TableAttendance, { AttendanceRecord } from "./TableAttendance";
import { Student } from "../../_interfaces"; // Import your Student interface

import { db } from "../../../firebase-config";
import { collection, getDocs, query, orderBy, Timestamp, doc, deleteDoc } from "firebase/firestore"; // Added doc, deleteDoc

export default function AttendanceRecordPage() {
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for delete confirmation modal
  const [isDeleteModalActive, setIsDeleteModalActive] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<AttendanceRecord | null>(null);

  const fetchAttendanceRecords = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch all student data first and create a map for easy lookup
      const studentsSnapshot = await getDocs(collection(db, "students"));
      const studentsMap = new Map<string, Student>();
      studentsSnapshot.forEach(docSnap => {
        studentsMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() } as Student);
      });
      const recordsQuery = query(
        collection(db, "attendance"),
        orderBy("date", "desc"),
        orderBy("timestamp", "desc")
      );
      const attendanceSnapshot = await getDocs(recordsQuery);
      const recordsData = attendanceSnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        const student = studentsMap.get(data.studentId); // Get current student details

        return {
          id: docSnap.id,
          studentName: student ? student.fullName : (data.studentName || 'Unknown Student'),
          class: data.class,
          shift: data.shift,
          status: data.status || 'Unknown',
          date: data.date,
          timestamp: data.timestamp,
        } as AttendanceRecord;
      });
      setAttendanceRecords(recordsData);
    } catch (err) {
      console.error("Error fetching attendance records: ", err);
      setError("Failed to fetch attendance records. Please try again.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAttendanceRecords();
  }, [fetchAttendanceRecords]);

  // Handlers for delete functionality
  const handleOpenDeleteModal = (record: AttendanceRecord) => {
    setRecordToDelete(record);
    setIsDeleteModalActive(true);
  };

  const handleConfirmDelete = async () => {
    if (!recordToDelete) return;
    try {
      await deleteDoc(doc(db, "attendance", recordToDelete.id));
      setAttendanceRecords(prevRecords => prevRecords.filter(r => r.id !== recordToDelete.id));
      // Optionally, show a success notification
    } catch (err) {
      console.error("Error deleting attendance record: ", err);
      setError("Failed to delete record. Please try again.");
      // Optionally, show an error notification
    }
    setIsDeleteModalActive(false);
    setRecordToDelete(null);
  };

  return (
    <SectionMain>
      <SectionTitleLineWithButton
        icon={mdiClipboardListOutline}
        title="Attendance Records"
        main
      />

      {error && (
        <NotificationBar color="danger" icon={mdiClipboardListOutline} className="mb-4">
          {error}
        </NotificationBar>
      )}

      <CardBox className="mb-6 rounded-lg shadow" hasTable>
        {loading ? (
          <p className="p-6 text-center">Loading records...</p>
        ) : attendanceRecords.length === 0 && !error ? (
          <NotificationBar color="warning" icon={mdiClipboardListOutline}>
            No attendance records found.
          </NotificationBar>
        ) : (
          <TableAttendance
            records={attendanceRecords}
            onDeleteRecord={handleOpenDeleteModal} // Pass the handler here
          />
        )}
      </CardBox>

      {/* Delete Confirmation Modal */}
      {recordToDelete && (
        <CardBoxModal
          title="Confirm Delete"
          buttonColor="danger"
          buttonLabel="Delete"
          isActive={isDeleteModalActive}
          onConfirm={handleConfirmDelete}
          onCancel={() => {
            setIsDeleteModalActive(false);
            setRecordToDelete(null);
          }}
        >
          <p>Are you sure you want to delete the attendance record for</p>
          <p>
            <b>{recordToDelete.studentName}</b> on{" "}
            <b>
              {recordToDelete.date instanceof Date
                ? recordToDelete.date.toLocaleDateString()
                : recordToDelete.date && typeof (recordToDelete.date as Timestamp).toDate === "function"
                ? (recordToDelete.date as Timestamp).toDate().toLocaleDateString()
                : String(recordToDelete.date)}
            </b>
            ?
          </p>
          <p className="mt-2 text-sm text-gray-600">This action cannot be undone.</p>
        </CardBoxModal>
      )}
    </SectionMain>
  );
}