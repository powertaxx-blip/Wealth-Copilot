client";

import { useState } from "react";
import type { EstimatorInput, EstimatorResult } from "@/lib/tax";

type AIState = "idle" | "loading" | "success" | "error";

type ExplainResponse = { summary: string; tips: string[] };

export function AIInsightPanel({ status, kids, result }: { status: EstimatorInput["status"]; kids: number; result: EstimatorResult }) {
  const [state, setState] = useState<AIState>("idle");
  const [data, setData] = useState<ExplainResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function run() {
    setState("loading");
    setErrorMsg(null);
    try {
      const res = await fetch("/api/es
