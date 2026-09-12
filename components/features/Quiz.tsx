"use client";

import { useEffect, useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { MentorNote } from "@/components/ui/MentorNote";
import { ResultBox, StatusPill } from "@/components/ui/ResultBox";
import { useOrgType } from "@/lib/orgType";
import { useLocalStorageState } from "@/lib/useLocalStorageState";
import {
  blankProgress,
  calcQuizScore,
  drawQuiz,
  NONPROFIT_QUESTIONS,
  QUIZ_LENGTH,
  resolveQuestion,
  STANDARD_QUESTIONS,
  type QuizProgress,
} from "@/lib/quiz";

/**
 * Financial IQ Quiz — new build (see lib/quiz.ts header for why this
 * isn't a port of anything, and for why questions are drawn randomly
 * rather than fixed). Each question answers immediately on click rather
 * than waiting for a "submit all" step — the explanation is the point,
 * not just the score, so it shows up while the question is still fresh
 * instead of at the end of a 12-question list.
 *
 * Two independent question pools, two independent localStorage keys
 * (wc.quiz.standard / wc.quiz.nonprofit) — same "keep both simultaneously"
 * pattern used for Budgeting's income fields and the S-Corp/UBIT
 * calculators, so toggling Nonprofit Mode mid-quiz never wipes out
 * progress on the other set.
 *
 * The draw itself (which 12 of the ~20 pool questions, in what order,
 * with each question's own options also shuffled) is decided ONCE per
 * quiz run and stored alongside the answers — not recomputed on every
 * render — so a mid-quiz page reload shows the same draw the person was
 * already answering. A fresh draw only happens when there's no saved
 * draw yet (first visit, or right after "New Quiz") — and only once
 * useLocalStorageState's own hydration effect has had its chance to load
 * a real saved draw first; racing ahead of that would silently overwrite
 * an in-progress quiz with a brand new random one on every reload, which
 * an early version of this effect actually did before this comment was
 * written.
 */

export function Quiz() {
  const [orgType] = useOrgType();
  const nonprofit = orgType === "nonprofit";
  const pool = nonprofit ? NONPROFIT_QUESTIONS : STANDARD_QUESTIONS;
  const storageKey = nonprofit ? "wc.quiz.nonprofit" : "wc.quiz.standard";

  const [progress, setProgress, hydrated] = useLocalStorageState<QuizProgress>(storageKey, blankProgress());

  // Draw a fresh quiz only once hydration has confirmed there's nothing
  // already saved to resume — see the file header for why `hydrated` matters.
  useEffect(() => {
    if (hydrated && progress.draw.length === 0) {
      setProgress({ draw: drawQuiz(pool, QUIZ_LENGTH), answers: Array(QUIZ_LENGTH).fill(null) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, progress.draw.length, nonprofit]);

  const score = useMemo(() => calcQuizScore(pool, progress), [pool, progress]);

  function selectAnswer(qIndex: number, optionIndex: number) {
    setProgress((p) => {
      const answers = [...p.answers];
      answers[qIndex] = optionIndex;
      return { ...p, answers };
    });
  }

  function newQuiz() {
    setProgress({ draw: drawQuiz(pool, QUIZ_LENGTH), answers: Array(QUIZ_LENGTH).fill(null) });
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
          ? "Twelve questions, freshly drawn each run from a larger pool covering the nonprofit panels in this app — mileage, budgeting, filing, and donation receipts. Answer one at a time; the explanation shows up right away, not just at the end."
          : "Twelve questions, freshly drawn each run from a larger pool covering the calculators in this app — mileage, budgeting, break-even, debt payoff, and more. Answer one at a time; the explanation shows up right away, not just at the end."
      }
    >
      <MentorNote>
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
      </MentorNote>

      {progress.draw.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          Drawing your quiz…
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {progress.draw.map((dq, qi) => {
            const q = resolveQuestion(pool, dq);
            const selected = progress.answers[qi];
            const answered = selected !== null && selected !== undefined;
            const isCorrect = answered && selected === q.correctIndex;

            return (
              <div key={qi} className="card" style={{ boxShadow: "none" }}>
                <div className="flex items-start justify-between gap-3">
                  <h4 className="mt-0" style={{ color: "var(--navy)" }}>
                    {qi + 1}. {q.question}
                  </h4>
                  {answered && (
                    <StatusPill tone={isCorrect ? "good" : "critical"}>{isCorrect ? "Correct" : "Not quite"}</StatusPill>
                  )}
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
      )}

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
        <button type="button" className="btn ghost" onClick={newQuiz}>
          New Quiz (fresh set of questions)
        </button>
      </div>

      <p className="text-sm" style={{ color: "var(--muted)" }}>
        This isn&apos;t about memorizing every rule — it&apos;s about knowing enough to ask your advisor the right
        question, and to catch it when a number sounds off.
      </p>
    </Card>
  );
}
