// app/dashboard/manage-excuses/page.tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { mdiAccountClockOutline, mdiReload } from "@mdi/js";
import SectionMain from "../../_components/Section/Main";
import SectionTitleLineWithButton from "../../_components/Section/TitleLineWithButton";
import CardBox from "../../_components/CardBox";
import NotificationBar from "../../_components/NotificationBar";
import TableManageGracePeriods, { StudentWithGracePeriod } from "./TableManageGracePeriods"; // Adjust path if needed
import Button from "../../_components/Button";
import FormField from "../../_components/FormField"; // Assuming you have this


import { db } from "../../../firebase-config"; // Adjust path
import { collection, getDocs, query, orderBy, doc, updateDoc } from "firebase/firestore";

// Removed serverTimestamp as it's not used in this specific update logic for gracePeriodMinutes

// Define standard and extended grace periods (these could also be app-wide configs)
export const STANDARD_ON_TIME_GRACE_MINUTES = 15;
export const EXTENDED_GRACE_MINUTES = 30;

export default function ManageGracePeriodsPage() { // Renamed for clarity
  const [students, setStudents] = useState<StudentWithGracePeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null); // For success messages

  const [searchName, setSearchName] = useState<string>("");
  const [gracePeriodFilter, setGracePeriodFilter] = useState<string>("all"); // "all", "standard", "extended"

  const fetchStudentsWithGracePeriod = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const studentsQuery = query(collection(db, "students"), orderBy("fullName", "asc")); // Order by name
      const querySnapshot = await getDocs(studentsQuery);
      const studentsData = querySnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          fullName: data.fullName || 'N/A',
          class: data.class,
          shift: data.shift,
          // Fetch existing gracePeriodMinutes; it will be undefined if not set
          gracePeriodMinutes: data.gracePeriodMinutes === undefined ? null : data.gracePeriodMinutes,
          // Include other fields from Student interface if needed by your StudentWithGracePeriod type
        } as StudentWithGracePeriod;
      });
      setStudents(studentsData);
    } catch (err) {
      console.error("Error fetching students: ", err);
      setError("Failed to fetch students. Please try again.");
    }
    setLoading(false);
  }, []);


  useEffect(() => {
    fetchStudentsWithGracePeriod();
  }, [fetchStudentsWithGracePeriod]);

  const handleUpdateGracePeriod = async (studentId: string, newGraceMinutes: number | null) => {
    setFeedback(null); // Clear previous feedback
    setError(null);
    try {
      const studentRef = doc(db, "students", studentId);
      // If newGraceMinutes is null, it means we want to revert to the default behavior
      // (i.e., the scanner will use STANDARD_ON_TIME_GRACE_MINUTES).
      // Firestore doesn't store `null` in a way that distinguishes it from an absent field easily without extra logic.
      // So, we can either store a specific value for "standard" or remove the field.
      // For simplicity, let's just update the field. If it's standard, it will be treated as such by scanner later.
      // Or, better: if newGraceMinutes is what we consider standard, we could choose to *remove* the field.
      // For now, we just update it. The scanner logic will be: student.gracePeriodMinutes ?? STANDARD_ON_TIME_GRACE_MINUTES
      await updateDoc(studentRef, {
        gracePeriodMinutes: newGraceMinutes // This will set it to 15, 30, or potentially remove it if newGraceMinutes is null
                                            // and updateDoc handles null by removing. Firestore typically converts null to absent.
                                            // To explicitly remove, use deleteField() from "firebase/firestore"
      });

      setFeedback(`Grace period updated for student.`);
      // Refresh local student data to show the update immediately
      setStudents(prevStudents =>
        prevStudents.map(s =>
          s.id === studentId ? { ...s, gracePeriodMinutes: newGraceMinutes } : s
        )
      );
    } catch (err) {
      console.error("Error updating grace period: ", err);
      setError("Failed to update grace period. Please try again.");
    }
    setTimeout(() => setFeedback(null), 3000); // Clear feedback after 3s
  };

  const displayedStudents = useMemo(() => {
    let filtered = [...students]; // Start with a copy of all fetched students

    // Filter by name (case-insensitive)
    if (searchName.trim() !== "") {
        filtered = filtered.filter(student =>
        student.fullName.toLowerCase().includes(searchName.toLowerCase())
        );
    }

    // Filter by grace period type
    if (gracePeriodFilter === "standard") {
        filtered = filtered.filter(student =>
        student.gracePeriodMinutes === STANDARD_ON_TIME_GRACE_MINUTES ||
        student.gracePeriodMinutes == null || 
        student.gracePeriodMinutes === undefined
        );
    } else if (gracePeriodFilter === "extended") {
        filtered = filtered.filter(student =>
        student.gracePeriodMinutes === EXTENDED_GRACE_MINUTES
        );
    }
    // If gracePeriodFilter is "all", no additional grace period filtering is done on `filtered`

    return filtered;
    }, [students, searchName, gracePeriodFilter]);

  return (
    <SectionMain>
      <SectionTitleLineWithButton
        icon={mdiAccountClockOutline}
        title="Manage Student Grace Periods"
        main
      >
        <Button
            onClick={fetchStudentsWithGracePeriod}
            icon={mdiReload}
            label="Refresh List"
            color="info"
            small
        />
      </SectionTitleLineWithButton>

      {error && (
        <NotificationBar color="danger" icon={mdiAccountClockOutline} className="mb-4">
          {error}
        </NotificationBar>
      )}
      {feedback && (
        <NotificationBar color="success" icon={mdiAccountClockOutline} className="mb-4">
          {feedback}
        </NotificationBar>
      )}

      <CardBox className="mb-6 pl-2 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
          <FormField label="Search by Student Name" labelFor="searchNameInputManage">
            {(fd) => (
              <input
                type="text"
                id="searchNameInputManage"
                placeholder="Enter name..."
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                className={fd.className}
              />
            )}
          </FormField>

          <FormField label="Filter by Late Period" labelFor="graceFilterSelectManage">
            {(fd) => (
              <select
                id="graceFilterSelectManage"
                value={gracePeriodFilter}
                onChange={(e) => setGracePeriodFilter(e.target.value)}
                className={fd.className}
              >
                <option value="all">All Students</option>
                <option value="standard">Standard Late Only ({STANDARD_ON_TIME_GRACE_MINUTES} min)</option>
                <option value="extended">Extended Late Only ({EXTENDED_GRACE_MINUTES} min)</option>
              </select>
            )}
          </FormField>
        </div>
      </CardBox>

      {error && (
        <NotificationBar color="danger" icon={mdiAccountClockOutline} className="mb-4">
          {error}
        </NotificationBar>
      )}
      {feedback && (
        <NotificationBar color="success" icon={mdiAccountClockOutline} className="mb-4">
          {feedback}
        </NotificationBar>
      )}

      <CardBox className="mb-6 rounded-lg shadow" hasTable>
        {loading ? (
          <p className="p-6 text-center">Loading students...</p>
        ) : displayedStudents.length === 0 && !error ? (
          <NotificationBar color="warning" icon={mdiAccountClockOutline}>
            No students match your current filters.
          </NotificationBar>
        ) : (
          <TableManageGracePeriods
            students={displayedStudents}
            onUpdateGracePeriod={handleUpdateGracePeriod}
            standardGraceValue={STANDARD_ON_TIME_GRACE_MINUTES}
            extendedGraceValue={EXTENDED_GRACE_MINUTES}
          />
        )}
      </CardBox>
    </SectionMain>
  );
}