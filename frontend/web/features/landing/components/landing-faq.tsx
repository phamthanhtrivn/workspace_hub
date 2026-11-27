import { Plus } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { LANDING_FAQS } from "../landing-content";
import { FadeIn, FadeInStagger } from "./motion/fade-in";
import { LANDING_MOTION } from "./motion/motion-config";

export function LandingFaq() {
  return (
    <section
      id="faq"
      aria-labelledby="faq-heading"
      className="mx-auto max-w-3xl scroll-mt-8 px-5 py-20 sm:px-8 sm:py-24"
    >
      <FadeIn className="mb-10 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-link">
          Frequently asked questions
        </p>
        <h2
          id="faq-heading"
          className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
        >
          Questions? We&apos;ve got answers.
        </h2>
      </FadeIn>

      <div className="divide-y divide-border border-y border-border">
        <FadeInStagger stagger={LANDING_MOTION.faqStagger}>
          {LANDING_FAQS.map((faq) => (
            <FadeIn key={faq.question} preset="faq">
              <Collapsible>
                <h3>
                  <CollapsibleTrigger className="group flex min-h-16 w-full cursor-pointer items-center justify-between gap-5 rounded-sm py-5 text-left text-sm font-semibold text-foreground outline-none hover:text-link focus-visible:ring-2 focus-visible:ring-ring">
                    <span>{faq.question}</span>
                    <Plus
                      aria-hidden="true"
                      className="landing-faq-icon size-4 shrink-0 text-muted-foreground group-data-[panel-open]:rotate-45"
                    />
                  </CollapsibleTrigger>
                </h3>
                <CollapsibleContent className="landing-faq-panel">
                  <p className="pb-6 pr-6 text-sm leading-7 text-muted-foreground">
                    {faq.answer}
                  </p>
                </CollapsibleContent>
              </Collapsible>
            </FadeIn>
          ))}
        </FadeInStagger>
      </div>
    </section>
  );
}
