"use client";

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeCameraScanConfig } from 'html5-qrcode'; // Html5QrcodeResult removed from import if not used
import { db } from '../../../firebase-config';
import { collection, addDoc, query, where, getDocs, serverTimestamp, doc, getDoc, Timestamp } from 'firebase/firestore';
import { Student } from '../../_interfaces';
import CardBox from "../../_components/CardBox";

const VIDEO_ELEMENT_CONTAINER_ID = "qr-video-reader-container";
const SCAN_COOLDOWN_MS = 3000;
const FEEDBACK_DISPLAY_MS = 3000;

const AttendanceScanner: React.FC = () => {
  const [scannedStudentInfo, setScannedStudentInfo] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const lastScannedIdCooldownRef = useRef<string | null>(null);
  const cooldownTimerIdRef = useRef<NodeJS.Timeout | null>(null);
  const feedbackTimerIdRef = useRef<NodeJS.Timeout | null>(null);
  const successSoundRef = useRef<HTMLAudioElement | null>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof Audio !== "undefined") {
      try {
        const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
        const soundFilePath = `${basePath}/success_sound_2.mp3`; // Ensure this is in /public
        successSoundRef.current = new Audio(soundFilePath);
        console.log("base: ", basePath);
        console.log("Audio initialized with src:", soundFilePath);
      } catch (e) { console.warn("Could not initialize audio:", e); }
    }
  }, []);

  useEffect(() => { // Separate useEffect for timer cleanups on unmount
    return () => {
      if (feedbackTimerIdRef.current) clearTimeout(feedbackTimerIdRef.current);
      if (cooldownTimerIdRef.current) clearTimeout(cooldownTimerIdRef.current);
    };
  }, []);

  const playSuccessSound = useCallback(() => { /* ... your existing correct logic ... */ 
    if (successSoundRef.current) {
      successSoundRef.current.currentTime = 0;
      successSoundRef.current.play().catch(error => console.warn("Error playing sound:", error));
    }
  }, []);

  const showFeedback = useCallback((type: 'success' | 'error' | 'info', text: string) => { /* ... your existing correct logic ... */ 
    setFeedbackMessage({ type, text });
    if (feedbackTimerIdRef.current) clearTimeout(feedbackTimerIdRef.current);
    feedbackTimerIdRef.current = setTimeout(() => {
      setFeedbackMessage(null);
      setScannedStudentInfo(null);
    }, FEEDBACK_DISPLAY_MS);
  }, []);

  const onScanSuccess = useCallback(async (decodedText: string /*, result: any */) => { /* ... your existing correct logic ... */ 
    if (lastScannedIdCooldownRef.current === decodedText) return;
    lastScannedIdCooldownRef.current = decodedText;
    if (cooldownTimerIdRef.current) clearTimeout(cooldownTimerIdRef.current);
    cooldownTimerIdRef.current = setTimeout(() => { lastScannedIdCooldownRef.current = null; }, SCAN_COOLDOWN_MS);

    console.log(`QR Scanned - Raw: ${decodedText}`);
    const urlPattern = new RegExp('^(https?|ftp|file)://[-A-Z0-9+&@#/%?=~_|!:,.;]*[-A-Z0-9+&@#/%=~_|]', 'i');
    if (urlPattern.test(decodedText)) {
      showFeedback('error', `Scanned a URL. Please scan a valid Student ID QR code.`);
      return;
    }
    const firestoreIdPattern = /^[a-zA-Z0-9]{15,25}$/;
    if (!firestoreIdPattern.test(decodedText) || decodedText.includes('/') || decodedText.includes('.')) {
      showFeedback('error', `Invalid Student ID format: ${decodedText.substring(0, 30)}...`);
      return;
    }

    try {
      const studentDocRef = doc(db, "students", decodedText);
      const studentSnap = await getDoc(studentDocRef);
      if (!studentSnap.exists()) {
        showFeedback('error', `Student ID [${decodedText}] not found.`);
        return;
      }
      const studentData = { id: studentSnap.id, ...studentSnap.data() } as Student;
      setScannedStudentInfo(`${studentData.fullName} (Class: ${studentData.class || 'N/A'})`);

      const today = new Date();
      const dateString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const attendanceQuery = query(collection(db, "attendance"), where("studentId", "==", decodedText), where("date", "==", dateString));
      const attendanceSnapshot = await getDocs(attendanceQuery);

      if (!attendanceSnapshot.empty) {
        showFeedback('info', `${studentData.fullName} is already marked present for ${dateString}.`);
        return;
      }
      await addDoc(collection(db, "attendance"), {
        studentId: decodedText, studentName: studentData.fullName, class: studentData.class || null,
        shift: studentData.shift || null, date: dateString, timestamp: serverTimestamp(), status: "present",
      });
      playSuccessSound();
      showFeedback('success', `${studentData.fullName} marked present!`);
    } catch (error: any) {
      console.error("Error processing attendance:", error);
      showFeedback('error', `Error processing: ${error.message || 'Unknown error'}`);
    }
  }, [playSuccessSound, showFeedback]);

  const onScanFailure = useCallback((errorMessage: string) => { /* ... (console.warn if needed) ... */ }, []);

  // Effect to Start and Stop the scanner based on `isScanning`
  useEffect(() => {
    if (isScanning) {
      // Only attempt to start if no instance currently exists in the ref
      if (!html5QrCodeRef.current && videoContainerRef.current) {
        console.log("useEffect[isScanning]: Attempting to start scanner.");
        const newHtml5QrCodeInstance = new Html5Qrcode(VIDEO_ELEMENT_CONTAINER_ID, { verbose: false });
        html5QrCodeRef.current = newHtml5QrCodeInstance; // Store instance immediately

        const qrCodeScanConfiguration: Html5QrcodeCameraScanConfig = {
          fps: 10,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            return { width: Math.floor(minEdge * 0.8), height: Math.floor(minEdge * 0.8) };
          },
        };

        Html5Qrcode.getCameras()
          .then(cameras => {
            if (cameras && cameras.length) {
              let cameraId = cameras[0].id;
              const backCamera = cameras.find(camera => camera.label && camera.label.toLowerCase().includes('back'));
              if (backCamera) cameraId = backCamera.id;
              
              // Check if the instance in the ref is still the one we just created
              // This guards against rapid toggles of isScanning
              if (html5QrCodeRef.current === newHtml5QrCodeInstance) {
                newHtml5QrCodeInstance.start(cameraId, qrCodeScanConfiguration, onScanSuccess, onScanFailure)
                  .then(() => {
                    console.log("Scanner started successfully.");
                  })
                  .catch(err => {
                    console.error("Error starting scanner camera:", err);
                    showFeedback('error', `Camera start error: ${(err as Error).message}`);
                    setIsScanning(false); // Revert scanning state
                    html5QrCodeRef.current = null; // Clear ref on error
                  });
              }
            } else {
              showFeedback('error', 'No cameras found.');
              setIsScanning(false);
              html5QrCodeRef.current = null;
            }
          })
          .catch(err => {
            console.error("Error getting cameras:", err);
            showFeedback('error', `Error getting cameras: ${(err as Error).message}`);
            setIsScanning(false);
            html5QrCodeRef.current = null;
          });
      }
    } else {
      // isScanning is false, so stop the current scanner instance if it exists
      if (html5QrCodeRef.current) {
        console.log("useEffect[isScanning]: Attempting to stop scanner.");
        const currentScanner = html5QrCodeRef.current; // Capture ref before async operation
        html5QrCodeRef.current = null; // Optimistically nullify to prevent re-entry or race conditions

        currentScanner.stop()
          .then(() => {
            console.log("Scanner stopped successfully via useEffect.");
            if (videoContainerRef.current) { // Ensure container exists before manipulating
              videoContainerRef.current.innerHTML = '';
            }
          })
          .catch(err => {
            console.warn("Error stopping scanner (isScanning became false):", err);
            if (videoContainerRef.current) {
              videoContainerRef.current.innerHTML = ''; // Still try to clear UI
            }
          });
      }
    }

    // This cleanup is for when the COMPONENT UNMOUNTS or if dependencies change,
    // which primarily should be `isScanning` here.
    return () => {
      // If an instance was created by THIS effect run and isScanning is true (meaning we are unmounting mid-scan)
      // or if the main ref still holds an instance when component unmounts.
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        console.log("useEffect[isScanning] FULL UNMOUNT cleanup: Stopping scanner.");
        html5QrCodeRef.current.stop()
          .catch(err => console.warn("Error stopping scanner on full unmount/dep change:", err))
          .finally(() => {
            html5QrCodeRef.current = null;
          });
      }
    };
  // The callbacks onScanSuccess, onScanFailure, showFeedback are memoized,
  // so they are stable if their own dependencies are stable.
  // Including them ensures that if they *do* change for a valid reason,
  // the scanner is re-initialized with the new versions.
  }, [isScanning, onScanSuccess, onScanFailure, showFeedback]);

  const handleStartScan = () => {
    if (!isScanning) {
      setFeedbackMessage(null);
      setScannedStudentInfo(null);
      setIsScanning(true); // This will trigger the useEffect
    }
  };

  const handleStopScan = () => {
    if (isScanning) {
      setIsScanning(false); // This will trigger the useEffect's "else" block and then its cleanup
    }
  };

  return (
    <CardBox className="mx-auto max-w-xl">
      <h2 className="text-2xl md:text-3xl font-bold mb-6 text-center text-white-800"> {/* Changed white-800 to gray-800 */}
        Scan Student QR
      </h2>
      <div ref={videoContainerRef} id={VIDEO_ELEMENT_CONTAINER_ID}
        className="w-full rounded-md overflow-hidden mb-4 border-2 border-gray-300 bg-gray-900"
        style={{ minHeight: '280px', width: '100%' }}
      >
        {!isScanning && (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-400 text-center p-10">Camera feed will appear here.</p>
          </div>
        )}
      </div>
      <div className="flex flex-col sm:flex-row justify-center space-y-3 sm:space-y-0 sm:space-x-4 mb-6">
        <button onClick={handleStartScan} disabled={isScanning} className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-opacity-75 disabled:opacity-60 transition duration-150 ease-in-out">
          Start Scan
        </button>
        <button onClick={handleStopScan} disabled={!isScanning} className="px-6 py-3 bg-red-600 text-white font-semibold rounded-lg shadow-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-opacity-75 disabled:opacity-60 transition duration-150 ease-in-out">
          Stop Scan
        </button>
      </div>

      {/* Feedback messages */}
      {scannedStudentInfo && !feedbackMessage && (
        <div className="text-center p-3 mb-4 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-lg font-medium text-blue-700 animate-pulse">
            Scanned: {scannedStudentInfo}
            </p>
        </div>
      )}
      {feedbackMessage && (
        <div
            className={`text-center p-3 my-3 rounded-md text-base font-medium border
            ${feedbackMessage.type === 'success' ? 'bg-green-50 text-green-700 border-green-300' : ''}
            ${feedbackMessage.type === 'error' ? 'bg-red-50 text-red-700 border-red-300' : ''}
            ${feedbackMessage.type === 'info' ? 'bg-blue-50 text-blue-700 border-blue-300' : ''}
            `}
        >
            {feedbackMessage.text}
        </div>
      )}
    </CardBox>
  );
};

export default AttendanceScanner;