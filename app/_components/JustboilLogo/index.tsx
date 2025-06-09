import React from "react";

// Define the props it will accept
interface RodwellLogoProps {
  className?: string;
  width?: number;  // Accept width as a number (pixels)
  height?: number; // Accept height as a number (pixels)
}

export default function RodwellLogo({
  className = "",
  width,  // Destructure width
  height, // Destructure height
}: RodwellLogoProps) {
  // Determine styles. If width/height are passed, use them. Otherwise, fall back to Tailwind defaults.
  const imageStyles: React.CSSProperties = {};
  let imageClassName = `m-2 ${className}`; // Keep m-2 and passed className by default

  if (width !== undefined && height !== undefined) {
    imageStyles.width = `${width}px`;
    imageStyles.height = `${height}px`;
    // If width/height props are provided, we might not want the w-12 h-12 Tailwind classes.
  } else {
    // Fallback to Tailwind classes if width/height props are not provided
    imageClassName = `w-12 h-12 m-2 ${className}`;
  }

  return (
    <img
      src="/rodwell_logo.png"
      alt="Rodwell Logo"
      className={imageClassName} // Apply Tailwind classes (potentially without w-12 h-12 if style is used)
      style={imageStyles}      // Apply inline styles for width and height if provided
      draggable={false}
    />
  );
}