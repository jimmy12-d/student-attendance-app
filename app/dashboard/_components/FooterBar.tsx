import React, { ReactNode } from "react";
import { containerMaxW } from "../../_lib/config";
import JustboilLogo from "../../_components/JustboilLogo";

type Props = {
  children: ReactNode;
};

export default function FooterBar({ children }: Props) {
  const year = new Date().getFullYear();

  return (
    <footer className={`py-2 px-6 ${containerMaxW}`}>
      {/* No Footer */}
    </footer>
  );
}
