import { Plus } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { LANDING_FAQS } from "../landing-content";
import { FadeIn, FadeInStagger } from "./motion/fade-in";
import { SlideIn } from "./motion/slide-in";
import { LANDING_MOTION } from "./motion/motion-config";

export function LandingFaq() {
  return (
    <section id="faq" aria-labelledby="faq-heading" className="mx-auto grid max-w-6xl scroll-mt-8 gap-10 px-5 py-20 sm:px-8 sm:py-24 md:grid-cols-[0.8fr_1.2fr] md:gap-20">
      <SlideIn from="right" preset="faq"><h2 id="faq-heading" className="text-3xl font-semibold tracking-tight sm:text-4xl">A few things<br className="hidden md:block" /> you might wonder.</h2><p className="mt-5 max-w-xs text-sm leading-7 text-muted-foreground">A shared project or a personal plan.<br />There&apos;s room for both here.</p></SlideIn>
      <div className="divide-y divide-border border-y border-border">
        <FadeInStagger stagger={LANDING_MOTION.faqStagger}>
        {LANDING_FAQS.map((faq) => <FadeIn key={faq.question} preset="faq"><Collapsible>
          <h3><CollapsibleTrigger className="group flex min-h-16 w-full cursor-pointer items-center justify-between gap-5 rounded-sm py-5 text-left text-sm font-medium outline-none hover:text-link focus-visible:ring-2 focus-visible:ring-ring"><span>{faq.question}</span><Plus aria-hidden="true" className="landing-faq-icon size-4 shrink-0 text-muted-foreground group-data-[panel-open]:rotate-45" /></CollapsibleTrigger></h3>
          <CollapsibleContent className="landing-faq-panel"><p className="max-w-xl pb-6 pr-6 text-sm leading-7 text-muted-foreground">{faq.answer}</p></CollapsibleContent>
        </Collapsible></FadeIn>)}
        </FadeInStagger>
      </div>
    </section>
  );
}
