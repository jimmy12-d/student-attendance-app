// app/dashboard/permissions/_components/TablePermissions.tsx
"use client";

import React from "react";
import { Timestamp } from "firebase/firestore"; // Ensure Timestamp is imported
import { PermissionRecord } from "../../_interfaces"; // Or your correct path
import Button from "../../_components/Button";
import Buttons from "../../_components/Buttons";
import { mdiCheck, mdiClose } from "@mdi/js";

// This should now be the 'EnrichedPermissionRecord' if you added class/shift
// For this component, let's assume the prop is this type:
interface EnrichedPermissionRecord extends PermissionRecord {
  class?: string;
  shift?: string;
}

type Props = {
  permissions: EnrichedPermissionRecord[];
  onUpdateRequest: (permissionId: string, newStatus: 'approved' | 'rejected') => void;
};

// Renamed and updated the formatter function
const formatTimestampToDayMonth = (timestamp?: Timestamp): string => {
  if (!timestamp) {
    return 'N/A';
  }
  // Convert Firestore Timestamp to JavaScript Date, then format it
  return timestamp.toDate().toLocaleString('default', { 
    day: 'numeric', 
    month: 'long' 
  }); // This will output formats like "6 July"
};

const formatDateStringToDayMonth = (dateStr?: string): string => {
  if (!dateStr) return 'N/A';
  // "YYYY-MM-DD" split is a reliable way to create a Date object correctly
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr; // Return original string if format is wrong

  const year = parseInt(parts[0]);
  const month = parseInt(parts[1]) - 1; // Month is 0-indexed for new Date()
  const day = parseInt(parts[2]);

  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    return dateStr; // Return original if parsing fails
  }

  const date = new Date(year, month, day);
  return date.toLocaleString('default', { day: '2-digit', month: 'long' }); // e.g., "06 July"
};

const TablePermissions: React.FC<Props> = ({ permissions, onUpdateRequest }) => {
    
  const getStatusPillColor = (status: string) => {
    if (status === 'approved') return 'bg-green-100 text-green-800';
    if (status === 'rejected') return 'bg-red-100 text-red-800';
    if (status === 'pending') return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <table>
      <thead>
        <tr>
          <th>Student Name</th>
          <th>Class & Shift</th>
          <th>Permission Dates</th>
          <th>Reason</th>
          <th>Details</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {permissions.map((permission) => (
          <tr key={permission.id}>
            <td data-label="Student Name">{permission.studentName}</td>
            <td data-label="Class & Shift" className="whitespace-nowrap">
              {permission.class || "N/A"} - {permission.shift || "N/A"}
            </td>
            <td data-label="Permission Dates" className="whitespace-nowrap">
              {formatDateStringToDayMonth(permission.permissionStartDate)} to {formatDateStringToDayMonth(permission.permissionEndDate)}
            </td>
            <td data-label="Reason">{permission.reason}</td>
            
            {/* VVVV 2. MODIFIED "DETAILS" COLUMN CONTENT VVVV */}
            <td data-label="Details">
              <div className="flex flex-col text-left"> {/* Aligned left */}
                <span 
                  className="text-sm text-ellipsis overflow-hidden whitespace-nowrap max-w-[200px] block" 
                  title={permission.details}
                >
                  {permission.details || <span className="text-gray-400 dark:text-slate-500">No details</span>}
                </span>
                <small className="text-gray-500 dark:text-slate-400 whitespace-nowrap" title={`Requested on ${permission.requestDate.toDate().toLocaleString()}`}>
                  Req: {formatTimestampToDayMonth(permission.requestDate)}
                </small>
              </div>
            </td>
            {/* ^^^^ END OF MODIFIED "DETAILS" COLUMN ^^^^ */}

            <td data-label="Status" className="text-center">
              <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusPillColor(permission.status)}`}>
                {permission.status && permission.status.charAt(0).toUpperCase() + permission.status.slice(1)}
              </span>
            </td>
            <td className="before:hidden lg:w-1 whitespace-nowrap">
                <Buttons type="justify-start lg:justify-end" noWrap>
                  <Button
                    color="success"
                    icon={mdiCheck}
                    onClick={() => onUpdateRequest(permission.id, 'approved')}
                    small
                    isGrouped
                  />
                  <Button
                    color="danger"
                    icon={mdiClose}
                    onClick={() => onUpdateRequest(permission.id, 'rejected')}
                    small
                    isGrouped
                  />
                </Buttons>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default TablePermissions;