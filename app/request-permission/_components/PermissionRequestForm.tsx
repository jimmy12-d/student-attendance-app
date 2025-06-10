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

      const startDateObj = new Date(startDate);
      startDateObj.setMinutes(startDateObj.getMinutes() + startDateObj.getTimezoneOffset());
      const endDateObj = new Date(startDateObj);
      endDateObj.setDate(startDateObj.getDate() + (duration - 1));

      const permissionEndDate = `${endDateObj.getFullYear()}-${String(endDateObj.getMonth() + 1).padStart(2, '0')}-${String(endDateObj.getDate()).padStart(2, '0')}`;

      await addDoc(collection(db, "permissions"), {
        studentId: studentDoc.id,
        studentName: studentData.fullName,
        class: studentData.class,
        shift: studentData.shift,
        permissionStartDate: startDate,
        permissionEndDate: permissionEndDate,
        reason: reason,
        details: details,
        status: "pending",
        requestDate: serverTimestamp(),
      });

      setFeedback({ type: 'success', text: "Your permission request has been submitted successfully! It is now pending review." });
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

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {feedback && (
        <NotificationBar
          color={
            feedback.type === "success"
              ? "success"
              : feedback.type === "error"
              ? "danger"
              : "info"
          }
        >
          {feedback.text}
        </NotificationBar>
      )}

      <FormField label="Your Full Name (as registered)" help="Please enter your full name exactly as it appears in school records." labelFor="fullName">
        {(fd) => (
          <input
            type="text"
            id="fullName"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className={fd.className}
            required
          />
        )}
      </FormField>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <FormField label="Permission Start Date" labelFor="startDate">
          {(fd) => <input type="date" id="startDate" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={fd.className} required />}
        </FormField>
        <FormField label="Duration (in days)" labelFor="duration">
          {(fd) => (
            <input 
              type="number" 
              id="duration" 
              value={duration} 
              onChange={(e) => setDuration(Math.max(1, parseInt(e.target.value) || 1))} 
              className={fd.className}
              min="1"
              required 
            />
          )}
        </FormField>
      </div>

      <FormField label="Reason for Leave" labelFor="reasonSelect">
        {(fd) => (
          <select id="reasonSelect" value={reason} onChange={(e) => setReason(e.target.value)} className={fd.className} required>
            <option value="Sickness">Sickness</option>
            <option value="Family Event">Family Event</option>
            <option value="Vacation">Vacation</option>
            <option value="Other">Other</option>
          </select>
        )}
      </FormField>

      <FormField label="Details" help="Please provide at least 10 words explaining your request." labelFor="detailsText">
        {(fd) => <textarea id="detailsText" value={details} onChange={(e) => setDetails(e.target.value)} className={fd.className} rows={4} required></textarea>}
      </FormField>

      <Divider />
      
      <Buttons>
        <Button type="submit" color="info" label={isLoading ? "Submitting..." : "Submit Request"} disabled={isLoading} />
      </Buttons>
    </form>
  );
};

export default PermissionRequestForm;
