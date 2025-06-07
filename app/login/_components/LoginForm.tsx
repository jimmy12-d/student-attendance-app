// app/login/_components/LoginForm.tsx
"use client";

import React, { useState } from "react";
import Button from "../../_components/Button"; // Verify path
import Buttons from "../../_components/Buttons"; // Verify path
import { useRouter } from "next/navigation"; // For redirection

// Firebase imports for Google Sign-In
import { GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth"; // Added signOut
import { auth, db } from "../../../firebase-config"; // Adjust path, ensure db is exported from firebase-config
import { doc, getDoc } from "firebase/firestore"; // For checking authorization

// Redux imports to set user state
import { useAppDispatch } from "../../_stores/hooks";
import { setUser } from "../../_stores/mainSlice"; // Ensure this path and action are correct

  const LoginForm = () => {
    const router = useRouter();
    const dispatch = useAppDispatch();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    const provider = new GoogleAuthProvider();

    try {
      const result = await signInWithPopup(auth, provider);
      const firebaseUser = result.user; // user from Firebase Auth
      console.log("Google Sign-In Attempt Successful with Firebase Auth:", firebaseUser.email);

      if (!firebaseUser.email) {
        console.error("User email not available from Google Sign-In.");
        setError("Could not retrieve email from Google account. Please try again or use a different account.");
        await signOut(auth); // Sign out the Firebase Auth session
        setIsLoading(false);
        return;
      }

      // **** CHECK IF USER IS AUTHORIZED ****
      const authorizedUserRef = doc(db, "authorizedUsers", firebaseUser.email);
      const authorizedUserSnap = await getDoc(authorizedUserRef);

      if (authorizedUserSnap.exists()) {
        // User is authorized
        console.log("User is authorized:", firebaseUser.email);
        dispatch(
          setUser({
            name: firebaseUser.displayName,
            email: firebaseUser.email,
            avatar: firebaseUser.photoURL,
            uid: firebaseUser.uid,
          })
        );
        router.push("/dashboard"); // Redirect to dashboard
        // No need to setIsLoading(false) here as it redirects
      } else {
        // User is NOT authorized
        console.warn("User is NOT authorized:", firebaseUser.email);
        setError(`Access Denied. Your Google account (${firebaseUser.email}) is not authorized for this application.`);
        await signOut(auth); // Sign them out of the Firebase session
        setIsLoading(false);
      }
      // **** END OF AUTHORIZATION CHECK ****

    } catch (error) {
      console.error("Google Sign-In Error:", error);
      // Handle specific errors like 'auth/popup-closed-by-user' gracefully
      if (error.code === 'auth/popup-closed-by-user') {
        setError("Sign-in process was cancelled.");
      } else if (error.code === 'auth/cancelled-popup-request') {
        // Ignore this error or treat as cancellation if another popup was opened.
        console.log("Popup request was cancelled, possibly due to another popup.")
      }
      else {
        setError(error.message || "Failed to sign in with Google. Please try again.");
      }
      setIsLoading(false);
    }
  };

  return (
    <>

      {error && (
        <div className="my-4 text-sm text-red-600 p-3 bg-red-100 rounded-md">
          {error}
        </div>
      )}

      <Buttons> {/* This component usually handles layout of multiple buttons */}
        {/* <Button type="submit" color="info" label="Login" disabled={isLoading} /> */}
        <Button
          type="button" // Important: not submit if it's not part of a form submit
          color="info" // Or a color that suits a Google button
          label={isLoading ? "Signing in..." : "Sign In with Google"}
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="w-full" // Make it full width perhaps
          // You can add a Google icon here if your Button component supports it
        />
      </Buttons>
    </>
  );
};

export default LoginForm;