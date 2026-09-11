"use client";

import { useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { ResultBox, StatusPill } from "@/components/ui/ResultBox";
import { useOrgType } from "@/lib/orgType";
import { useLocalStorageState } from "@/lib/useLocalStorageState";
import {
  blankProgress,
  calcQuizScore,
  NONPROFIT_QUESTIONS,
  STANDARD_QUESTIONS,
  type QuizProgress,
} from "@/lib/quiz";

/**
 * Financial IQ Quiz — new build (see lib/quiz.ts header for why this
 * isn't a port of anything). Each question answers immediately on
 * click rather than waiting for a "submit all" step — the explanation
 * is the point, not just the score, so it shows up while the question
 * is still fresh instead of at the end of a 12-question list.
 *
 * Two independent question sets, two independent localStorage keys
 * (wc.quiz.standard / wc.quiz.nonprofit) — same "keep both simultaneously"
 * pattern used for Budgeting's income fields and the S-Corp/UBIT
 * calculators, so toggling Nonprofit Mode mid-quiz never wipes out
 * progress on the other set.
 */

const QUIZ_COUNT = STANDARD_QUESTIONS.length; // both sets are the same length

export function Quiz() {
  const [orgType] = useOrgType();
  const nonprofit = orgType === "nonprofit";
  const questions = nonprofit ? NONPROFIT_QUESTIONS : STANDARD_QUESTIONS;
  const storageKey = nonprofit ? "wc.quiz.nonprofit" : "wc.quiz.standard";

  const [progress, setProgress] = useLocalStorageState<QuizProgress>(storageKey, blankProgress(QUIZ_COUNT));

  const score = useMemo(() => calcQuizScore(questions, progress), [questions, progress]);

  function selectAnswer(qIndex: number, optionIndex: number) {
    setProgress((p) => {
      const answers = [...p.answers];
      answers[qIndex] = optionIndex;
      return { answers };
    });
  }

  function restart() {
    setProgress(blankProgress(QUIZ_COUNT));
  }

  let tone: "good" | "warning" | "critical" = "warning";
  let verdict = "Answer every question to see your final score.";
  if (score.complete) {
    const pct = score.correct / score.total;
    if (pct >= 0.75) {
      tone = "good";
      verdict = "Solid grasp of the fundamentals.";
    } else if (pct >= 0.5) {
      tone = "warning";
      verdict = "A decent start — worth another pass through the panels you missed.";
    } else {
      tone = "critical";
      verdict = "This is exactly what the quiz is for — go revisit the panels these questions came from.";
    }
  }

  return (
    <Card
      title="Financial IQ Quiz"
      lede={
        nonprofit
          ? "Twelve questions pulled straight from the nonprofit panels in this app — mileage, budgeting, filing, and donation receipts. Answer one at a time; the explanation shows up right away, not just at the end."
          : "Twelve questions pulled straight from the calculators in this app — mileage, budgeting, break-even, debt payoff, and more. Answer one at a time; the explanation shows up right away, not just at the end."
      }
    >
      <div className="mentor">
        <div>
          <span className="eyebrow">Mentor&apos;s Note</span>
          {nonprofit ? (
            <>
              The Bhagavad Gita calls knowledge &quot;the ultimate purifier&quot; — not knowledge for its own sake,
              but knowledge that lets you act rightly on behalf of something bigger than yourself. A board or
              staff member who actually understands these rules serves the mission better than one who just
              trusts the paperwork.
            </>
          ) : (
            <>
              Stevie Wonder kept singing &quot;I&apos;m so glad that I know&quot; on his way to <b>higher ground</b>{" "}
              — getting a question wrong here costs nothing. Not knowing it out in the world can cost real
              money.
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {questions.map((q, qi) => {
          const selected = progress.answers[qi];
          const answered = selected !== null && selected !== undefined;
          const isCorrect = answered && selected === q.correctIndex;

          return (
            <div key={qi} className="card" style={{ boxShadow: "none" }}>
              <div className="flex items-start justify-between gap-3">
                <h4 className="mt-0" style={{ color: "var(--navy)" }}>
                  {qi + 1}. {q.question}
                </h4>
                {answered && <StatusPill tone={isCorrect ? "good" : "critical"}>{isCorrect ? "Correct" : "Not quite"}</StatusPill>}
              </div>

              <div className="mt-2 flex flex-col gap-2">
                {q.options.map((opt, oi) => {
                  let bg = "transparent";
                  let border = "var(--line)";
                  let color = "var(--ink)";
                  if (answered) {
                    if (oi === q.correctIndex) {
                      bg = "var(--status-good-bg)";
                      border = "var(--status-good)";
                      color = "var(--status-good)";
                    } else if (oi === selected) {
                      bg = "var(--status-critical-bg)";
                      border = "var(--status-critical)";
                      color = "var(--status-critical)";
                    }
                  }
                  return (
                    <button
                      key={oi}
                      type="button"
                      onClick={() => selectAnswer(qi, oi)}
                      className="text-left text-sm"
                      style={{
                        padding: "10px 14px",
                        borderRadius: 8,
                        border: `1px solid ${border}`,
                        background: bg,
                        color,
                        cursor: "pointer",
                        fontWeight: answered && (oi === q.correctIndex || oi === selected) ? 600 : 400,
                      }}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>

              {answered && (
                <div className="note mt-2">
                  <b>{isCorrect ? "Right — " : "Correct answer: " + q.options[q.correctIndex] + ". "}</b>
                  {q.explanation}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <ResultBox
        label={score.complete ? "Final Score" : "Progress"}
        big={`${score.correct} / ${score.total} correct`}
        stats={[
          { v: String(score.answered), k: "answered" },
          { v: String(score.total - score.answered), k: "remaining" },
        ]}
      />

      <div className="flex items-center gap-3">
        <StatusPill tone={tone}>{verdict}</StatusPill>
        <button type="button" className="btn ghost" onClick={restart}>
          Restart Quiz
        </button>
      </div>

      <p className="text-sm" style={{ color: "var(--muted)" }}>
        This isn&apos;t about memorizing every rule — it&apos;s about knowing enough to ask your advisor the right
        question, and to catch it when a number sounds off.
      </p>
    </Card>
  );
}
