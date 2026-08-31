"use client";

import { ChangeEvent, useRef, useState, useTransition } from "react";
import { ImagePlusIcon, Trash2Icon } from "lucide-react";
import { updateAvatar } from "@/app/settings/actions";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";

export function AvatarUploader({ initial, name }: { initial: string; name: string }) {
  const [value, setValue] = useState(initial);
  const [source, setSource] = useState("");
  const [zoom, setZoom] = useState(1);
  const [x, setX] = useState(50);
  const [y, setY] = useState(50);
  const image = useRef<HTMLImageElement | null>(null);
  const [pending, start] = useTransition();

  function choose(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5_000_000) {
      toast.add({ title: "Image is too large", description: "Choose a file under 5 MB.", type: "error" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setSource(String(reader.result));
    reader.readAsDataURL(file);
  }

  function crop() {
    const img = image.current;
    if (!img) return;
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const scale = Math.max(256 / img.naturalWidth, 256 / img.naturalHeight) * zoom;
    const sw = 256 / scale;
    const sh = 256 / scale;
    const sx = ((img.naturalWidth - sw) * x) / 100;
    const sy = ((img.naturalHeight - sh) * y) / 100;
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, 256, 256);
    setValue(canvas.toDataURL("image/jpeg", 0.78));
    setSource("");
  }

  function save(next = value) {
    start(async () => {
      const result = await updateAvatar(next);
      toast.add({
        title: result.ok ? "Avatar saved" : "Avatar failed",
        description: result.message,
        type: result.ok ? "success" : "error",
      });
    });
  }

  return (
    <section className="grid gap-4 border p-5" aria-labelledby="avatar-heading">
      <div>
        <h3 id="avatar-heading" className="font-heading text-2xl font-bold uppercase">
          Profile photo
        </h3>
        <p className="text-sm text-muted-foreground">Upload, crop, and preview your public avatar.</p>
      </div>
      <div className="flex items-center gap-4">
        <span
          className="flex size-24 items-center justify-center rounded-full border bg-muted bg-cover bg-center font-heading text-3xl"
          style={value ? { backgroundImage: `url(${value})` } : undefined}
        >
          {value ? null : name.split(/\s+/).map((p) => p[0]).join("").slice(0, 2)}
        </span>
        <div className="grid gap-2">
          <label className="inline-flex h-10 cursor-pointer items-center justify-center border px-4 font-semibold">
            <ImagePlusIcon className="mr-2 size-4" />
            Upload image
            <input className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" onChange={choose} />
          </label>
          <Button
            type="button"
            variant="ghost"
            disabled={!value || pending}
            onClick={() => {
              setValue("");
              save("");
            }}
          >
            <Trash2Icon data-icon="inline-start" />
            Remove
          </Button>
        </div>
      </div>
      {source ? (
        <div className="border p-4">
          <div className="mx-auto size-64 overflow-hidden rounded-full bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={image}
              src={source}
              alt="Avatar crop preview"
              className="size-full object-cover"
              style={{ objectPosition: `${x}% ${y}%`, transform: `scale(${zoom})` }}
            />
          </div>
          <div className="mt-4 grid gap-3">
            {[
              ["Zoom", zoom, setZoom, 1, 2.5, 0.05],
              ["Horizontal position", x, setX, 0, 100, 1],
              ["Vertical position", y, setY, 0, 100, 1],
            ].map(([label, val, setter, min, max, step]) => (
              <label key={String(label)} className="text-sm font-semibold">
                {String(label)}
                <input
                  className="w-full"
                  type="range"
                  min={Number(min)}
                  max={Number(max)}
                  step={Number(step)}
                  value={Number(val)}
                  onChange={(e) => (setter as (n: number) => void)(Number(e.target.value))}
                />
              </label>
            ))}
            <div className="flex gap-2">
              <Button type="button" onClick={crop}>
                Use crop
              </Button>
              <Button type="button" variant="outline" onClick={() => setSource("")}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      ) : null}
      <Button type="button" disabled={!value || pending} onClick={() => save()}>
        {pending ? "Saving…" : "Save avatar"}
      </Button>
      <p className="text-xs text-muted-foreground">JPG, PNG, or WebP up to 5 MB. Stored as an optimized 256px JPEG.</p>
    </section>
  );
}
