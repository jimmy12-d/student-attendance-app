
// app/_components/PillTag/Plain.tsx
// app/_components/PillTag/index.tsx
import React, { ReactNode } from "react";
import { ColorKey } from "../../_interfaces";
import { colorsBgLight, colorsOutline } from "../../_lib/colors";
import PillTagPlain from "./Plain";

type Props = {
  label?: string;
  color: ColorKey;
  icon?: string | null;
  small?: boolean;
  outline?: boolean;
  className?: string;
  isGrouped?: boolean;
  onClick?: () => void;     // Existing onClick for the whole pill
  onIconClick?: () => void; // <-- ADD onIconClick PROP
  labelClassName?: string;
  children?: ReactNode;
};

const PillTag = ({
  small = false,
  outline = false,
  className = "",
  onClick,
  onIconClick, // <-- DESTRUCTURE onIconClick
  labelClassName,
  ...props
}: Props) => {
  const layoutClassName = small ? "py-1 px-3" : "py-1 px-3";
  const colorClassName = outline
    ? colorsOutline[props.color]
    : colorsBgLight[props.color];
  const groupedClassName = props.isGrouped ? "mr-3 last:mr-0 mb-3" : "";
  
  // If either onClick or onIconClick is present, the whole pill might appear clickable or parts of it.
  // The interactiveClassName for cursor-pointer applies if the whole pill is clickable.
  // The icon itself will get a cursor if onIconClick is set.
  const interactiveClassName = onClick && !onIconClick ? "cursor-pointer" : ""; // Only make whole pill cursor-pointer if no specific icon click

  return (
    <PillTagPlain
      className={`border rounded-full ${layoutClassName} ${colorClassName} ${groupedClassName} ${interactiveClassName} ${className}`}
      icon={props.icon}
      label={props.label}
      small={small} // This still controls padding and default icon size for PillTagPlain
      onClick={onClick} // Pass onClick for the whole pill
      onIconClick={onIconClick} // <-- PASS onIconClick TO PillTagPlain
      labelClassName={labelClassName}
    />
  );
};

export default PillTag;