import React, { ReactNode } from "react";
import Icon from "../Icon";
import IconRounded from "../Icon/Rounded";

type Props = {
  icon: string;
  title: string;
  main?: boolean;
  children?: ReactNode;
};

export default function SectionTitleLineWithButton({
  icon,
  title,
  main = false,
  children,
}: Props) {

  return (
    <section
      className={`${main ? "" : "pt-6"} mb-6 flex items-center justify-between`}
    >
      <div className="flex items-center justify-start">
        {icon && main && (
          <IconRounded icon={icon} color="light" className="mr-3" bg />
        )}
        {icon && !main && <Icon path={icon} className="mr-2" size="20" />}
        <h1 className={`leading-tight ${main ? "text-3xl" : "text-2xl"}`}>
          {title}
        </h1>
      </div>
      {children}
      {/* {!hasChildren && <Button icon={mdiCog} color="whiteDark" />} */}
    </section>
  );
}
