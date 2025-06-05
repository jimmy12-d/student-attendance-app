// Example: Temporarily add this to a component like app/dashboard/page.tsx
"use client"; 

import { db } from '../../firebase-config'; // Adjust path
import { doc, setDoc, collection } from "firebase/firestore";
import Button from '../_components/Button'; // Adjust path

// --- Paste the UPDATED classesToCreate array here ---
const classesToCreate = [
  // ... (the array from above with studyDays included) ...
  { id: "12A", name: "12A", studyDays: [1, 2, 3, 4, 5, 6], shifts: { "Morning": { startTime: "07:00" }, "Afternoon": { startTime: "13:00" } } },
  { id: "12B", name: "12B", studyDays: [1, 2, 3, 4, 5, 6], shifts: { "Morning": { startTime: "07:00" }, "Afternoon": { startTime: "13:00" } } },
  { id: "12C", name: "12C", studyDays: [1, 2, 3, 4, 5, 6], shifts: { "Morning": { startTime: "07:00" }, "Afternoon": { startTime: "13:00" } } },
  { id: "12I", name: "12I", studyDays: [1, 2, 3, 4, 5, 6], shifts: { "Morning": { startTime: "07:00" }, "Afternoon": { startTime: "13:00" } } },
  { id: "12J", name: "12J", studyDays: [1, 2, 3, 4, 5, 6], shifts: { "Morning": { startTime: "07:00" }, "Afternoon": { startTime: "13:00" } } },
  { id: "12NKGS", name: "12NKGS", studyDays: [1, 2, 3, 4, 5, 6], shifts: { "Morning": { startTime: "07:00" }, "Afternoon": { startTime: "13:00" } } },
  { id: "12S", name: "12S", studyDays: [1, 2, 3, 4, 5, 6], shifts: { "Morning": { startTime: "07:00" }, "Afternoon": { startTime: "13:00" } } },
  { id: "12R", name: "12R", studyDays: [1, 2, 3, 4, 5, 6], shifts: { "Morning": { startTime: "07:00" }, "Afternoon": { startTime: "13:00" } } },
  { id: "12T", name: "12T", studyDays: [1, 2, 3, 4, 5, 6], shifts: { "Morning": { startTime: "07:00" }, "Afternoon": { startTime: "13:00" } } },
  { id: "11A", name: "11A", studyDays: [1, 2, 3, 4, 5, 6], shifts: { "Morning": { startTime: "07:00" }, "Afternoon": { startTime: "13:00" } } },
  { id: "7E", name: "7E", studyDays: [1, 2, 3, 4], shifts: { "Evening": { startTime: "17:30" } } },
  { id: "7F", name: "7F", studyDays: [1, 2, 3, 4], shifts: { "Evening": { startTime: "17:30" } } },
  { id: "8E", name: "8E", studyDays: [1, 2, 3, 4], shifts: { "Evening": { startTime: "17:30" } } },
  { id: "8F", name: "8F", studyDays: [1, 2, 3, 4], shifts: { "Evening": { startTime: "17:30" } } },
  { id: "11E", name: "11E", studyDays: [1, 2, 3, 4, 5], shifts: { "Evening": { startTime: "17:30" } } },
  { id: "11F", name: "11F", studyDays: [1, 2, 3, 4, 5], shifts: { "Evening": { startTime: "17:30" } } },
  { id: "11G", name: "11G", studyDays: [1, 2, 3, 4, 5], shifts: { "Evening": { startTime: "17:30" } } },
  { id: "9E", name: "9E", studyDays: [1, 2, 3, 4], shifts: { "Evening": { startTime: "17:45" } } },
  { id: "9F", name: "9F", studyDays: [1, 2, 3, 4], shifts: { "Evening": { startTime: "17:45" } } },
  { id: "10E", name: "10E", studyDays: [1, 2, 3, 4], shifts: { "Evening": { startTime: "17:45" } } },
  { id: "10F", name: "10F", studyDays: [1, 2, 3, 4], shifts: { "Evening": { startTime: "17:45" } } },
];


function YourPageComponentToSeedData() { // Renamed to avoid conflict if on dashboard/page.tsx

  const seedClassesToFirestore = async () => {
    console.log("Starting to seed classes with studyDays...");
    const classesCollectionRef = collection(db, "classes");
    let count = 0;
    let errors = 0;

    for (const classData of classesToCreate) {
      try {
        const classDocRef = doc(classesCollectionRef, classData.id);
        // Ensure all expected data is included in the object passed to setDoc
        await setDoc(classDocRef, {
          name: classData.name,
          shifts: classData.shifts,
          studyDays: classData.studyDays, // <-- INCLUDE studyDays HERE
        });
        console.log(`Successfully created/updated class: ${classData.id} with studyDays: ${classData.studyDays.join(',')}`);
        count++;
      } catch (error) {
        console.error(`Error adding/updating class ${classData.id}: `, error);
        errors++;
      }
    }
    alert(`${count} classes processed. ${errors} errors.`);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Admin Data Seeding</h1>
      <p className="mb-2">This tool will populate your 'classes' collection with predefined start times and study days.</p>
      <Button
        label="Seed Class Data to Firestore (with Study Days)"
        color="danger"
        onClick={seedClassesToFirestore}
        className="my-4"
      />
      <p className="text-xs text-gray-500">
        Warning: Clicking this button will create/overwrite documents in your 'classes' collection. Use with caution and typically only once.
      </p>
    </div>
  );
}

export default YourPageComponentToSeedData;