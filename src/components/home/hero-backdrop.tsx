import Image from "next/image";

/**
 * The photograph behind the hero's practice card.
 *
 * It is decoration, so it carries an empty alt and is hidden from assistive
 * technology: the headline beside it already says what the page is. The mask
 * fades the inner edge, because a photograph that stops in a hard vertical line
 * beside the headline reads as a misplaced rectangle rather than a backdrop.
 */
export function HeroBackdrop({ src }: { src: string }) {
  return (
    <div
      className="pointer-events-none absolute inset-x-[-8%] top-1/2 -z-10 hidden aspect-[16/10] -translate-y-1/2 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_18%)] lg:block"
      aria-hidden="true"
    >
      <Image
        src={src}
        alt=""
        fill
        // It is the largest thing above the fold, so it is the one image on the
        // page worth blocking the render for.
        priority
        sizes="(min-width: 1024px) 60vw, 0px"
        className="object-cover"
      />
    </div>
  );
}
