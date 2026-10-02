"use client";

import { Button } from "@/components/ui/button";

export default function Error({ reset }: { reset: () => void }) {
  return (
    <section className="wrapper flex-center min-h-[50vh] flex-col gap-5 text-center">
      <h2 className="h3-bold">Something went wrong</h2>
      <p className="p-regular-16">
        We couldn&apos;t load this page. Please try again in a few minutes.
      </p>
      <Button size="lg" className="button" onClick={reset}>
        Try again
      </Button>
    </section>
  );
}
