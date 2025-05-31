// Corrected app/page.tsx for redirecting
"use client"; // Required for useEffect and client-side redirect

import { useEffect } from 'react'; // useEffect is needed
import { redirect } from 'next/navigation';

export default function HomePage() {
  useEffect(() => {
    redirect('/dashboard');
  }, []);

  return null;
}