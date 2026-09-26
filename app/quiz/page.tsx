import { Quiz } from "@/components/features/Quiz";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Financial IQ Quiz" };

export default function QuizPage() {
  return <Quiz />;
}
