import React, { ReactNode } from "react";
import { containerMaxW } from "../../_lib/config";

type Props = {
  children: ReactNode;
};

export default function SectionMain({ children }: Props) {
  return <section className={`bg-gray-100 dark:bg-gray-800 p-6 ${containerMaxW}`}>{children}</section>;
}
