// app/dashboard/permissions/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { mdiFileDocumentCheckOutline } from "@mdi/js";
import SectionMain from "../../_components/Section/Main";
import SectionTitleLineWithButton from "../../_components/Section/TitleLineWithButton";
import CardBox from "../../_components/CardBox";
import TablePermissions from "./TablePermissions";
import { db } from "../../../firebase-config";
import { collection, getDocs, query, orderBy, doc, updateDoc, CollectionReference, DocumentData } from "firebase/firestore";
import { PermissionRecord, Student } from "../../_interfaces"; // Import Student
import NotificationBar from "../../_components/NotificationBar";
// ... (import AddPermissionForm if you have it)

// Create an "enriched" type for the data that will be passed to the table
export interface EnrichedPermissionRecord extends PermissionRecord {
  class?: string;
  shift?: string;
}

export default function ManagePermissionsPage() {
  const [permissions, setPermissions] = useState<EnrichedPermissionRecord[]>([]); // Use the enriched type
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  
  const fetchPermissions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const permissionsCol = collection(db, "permissions") as CollectionReference<DocumentData>;
      const studentsCol = collection(db, "students") as CollectionReference<DocumentData>;

      // Fetch both permissions and students concurrently
      const permissionsQuery = query(permissionsCol, orderBy("requestDate", "desc"));
      const [permissionsSnapshot, studentsSnapshot] = await Promise.all([
        getDocs(permissionsQuery),
        getDocs(studentsCol)
      ]);

      // Create a map of students for easy lookup
      const studentsMap = new Map<string, Student>();
      studentsSnapshot.docs.forEach(docSnap => {
        studentsMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() } as Student);
      });

      // Map permission records and "join" them with student data
      const enrichedPerms = permissionsSnapshot.docs.map(docSnap => {
        const perm = { id: docSnap.id, ...docSnap.data() } as PermissionRecord;
        const student = studentsMap.get(perm.studentId);
        
        return {
          ...perm,
          class: student?.class || 'N/A', // Get current class from student map
          shift: student?.shift || 'N/A', // Get current shift from student map
        };
      });

      setPermissions(enrichedPerms);
    } catch (err) {
      console.error(err);
      if (err.code === 'permission-denied') {
        setError("Permission Denied. Check Firestore security rules for 'permissions' and 'students' collections.");
      } else {
        setError("Failed to fetch permission requests.");
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

    const handleUpdateRequest = async (permissionId: string, newStatus: 'approved' | 'rejected') => {
      setFeedback(null);
      try {
        const permRef = doc(db, "permissions", permissionId);
        await updateDoc(permRef, {
          status: newStatus,
          reviewedAt: new Date(), // Use JS Date, Firestore will convert to timestamp if field is timestamp type
          // reviewedBy: auth.currentUser?.email // If you have auth state available
        });
        setFeedback(`Request has been ${newStatus}.`);
        fetchPermissions(); // Refresh the list
      } catch (err) {
        console.error(err);
        setError("Failed to update request status.");
      }
      setTimeout(() => setFeedback(null), 3000);
    };

  return (
    <SectionMain>
      <SectionTitleLineWithButton
        icon={mdiFileDocumentCheckOutline}
        title="Manage Permission Requests"
        main
      >
        {/* ... "Add Permission" button ... */}
      </SectionTitleLineWithButton>

      {error && <NotificationBar color="danger" className="mb-4">{error}</NotificationBar>}
      {feedback && <NotificationBar color="success" className="mb-4">{feedback}</NotificationBar>}
      
      <CardBox hasTable>
        {loading ? (
          <p className="p-4 text-center">Loading requests...</p>
        ) : (
          <TablePermissions permissions={permissions} onUpdateRequest={handleUpdateRequest} />
        )}
      </CardBox>
    </SectionMain>
  );
}