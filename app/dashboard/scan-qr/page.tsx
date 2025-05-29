"use client";

import {
  mdiAccount,
  mdiBallotOutline,
  mdiGithub,
  mdiMail,
  mdiQrcode,
  mdiUpload,
} from "@mdi/js";
import { Field, Form, Formik } from "formik";
import Head from "next/head";
import Button from "../../_components/Button";
import Buttons from "../../_components/Buttons";
import Divider from "../../_components/Divider";
import CardBox from "../../_components/CardBox";
import FormCheckRadio from "../../_components/FormField/CheckRadio";
import FormCheckRadioGroup from "../../_components/FormField/CheckRadioGroup";
import FormField from "../../_components/FormField";
import FormFilePicker from "../../_components/FormField/FilePicker";
import SectionMain from "../../_components/Section/Main";
import SectionTitle from "../../_components/Section/Title";
import SectionTitleLineWithButton from "../../_components/Section/TitleLineWithButton";
import { getPageTitle } from "../../_lib/config";
import FieldLabel from "../../_components/FormField/FieldLabel";
import AttendanceScanner from "../scan-qr/AttendanceScanner"; // <-- Import the scanner

export default function FormsPage() {
  return (
    <>
      <Head>
        <title>{getPageTitle("Forms")}</title>
      </Head>

      <SectionMain>
        <SectionTitleLineWithButton
          icon={mdiQrcode}
          title="Scan QR Code"
          main
        >
        </SectionTitleLineWithButton>
          <AttendanceScanner>
          </AttendanceScanner>
      </SectionMain>

      {/* ...rest of your page... */}
    </>
  );
}