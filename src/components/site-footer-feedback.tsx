"use client";

import { useState, useTransition } from "react";
import { CheckIcon } from "lucide-react";

import { submitSiteFeedback } from "@/app/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";

type Kind = "bug" | "contact" | "support";

const copy: Record<Kind, { label: string; title: string; description: string; placeholder: string }> = {
  bug: {
    label: "Report a bug",
    title: "Report a bug",
    description: "Tell us what went wrong and where. Include what you expected to happen instead.",
    placeholder: "What happened, and what page were you on?",
  },
  contact: {
    label: "Contact",
    title: "Contact us",
    description: "Send a general message to the LeagueCred team.",
    placeholder: "What's on your mind?",
  },
  support: {
    label: "Support",
    title: "Get support",
    description: "Stuck on something with your account or a league? Tell us what you need.",
    placeholder: "What do you need help with?",
  },
};

function FeedbackDialog({ kind }: { kind: Kind }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();
  const text = copy[kind];

  function reset() {
    setSent(false);
    setMessage("");
    setEmail("");
    setError(null);
  }

  function submit() {
    if (!message.trim() || pending) return;
    startTransition(async () => {
      const result = await submitSiteFeedback(kind, message, email.trim() || undefined);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setError(null);
      setSent(true);
    });
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) reset(); }}>
      <DialogTrigger render={<button type="button" className="transition-colors hover:text-background" />}>{text.label}</DialogTrigger>
      <DialogContent className="rounded-none sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading text-3xl font-extrabold uppercase">{text.title}</DialogTitle>
          <DialogDescription>{text.description}</DialogDescription>
        </DialogHeader>
        {sent ? (
          <p className="text-sm">Thanks — we&apos;ve got it, and will follow up if you left an email.</p>
        ) : (
          <div className="grid gap-3">
            <label className="grid gap-1 text-sm font-semibold">
              Message
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                maxLength={2000}
                rows={5}
                placeholder={text.placeholder}
                disabled={pending}
                className="border bg-background px-3 py-2 text-sm font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              Email (optional)
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                disabled={pending}
                className="border bg-background px-3 py-2 text-sm font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>
            {error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}
          </div>
        )}
        <DialogFooter>
          {sent ? (
            <Button onClick={() => setOpen(false)}>Close</Button>
          ) : (
            <Button onClick={submit} disabled={pending || !message.trim()}>
              {pending ? <Spinner data-icon="inline-start" /> : <CheckIcon data-icon="inline-start" />}Send
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function FooterHelpLinks() {
  return (
    <ul className="mt-3 space-y-2 text-sm text-background/75">
      <li><FeedbackDialog kind="bug" /></li>
      <li><FeedbackDialog kind="contact" /></li>
      <li><FeedbackDialog kind="support" /></li>
    </ul>
  );
}
