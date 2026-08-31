import { ArrowRightIcon, LockKeyholeIcon, ShieldCheckIcon } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function PreviewRow({
  code,
  title,
  meta,
  lock,
  selected = false,
}: {
  code: string;
  title: string;
  meta: string;
  lock: string;
  selected?: boolean;
}) {
  return (
    <div
      className={
        selected
          ? "grid grid-cols-[auto_1fr_auto] items-center gap-3 border border-primary bg-background p-4"
          : "grid grid-cols-[auto_1fr_auto] items-center gap-3 border border-border bg-background p-4"
      }
    >
      <span className="flex size-10 items-center justify-center rounded-full bg-inverted font-heading text-sm font-bold text-inverted-foreground">
        {code}
      </span>
      <span className="min-w-0">
        <span className="block truncate font-semibold">{title}</span>
        <span className="block text-sm text-muted-foreground">{meta}</span>
        <span className="mt-2 flex items-center gap-2 text-sm">
          <LockKeyholeIcon aria-hidden="true" className="size-4" />
          {lock}
        </span>
      </span>
      <ArrowRightIcon aria-hidden="true" className="size-4" />
    </div>
  );
}

export function ProductPreview() {
  return (
    <Card className="rounded-md shadow-xl shadow-foreground/10">
      <CardHeader className="border-b">
        <CardTitle className="font-heading text-2xl font-bold uppercase">
          Your league network
        </CardTitle>
        <CardDescription>
          Independent expertise on one side. Trusted guidance on the other.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 lg:grid-cols-2">
        <section className="flex flex-col gap-3" aria-labelledby="know-heading">
          <div className="flex items-center justify-between gap-3">
            <h2 id="know-heading" className="text-xs font-bold tracking-[0.16em] uppercase">
              Leagues I know
            </h2>
            <ShieldCheckIcon aria-hidden="true" className="size-5 text-primary" />
          </div>
          <PreviewRow
            code="SÜL"
            title="Süper Lig"
            meta="78.3% accuracy · 36–10"
            lock="Independent lock: Galatasaray"
            selected
          />
          <div className="h-16 border border-border bg-muted" aria-hidden="true" />
        </section>

        <section className="flex flex-col gap-3" aria-labelledby="follow-heading">
          <h2 id="follow-heading" className="text-xs font-bold tracking-[0.16em] uppercase">
            Leagues I follow
          </h2>
          <PreviewRow
            code="LMX"
            title="Liga MX"
            meta="Following Diego"
            lock="Diego's lock: Monterrey"
          />
          <div className="h-16 border border-border bg-muted" aria-hidden="true" />
        </section>
      </CardContent>
      <CardFooter className="grid gap-3 bg-muted lg:grid-cols-2">
        <span className="text-sm font-semibold">Add another league</span>
        <span className="text-sm font-semibold lg:text-right">Find another specialist</span>
      </CardFooter>
    </Card>
  );
}
