import React, { ReactNode } from "react";
import { containerMaxW } from "../../_lib/config";

type Props = {
  children: ReactNode;
};

export default function FooterBar({ children }: Props) {
  return (
    <footer className={`py-2 px-6 ${containerMaxW}`}>
      {/* No Footer */}
    </footer>
  );
}
