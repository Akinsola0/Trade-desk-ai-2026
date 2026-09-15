import { howItWorksSteps } from "@/lib/marketing";

/**
 * A tiny fake browser chrome above each step's screenshot — three dots, no
 * address bar, just enough that a cropped screenshot reads as "a page of the
 * product", not a stray photo.
 *
 * A plain `<img>`, not `next/image`: these are small, already-cropped local
 * screenshots (see `public/images/how-it-works/`), not photos that need
 * responsive srcset/format conversion — and going through `next/image`'s
 * optimizer here hit a resize-cache inconsistency in dev.
 */
function BrowserFrame({ src }: { src: string }) {
  return (
    <div className="overflow-hidden rounded-t-2xl border-b border-white/10 bg-black/20">
      <div className="flex items-center gap-1.5 px-3 py-2">
        <span className="size-2 rounded-full bg-white/30" />
        <span className="size-2 rounded-full bg-white/30" />
        <span className="size-2 rounded-full bg-white/30" />
      </div>
      <div className="relative aspect-4/3 bg-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          aria-hidden
          className="absolute inset-0 size-full object-cover object-top"
        />
      </div>
    </div>
  );
}

/**
 * Sits on the same olive-gradient background as `AudienceSplit`'s business
 * panel (`linear-gradient(160deg, #6f6535, #3f3a20)`), set via inline style
 * for the same reason that panel does: an inline style wins outright over
 * `.band-dark`'s own near-black `background` rule regardless of Tailwind's
 * utility-vs-component layer order. Because that gradient is lighter than
 * `.band-dark` is tuned for, text and the step tiles below override the
 * token-driven colours directly (`text-white/75`, `bg-white/10`) rather than
 * relying on the cascade — same reasoning as that panel's own comment.
 */
export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="band-dark"
      style={{ backgroundImage: "linear-gradient(160deg, #6f6535, #3f3a20)" }}
    >
      <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 md:py-24">
        <p className="text-xs font-semibold tracking-[0.12em] text-white/90 uppercase">
          For homeowners
        </p>
        <h2 className="display mt-3 max-w-3xl text-3xl sm:text-4xl">
          The tradesman finder that never leaves you hanging
        </h2>
        <p className="mt-3 max-w-xl text-white/75">
          No calling round, no voicemail, no wondering if anyone&apos;s coming.
          Tell us the job once — we do the rest.
        </p>

        <ol className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {howItWorksSteps.map((step, index) => (
            <li
              key={step.title}
              className="overflow-hidden rounded-2xl border border-white/15 bg-white/10"
            >
              <BrowserFrame src={step.image} />
              <div className="p-5">
                <span className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-full text-sm font-bold">
                  {index + 1}
                </span>
                <h3 className="mt-3 font-semibold text-white">{step.title}</h3>
                <p className="mt-1.5 text-sm text-white/75">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
