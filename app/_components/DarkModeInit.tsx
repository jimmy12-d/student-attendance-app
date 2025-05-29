"use client";
import { useEffect } from "react";

export default function DarkModeInit() {
  useEffect(() => {
    const stored = localStorage.getItem('darkMode');
    const isDark = stored === null ? true : stored === '1';
    document.body.classList[isDark ? "add" : "remove"]("dark-scrollbars");
    document.documentElement.classList[isDark ? "add" : "remove"]("dark", "dark-scrollbars-compat");
  }, []);
  return null;
}