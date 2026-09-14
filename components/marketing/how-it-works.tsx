import { howItWorksSteps } from "@/lib/marketing";

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 md:py-24"
    >
      <p className="kicker">For tradespeople</p>
      <h2 className="display mt-3 max-w-3xl text-3xl sm:text-4xl">
        An AI front desk that knows what a zone valve is
      </h2>
      <p className="text-muted-foreground mt-3 max-w-xl">
        No apps for your customers to download, no new number, no receptionist
        to train. You divert your calls and get on with the job.
      </p>

      <ol className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {howItWorksSteps.map((step, index) => (
          <li key={step.title} className="border-t-2 border-primary/20 pt-4">
            <span className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-full text-sm font-bold">
              {index + 1}
            </span>
            <h3 className="mt-3 font-semibold">{step.title}</h3>
            <p className="text-muted-foreground mt-1.5 text-sm">{step.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
