"use client";

import { FormEvent, useState, useTransition } from "react";
import { MessageCircleIcon, SendIcon } from "lucide-react";

import { addGameDiscussion } from "@/app/leagues/actions";
import type { GameDiscussion } from "@/data/leagues";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

export function GameDiscussion({ fixtureId, initialComments }: { fixtureId: string; initialComments: GameDiscussion[] }) {
  const [comments] = useState(initialComments);
  const [body, setBody] = useState("");
  const [open, setOpen] = useState(initialComments.length > 0);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await addGameDiscussion(fixtureId, body);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setBody("");
      setOpen(true);
      window.location.reload();
    });
  }

  return (
    <div className="col-span-3 row-start-4 border-t pt-2 sm:col-span-1 sm:col-start-1 sm:row-start-2 sm:col-end-4">
      <button type="button" onClick={() => setOpen((value) => !value)} className="flex w-full cursor-pointer items-center gap-2 px-1 py-2 text-left text-xs font-bold uppercase tracking-wide text-muted-foreground hover:text-foreground">
        <MessageCircleIcon className="size-4" aria-hidden="true" />
        Discuss this game{comments.length ? ` (${comments.length})` : ""}
      </button>
      {open ? (
        <div className="space-y-3 px-1 pb-1">
          {comments.length ? <div className="space-y-2">{comments.map((comment) => <article key={comment.id} className="border-l-2 border-primary/50 pl-3 text-sm"><p className="text-xs font-semibold text-muted-foreground">{comment.author}</p><p className="whitespace-pre-wrap">{comment.body}</p></article>)}</div> : <p className="text-sm text-muted-foreground">No ideas yet. Start the conversation.</p>}
          <form onSubmit={submit} className="flex gap-2">
            <label className="sr-only" htmlFor={`discussion-${fixtureId}`}>Your idea about this game</label>
            <input id={`discussion-${fixtureId}`} value={body} onChange={(event) => setBody(event.target.value)} maxLength={1000} placeholder="Share your idea about the game..." className="min-w-0 flex-1 border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" disabled={pending} />
            <Button type="submit" size="sm" disabled={pending || !body.trim()}>{pending ? <Spinner data-icon="inline-start" /> : <SendIcon data-icon="inline-start" />}Post</Button>
          </form>
          <p className="text-xs text-muted-foreground">No login required. Guests appear as guest123.</p>
          {error ? <p className="text-xs font-semibold text-destructive">{error}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
