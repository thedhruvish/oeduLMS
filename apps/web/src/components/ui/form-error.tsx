import { AnimatePresence, motion } from "motion/react";
import { FieldError } from "@oedulms/ui/components/field";
import type { ValidationError } from "@tanstack/react-form";
import React from "react";

interface FormErrorProps {
  isInvalid: boolean;
  errors: ValidationError[];
}

function formatValidationErrors(errors: ValidationError[]) {
  return errors.map((err) => {
    if (typeof err === "string") {
      return { message: err };
    }
    if (err && typeof err === "object" && "message" in err) {
      return { message: String((err as { message?: unknown }).message || "") };
    }
    return { message: String(err || "") };
  });
}

export function FormError({ isInvalid, errors }: FormErrorProps) {
  const formattedErrors = React.useMemo(() => formatValidationErrors(errors), [errors]);

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
          <FieldError errors={formattedErrors} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
