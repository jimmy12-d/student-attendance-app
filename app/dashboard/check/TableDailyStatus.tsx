"use client";

import React, { useState } from "react";
import { Timestamp } from "firebase/firestore";
import Button from "../../_components/Button"; // Adjust path as needed
import Buttons from "../../_components/Buttons"; // Adjust path as needed
import { Student } from "../../_interfaces"; // Assuming Student interface is in _interfaces

// Interface for the data this table will display
export interface DailyStudentStatus extends Student {
  attendanceDate: string; // The date for which the status is being shown
  attendanceStatus: "Present" | "Late" | "Absent" | "Unknown";
  actualTimestamp?: Timestamp | Date; // Timestamp of actual check-in if present
}

type Props = {
  statuses: DailyStudentStatus[]; // Array of student statuses
  perPage?: number;
};

// Function to format date (can be moved to a utils file if used elsewhere)
const formatDateToDDMMYYYY = (dateInput: string | Date | Timestamp | undefined): string => {
  if (!dateInput) return 'N/A';
  let dateObj: Date;

  if (typeof dateInput === 'string') {
    const parts = dateInput.split('-');
    if (parts.length === 3 && !isNaN(parseInt(parts[0])) && !isNaN(parseInt(parts[1])) && !isNaN(parseInt(parts[2]))) {
      dateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    } else {
      dateObj = new Date(dateInput);
    }
  } else if (dateInput instanceof Timestamp) {
    dateObj = dateInput.toDate();
  } else if (dateInput instanceof Date) {
    dateObj = dateInput;
  } else {
    return 'Invalid Date Type';
  }

  if (isNaN(dateObj.getTime())) {
    return 'Invalid Date';
  }

  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const year = dateObj.getFullYear();
  return `${day}-${month}-${year}`;
};

const TableDailyStatus: React.FC<Props> = ({ statuses, perPage = 10 }) => {
  const [currentPage, setCurrentPage] = useState(0);

  const statusesPaginated = statuses.slice(
    perPage * currentPage,
    perPage * (currentPage + 1)
  );

  const numPages = Math.ceil(statuses.length / perPage);
  const pagesList: number[] = [];
  for (let i = 0; i < numPages; i++) {
    pagesList.push(i);
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th>Student Name</th>
              <th>Class</th>
              <th>Shift</th>
              <th>Date</th>
              <th>Status</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {statusesPaginated.map((statusEntry: DailyStudentStatus) => (
              <tr key={statusEntry.id}>
                <td data-label="Student Name">{statusEntry.fullName}</td>
                <td data-label="Class">{statusEntry.class || 'N/A'}</td>
                <td data-label="Shift">{statusEntry.shift || 'N/A'}</td>
                <td data-label="Date" className="whitespace-nowrap">
                  {formatDateToDDMMYYYY(statusEntry.attendanceDate)}
                </td>
                <td data-label="Status">
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    statusEntry.attendanceStatus === 'Present' ? 'bg-green-200 text-green-800' :
                    statusEntry.attendanceStatus === 'Late' ? 'bg-yellow-100 text-yellow-800 border border-yellow-300' :
                    statusEntry.attendanceStatus === 'Absent' ? 'bg-red-200 text-red-800' :
                    'bg-gray-100 text-gray-800' // For "Unknown" or other statuses
                  }`}>
                    {statusEntry.attendanceStatus}
                  </span>
                </td>
                <td data-label="Time" className="whitespace-nowrap">
                  {(statusEntry.attendanceStatus === 'Present' || statusEntry.attendanceStatus === 'Late') && statusEntry.actualTimestamp
                    ? (statusEntry.actualTimestamp instanceof Timestamp
                        ? statusEntry.actualTimestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
                        : statusEntry.actualTimestamp instanceof Date
                        ? statusEntry.actualTimestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
                        : 'N/A')
                    : 'N/A'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
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
                isGrouped
              />
            ))}
          </Buttons>
          <small className="mt-6 md:mt-0">
            Page {currentPage + 1} of {numPages} (Total: {statuses.length} records)
          </small>
        </div>
      </div>
    </>
  );
};

export default TableDailyStatus;