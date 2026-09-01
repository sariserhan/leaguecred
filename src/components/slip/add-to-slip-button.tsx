"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckIcon, PlusIcon } from "lucide-react";

import { addSlipCandidate } from "@/app/slip/actions";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";

/**
 * Sets a match aside from wherever it is being read.
 *
 * The same one press everywhere a match appears, because the moment a match is
 * worth a thought is the moment it is in front of you - going somewhere else to
 * note it down is how it gets forgotten instead. It commits nothing: the slip
 * dock is where a side is chosen and the lock is made.
 */
export function AddToSlipButton({
  fixtureId,
  label,
  inSlip = false,
  disabled = false,
  size = "sm",
  variant = "outline",
  className,
}: {
  fixtureId: string;
  /** What the toast should name, usually "Home v Away". */
  label: string;
  inSlip?: boolean;
  disabled?: boolean;
  size?: "sm" | "default";
  variant?: "outline" | "ghost" | "secondary";
  className?: string;
}) {
  const router = useRouter();
  const [added, setAdded] = useState(inSlip);
  const [pending, startTransition] = useTransition();

  function add() {
    startTransition(async () => {
      const result = await addSlipCandidate(fixtureId);
      if (result.ok) {
        setAdded(true);
        toast.add({ title: "On your slip", description: `${label} is waiting for you to decide.`, type: "success" });
        // The dock is rendered by the layout, so it only learns of this on a
        // refresh of the server render.
        router.refresh();
      } else {
        toast.add({ title: "Not added", description: result.message, type: "error" });
      }
    });
  }

  return (
    <Button
      size={size}
      variant={added ? "secondary" : variant}
      className={className}
      disabled={disabled || pending || added}
      onClick={add}
      aria-label={added ? `${label} is on your slip` : `Add ${label} to your slip`}
    >
      {added ? <CheckIcon data-icon="inline-start" /> : <PlusIcon data-icon="inline-start" />}
      {added ? "On your slip" : "Slip"}
    </Button>
  );
}
