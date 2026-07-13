import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronDown } from "lucide-react";
import { usePublicCourseFaqs } from "@/api/courses";
import { PublicFaq } from "@/types/public";

function FaqItem({ faq }: { faq: PublicFaq }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="group overflow-hidden rounded-xl border border-border/40 bg-card/30 transition-all duration-300 hover:border-border/80 hover:bg-card">
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center justify-between text-left font-semibold text-foreground p-5 transition-colors focus:outline-none"
      >
        <span className="text-sm sm:text-base pr-4 text-foreground/80 group-hover:text-foreground transition-colors">
          {faq.question}
        </span>
        <ChevronDown
          className={`size-4 text-muted-foreground transition-transform duration-300 shrink-0 ${
            isOpen ? "rotate-180 text-foreground" : ""
          }`}
        />
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.04, 0.62, 0.23, 0.98] }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed border-t border-border/20 pt-3 bg-muted/20 backdrop-blur-md">
              {faq.answer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface CourseFaqsProps {
  courseIdOrSlug: string;
}

export function CourseFaqs({ courseIdOrSlug }: CourseFaqsProps) {
  const { data: faqs = [], isLoading, isError } = usePublicCourseFaqs(courseIdOrSlug);

  return (
    <section className="space-y-6">
      <div className="space-y-1.5">
        <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">
          Frequently Asked Questions
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Got questions? We have got answers. Here are some of the most common questions about this
          course.
        </p>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-16 bg-card/40 animate-pulse rounded-xl border border-border/30"
            />
          ))}
        </div>
      )}

      {isError && (
        <div className="p-5 rounded-xl border border-destructive/20 bg-destructive/5 text-center">
          <p className="text-xs sm:text-sm text-destructive font-medium">
            Failed to load FAQs. Please reload the page.
          </p>
        </div>
      )}

      {!isLoading && !isError && faqs.length === 0 && (
        <div className="p-8 text-center rounded-xl border border-dashed border-border/60 bg-muted/5">
          <p className="text-sm text-muted-foreground">No FAQs available for this course yet.</p>
        </div>
      )}

      {!isLoading && !isError && faqs.length > 0 && (
        <div className="space-y-3">
          {faqs.map((faq) => (
            <FaqItem key={faq.id} faq={faq} />
          ))}
        </div>
      )}
    </section>
  );
}
