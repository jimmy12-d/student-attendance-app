// app/dashboard/permissions/_components/TablePermissions.tsx
"use client";

import React, { useState } from "react";
import { Timestamp } from "firebase/firestore"; // <-- Make sure Timestamp is imported
import { PermissionRecord } from "../../_interfaces";
import Button from "../../_components/Button";
import Buttons from "../../_components/Buttons";
import { mdiCheck, mdiClose } from "@mdi/js";

type Props = {
  permissions: PermissionRecord[];
  onUpdateRequest: (permissionId: string, newStatus: 'approved' | 'rejected') => void;
};

// VVVV ADD A HELPER FUNCTION TO FORMAT TIMESTAMPS VVVV
const formatTimestampToDayMonth = (timestamp: Timestamp | undefined): string => {
  if (!timestamp) {
    return 'N/A';
  }
  // Convert Firestore Timestamp to JavaScript Date, then format it
       return timestamp.toDate().toLocaleString('default', { 
       day: 'numeric', 
       month: 'long' 
    }); // This will output formats like "6 July"
    };

const TablePermissions: React.FC<Props> = ({ permissions, onUpdateRequest }) => {
  const [currentPage, setCurrentPage] = useState(0);
  const perPage = 10;
  const permissionsPaginated = permissions.slice(perPage * currentPage, perPage * (currentPage + 1));

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
          <th>Class</th>
          <th>Requested Dates</th>
          <th>Reason</th>
          <th>Details</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {permissionsPaginated.map((permission) => (
          <tr key={permission.id}>
            <td data-label="Student Name">{permission.studentName}</td>
            <td data-label="Class">All 12 A</td>
            <td data-label="Dates" className="whitespace-nowrap">
              {formatTimestampToDayMonth(permission.permissionStartDate)} to {permission.permissionEndDate}
            </td>
            <td data-label="Reason">{permission.reason}</td>
            {/* VVVV RENDER THE FORMATTED TIMESTAMP HERE VVVV */}
            <td data-label="Details">
            <div className="flex flex-col">
                <small className="text-gray-500 dark:text-slate-400 whitespace-nowrap" title={`Requested on ${permission.requestDate.toDate().toLocaleString()}`}>
                {formatTimestampToDayMonth(permission.requestDate)}
                </small>
                <span className="text-sm text-ellipsis overflow-hidden whitespace-nowrap max-w-[200px] block" title={permission.details}>
                {permission.details}
                </span>
            </div>
            </td>
            {/* ^^^^ END OF TIMESTAMP RENDERING ^^^^ */}
            <td data-label="Status">
              <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusPillColor(permission.status)}`}>
                {permission.status}
              </span>
            </td>
            <td className="before:hidden lg:w-1 whitespace-nowrap">
              {permission.status === 'pending' && (
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
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default TablePermissions;