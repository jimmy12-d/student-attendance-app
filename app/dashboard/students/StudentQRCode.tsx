// app/dashboard/students/StudentQRCode.tsx
import React from 'react';
import QRCode from "react-qr-code";
import RodwellLogo from "../../_components/JustboilLogo";

interface Props {
  studentId: string;
  studentName?: string;
  size?: number;
  logoSizePercentage?: number;
  isForDownloadCapture?: boolean; // <-- New prop
}

const StudentQRCode: React.FC<Props> = ({
  studentId,
  studentName,
  size: qrVisualSize = 128,
  logoSizePercentage = 0.30,
  isForDownloadCapture = false, // <-- Default to false
}) => {
  if (!studentId) {
    return <p className="text-center text-red-500 text-xs">ID missing for QR.</p>;
  }

  const logoDimension = Math.floor(qrVisualSize * logoSizePercentage);

  // Determine name color based on the new prop
  const nameColorClass = isForDownloadCapture
    ? "text-black" // Black for download
    : "text-gray-700 dark:text-gray-200"; // Original style for modal view (adjust if your modal view needs white text explicitly)

  return (
    // Ensure this outer div has a white background for consistent PNG download
    <div className={`text-center p-2 inline-block ${isForDownloadCapture ? 'bg-white' : ''} rounded-md`}>
      {studentName && (
        <h3 className={`text-lg font-semibold ${nameColorClass} mb-3`}>
          {studentName}
        </h3>
      )}
      <div
        style={{
          position: 'relative',
          width: qrVisualSize,
          height: qrVisualSize,
          margin: '0 auto',
          background: 'white', // QR code background itself should always be white
          padding: '8px',
          boxSizing: 'content-box',
        }}
        className="rounded-md shadow" // Shadow primarily for modal view
      >
        <QRCode
          value={studentId}
          size={qrVisualSize}
          level="H"
          bgColor="#FFFFFF"
          fgColor="#000000"
          style={{ display: 'block' }}
        />
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'white',
            padding: '3px',
            boxSizing: 'border-box',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: logoDimension,
            height: logoDimension,
          }}
        >
          <RodwellLogo
            width={logoDimension}
            height={logoDimension}
          />
        </div>
      </div>
    </div>
  );
};

export default StudentQRCode;