// Example: Temporarily add this to a component like app/dashboard/page.tsx
// Make sure to import necessary Firebase functions and your `db` instance.
"use client"; // <--- ADD THIS DIRECTIVE AT THE VERY TOP

import { db } from '../../firebase-config'; // Adjust path to your Firebase config
import { doc, setDoc, collection } from "firebase/firestore";
import Button from '../_components/Button'; // Assuming you have your Button component

// --- Place your classesToCreate array here (from Step 1) ---
const classesToCreate = [
  // Morning (7:00 AM) and Afternoon (1:00 PM / 13:00) classes
  { id: "12A", name: "12A", shifts: { "Morning": { startTime: "07:00" }, "Afternoon": { startTime: "13:00" } } },
  { id: "12B", name: "12B", shifts: { "Morning": { startTime: "07:00" }, "Afternoon": { startTime: "13:00" } } },
  { id: "12C", name: "12C", shifts: { "Morning": { startTime: "07:00" }, "Afternoon": { startTime: "13:00" } } },
  { id: "12I", name: "12I", shifts: { "Morning": { startTime: "07:00" }, "Afternoon": { startTime: "13:00" } } },
  { id: "12J", name: "12J", shifts: { "Morning": { startTime: "07:00" }, "Afternoon": { startTime: "13:00" } } },
  { id: "12NKGS", name: "12NKGS", shifts: { "Morning": { startTime: "07:00" }, "Afternoon": { startTime: "13:00" } } },
  { id: "12S", name: "12S", shifts: { "Morning": { startTime: "07:00" }, "Afternoon": { startTime: "13:00" } } },
  { id: "12R", name: "12R", shifts: { "Morning": { startTime: "07:00" }, "Afternoon": { startTime: "13:00" } } },
  { id: "12T", name: "12T", shifts: { "Morning": { startTime: "07:00" }, "Afternoon": { startTime: "13:00" } } },

  // Evening classes starting at 5:30 PM (17:30)
  { id: "7E", name: "7E", shifts: { "Evening": { startTime: "17:30" } } },
  { id: "7F", name: "7F", shifts: { "Evening": { startTime: "17:30" } } },
  { id: "8E", name: "8E", shifts: { "Evening": { startTime: "17:30" } } },
  { id: "8F", name: "8F", shifts: { "Evening": { startTime: "17:30" } } },
  { id: "11E", name: "11E", shifts: { "Evening": { startTime: "17:30" } } },
  { id: "11F", name: "11F", shifts: { "Evening": { startTime: "17:30" } } },
  { id: "11G", name: "11G", shifts: { "Evening": { startTime: "17:30" } } },

  // Evening classes starting at 5:45 PM (17:45)
  { id: "9E", name: "9E", shifts: { "Evening": { startTime: "17:45" } } },
  { id: "9F", name: "9F", shifts: { "Evening": { startTime: "17:45" } } },
  { id: "10E", name: "10E", shifts: { "Evening": { startTime: "17:45" } } },
  { id: "10F", name: "10F", shifts: { "Evening": { startTime: "17:45" } } },
];

function YourPageComponent() { // Or whatever your component is named

  const seedClassesToFirestore = async () => {
    console.log("Starting to seed classes...");
    const classesCollectionRef = collection(db, "classes");
    let count = 0;

    for (const classData of classesToCreate) {
      try {
        // Use setDoc with the class ID as the document ID.
        // This will create the document if it doesn't exist, or overwrite it if it does.
        const classDocRef = doc(classesCollectionRef, classData.id);
        await setDoc(classDocRef, {
          name: classData.name,
          shifts: classData.shifts,
        });
        console.log(`Successfully created/updated class: ${classData.id}`);
        count++;
      } catch (error) {
        console.error(`Error adding class ${classData.id}: `, error);
      }
    }
    alert(`${count} classes processed. Check Firestore and console for details.`);
  };

  return (
    <div>
      {/* ... your existing page content ... */}
      <Button
        label="Seed Class Data to Firestore"
        color="danger" // Use a distinct color
        onClick={seedClassesToFirestore}
        className="my-4"
      />
      <p className="text-xs text-gray-500">
        Warning: Clicking this button will create/overwrite documents in your 'classes' collection. Use with caution.
      </p>
    </div>
  );
}

export default YourPageComponent;