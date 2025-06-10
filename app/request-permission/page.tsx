// app/request-permission/page.tsx
import SectionMain from "../_components/Section/Main";
import CardBox from "../_components/CardBox";
import SectionTitleLineWithButton from "../_components/Section/TitleLineWithButton";
import PermissionRequestForm from "./_components/PermissionRequestForm";// We will create this next
import { mdiFileDocumentCheckOutline } from "@mdi/js";
export default function RequestPermissionPage() {
  return (
    // We use SectionMain to give it a consistent, centered layout on a plain background
    <SectionMain> 
      <CardBox className="max-w-2xl mx-auto">
        <SectionTitleLineWithButton
          icon={mdiFileDocumentCheckOutline}
          title="Permission Request Form"
          main
        />
        <PermissionRequestForm />
      </CardBox>
    </SectionMain>
  );
}