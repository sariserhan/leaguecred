import { sendEmail } from "@/lib/email";
import { failedJobSteps, type JobStepsResult } from "@/lib/job-steps";
import { formatServerError } from "@/lib/observability";

/**
 * Finishes a cron run: reports it, then answers.
 *
 * A failed step already returns a 500, which marks the run failed in Vercel's
 * cron log — but that log has to be opened by somebody who suspects there is
 * something in it. For a product run by one person, the difference between a
 * settlement that failed on Friday and one noticed on Monday is the difference
 * between a fixable night and a weekend of records nobody could trust.
 *
 * So a failure also goes to ALERT_EMAIL when one is set. Unset, this is exactly
 * the behaviour that was here before, minus the silence in the log.
 */
export async function completeJobRun(jobName: string, outcome: JobStepsResult): Promise<Response> {
  const failures = failedJobSteps(outcome.results);

  if (failures.length > 0) {
    for (const failure of failures) {
      console.error(formatServerError({
        scope: "job",
        message: failure.message,
        route: `${jobName}:${failure.name}`,
      }));
    }
    await alert(jobName, failures);
  }

  return Response.json({ ok: outcome.ok, ...outcome.results }, { status: outcome.ok ? 200 : 500 });
}

/**
 * Written here rather than in `email-templates.ts` on purpose: everything there
 * is addressed to a member and wrapped in the branded layout with a call to
 * action. This is a log line sent to whoever runs the site, and dressing it up
 * as product mail would only make it slower to read.
 */
async function alert(jobName: string, failures: Array<{ name: string; message: string }>) {
  const recipient = process.env.ALERT_EMAIL?.trim();
  if (!recipient) return;

  const lines = failures.map((failure) => `- ${failure.name}: ${failure.message}`).join("\n");
  const subject = `LeagueCred: ${jobName} failed ${failures.length} step${failures.length === 1 ? "" : "s"}`;

  // Never throws, and a failure to send is logged by the transport. An alert
  // that could take the job down with it would be worse than no alert.
  await sendEmail(recipient, {
    subject,
    text: `${subject}\n\n${lines}\n\nEvery step is idempotent, so the next scheduled run retries whatever failed.`,
    html: `<p>${subject}</p><pre>${lines.replace(/[<&]/g, (c) => (c === "<" ? "&lt;" : "&amp;"))}</pre>`,
  });
}
