// app/dashboard/students/TableStudents.tsx
"use client";

import { mdiQrcode, mdiPencil, mdiTrashCan, mdiDownload } from "@mdi/js";
import React, { useState, useRef } from "react";
import { Student } from "../../_interfaces";
import Button from "../../_components/Button";
import Buttons from "../../_components/Buttons";
import CardBoxModal from "../../_components/CardBox/Modal";
import StudentQRCode from "./StudentQRCode";

import { toPng } from 'html-to-image';

type Props = {
  students: Student[];
  onEdit: (student: Student) => void;
  onDelete: (student: Student) => void;
};

const TableStudents = ({ students, onEdit, onDelete }: Props) => {
  const perPage = 5;
  const [currentPage, setCurrentPage] = useState(0);

  // **** MOVE THESE CALCULATIONS INSIDE THE COMPONENT ****
  const studentsPaginated = students.slice(
    perPage * currentPage,
    perPage * (currentPage + 1)
  );

  const numPages = Math.ceil(students.length / perPage);
  const pagesList: number[] = [];
  for (let i = 0; i < numPages; i++) {
    pagesList.push(i);
  }
  // ******************************************************

  const [isQrModalActive, setIsQrModalActive] = useState(false);
  const [selectedStudentForQr, setSelectedStudentForQr] = useState<Student | null>(null);
  const offscreenQrContainerRef = useRef<HTMLDivElement>(null);
  const [studentToDownload, setStudentToDownload] = useState<Student | null>(null);

  const handleShowQrCode = (student: Student) => {
    setSelectedStudentForQr(student);
    setIsQrModalActive(true);
  };

  const handleDownloadQR = async (student: Student) => {
    if (!student) return;
    setStudentToDownload(student);

    setTimeout(async () => {
      if (offscreenQrContainerRef.current && offscreenQrContainerRef.current.firstChild) {
        const nodeToCapture = offscreenQrContainerRef.current.firstChild as HTMLElement;
        try {
          const dataUrl = await toPng(nodeToCapture, {
            cacheBust: true,
            pixelRatio: 2,
            style: {
                display: 'inline-block',
                backgroundColor: 'white',
            },
          });
          const link = document.createElement('a');
          link.download = `${student.fullName.replace(/\s+/g, '_')}_QR.png`;
          link.href = dataUrl;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } catch (err) {
          console.error('QR Code download failed:', err);
          alert('Failed to download QR code as PNG. See console for details.');
        } finally {
          setStudentToDownload(null);
        }
      } else {
        console.error('Off-screen QR node not found for capture. Ref or firstChild is null.');
        alert('Failed to prepare QR code for download. Please try again.');
        setStudentToDownload(null);
      }
    }, 150);
  };

  return (
    <>
      {/* Modal for Viewing QR Code */}
      <CardBoxModal
        title={`QR Code for ${selectedStudentForQr?.fullName || "Student"}`}
        buttonColor="info"
        buttonLabel="Done"
        isActive={isQrModalActive}
        onConfirm={() => setIsQrModalActive(false)}
      >
        {selectedStudentForQr && (
          <div className="flex flex-col items-center justify-center w-full">
            <StudentQRCode
              studentId={selectedStudentForQr.id}
              studentName={selectedStudentForQr.fullName}
              size={200}
            />
          </div>
        )}
      </CardBoxModal>

      {/* Off-screen rendering container */}
      <div
        ref={offscreenQrContainerRef}
        style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}
        aria-hidden="true"
      >
        {studentToDownload && (
          <StudentQRCode
            studentId={studentToDownload.id}
            studentName={studentToDownload.fullName}
            size={300}
            logoSizePercentage={0.25}
            isForDownloadCapture={true} 
          />
        )}
      </div>

      <div className="overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Class</th>
              <th className="w-32">Shift</th>
              <th className="whitespace-nowrap px-2 md:px-4 w-auto md:w-40">QR Actions</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {/* Ensure studentsPaginated is used here */}
            {studentsPaginated.map((student: Student) => (
              <tr key={student.id}>
                <td data-label="Name">{student.fullName}</td>
                <td data-label="Class">{student.class}</td>
                <td data-label="Shift" className="w-32">{student.shift}</td>
                <td data-label="QR Actions" className="whitespace-nowrap">
                  <Buttons>
                    <Button
                      color="info"
                      icon={mdiQrcode}
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
                    <Button color="success" icon={mdiPencil} onClick={() => onEdit(student)} small isGrouped />
                    <Button color="danger" icon={mdiTrashCan} onClick={() => onDelete(student)} small isGrouped />
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
            {/* Ensure pagesList is used here */}
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
          {/* Ensure numPages is used here */}
          <small className="mt-6 md:mt-0">
            Page {currentPage + 1} of {numPages} (Total: {students.length} students)
          </small>
        </div>
      </div>
    </>
  );
};

export default TableStudents;