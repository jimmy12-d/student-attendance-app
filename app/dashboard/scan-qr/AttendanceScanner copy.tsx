"use client";

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeCameraScanConfig } from 'html5-qrcode';
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
  const [isScanning, setIsScanning] = useState(false); // This is the primary state controlling the scanner

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null); // Holds the Html5Qrcode instance
  const lastScannedIdCooldownRef = useRef<string | null>(null);
  const cooldownTimerIdRef = useRef<NodeJS.Timeout | null>(null);
  const feedbackTimerIdRef = useRef<NodeJS.Timeout | null>(null);
  const successSoundRef = useRef<HTMLAudioElement | null>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null); // Ref for the video container

  // Initialize Audio - runs once on mount
  useEffect(() => {
    if (typeof Audio !== "undefined") {
      try {
        const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
        const soundFilePath = `${basePath}/success_sound_2.mp3`;
        successSoundRef.current = new Audio(soundFilePath);
        console.log("Audio initialized with src:", soundFilePath);
      } catch (e) { console.warn("Could not initialize audio:", e); }
    }
  }, []);

  // Cleanup general timers on unmount
  useEffect(() => {
    return () => {
      if (feedbackTimerIdRef.current) clearTimeout(feedbackTimerIdRef.current);
      if (cooldownTimerIdRef.current) clearTimeout(cooldownTimerIdRef.current);
    };
  }, []);

  const playSuccessSound = useCallback(() => { /* ... Your existing correct logic ... */
    if (successSoundRef.current) {
        successSoundRef.current.currentTime = 0;
        successSoundRef.current.play().catch(error => console.warn("Error playing sound:", error));
    }
  }, []);

  const showFeedback = useCallback((type: 'success' | 'error' | 'info', text: string) => { /* ... Your existing correct logic ... */
    setFeedbackMessage({ type, text });
    if (feedbackTimerIdRef.current) clearTimeout(feedbackTimerIdRef.current);
    feedbackTimerIdRef.current = setTimeout(() => {
        setFeedbackMessage(null);
        setScannedStudentInfo(null);
    }, FEEDBACK_DISPLAY_MS);
  }, []);

  const onScanSuccess = useCallback(async (decodedText: string /*, result: any */) => { /* ... Your existing onScanSuccess logic ... */
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


  // useEffect to manage the scanner lifecycle based on `isScanning` state
  useEffect(() => {
    // Start scanner when isScanning becomes true
    if (isScanning) {
      if (html5QrCodeRef.current) {
        // If an instance somehow still exists, try to clear it first
        // This case should ideally not be hit if cleanup is working.
        console.warn("Scanner instance already exists while trying to start. Attempting to clear old one.");
        html5QrCodeRef.current.clear()
          .catch(err => console.warn("Error clearing pre-existing scanner before start:", err))
          .finally(() => {
            html5QrCodeRef.current = null; // Ensure it's null before creating new
            initializeScanner(); // Then try to initialize
          });
      } else {
        initializeScanner();
      }
    }

    // Cleanup function for this effect:
    // This will run when `isScanning` changes from true to false,
    // OR when the component unmounts if `isScanning` was true.
    return () => {
      if (html5QrCodeRef.current) {
        console.log("useEffect[isScanning] cleanup: Stopping and clearing scanner.");
        const scannerToStop = html5QrCodeRef.current;
        html5QrCodeRef.current = null; // Nullify ref immediately to prevent race conditions

        scannerToStop.stop()
          .then(() => {
            console.log("Scanner stopped successfully by useEffect cleanup.");
            // The library's stop() should release the camera.
            // Clearing innerHTML of the container might still be needed if stop() doesn't remove all UI.
            if (videoContainerRef.current) {
              videoContainerRef.current.innerHTML = '';
            }
          })
          .catch(err => {
            console.warn("Error stopping scanner in useEffect cleanup:", err);
            // Even if stop fails, try to clear the container and nullify ref
            if (videoContainerRef.current) {
              videoContainerRef.current.innerHTML = '';
            }
          });
      }
    };
  }, [isScanning, onScanSuccess, onScanFailure, showFeedback]); // Dependencies for re-initializing if callbacks change


  const initializeScanner = async () => {
    if (!videoContainerRef.current) {
      showFeedback('error', 'Video container element not found in DOM.');
      setIsScanning(false); // Can't scan
      return;
    }
    // Ensure container is empty before Html5Qrcode tries to add its video element
    videoContainerRef.current.innerHTML = '';

    const newScanner = new Html5Qrcode(VIDEO_ELEMENT_CONTAINER_ID, { verbose: false });
    html5QrCodeRef.current = newScanner; // Set ref immediately

    const config: Html5QrcodeCameraScanConfig = {
      fps: 10,
      qrbox: (vfW, vfH) => ({ width: Math.floor(Math.min(vfW, vfH) * 0.7), height: Math.floor(Math.min(vfW, vfH) * 0.7) }),
    };

    try {
      const cameras = await Html5Qrcode.getCameras();
      if (cameras && cameras.length) {
        let cameraId = cameras[0].id;
        const backCamera = cameras.find(c => c.label.toLowerCase().includes('back'));
        if (backCamera) cameraId = backCamera.id;

        // Check if html5QrCodeRef.current is still this newScanner instance
        // (guards against stop being called during async getCameras)
        if (html5QrCodeRef.current === newScanner) {
          await newScanner.start(cameraId, config, onScanSuccess, onScanFailure);
          console.log("Scanner started successfully.");
          // isScanning is already true, no need to set it again here.
        } else {
          console.log("Scanner instance was changed/stopped before camera could start.");
        }
      } else {
        showFeedback('error', 'No cameras found.');
        setIsScanning(false);
        html5QrCodeRef.current = null;
      }
    } catch (err) {
      console.error("Error during scanner initialization or start:", err);
      showFeedback('error', `Camera Error: ${(err as Error).message}`);
      setIsScanning(false);
      if (html5QrCodeRef.current === newScanner) { // Only nullify if it's still our instance
        html5QrCodeRef.current = null;
      }
    }
  };

  const handleStartScan = () => {
    if (!isScanning) {
      setFeedbackMessage(null);
      setScannedStudentInfo(null);
      setIsScanning(true); // This triggers the useEffect to initialize the scanner
    }
  };

  const handleStopScan = () => {
    // This will trigger the cleanup within the useEffect when `isScanning` becomes false
    // The useEffect will then call scanner.stop()
    setIsScanning(false);
  };

  return (
    <CardBox className="mx-auto max-w-xl">
      <h2 className="text-2xl md:text-3xl font-bold mb-6 text-center text-white-800">
        Scan Student QR 2
      </h2>
      {/* The video container's content is managed by Html5Qrcode OR the placeholder */}
      <div ref={videoContainerRef} id={VIDEO_ELEMENT_CONTAINER_ID}
        className="w-full rounded-md overflow-hidden mb-4 border-2 border-gray-300 bg-gray-900"
        style={{ minHeight: '280px', width: '100%' }}
      >
        {(!isScanning && !html5QrCodeRef.current) && ( // Show placeholder only if not scanning AND no lingering instance
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