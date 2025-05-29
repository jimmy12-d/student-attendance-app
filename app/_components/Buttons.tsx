import type { ReactNode } from "react";

type Props = {
  type?: string;
  mb?: string;
  noWrap?: boolean;
  classAddon?: string; // Not used in the provided snippet, but defined
  children: ReactNode; // <--- THIS IS CORRECT
  className?: string;
};

const Buttons = ({
  type = "justify-start",
  mb = "-mb-3",
  noWrap = false,
  children,      // <--- CORRECTLY DESTRUCTURED
  className,
}: Props) => {
  return (
    <div
      className={`flex items-center ${type} ${className} ${mb} ${
        noWrap ? "flex-nowrap" : "flex-wrap"
      }`}
    >
      {children} {/* <--- CORRECTLY RENDERED */}
    </div>
  );
};

export default Buttons;