import { Form990Compliance } from "@/components/features/Form990";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "990 Compliance" };

export default function Form990Page() {
  return <Form990Compliance />;
}
