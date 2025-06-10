// app/request-permission/_components/PermissionRequestForm.tsx
"use client";

import React, { useState } from "react";
import { db } from "../../../firebase-config";
import { collection, addDoc, serverTimestamp, query, where, getDocs, limit } from "firebase/firestore";
import FormField from "../../_components/FormField";
import Button from "../../_components/Button";
import Buttons from "../../_components/Buttons";
import Divider from "../../_components/Divider";
import NotificationBar from "../../_components/NotificationBar";

// Helper to count words for validation
const countWords = (text: string) => {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
};

// Define ColorKey type for NotificationBar color prop
type ColorKey = "success" | "danger" | "info";

const PermissionRequestForm = () => {
  // Form state
  const [fullName, setFullName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [duration, setDuration] = useState(1);
  const [reason, setReason] = useState("Sickness");
  const [details, setDetails] = useState("");

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    // 1. Client-side validation
    if (!fullName || !startDate || duration < 1 || !reason) {
      setFeedback({ type: 'error', text: "Please fill out your name, start date, duration, and reason." });
      return;
    }
    if (countWords(details) < 10) {
      setFeedback({ type: 'error', text: "Please provide at least 10 words in the details field." });
      return;
    }

    setIsLoading(true);

    try {
      // 2. Validate student name exists in the database
      const studentsRef = collection(db, "students");
      const q = query(studentsRef, where("fullName", "==", fullName.trim()), limit(1));
      const studentSnapshot = await getDocs(q);

      if (studentSnapshot.empty) {
        setFeedback({ type: 'error', text: `Student with name "${fullName.trim()}" not found. Please check spelling and capitalization.` });
        setIsLoading(false);
        return;
      }
      
      const studentDoc = studentSnapshot.docs[0];
      const studentData = studentDoc.data();

      // 3. Calculate the end date based on duration
      const startDateObj = new Date(startDate);
      // Adjust for timezone offset to prevent day-before issues when creating from string
      startDateObj.setMinutes(startDateObj.getMinutes() + startDateObj.getTimezoneOffset());
      const endDateObj = new Date(startDateObj);
      endDateObj.setDate(startDateObj.getDate() + (duration - 1));

      const permissionEndDate = `${endDateObj.getFullYear()}-${String(endDateObj.getMonth() + 1).padStart(2, '0')}-${String(endDateObj.getDate()).padStart(2, '0')}`;

      // 4. Create the permission request document
      await addDoc(collection(db, "permissions"), {
        studentId: studentDoc.id,
        studentName: studentData.fullName,
        class: studentData.class, // Add class/shift for admin convenience
        shift: studentData.shift,
        permissionStartDate: startDate,
        permissionEndDate: permissionEndDate,
        reason: reason,
        details: details,
        status: "pending", // All new requests start as pending
        requestDate: serverTimestamp(),
      });

      setFeedback({ type: 'success', text: "Your permission request has been submitted successfully! It is now pending review." });
      // Reset form on success
      setFullName("");
      setStartDate("");
      setDuration(1);
      setReason("Sickness");
      setDetails("");

    } catch (err) {
      console.error("Error submitting permission request:", err);
      setFeedback({ type: 'error', text: "An error occurred. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  // Map feedback type to ColorKey values
  const feedbackColorMap: Record<'success' | 'error' | 'info', ColorKey> = {
    success: "success",
    error: "danger",
    info: "info",
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {feedback && (
        <NotificationBar color={feedbackColorMap[feedback.type]}>
          {feedback.text}
        </NotificationBar>
      )}

      <FormField label="Your Full Name (as registered)" help="Please enter your full name exactly as it appears in school records." labelFor="fullName">
        {() => (
          <input
            type="text"
            id="fullName"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="input"
            required
          />
        )}
      </FormField>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <FormField label="Permission Start Date" labelFor="startDate">
          {() => (
            <input type="date" id="startDate" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input" required />
          )}
        </FormField>
        <FormField label="Duration (in days)" labelFor="duration">
          {() => (
            <input 
              type="number" 
              id="duration" 
              value={duration} 
              onChange={(e) => setDuration(Math.max(1, parseInt(e.target.value) || 1))} 
              className="input" 
              min="1"
              required 
            />
          )}
        </FormField>
      </div>

      <FormField label="Reason for Leave" labelFor="reasonSelect">
        {() => (
          <select id="reasonSelect" value={reason} onChange={(e) => setReason(e.target.value)} className="input" required>
            <option value="Sickness">Sickness</option>
            <option value="Family Event">Family Event</option>
            <option value="Vacation">Vacation</option>
            <option value="Other">Other</option>
          </select>
        )}
      </FormField>

      <FormField label="Details" help="Please provide at least 10 words explaining your request." labelFor="detailsText">
        {() => (
          <textarea id="detailsText" value={details} onChange={(e) => setDetails(e.target.value)} className="textarea" rows={4} required></textarea>
        )}
      </FormField>

      <Divider />
      
      <Buttons>
        <Button type="submit" color="info" label={isLoading ? "Submitting..." : "Submit Request"} disabled={isLoading} />
      </Buttons>
    </form>
  );
};

export default PermissionRequestForm;