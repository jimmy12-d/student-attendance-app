// app/dashboard/_components/CardBoxAttendanceWarning.tsx
"use client";

import React, { useState } from "react";
import CardBox from "../../_components/CardBox"; // Adjust path
import PillTag from "../../_components/PillTag"; // Adjust path
import { StudentAttendanceWarning } from "../page"; // Import from dashboard page
import { Student } from "../../_interfaces"; // To pass student data to modal
import { AllClassConfigs } from "../_lib/configForAttendanceLogic"; // Import this
import DailyStatusDetailsModal from "./DailyStatusDetailsModal"; // We will create this new component
import { mdiEye } from "@mdi/js";

interface Props {
  warning: StudentAttendanceWarning;
  student: Student; // Pass the full student object
  allAttendanceRecordsForStudent: any[]; // Pass attendance specific to this student
  allClassConfigs: AllClassConfigs | null;
}

const CardBoxAttendanceWarning: React.FC<Props> = ({ warning, student, allAttendanceRecordsForStudent, allClassConfigs }) => {
  const [isDetailModalActive, setIsDetailModalActive] = useState(false);

  const getPillColor = () => {
    if (warning.warningType === "totalLate") return "warning";
    if (warning.warningType === "consecutiveAbsence") return "danger";
    if (warning.warningType === "totalAbsence") return "danger";
    return "info";
  };

  const handleViewDetails = () => {
    setIsDetailModalActive(true);
  };

  return (
    <>
      <CardBox className="pb-2 pt-1 pl-2 last:mb-0">
        <div className="flex flex-col sm:flex-row items-center justify-between">
          <div className="flex-grow text-center sm:text-left overflow-hidden mb-4 sm:mb-0 sm:mr-3"> {/* Reduced mr */}
            <h4 className="text-lg font-semibold truncate">{warning.fullName}</h4>
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Class: {warning.class || "N/A"} {warning.shift || "N/A"}
            </p>
          </div>
          
          <div className="flex items-center space-x-2"> {/* Wrapper for pill and eye button */}
            <button
              type="button" // Good practice for buttons not submitting forms
              onClick={handleViewDetails}
className="p-1 rounded-full transition-all duration-200 ease-in-out text-red-600 dark:text-red-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-75 hover:bg-red-500/20 dark:hover:bg-red-500/30 hover:shadow-md hover:shadow-red-400/30 dark:hover:shadow-md dark:hover:shadow-red-400/20"
              title="View Attendance Details" // Tooltip for the button
            >
              <PillTag
                color={getPillColor()} // This styles the pill itself
                label={warning.details || `${warning.value}`}
                icon={mdiEye} // PillTag will display this icon
                // small={false} // To ensure text-sm for label if not default
                // labelClassName="text-sm font-semibold" // Example if you used this for label size
                // onIconClick={handleViewDetails} // If you wanted only icon clickable, now whole button is
                className="truncate pointer-events-none" // pointer-events-none so pill doesn't interfere with button's click
              />
            </button>
          </div>
         
        </div>
      </CardBox>

      {isDetailModalActive && student && allClassConfigs && ( // Ensure data is ready for modal
        <DailyStatusDetailsModal
          student={student}
          attendanceRecords={allAttendanceRecordsForStudent}
          allClassConfigs={allClassConfigs}
          isActive={isDetailModalActive}
          onClose={() => setIsDetailModalActive(false)}
        />
      )}
    </>
  );
};

export default CardBoxAttendanceWarning;