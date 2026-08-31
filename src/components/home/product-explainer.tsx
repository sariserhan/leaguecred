import {
  BadgeCheckIcon,
  ChartNoAxesColumnIncreasingIcon,
  ClipboardCheckIcon,
  EyeIcon,
  ListChecksIcon,
  LockKeyholeIcon,
  MinusIcon,
  PlusIcon,
  ScaleIcon,
  SearchIcon,
  ShieldCheckIcon,
  TargetIcon,
  TrophyIcon,
  UserRoundCheckIcon,
  UserRoundPlusIcon,
  UsersRoundIcon,
} from "lucide-react";

const proveSteps = [
  { text: "Choose a league you genuinely follow.", icon: TrophyIcon },
  { text: "Select one team before the deadline.", icon: TargetIcon },
  { text: "Your pick becomes permanent.", icon: LockKeyholeIcon },
  { text: "The result builds your league-specific record.", icon: ChartNoAxesColumnIncreasingIcon },
  { text: "Specialist calls become visible after you lock.", icon: EyeIcon },
] as const;

const followSteps = [
  { text: "Open a league you don’t know well.", icon: SearchIcon },
  { text: "Choose Follow Experts.", icon: UsersRoundIcon },
  { text: "Give up an independent pick for that league and week.", icon: ListChecksIcon },
  { text: "Reveal specialists with proven records.", icon: BadgeCheckIcon },
  { text: "Follow one call with clear attribution.", icon: UserRoundCheckIcon },
] as const;

const recordFields = [
  {
    title: "Accuracy",
    description: "Wins divided by settled independent picks.",
    icon: TargetIcon,
  },
  {
    title: "Settled picks",
    description: "Completed Daily Locks with a final result.",
    icon: ClipboardCheckIcon,
  },
  {
    title: "Confidence-adjusted",
    description: "Accuracy weighted by the amount of evidence behind it.",
    icon: ScaleIcon,
  },
  {
    title: "Followed calls",
    description: "Tracked separately. They never build your expertise record.",
    icon: UsersRoundIcon,
  },
] as const;

const questions = [
  {
    question: "Is this betting?",
    answer:
      "No. LeagueCred records predictions and reputation. It does not accept stakes or pay winnings.",
  },
  {
    question: "Can I change my pick?",
    answer:
      "No. A Daily Lock is permanent once submitted, so every record reflects the call that was actually made before the deadline.",
  },
  {
    question: "Can I pick in multiple leagues?",
    answer:
      "Yes. You can make one independent Daily Lock in each league you know, for every available matchweek.",
  },
  {
    question: "What happens if a match is cancelled?",
    answer:
      "A cancelled or abandoned fixture is treated as void. It does not add a win or a loss to your record.",
  },
  {
    question: "Why are specialist picks hidden?",
    answer:
      "They stay hidden until you lock or choose Follow Experts, preventing a borrowed call from being presented as independent expertise.",
  },
] as const;

function PathSteps({
  steps,
  dark = false,
}: {
  steps: typeof proveSteps | typeof followSteps;
  dark?: boolean;
}) {
  return (
    <ol className={dark ? "divide-y divide-background/20 border-y border-background/20" : "divide-y border-y"}>
      {steps.map((step, index) => {
        const Icon = step.icon;

        return (
          <li key={step.text} className="grid grid-cols-[2rem_2rem_1fr] items-center gap-3 py-4 sm:grid-cols-[2.5rem_2.5rem_1fr] sm:gap-4 sm:py-5">
            <span className="font-heading text-2xl font-bold text-primary sm:text-3xl">
              {index + 1}
            </span>
            <Icon aria-hidden="true" className="size-6" strokeWidth={1.5} />
            <span className="font-semibold leading-6">{step.text}</span>
          </li>
        );
      })}
    </ol>
  );
}

export function ParticipationPaths() {
  return (
    <section className="page-shell py-14 sm:py-20" aria-labelledby="paths-heading">
      <div className="mb-8 flex items-end gap-5 sm:mb-10">
        <div className="h-px flex-1 bg-border" aria-hidden="true" />
        <UserRoundPlusIcon aria-hidden="true" className="size-8 text-primary" strokeWidth={1.5} />
        <div className="h-px flex-1 bg-border" aria-hidden="true" />
      </div>
      <h2 id="paths-heading" className="section-title text-center">
        Choose your path each matchweek.
      </h2>

      <div className="relative mt-8 grid border lg:grid-cols-2">
        <article className="bg-foreground p-6 text-background sm:p-8 lg:p-10">
          <div className="mb-6 flex items-center gap-4 border-b border-primary pb-5">
            <TrophyIcon aria-hidden="true" className="size-8 text-primary" strokeWidth={1.5} />
            <h3 className="font-heading text-3xl font-bold uppercase sm:text-4xl">
              Prove your knowledge
            </h3>
          </div>
          <PathSteps steps={proveSteps} dark />
        </article>

        <div className="absolute top-1/2 left-1/2 z-10 hidden size-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 border-background bg-foreground font-heading text-xl font-bold text-background lg:flex">
          OR
        </div>

        <article className="border-t p-6 sm:p-8 lg:border-t-0 lg:border-l lg:p-10">
          <div className="mb-6 flex items-center gap-4 border-b border-primary pb-5">
            <UserRoundPlusIcon aria-hidden="true" className="size-8" strokeWidth={1.5} />
            <h3 className="font-heading text-3xl font-bold uppercase sm:text-4xl">
              Follow a specialist
            </h3>
          </div>
          <PathSteps steps={followSteps} />
        </article>
      </div>
    </section>
  );
}

export function RecordAndQuestions() {
  return (
    <>
      <section className="page-shell pb-14 sm:pb-20" aria-labelledby="record-meaning-heading">
        <h2 id="record-meaning-heading" className="section-title border-b pb-6">
          What your record means.
        </h2>
        <dl className="grid border-b sm:grid-cols-2 lg:grid-cols-4">
          {recordFields.map((field) => {
            const Icon = field.icon;

            return (
              <div key={field.title} className="border-b px-5 py-7 text-center last:border-b-0 sm:odd:border-r sm:[&:nth-child(3)]:border-b-0 sm:[&:nth-child(4)]:border-b-0 lg:border-r lg:border-b-0 lg:last:border-r-0 lg:px-7 lg:py-10">
                <Icon aria-hidden="true" className="mx-auto size-9 text-primary" strokeWidth={1.5} />
                <dt className="mt-5 font-heading text-2xl font-bold uppercase">{field.title}</dt>
                <dd className="mt-2 leading-7 text-muted-foreground">{field.description}</dd>
              </div>
            );
          })}
        </dl>
      </section>

      <section className="bg-foreground text-background" aria-label="LeagueCred responsible-use statement">
        <div className="page-shell flex flex-col gap-6 py-10 sm:flex-row sm:items-center sm:gap-8 sm:py-12">
          <ShieldCheckIcon aria-hidden="true" className="size-14 shrink-0 text-primary" strokeWidth={1.5} />
          <p className="max-w-5xl text-xl leading-8 font-semibold sm:text-2xl sm:leading-9">
            LeagueCred does not offer odds, wagers, payouts, or guaranteed winners. It records football
            knowledge and helps supporters discover proven league specialists.
          </p>
        </div>
      </section>

      <section className="page-shell py-14 sm:py-20" aria-labelledby="questions-heading">
        <h2 id="questions-heading" className="section-title border-b pb-6">
          Questions before your first lock.
        </h2>
        <div className="divide-y border-b">
          {questions.map((item, index) => (
            <details key={item.question} open={index === 0} className="group">
              <summary className="grid cursor-pointer list-none grid-cols-[1fr_auto] items-center gap-5 py-5 font-semibold marker:content-none sm:py-6 sm:text-lg">
                <span>{item.question}</span>
                <PlusIcon aria-hidden="true" className="size-5 group-open:hidden" />
                <MinusIcon aria-hidden="true" className="hidden size-5 text-primary group-open:block" />
              </summary>
              <p className="max-w-4xl pb-6 pr-10 leading-7 text-muted-foreground">{item.answer}</p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}
