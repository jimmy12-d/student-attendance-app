// Example path: app/dashboard/manage-excuses/TableManageGracePeriods.tsx
"use client";

import React, { useState } from "react";
import { Student } from "../../_interfaces"; // Adjust path to your Student interface
import Button from "../../_components/Button"; // Adjust path
import Buttons from "../../_components/Buttons"; // Adjust path
import { mdiContentSaveEditOutline, mdiCloseCircleOutline } from "@mdi/js"; // Icons

// Extend Student interface for this table's specific needs
export interface StudentWithGracePeriod extends Student {
  gracePeriodMinutes?: number | null; // Grace period in minutes from their Firestore doc
}

type Props = {
  students: StudentWithGracePeriod[];
  onUpdateGracePeriod: (studentId: string, newGraceTotalMinutes: number | null) => Promise<void>;
  // Define what your "standard" and "extended" grace periods mean in minutes
  standardGraceValue: number; // e.g., 15 (this is the default if student.gracePeriodMinutes is null/undefined)
  extendedGraceValue: number; // e.g., 30
  perPage?: number;
};

const TableManageGracePeriods: React.FC<Props> = ({
  students,
  onUpdateGracePeriod,
  standardGraceValue,
  extendedGraceValue,
  perPage = 15,
}) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  // Stores the string value from the select: "standard", "extended", or a custom number string
  const [selectedGraceOption, setSelectedGraceOption] = useState<string>("");

  const studentsPaginated = students.slice(
    perPage * currentPage,
    perPage * (currentPage + 1)
  );

  const numPages = Math.ceil(students.length / perPage);
  const pagesList: number[] = [];
  for (let i = 0; i < numPages; i++) {
    pagesList.push(i);
  }

  const handleEditClick = (student: StudentWithGracePeriod) => {
    setEditingStudentId(student.id);
    if (student.gracePeriodMinutes === extendedGraceValue) {
      setSelectedGraceOption(String(extendedGraceValue));
    } else { // Defaults to standard if null, undefined, or matches standardGraceValue
      setSelectedGraceOption(String(standardGraceValue));
    }
  };

  const handleSaveGracePeriod = async (studentId: string) => {
    const newGraceMinutes: number | null = parseInt(selectedGraceOption);

    if (isNaN(newGraceMinutes) || newGraceMinutes < 0) { // Basic validation
        alert("Invalid grace period value.");
        return;
    }

    // If newGraceMinutes matches the standard, you might choose to store null
    // to signify "use system default". For this example, we store the number.
    // if (newGraceMinutes === standardGraceValue) newGraceMinutes = null;

    setLoadingStateForStudent(studentId, true); // Optional: for per-row loading
    try {
      await onUpdateGracePeriod(studentId, newGraceMinutes);
    } catch (e) {
      // Handle error (e.g., show notification)
    } finally {
      setLoadingStateForStudent(studentId, false); // Optional
      setEditingStudentId(null);
    }
  };

  // Optional: for per-row loading state if updates are slow
  const [loadingStates, setLoadingStates] = useState<{ [key: string]: boolean }>({});
  const setLoadingStateForStudent = (studentId: string, isLoading: boolean) => {
    setLoadingStates(prev => ({ ...prev, [studentId]: isLoading }));
  };

  const graceOptions = [
    { label: `Standard (${standardGraceValue} min)`, value: String(standardGraceValue) },
    { label: `Extended (${extendedGraceValue} min)`, value: String(extendedGraceValue) },
    // You can add more predefined options if needed:
    // { label: `Special (45 min)`, value: "45" },
  ];

  return (
    <>
      <div className="overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Class</th>
              <th>Shift</th>
              <th>Late Period</th>
              <th className="w-1/4 md:w-1/3">Set Grace Period</th> 
            </tr>
          </thead>
          <tbody>
            {studentsPaginated.map((student) => (
              <tr key={student.id}>
                <td data-label="Name">{student.fullName}</td>
                <td data-label="Class">{student.class || 'N/A'}</td>
                <td data-label="Shift">{student.shift || 'N/A'}</td>
                <td data-label="Current Grace Period">
                <span
                    className={`px-3 py-1 inline-flex items-baseline text-xs leading-5 rounded-full whitespace-nowrap ${
                    student.gracePeriodMinutes === extendedGraceValue
                        ? 'bg-purple-100 text-purple-800 dark:bg-purple-700 dark:text-purple-100' // Pill style for Extended
                        : (student.gracePeriodMinutes === standardGraceValue || student.gracePeriodMinutes == null || student.gracePeriodMinutes === undefined)
                        ? 'bg-sky-100 text-sky-800 dark:bg-sky-700 dark:text-sky-100'       // Pill style for Standard/Default
                        : 'bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-200'      // Pill style for Custom or other values
                    }`}
                >
                    {student.gracePeriodMinutes === extendedGraceValue && (
                    <>
                        <span className="font-semibold">Extended</span>
                        <span className="ml-1 font-normal opacity-80">({extendedGraceValue} min)</span>
                    </>
                    )}
                    {(student.gracePeriodMinutes === standardGraceValue || student.gracePeriodMinutes == null || student.gracePeriodMinutes === undefined) && (
                    <>
                        <span className="font-semibold">Standard</span>
                        <span className="ml-1 font-normal opacity-80">({standardGraceValue} min)</span>
                    </>
                    )}
                    {typeof student.gracePeriodMinutes === 'number' &&
                    student.gracePeriodMinutes !== extendedGraceValue &&
                    student.gracePeriodMinutes !== standardGraceValue && (
                    <>
                        <span className="font-semibold">{student.gracePeriodMinutes} min</span>
                        <span className="ml-1 font-normal opacity-80">(Custom)</span>
                    </>
                    )}
                </span>
                </td>
                <td data-label="Set Late Period">
                  {editingStudentId === student.id ? (
                    <div className="flex items-center space-x-1 sm:space-x-2">
                      <select
                        value={selectedGraceOption}
                        onChange={(e) => setSelectedGraceOption(e.target.value)}
                        className="input text-xs sm:text-sm py-1 px-1 sm:px-2 w-full dark:bg-slate-700"
                      >
                        {graceOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                      <Button
                        color="success"
                        icon={mdiContentSaveEditOutline}
                        onClick={() => handleSaveGracePeriod(student.id)}
                        small
                        disabled={loadingStates[student.id]}
                      />
                      <Button
                        icon={mdiCloseCircleOutline}
                        onClick={() => setEditingStudentId(null)}
                        small
                        color="lightDark"
                        outline
                         disabled={loadingStates[student.id]}
                      />
                    </div>
                  ) : (
                    <Button
                      color="info"
                      label="Change"
                      onClick={() => handleEditClick(student)}
                      small
                      outline
                    />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
        <div className="p-3 lg:px-6 border-t border-gray-100 dark:border-slate-800">
          <div className="flex flex-col md:flex-row items-center justify-between py-3 md:py-0">
            <Buttons>
              {pagesList.map((page) => (
                <Button
                  key={page}
                  active={page === currentPage}
                  label={(page + 1).toString()}
                  color={page === currentPage ? "lightDark" : "whiteDark"}
                  small
                  onClick={() => setCurrentPage(page)}
                  isGrouped // Assuming your Button component handles this for styling adjacent buttons
                />
              ))}
            </Buttons>
            <small className="mt-6 md:mt-0">
              Page {currentPage + 1} of {numPages} (Total: {students.length} students)
            </small>
          </div>
        </div>
    </>
  );
};

export default TableManageGracePeriods;