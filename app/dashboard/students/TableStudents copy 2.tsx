"use client";

import { mdiDownload, mdiPencil, mdiTrashCan, mdiQrcode } from "@mdi/js"; // Changed mdiEye to mdiQrcode for the button
import React, { useState } from "react";
import { Student } from "../../_interfaces";
import Button from "../../_components/Button";
import Buttons from "../../_components/Buttons";
import CardBoxModal from "../../_components/CardBox/Modal";
import StudentQRCode from "./StudentQRCode"; // <-- Import StudentQRCode
import ReactDOMServer from 'react-dom/server'; // For generating SVG string
import QRCode from "react-qr-code"; // To render QR for download logic
import { toPng } from 'html-to-image';

// Removed formatDate and Timestamp import as they are not used in this modal anymore

type Props = {
  students: Student[];
  onEdit: (student: Student) => void;
  onDelete: (student: Student) => void;
  // No longer need onShowQr explicitly if we handle it within this component's modal
};

const TableStudents = ({ students, onEdit, onDelete }: Props) => {
  const perPage = 5;
  const [currentPage, setCurrentPage] = useState(0);

  const studentsPaginated = students.slice(
    perPage * currentPage,
    perPage * (currentPage + 1)
  );

  const numPages = Math.ceil(students.length / perPage);
  const pagesList: number[] = [];
  for (let i = 0; i < numPages; i++) {
    pagesList.push(i);
  }

  const [isQrModalActive, setIsQrModalActive] = useState(false); // Renamed for clarity
  const [selectedStudentForQr, setSelectedStudentForQr] = useState<Student | null>(null);

  const handleShowQrCode = (student: Student) => {
    setSelectedStudentForQr(student);
    setIsQrModalActive(true);
  };

    const handleDownloadQR = (student: Student) => {
    // Render the QRCode component to an SVG string
    // Note: This will render the QR code WITHOUT the overlaid logo from StudentQRCode component
    // as that logo is positioned via CSS over the component.
    const svgString = ReactDOMServer.renderToStaticMarkup(
      <QRCode
        value={student.id}
        size={256} // Standard size for download, can be adjusted
        level="H"  // High error correction
        bgColor="#FFFFFF"
        fgColor="#000000"
      />
    );

    // Ensure proper SVG XML declaration and xmlns attributes for wider compatibility
    let wellFormedSvgString = svgString;
    if (!wellFormedSvgString.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)) {
      wellFormedSvgString = wellFormedSvgString.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
    }
    wellFormedSvgString = '<?xml version="1.0" standalone="no"?>\r\n' + wellFormedSvgString;

    const blob = new Blob([wellFormedSvgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const fileName = `${student.fullName.replace(/\s+/g, '_')}_QR.svg`; // e.g., Kemout_QR.svg
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url); // Clean up
  };

  return (
    <>
      {/* Modal to Display Student QR Code */}
      <CardBoxModal
        title={`QR Code for ${selectedStudentForQr?.fullName || "Student"}`}
        buttonColor="info"
        buttonLabel="Done"
        isActive={isQrModalActive}
        onConfirm={() => setIsQrModalActive(false)}
      >
        {selectedStudentForQr && (
          <StudentQRCode
            studentId={selectedStudentForQr.id}
            studentName={selectedStudentForQr.fullName}
            size={250} // You can adjust the size
          />
        )}
      </CardBoxModal>

      <div className="overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Class</th>
              <th>Shift</th>
              <th className="whitespace-nowrap px-2 md:px-4 w-auto md:w-40">QR Actions</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {studentsPaginated.map((student: Student) => (
              <tr key={student.id}>
                <td data-label="Name">{student.fullName}</td>
                <td data-label="Class">{student.class}</td>
                <td data-label="Shift">{student.shift}</td>
                <td data-label="QR Actions" className="whitespace-nowrap">
                  <Buttons> {/* Use Buttons component to group them nicely */}
                    <Button
                      color="info"
                      icon={mdiQrcode} // Icon for viewing
                      onClick={() => handleShowQrCode(student)}
                      small     
                      isGrouped           
                    />
                    <Button                
                      icon={mdiDownload}
                      onClick={() => handleDownloadQR(student)}
                      small
                      isGrouped
                    />
                  </Buttons>
                </td>
                <td className="before:hidden lg:w-1 whitespace-nowrap">
                  <Buttons type="justify-start lg:justify-end" noWrap>
                    <Button
                      color="success"
                      icon={mdiPencil}
                      onClick={() => onEdit(student)}
                      small
                      isGrouped
                    />
                    <Button
                      color="danger"
                      icon={mdiTrashCan}
                      onClick={() => onDelete(student)}
                      small
                      isGrouped
                    />
                  </Buttons>
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
            Page {currentPage + 1} of {numPages} (Total: {students.length} students)
          </small>
        </div>
      </div>
    </>
  );
};

export default TableStudents;