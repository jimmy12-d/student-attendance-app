// app/dashboard/check/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { mdiMagnify, mdiReload } from "@mdi/js";
import SectionMain from "../../_components/Section/Main";
import SectionTitleLineWithButton from "../../_components/Section/TitleLineWithButton";
import CardBox from "../../_components/CardBox";
import NotificationBar from "../../_components/NotificationBar";
import TableAttendance, { AttendanceRecord } from "../record/TableAttendance"; // Assuming path is correct
import Button from "../../_components/Button";
import FormField from "../../_components/FormField"; // Use THIS component
// REMOVE THIS LINE if Field.tsx doesn't exist or isn't what you intend to use:
// import Field from "../../_components/FormField/Field";

// Firebase
import { db } from "../../../firebase-config";
import { collection, getDocs, query, where, orderBy, Timestamp } from "firebase/firestore";

const getTodayDateString = () => {
  const today = new Date();
  // Format as YYYY-MM-DD for input[type="date"]
  return today.toISOString().slice(0, 10);
};

export default function CheckAttendancePage() {
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedShift, setSelectedShift] = useState<string>("");
  const [searchName, setSearchName] = useState<string>("");
  const [filteredRecords, setFilteredRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const classOptions = ["All", "10A", "10B", "11A", "11B", "12A", "12B"];
  const shiftOptions = ["All", "Morning", "Afternoon", "Evening"];

  const fetchAndFilterAttendance = useCallback(async () => { /* ... your existing logic ... */ }, 
    [selectedDate, selectedClass, selectedShift, searchName]
  );

  const showFeedback = (type: 'error' | 'info', text: string) => { /* ... your existing logic ... */ };

  const handleSearch = () => {
      fetchAndFilterAttendance();
  };

  return (
    <SectionMain>
      <SectionTitleLineWithButton
        icon={mdiMagnify}
        title="Check Attendance Records"
        main
      />

      <CardBox className="mb-6 p-6 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4 items-end">
          {/* Date Filter */}
          <FormField label="Date" labelFor="filterDate">
            {(fieldData) => ( // Children as a function
              <input
                type="date"
                id="filterDate"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                // Use className from fieldData or your custom 'input' class
                // fieldData.className already includes focus, border, bg, etc.
                className={fieldData.className}
                // If you want to add more custom classes: `${fieldData.className} your-extra-class`
                // Or if you want to ignore fieldData.className and use your own: className="input"
              />
            )}
          </FormField>

          {/* Class Filter */}
          <FormField label="Class" labelFor="filterClass">
            {(fieldData) => (
              <select
                id="filterClass"
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className={fieldData.className} // Use styles from FormField
              >
                {classOptions.map(opt => <option key={opt} value={opt === "All" ? "" : opt}>{opt}</option>)}
              </select>
            )}
          </FormField>

          {/* Shift Filter */}
          <FormField label="Shift" labelFor="filterShift">
            {(fieldData) => (
              <select
                id="filterShift"
                value={selectedShift}
                onChange={(e) => setSelectedShift(e.target.value)}
                className={fieldData.className} // Use styles from FormField
              >
                {shiftOptions.map(opt => <option key={opt} value={opt === "All" ? "" : opt}>{opt}</option>)}
              </select>
            )}
          </FormField>

          {/* Name Search */}
          <FormField label="Student Name" labelFor="filterName">
            {(fieldData) => (
              <input
                type="text"
                id="filterName"
                placeholder="Enter student name..."
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                className={fieldData.className} // Use styles from FormField
              />
            )}
          </FormField>
        </div>
        <div className="flex justify-start">
          <Button
            label="Search / Refresh"
            color="info"
            icon={searchName || selectedClass || selectedShift ? mdiMagnify : mdiReload} // Dynamic icon
            onClick={handleSearch}
            disabled={loading || !selectedDate}
          />
        </div>
      </CardBox>

      {/* ... rest of your page (error, table rendering) ... */}
      {error && (
        <NotificationBar color="danger" icon={mdiMagnify} className="mb-4">
          {error}
        </NotificationBar>
      )}

      <CardBox className="mb-6 rounded-lg shadow" hasTable>
        {loading ? ( <p>test</p> ) :  <p>test</p>  }
      </CardBox>
    </SectionMain>
  );
}