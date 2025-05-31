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

// --- Global Timing Rules ---
const STANDARD_ON_TIME_GRACE_MINUTES = 15;
const LATE_WINDOW_DURATION_MINUTES = 90; // Duration of the 'late' window AFTER on-time grace ends

interface ShiftTimeWindows {
  onTimeEnd: string;   // Scan before or at this time is "Present (On-Time)"
  lateEnd: string;     // Scan after onTimeEnd but before or at this time is "Late"
                       // Scans after lateEnd might be considered "Very Late" or "Absent" by policy,
                       // but for now, we'll just focus on Present vs Late within these windows.
}

const shiftTimings: { [key: string]: ShiftTimeWindows } = {
  "Morning": { onTimeEnd: "07:15", lateEnd: "8:30" },
  "Afternoon": { onTimeEnd: "13:15", lateEnd: "14:30" },
  "Evening": { onTimeEnd: "18:00", lateEnd: "19:00" },
};

const lateMessages = [
  "Fashionably late, I see!",
  "Better late than never, right?",
  "AGAIN! How many times already?",
  "You must have a good excuse this time!",
  "You know the rules, right?",
  "Glad you could make it!",
  "Traffic was bad, huh? 😉",
];

const getRandomLateMessage = (name: string) => {
  const message = lateMessages[Math.floor(Math.random() * lateMessages.length)];
  return `${name} is LATE! ${message}`;
};
// --- End Shift Times and Late Logic ---

// Interface for the structure of class config data we expect to fetch
interface ShiftConfig {
  startTime: string; // "HH:MM"
  // standardGraceMinutes and lateCutOffMinutes are now global constants
}
interface ClassShiftConfigs {
  [shiftName: string]: ShiftConfig;
}
interface AllClassConfigs {
  [className: string]: { shifts: ClassShiftConfigs };
}

const AttendanceScanner: React.FC = () => {
  const [scannedStudentInfo, setScannedStudentInfo] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error' | 'info' | 'warning', text: string } | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const lastScannedIdCooldownRef = useRef<string | null>(null);
  const cooldownTimerIdRef = useRef<NodeJS.Timeout | null>(null);
  const feedbackTimerIdRef = useRef<NodeJS.Timeout | null>(null);
  const successSoundRef = useRef<HTMLAudioElement | null>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null); // Ref for the video container div

    // State for class configurations
  const [allClassConfigs, setAllClassConfigs] = useState<AllClassConfigs | null>(null);
  const [loadingClassConfigs, setLoadingClassConfigs] = useState(true);

  // Initialize Audio
  useEffect(() => {
    if (typeof Audio !== "undefined") {
      try {
        const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
        const soundFilePath = `${basePath}/success_sound_2.mp3`;
        successSoundRef.current = new Audio(soundFilePath);
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

  const playSuccessSound = useCallback(() => {
    if (successSoundRef.current) {
      successSoundRef.current.currentTime = 0;
      successSoundRef.current.play().catch(error => console.warn("Error playing sound:", error));
    }
  }, []);

  const showFeedback = useCallback((type: 'success' | 'error' | 'info' | 'warning', text: string) => {
    setFeedbackMessage({type, text });
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
    const studentIdToProcess = decodedText; 

    try {
      const studentDocRef = doc(db, "students", studentIdToProcess);
      const studentSnap = await getDoc(studentDocRef);

      if (!studentSnap.exists()) {
        showFeedback('error', `Student ID [${studentIdToProcess}] not found.`);
        return;
      }
      const studentData = { id: studentSnap.id, ...studentSnap.data() } as Student;
      setScannedStudentInfo(`${studentData.fullName} (Class: ${studentData.class || 'N/A'})`);

      const currentTime = new Date();
      const dateString = `${currentTime.getFullYear()}-${String(currentTime.getMonth() + 1).padStart(2, '0')}-${String(currentTime.getDate()).padStart(2, '0')}`;
      
      // Check if already marked (present or late) today
      const attendanceQuery = query(
        collection(db, "attendance"),
        where("studentId", "==", studentIdToProcess),
        where("date", "==", dateString)
      );
      const attendanceSnapshot = await getDocs(attendanceQuery);

      if (!attendanceSnapshot.empty) {
        const existingStatus = attendanceSnapshot.docs[0].data().status || "present";
        showFeedback('info', `${studentData.fullName} already marked ${existingStatus} today.`);
        return;
      }

      // Determine attendance status (Present or Late)
      let attendanceStatus: "present" | "late" = "present"; // Default to present (on-time)
      const studentClassKey = studentData.class; // e.g., "12A" from student's record
      const studentShiftKey = studentData.shift; // e.g., "Morning" from student's record

      console.log(`[STATUS LOGIC] Student: <span class="math-inline">\{studentData\.fullName\}, Class\: '</span>{studentClassKey}', Shift: '${studentShiftKey}'`);

 if (loadingClassConfigs) {
   showFeedback('error', "Class time configurations are still loading. Please try again shortly.");
   // Note: Cooldown for decodedText is already set at the start of onScanSuccess
   return; // Exit if configs aren't ready
 }
 if (!allClassConfigs) {
   showFeedback('error', "Class time configurations not loaded. Cannot determine status accurately.");
   return; // Exit
 }

 const classConfig = studentClassKey ? allClassConfigs[studentClassKey] : undefined;
 const shiftConfig = (studentShiftKey && classConfig?.shifts) ? classConfig.shifts[studentShiftKey] : undefined;

 if (shiftConfig && shiftConfig.startTime) {
   console.log(`[STATUS LOGIC] Found shift config for ${studentClassKey} - ${studentShiftKey}: StartTime ${shiftConfig.startTime}`);
   const [startHour, startMinute] = shiftConfig.startTime.split(':').map(Number);

   const shiftStartTimeDate = new Date(currentTime); // Use current date, but set hours/minutes from config
   shiftStartTimeDate.setHours(startHour, startMinute, 0, 0); // seconds and ms to 0

   // FOR NOW: Use STANDARD_ON_TIME_GRACE_MINUTES.
   // LATER (Step 3 of overall plan), this will be:
   // const studentSpecificGraceMinutes = studentData.gracePeriodMinutes ?? STANDARD_ON_TIME_GRACE_MINUTES;
   const studentSpecificGraceMinutes = STANDARD_ON_TIME_GRACE_MINUTES;

   const onTimeDeadline = new Date(shiftStartTimeDate);
   onTimeDeadline.setMinutes(shiftStartTimeDate.getMinutes() + studentSpecificGraceMinutes);

   const absoluteLateDeadline = new Date(onTimeDeadline); // Late window starts after on-time grace
   absoluteLateDeadline.setMinutes(onTimeDeadline.getMinutes() + LATE_WINDOW_DURATION_MINUTES);

   console.log(`[STATUS LOGIC] Shift Start Time: ${shiftStartTimeDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit'})}`);
   console.log(`[STATUS LOGIC] Student's On-Time Deadline (incl. ${studentSpecificGraceMinutes}m grace): ${onTimeDeadline.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit'})}`);
   console.log(`[STATUS LOGIC] Absolute Late Deadline (incl. further ${LATE_WINDOW_DURATION_MINUTES}m late window): ${absoluteLateDeadline.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit'})}`);
   console.log(`[STATUS LOGIC] Current Scan Time: ${currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit'})}`);

      if (currentTime <= onTimeDeadline) {
        attendanceStatus = "present";
      } else if (currentTime > onTimeDeadline && currentTime <= absoluteLateDeadline) {
        attendanceStatus = "late";
      } else { // currentTime > absoluteLateDeadline
        attendanceStatus = "late"; // Policy: Still mark as "late" if they are past the official late window
                                    // You might want a different status like "very_late" or prevent check-in
      }
      console.log(`[STATUS LOGIC] Determined Status: ${attendanceStatus.toUpperCase()}`);
    } else {
      console.warn(`[STATUS LOGIC] Shift config not found for Class '<span class="math-inline">\{studentClassKey\}', Shift '</span>{studentShiftKey}'. Defaulting to 'present'. This might happen if class/shift names in student record don't match keys in 'classes' collection.`);
      attendanceStatus = "present"; // Default if specific shift timing isn't found
    }
    // ^^^^ END OF MODIFIED SECTION ^^^^

    console.log(`[DB SAVE] Final attendanceStatus: '${attendanceStatus}' for ${studentData.fullName}`);
    
    // Record attendance in Firestore (this part remains the same, using the new attendanceStatus)
    await addDoc(collection(db, "attendance"), {
      studentId: studentIdToProcess,
      studentName: studentData.fullName,
      class: studentData.class || null,
      shift: studentShiftKey || null, // Use the shift key from student data
      date: dateString,
      timestamp: serverTimestamp(),
      status: attendanceStatus, // Save the dynamically determined status
    });
      playSuccessSound(); // Play sound regardless of on-time or late for now
      if (attendanceStatus === "late") {
        showFeedback('warning', getRandomLateMessage(studentData.fullName));
      } else {
        showFeedback('success', `${studentData.fullName} marked present!`);
      }

    } catch (error: any) {
      console.error("Error processing attendance:", error);
      showFeedback('error', `Error processing: ${error.message || 'Unknown error'}`);
    }
  }, [playSuccessSound, showFeedback, allClassConfigs, loadingClassConfigs]); // Dependencies

  const onScanFailure = useCallback((errorMessage: string) => { /* ... */ }, []);
  // Effect to Start and Stop the scanner
  useEffect(() => {
    let currentScannerInstance: Html5Qrcode | null = null;

    const startScannerAsync = async () => {
      if (!videoContainerRef.current) {
        showFeedback('error', 'Video container element not found in DOM for starting scan.');
        setIsScanning(false);
        return;
      }
      // Ensure container is empty before new instance renders into it
      videoContainerRef.current.innerHTML = '';
      console.log("useEffect[isScanning=true]: Initializing scanner.");

      currentScannerInstance = new Html5Qrcode(VIDEO_ELEMENT_CONTAINER_ID, { verbose: false });
      // Set the main ref here, as this is the instance we are working with for this "start" attempt
      html5QrCodeRef.current = currentScannerInstance;

      const qrCodeScanConfiguration: Html5QrcodeCameraScanConfig = {
        fps: 10,
        qrbox: (viewfinderWidth, viewfinderHeight) => {
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
          // Ensure qrbox size is at least a certain minimum if viewfinder is too small temporarily
          const qrSize = Math.max(100, Math.floor(minEdge * 0.8));
          return { width: qrSize, height: qrSize };
        },
      };

      try {
        const cameras = await Html5Qrcode.getCameras();
        if (!isScanning || html5QrCodeRef.current !== currentScannerInstance) {
          console.log("Start aborted by state change during getCameras");
          if(currentScannerInstance && currentScannerInstance.isScanning) currentScannerInstance.stop().catch(()=>{}); // cleanup local instance
          if(html5QrCodeRef.current === currentScannerInstance) html5QrCodeRef.current = null;
          return;
        }

        if (cameras && cameras.length) {
          let cameraId = cameras[0].id;
          const backCamera = cameras.find(c => c.label && c.label.toLowerCase().includes('back'));
          if (backCamera) cameraId = backCamera.id;

          await currentScannerInstance.start(cameraId, qrCodeScanConfiguration, onScanSuccess, onScanFailure);
          console.log("Scanner started successfully.");
          // isScanning is already true
        } else {
          showFeedback('error', 'No cameras found.');
          setIsScanning(false); // Failed to start
          html5QrCodeRef.current = null;
        }
      } catch (err) {
        console.error("Error during scanner start process:", err);
        showFeedback('error', `Camera Error: ${(err as Error).message}`);
        setIsScanning(false); // Failed to start
        // If this specific instance was set to the ref, clear it
        if (html5QrCodeRef.current === currentScannerInstance) {
          html5QrCodeRef.current = null;
        }
      }
    };

    if (isScanning) {
      // Only attempt to start if no instance is currently in the ref.
      // This implies a previous stop was successful or it's the first start.
      if (!html5QrCodeRef.current) {
        startScannerAsync();
      } else {
        console.log("isScanning is true, but html5QrCodeRef.current already exists. Scanner might be already running or in an inconsistent state.");
        // This state should ideally be avoided by proper stop logic.
        // If it's not scanning, we might need to re-init.
        // For now, we assume if ref exists and isScanning is true, it's operational.
      }
    }

    // Cleanup function for THIS useEffect.
    return () => {
      console.log("useEffect [isScanning, deps] cleanup running.");
      // `currentScannerInstance` is the one created in *this* effect run if `isScanning` was true.
      // `html5QrCodeRef.current` is the shared ref.
      const scannerToPotentiallyStop = currentScannerInstance || html5QrCodeRef.current;

      if (scannerToPotentiallyStop) {
        // If this cleanup is for the instance currently in the global ref, nullify the global ref.
        if (html5QrCodeRef.current === scannerToPotentiallyStop) {
          html5QrCodeRef.current = null;
        }
        
        if (scannerToPotentiallyStop.isScanning) {
          console.log("   Cleanup: Attempting to stop scanner instance:", scannerToPotentiallyStop.getState());
          scannerToPotentiallyStop.stop()
            .then(() => console.log("   Scanner stopped successfully in cleanup."))
            .catch(err => console.warn("   Error stopping scanner in cleanup:", err.message || err))
            .finally(() => {
              if (videoContainerRef.current) {
                // Check if this was the last active scanner before clearing innerHTML
                 if (!html5QrCodeRef.current) videoContainerRef.current.innerHTML = '';
              }
            });
        } else {
          console.log("   Cleanup: Instance found but was not 'isScanning'. Ensuring UI is clear.");
           if (videoContainerRef.current && !html5QrCodeRef.current) { // Only clear if no new instance is taking over
            videoContainerRef.current.innerHTML = '';
          }
        }
      }
    };
  }, [isScanning, onScanSuccess, onScanFailure, showFeedback]); // Dependencies

  const handleStartScan = () => {
    if (!isScanning) {
      setFeedbackMessage(null);
      setScannedStudentInfo(null);
      setIsScanning(true);
    }
  };

  const handleStopScan = () => {
    if (isScanning) { // Only if react state thinks it should be scanning
      setIsScanning(false); // This will trigger the useEffect cleanup for the active instance
    } else {
      // If isScanning is already false, but a ref still exists (e.g. failed start), try to clean up.
      if (html5QrCodeRef.current) {
        console.log("handleStopScan: isScanning is false, but ref exists. Forcing cleanup of lingering ref.");
        const lingeringScanner = html5QrCodeRef.current;
        html5QrCodeRef.current = null;
        if (lingeringScanner.isScanning) { // Check before stop
          lingeringScanner.stop().catch(() => {}).finally(() => {
            if (videoContainerRef.current) videoContainerRef.current.innerHTML = '';
          });
        } else if (videoContainerRef.current) {
          videoContainerRef.current.innerHTML = '';
        }
      }
    }
  };

  return (
    <CardBox className="mx-auto max-w-xl">
      <h2 className="text-2xl md:text-3xl font-bold mb-6 text-center text-white-800">
        Scan Student QR
      </h2>
      <div ref={videoContainerRef} id={VIDEO_ELEMENT_CONTAINER_ID}
        className="w-full rounded-md overflow-hidden mb-4 border-2 border-gray-300 bg-gray-900"
        style={{ minHeight: '280px', width: '100%', transform: 'scaleX(-1)' }} // Mirror effect for better UX

      >
        {(!isScanning && !html5QrCodeRef.current) && (
        <div 
          className="flex items-center justify-center h-full"
          style={{ transform: 'scaleX(-1)' }}
        >
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
            ${feedbackMessage.type === 'warning' ? 'bg-yellow-100 text-yellow-800 border-yellow-400' : ''} 
            `}
        >
            {feedbackMessage.text}
        </div>
      )}
    </CardBox>
  );
};

export default AttendanceScanner;