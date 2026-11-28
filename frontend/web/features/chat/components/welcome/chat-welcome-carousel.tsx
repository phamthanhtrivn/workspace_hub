"use client";

import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";
import { CHAT_WELCOME_SLIDES } from "../../constants/chat-welcome.constants";
import { useChatWelcomeCarousel } from "../../hooks/use-chat-welcome-carousel";
import { ChatWelcomeIllustration } from "./chat-welcome-illustration";

export default function ChatWelcomeCarousel() {
  const { api, setApi, selected, reducedMotion, carouselRef, plugins } = useChatWelcomeCarousel();

  return (
    <div className="flex min-h-0 flex-1 overflow-y-auto bg-card px-5 py-8 @min-[1060px]/messages:px-10">
      <Carousel
        ref={carouselRef}
        setApi={setApi}
        opts={{ loop: true, duration: reducedMotion ? 0 : 25 }}
        plugins={plugins}
        aria-label="Get started with WorkspaceHub Messages"
        className="m-auto w-full max-w-xl"
      >
        <CarouselContent aria-live={reducedMotion ? "polite" : "off"} aria-atomic="true">
          {CHAT_WELCOME_SLIDES.map((slide, index) => (
            <CarouselItem key={slide.id} aria-label={`${index + 1} of ${CHAT_WELCOME_SLIDES.length}`} aria-hidden={selected !== index}>
              <ChatWelcomeIllustration slide={slide.id} />
              <div className="mx-auto mt-6 max-w-md text-center">
                <h2 className="text-balance text-xl font-semibold leading-snug text-foreground @min-[1060px]/messages:text-2xl">
                  {slide.title}
                </h2>
                <p className="mt-3 text-pretty text-sm leading-6 text-muted-foreground">
                  {slide.description}
                </p>
                <p className="mt-5 text-pretty text-sm leading-6 text-muted-foreground">
                  {slide.hint}
                </p>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <div className="mt-7 flex items-center justify-center gap-1">
          <CarouselPrevious variant="ghost" className="static size-9 translate-y-0 rounded-full text-muted-foreground" />
          <div className="flex items-center" role="group" aria-label="Choose an introduction slide">
            {CHAT_WELCOME_SLIDES.map((slide, index) => (
              <Button
                key={slide.id}
                type="button"
                variant="ghost"
                size="icon-sm"
                className="group rounded-full"
                aria-label={`Show slide ${index + 1}: ${slide.label}`}
                aria-current={selected === index ? "true" : undefined}
                disabled={!api}
                onClick={() => api?.scrollTo(index, reducedMotion)}
              >
                <span className={cn(
                  "h-2 rounded-full transition-[width,background-color] motion-reduce:transition-none",
                  selected === index ? "w-5 bg-primary-soft-foreground" : "w-2 bg-muted-foreground/40 group-hover:bg-muted-foreground",
                )} />
              </Button>
            ))}
          </div>
          <CarouselNext variant="ghost" className="static size-9 translate-y-0 rounded-full text-muted-foreground" />
        </div>
      </Carousel>
    </div>
  );
}
