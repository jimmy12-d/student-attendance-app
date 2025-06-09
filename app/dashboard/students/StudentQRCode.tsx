// app/dashboard/students/StudentQRCode.tsx
"use client";

import React from 'react';
import { QRCodeSVG } from "qrcode.react"; // Changed from 'QRCode' to 'QRCodeSVG' for direct SVG rendering
import RodwellLogo from "../../_components/JustboilLogo"; // Ensure path is correct

interface Props {
  studentId: string;
  studentName?: string;
  qrSize?: number; // Prop to control the size of the QR code canvas
  logoSizePercentage?: number;
  isForDownloadCapture?: boolean;
}

const StudentQRCode: React.FC<Props> = ({
  studentId,
  studentName,
  qrSize = 200, // Default QR size (e.g., 200px)
  
}) => {
  if (!studentId) {
    return <p className="text-center text-red-500 text-xs">ID missing for QR.</p>;
  }

  // Calculate logo size relative to QR code size
  const logoDimension = Math.floor(qrSize * 0.25); // Logo will be 25% of the QR code size

    return (
    // VVVV THIS IS THE MAIN CONTAINER VVVV
    // inline-block so it sizes to its content
    // rounded-xl for the main corner radius
    // overflow-hidden is CRITICAL for clipping child corners
    // shadow-lg for the card effect
    <div className="inline-block rounded-xl overflow-hidden shadow-lg bg-white">
      
      {/* 1. Purple Header Section */}
      <div className="bg-purple-800 p-2 text-center">
        {studentName && (
          <h3 className="text-lg font-bold text-white truncate" title={studentName}>
            {studentName}
          </h3>
        )}
      </div>

      {/* 2. White QR Code Section */}
      <div className="bg-white p-2 flex flex-col items-center">
        {/* VVVV THIS DIV WRAPS THE QR CODE FOR ROUNDED CORNERS VVVV */}
        {/* We add rounded-md here to the QR code wrapper itself */}
        <div
          className="rounded-lg shadow-inner bg-white p-2" // Add padding inside this wrapper
          style={{
            position: 'relative',
            width: qrSize,
            height: qrSize,
          }}
        >
          <QRCodeSVG
            value={studentId}
            size={qrSize - 16} // Subtract padding from size for the QR code itself
            bgColor={"#ffffff"}
            fgColor={"#000000"}
            level={"H"}
            style={{ display: 'block', width: '100%', height: '100%' }}
          />
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: 'white',
              padding: '4px',
              borderRadius: '6px',
              boxSizing: 'border-box',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: logoDimension,
              height: logoDimension,
            }}
          >
            <RodwellLogo
              width={logoDimension - 8}
              height={logoDimension - 8}
            />
          </div>
        </div>
        {/* ^^^^ END OF QR CODE WRAPPER ^^^^ */}
      </div>
    </div>
    // ^^^^ END OF MAIN CONTAINER ^^^^
  );
};

export default StudentQRCode;