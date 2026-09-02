"use client";

import { useState, useSyncExternalStore } from "react";
import { DownloadIcon, PlusSquareIcon, ShareIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";
import { isIosDevice } from "@/lib/pwa";

/** Chrome and Edge hand this event over instead of prompting themselves, on the
 *  understanding that the page will ask at a better moment. Not in lib.dom yet. */
type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const NEVER_CHANGES = () => () => {};

/** Read on the client only — the server has no idea how the page will be
 *  displayed, so every one of these starts false and settles on hydration. */
function useBrowserFact(subscribe: (onChange: () => void) => () => void, read: () => boolean) {
  return useSyncExternalStore(subscribe, read, () => false);
}

function subscribeToDisplayMode(onChange: () => void) {
  const query = window.matchMedia("(display-mode: standalone)");
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function subscribeToInstall(onChange: () => void) {
  window.addEventListener("appinstalled", onChange);
  return () => window.removeEventListener("appinstalled", onChange);
}

let installPrompt: InstallPromptEvent | null = null;
let alreadyInstalled = false;

// Both are caught at module scope because the browser fires them once, often
// before the footer has mounted, and neither is replayed for a listener that
// arrives late. Preventing the default on the first is what stops Chrome
// showing its own mini-infobar and hands the timing to the button below.
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    installPrompt = event as InstallPromptEvent;
    window.dispatchEvent(new Event("leaguecred:installable"));
  });
  window.addEventListener("appinstalled", () => {
    alreadyInstalled = true;
    installPrompt = null;
  });
}

function subscribeToInstallability(onChange: () => void) {
  window.addEventListener("leaguecred:installable", onChange);
  return () => window.removeEventListener("leaguecred:installable", onChange);
}

export function InstallApp({ className }: { className?: string }) {
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const standalone = useBrowserFact(
    subscribeToDisplayMode,
    () =>
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true,
  );
  const installed = useBrowserFact(subscribeToInstall, () => alreadyInstalled);
  const installable = useBrowserFact(subscribeToInstallability, () => installPrompt !== null);
  // Safari fires no install event, so an iPhone gets the Share-sheet
  // instructions rather than a button that could not do anything.
  const needsIosHelp = useBrowserFact(NEVER_CHANGES, () =>
    isIosDevice(window.navigator.userAgent, window.navigator.maxTouchPoints),
  );

  if (standalone || installed || dismissed || (!installable && !needsIosHelp)) return null;

  async function install() {
    const prompt = installPrompt;
    if (!prompt) return;
    // The event is single-use: once prompted it cannot be prompted again, so
    // the button goes with it until the browser offers another one.
    installPrompt = null;
    setDismissed(true);
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") {
      toast.add({ title: "LeagueCred installed", description: "It is on your home screen now.", type: "success" });
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className={className}
        onClick={() => (needsIosHelp ? setShowIosHelp(true) : void install())}
      >
        <DownloadIcon data-icon="inline-start" />
        Install app
      </Button>
      <Dialog open={showIosHelp} onOpenChange={setShowIosHelp}>
        <DialogContent className="rounded-none sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading text-3xl font-extrabold uppercase">Add to Home Screen</DialogTitle>
            <DialogDescription>
              Safari installs an app from the Share sheet rather than a prompt, so it takes two taps.
            </DialogDescription>
          </DialogHeader>
          <ol className="grid gap-3 text-sm">
            <li className="flex items-center gap-3">
              <ShareIcon aria-hidden="true" className="size-5 shrink-0 text-primary" />
              Tap Share on the Safari toolbar.
            </li>
            <li className="flex items-center gap-3">
              <PlusSquareIcon aria-hidden="true" className="size-5 shrink-0 text-primary" />
              Choose <span className="font-semibold">Add to Home Screen</span>, then Add.
            </li>
          </ol>
          <DialogFooter>
            <Button onClick={() => setShowIosHelp(false)}>Got it</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
