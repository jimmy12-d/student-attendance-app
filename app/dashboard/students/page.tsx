"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  mdiAccountPlus,
  mdiMonitorCellphone,
  mdiTableBorder,
  mdiReload,
} from "@mdi/js";
import Button from "../../_components/Button";
import CardBox from "../../_components/CardBox";
// CardBoxComponentEmpty might be needed if you use it for empty states
// import CardBoxComponentEmpty from "../../_components/CardBox/Component/Empty";
import NotificationBar from "../../_components/NotificationBar";
import SectionMain from "../../_components/Section/Main";
import SectionTitleLineWithButton from "../../_components/Section/TitleLineWithButton";
import AddStudentForm from "./AddStudentForm";
import TableStudents from "./TableStudents";
import CardBoxModal from "../../_components/CardBox/Modal";

// Firebase
import { db } from "../../../firebase-config";
import { collection, getDocs, deleteDoc, doc, Timestamp } from "firebase/firestore";

// Interface
import { Student } from "../../_interfaces"; // Ensure this path is correct

export default function StudentsPage() {
  const [isFormActive, setIsFormActive] = useState(false); // Renamed from isAddingStudent
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [isDeleteModalActive, setIsDeleteModalActive] = useState(false);

  // State for student to be edited
  const [studentToEdit, setStudentToEdit] = useState<Student | null>(null);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const querySnapshot = await getDocs(collection(db, "students"));
      const studentsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt instanceof Timestamp ? doc.data().createdAt.toDate() : doc.data().createdAt,
      })) as Student[];
      setStudents(studentsData);
    } catch (err) {
      console.error("Error fetching students: ", err);
      setError("Failed to fetch students. Please try again.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const handleShowCreateForm = () => {
    setStudentToEdit(null); // Ensure no student is being edited
    setIsFormActive(true);  // Show the form
  };
  
  const handleFormClose = () => {
    setIsFormActive(false);
    setStudentToEdit(null); // Clear studentToEdit when form closes
  };

  const handleStudentFormSubmit = (studentId: string) => { // Renamed from handleStudentAdded
    setIsFormActive(false);
    setStudentToEdit(null); // Clear studentToEdit after submission
    console.log(`Student ${studentToEdit ? 'updated' : 'added'}: ${studentId}. Refreshing list.`);
    fetchStudents(); // Refresh the list
  };

  // --- Delete Logic ---
  const openDeleteModal = (student: Student) => {
    setStudentToDelete(student);
    setIsDeleteModalActive(true);
  };

  const confirmDeleteStudent = async () => {
    if (studentToDelete) {
      try {
        await deleteDoc(doc(db, "students", studentToDelete.id));
        setStudents(prevStudents => prevStudents.filter(s => s.id !== studentToDelete.id));
        console.log("Student deleted:", studentToDelete.id);
      } catch (err) {
        console.error("Error deleting student:", err);
        setError("Failed to delete student.");
      }
    }
    setIsDeleteModalActive(false);
    setStudentToDelete(null);
  };

  // --- Edit Logic ---
  const handleEditStudent = (student: Student) => {
    console.log("Editing student:", student);
    setStudentToEdit(student); // Set the student to edit
    setIsFormActive(true);     // Show the form
  };

  return (
    <SectionMain>
      <SectionTitleLineWithButton
        icon={mdiTableBorder}
        title="Students"
        main
      >
        {!isFormActive && ( // Use isFormActive here
          <>
            <Button
              onClick={fetchStudents}
              icon={mdiReload}
              label="Refresh"
              color="info"
              small
              className="mr-2"
            />
            <Button
              onClick={handleShowCreateForm} // Changed to show create form
              icon={mdiAccountPlus}
              label="Create Student"
              color="contrast"
              roundedFull
              small
            />
          </>
        )}
      </SectionTitleLineWithButton>

      {error && (
        <NotificationBar color="danger" icon={mdiMonitorCellphone} className="mb-4">
          {error}
        </NotificationBar>
      )}
      
      {isFormActive && ( 
        <CardBox className="mb-6">
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">
              {studentToEdit ? "Edit Student" : "Add New Student"}
            </h2>
            <AddStudentForm
              onStudentAdded={handleStudentFormSubmit}
              onCancel={handleFormClose}
              // If studentToEdit is null, pass undefined instead.
              // Otherwise, pass studentToEdit.
              initialData={studentToEdit ? studentToEdit : undefined} 
            />
          </div>
        </CardBox>
      )}

      {!isFormActive && ( // Use isFormActive here
        <>
          {loading ? (
            <p className="text-center p-4">Loading students...</p>
          ) : students.length === 0 && !error ? (
            <NotificationBar color="warning" icon={mdiMonitorCellphone}>
              No students found. Add one to get started!
            </NotificationBar>
          ) : (
            <CardBox className="mb-6" hasTable>
              <TableStudents
                students={students}
                onEdit={handleEditStudent} // Pass the updated handler
                onDelete={openDeleteModal}
              />
            </CardBox>
          )}
        </>
      )}

      {/* Delete Confirmation Modal */}
      <CardBoxModal
        title="Please Confirm Delete"
        buttonColor="danger"
        buttonLabel="Confirm Delete"
        isActive={isDeleteModalActive}
        onConfirm={confirmDeleteStudent}
        onCancel={() => setIsDeleteModalActive(false)}
      >
        <p>Are you sure you want to delete student: <b>{studentToDelete?.fullName}</b>?</p>
        <p>This action cannot be undone.</p>
      </CardBoxModal>
    </SectionMain>
  );
}