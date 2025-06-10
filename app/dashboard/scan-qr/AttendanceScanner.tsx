"use client";

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeCameraScanConfig } from 'html5-qrcode';
import { db } from '../../../firebase-config';
import { collection, addDoc, query, where, getDocs, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { Student } from '../../_interfaces';
import CardBox from "../../_components/CardBox";
import { STANDARD_ON_TIME_GRACE_MINUTES } from '../_lib/configForAttendanceLogic';
import { LATE_WINDOW_DURATION_MINUTES } from '../_lib/configForAttendanceLogic';

const VIDEO_ELEMENT_CONTAINER_ID = "qr-video-reader-container";
const SCAN_COOLDOWN_MS = 3000;
const FEEDBACK_DISPLAY_MS = 3000;

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

    // Fetch Class Configurations
    const fetchAllClassData = async () => {
      setLoadingClassConfigs(true); // Correctly sets loading true
      try {
        const snapshot = await getDocs(collection(db, "classes"));
        const configs: AllClassConfigs = {};
        snapshot.forEach(doc => {
          configs[doc.id] = doc.data() as { shifts: ClassShiftConfigs };
        });
        setAllClassConfigs(configs); // Correctly sets configs
      } catch (error) {
        console.error("Failed to fetch class configurations:", error);
        // showFeedback('error', "Critical: Failed to load class time configurations. Attendance status may be incorrect.");
        // If showFeedback is used here, it needs to be stable or added to deps.
        // For simplicity, let's use setError directly if available or just log for now.
        // setError("Critical: Failed to load class time configurations."); // Assuming setError is available
      }
      setLoadingClassConfigs(false); // Correctly sets loading false
    };
    fetchAllClassData();
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
      const studentData = { id: studentSnap.id, ...studentSnap.data() } as Student & { gracePeriodMinutes?: number | null };
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
   // LATER (Step 3 of overall plan), this will be: edit here to use student-specific grace period
   const studentSpecificGraceMinutes = 
    (typeof studentData.gracePeriodMinutes === 'number' && !isNaN(studentData.gracePeriodMinutes))
    ? studentData.gracePeriodMinutes 
    : STANDARD_ON_TIME_GRACE_MINUTES;
  
   const onTimeDeadline = new Date(shiftStartTimeDate);
   onTimeDeadline.setMinutes(shiftStartTimeDate.getMinutes() + studentSpecificGraceMinutes); // Use the determined grace

   const absoluteLateDeadline = new Date(onTimeDeadline);
   absoluteLateDeadline.setMinutes(onTimeDeadline.getMinutes() + LATE_WINDOW_DURATION_MINUTES);
      if (currentTime <= onTimeDeadline) {
        attendanceStatus = "present";
      } else if (currentTime > onTimeDeadline && currentTime <= absoluteLateDeadline) {
        attendanceStatus = "late";
      } else { // currentTime > absoluteLateDeadline edit here 
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

    } catch (error) {
      console.error("Error processing attendance:", error);
      showFeedback('error', `Error processing: ${error.message || 'Unknown error'}`);
    }
  }, [playSuccessSound, showFeedback, allClassConfigs, loadingClassConfigs]); // Dependencies

    const onScanFailure = useCallback((errorMessage: string) => {
      if (
        errorMessage.includes("QR code not found") || 
        errorMessage.includes("notFound") ||
        errorMessage.includes("No QR code found")
      ) {
        // This is expected during normal operation. Do nothing.
        return;
      }
      
      // Log other, potentially more significant errors for debugging purposes.
      console.warn(`QR Scan Failure: ${errorMessage}`);
      
    }, []); 

  const initializeScanner = useCallback(async () => { // Make it async
    if (!videoContainerRef.current) {
      showFeedback('error', 'Video container element not found.');
      setIsScanning(false); // Ensure state is correct
      return;
    }
    // Ensure container is empty before new instance renders into it
    videoContainerRef.current.innerHTML = '';
    console.log("initializeScanner: Initializing new scanner instance.");

    const newHtml5QrCodeInstance = new Html5Qrcode(VIDEO_ELEMENT_CONTAINER_ID, { verbose: false });
    // Temporarily set ref to allow guard checks in async operations,
    // but it's only "truly" set after successful start.
    // This is a bit tricky. Let's assign to ref now, but clear on failure.
    html5QrCodeRef.current = newHtml5QrCodeInstance;


    const qrCodeScanConfiguration: Html5QrcodeCameraScanConfig = {
      fps: 10,
      qrbox: (viewfinderWidth, viewfinderHeight) => {
        const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
        const qrSize = Math.max(100, Math.floor(minEdge * 0.8));
        return { width: qrSize, height: qrSize };
      },
    };

    try {
            const cameras = await Html5Qrcode.getCameras();

    } catch (err) {
      console.error("Error during scanner initialization or start process:", err);
      showFeedback('error', `Camera Error: ${(err as Error).message}`);
      setIsScanning(false);
      // If this specific instance was set to the ref and failed, clear it
      if (html5QrCodeRef.current === newHtml5QrCodeInstance) {
        html5QrCodeRef.current = null;
      }
    }
  // Add dependencies for initializeScanner's own useCallback
  }, [isScanning, onScanSuccess, onScanFailure, showFeedback]); 
  // Effect to Start and Stop the scanner
useEffect(() => {
    if (isScanning) {
      if (!html5QrCodeRef.current && videoContainerRef.current) {
        // Check for dimensions as a possible guard before calling initializeScanner
        if (videoContainerRef.current.clientWidth > 0 || videoContainerRef.current.clientHeight > 0) {
            initializeScanner();
        } else {
            const initTimeoutId = setTimeout(() => {
                if (isScanning && !html5QrCodeRef.current && videoContainerRef.current &&
                    (videoContainerRef.current.clientWidth > 0 || videoContainerRef.current.clientHeight > 0)) {
                    initializeScanner();
                } else if (isScanning) {
                    console.error("Still no dimensions for video container after delay.");
                    showFeedback('error', 'Camera view could not be sized. Try again.');
                    setIsScanning(false);
                }
            }, 50); // Short delay
            // Return a cleanup for this timeout if isScanning becomes false quickly
            return () => clearTimeout(initTimeoutId);
        }
      }
    }
    // The main cleanup for when isScanning becomes false OR component unmounts OR dependencies change
    // is handled by the return function of THIS useEffect (as in your latest code)
    return () => {
        if (html5QrCodeRef.current) {
            const scannerToStop = html5QrCodeRef.current;
            html5QrCodeRef.current = null; // Nullify ref before async stop
            if (scannerToStop.isScanning) {
                scannerToStop.stop()
                    .then(() => console.log("Scanner stopped in useEffect cleanup."))
                    .catch(err => console.warn("Error stopping scanner in useEffect cleanup:", err.message || err))
                    .finally(() => {
                        if (videoContainerRef.current) videoContainerRef.current.innerHTML = '';
                    });
            } else if (videoContainerRef.current) {
                 videoContainerRef.current.innerHTML = ''; // Not scanning, just clear UI
            }
        }
    };
// Pass initializeScanner as a dependency if it's defined with useCallback outside,
// or if it's defined inside, its own dependencies (like onScanSuccess, showFeedback) should make this effect re-run correctly.
// For robustness, if initializeScanner is a useCallback, add it.
}, [isScanning, initializeScanner, onScanSuccess, onScanFailure, showFeedback]); 


const handleStartScan = () => {
 if (loadingClassConfigs) {
   showFeedback('info', "System is initializing. Please wait a moment.");
   return;
 }
  if (!isScanning) {
    setFeedbackMessage(null);
    setScannedStudentInfo(null);
    if (videoContainerRef.current) {
      //videoContainerRef.current.innerHTML = '';
    }
    setIsScanning(true); // This will trigger the useEffect to initialize the scanner
  } else {
  }
};

const handleStopScan = () => {
  if (isScanning) {
    console.log("handleStopScan: Setting isScanning to false.");
    setIsScanning(false); // This will trigger the useEffect cleanup for the active instance
  } else {
    // If isScanning is already false, but a ref might still exist (e.g., from a failed start that didn't nullify ref),
    // try a more direct cleanup if needed. The useEffect should handle most cases.
    if (html5QrCodeRef.current) {
      console.warn("handleStopScan: isScanning is false, but ref exists. Forcing cleanup of lingering ref.");
      const lingeringScanner = html5QrCodeRef.current;
      html5QrCodeRef.current = null;
      if (lingeringScanner.isScanning) {
        lingeringScanner.stop().catch(()=>{/* ignore */}).finally(() => {
          if (videoContainerRef.current) videoContainerRef.current.innerHTML = '';
        });
      } else if (videoContainerRef.current) {
        videoContainerRef.current.innerHTML = '';
      }
    } else {
       console.log("handleStopScan: isScanning is already false and no ref exists.");
    }
  }
};


  return (
    <CardBox className="mx-auto max-w-3xl p-6 bg-gray-800 shadow-lg rounded-lg">
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
        <button onClick={handleStartScan} disabled={isScanning || loadingClassConfigs} className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-opacity-75 disabled:opacity-60 transition duration-150 ease-in-out">
    {loadingClassConfigs ? "Loading Config..." : "Start Scan"}
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
export { STANDARD_ON_TIME_GRACE_MINUTES, LATE_WINDOW_DURATION_MINUTES };
export type { AllClassConfigs };
