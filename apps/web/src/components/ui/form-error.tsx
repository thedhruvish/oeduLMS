import { AnimatePresence, motion } from "motion/react";
import { FieldError } from "@oedulms/ui/components/field";
import type { ValidationError } from "@tanstack/react-form";

interface FormErrorProps {
  isInvalid: boolean;
  errors: ValidationError[];
}

export function FormError({ isInvalid, errors }: FormErrorProps) {
  return (
    <AnimatePresence initial={false}>
      {isInvalid && (
        <motion.div
          initial={{
            height: 0,
            opacity: 0,
            y: -4,
          }}
          animate={{
            height: "auto",
            opacity: 1,
            y: 0,
          }}
          exit={{
            height: 0,
            opacity: 0,
            y: -4,
          }}
          transition={{
            duration: 0.18,
            ease: "easeOut",
          }}
          className="overflow-hidden text-sm text-red-500 mt-1"
        >
          <FieldError errors={errors as unknown as Array<{ message?: string } | undefined>} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
