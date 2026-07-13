import { useState, useEffect } from "react";
import { useForm } from "@tanstack/react-form";
import { CreditCard, ArrowRight, Loader2 } from "lucide-react";
import { AxiosError } from "axios";
import { Button } from "@oedulms/ui/components/button";
import { Field, FieldGroup, FieldLabel } from "@oedulms/ui/components/field";
import { Input } from "@oedulms/ui/components/input";
import { FormError } from "@/components/ui/form-error";
import { useValidatePublicCoupon } from "@/api/coupons";
import { useMe } from "@/api/auth";
import { billingSchema } from "@oedulms/validator/public";
import type { PublicCouponValidation } from "@/types/public";

interface CheckoutSidebarProps {
  courseId: string;
  courseTitle: string;
  coursePrice: number; // original price in INR
  discountPrice?: number | null; // final price in INR
}

interface RazorpayResponse {
  rayorpay_payment_id?: string;
  razorpay_payment_id?: string;
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  handler: (response: RazorpayResponse) => void;
  prefill: {
    name: string;
    email: string;
    contact: string;
  };
  modal?: {
    ondismiss?: () => void;
  };
  theme: {
    color: string;
  };
}

interface RazorpayInstance {
  open: () => void;
}

interface RazorpayWindow extends Window {
  Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    const rzWindow = window as unknown as RazorpayWindow;
    if (rzWindow.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function CheckoutSidebar({
  courseId,
  courseTitle,
  coursePrice,
  discountPrice,
}: CheckoutSidebarProps) {
  const { data: auth } = useMe();
  const validateCoupon = useValidatePublicCoupon();

  // Coupon calculations
  const [couponCode, setCouponCode] = useState("");
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [appliedCoupon, setAppliedCoupon] = useState("");
  const [couponError, setCouponError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const basePrice = coursePrice;
  const isDiscounted =
    discountPrice !== undefined &&
    discountPrice !== null &&
    discountPrice > 0 &&
    discountPrice < coursePrice;
  const initialDiscountPrice = isDiscounted ? (discountPrice ?? basePrice) : basePrice;

  const finalAmount = Math.max(0, initialDiscountPrice - couponDiscount);
  const totalSavings = basePrice - initialDiscountPrice + couponDiscount;

  // Form handling using TanStack Form with Zod validation
  const form = useForm({
    defaultValues: {
      name: "",
      email: "",
      mobile: "",
    },
    validators: {
      onChange: billingSchema,
    },
    onSubmit: async ({ value }) => {
      setIsProcessing(true);
      try {
        const scriptLoaded = await loadRazorpayScript();
        if (!scriptLoaded) {
          alert("Razorpay checkout failed to load. Please verify your connection.");
          setIsProcessing(false);
          return;
        }

        const rzWindow = window as unknown as RazorpayWindow;
        if (!rzWindow.Razorpay) {
          setIsProcessing(false);
          return;
        }

        const options: RazorpayOptions = {
          key: "rzp_test_defaultkey", // Test gateway credentials
          amount: finalAmount * 100, // amount in paisa (1 INR = 100 Paisa)
          currency: "INR",
          name: "ProTech",
          description: `Enrollment for ${courseTitle}`,
          handler: (response) => {
            setIsProcessing(false);
            alert(
              `Payment transaction successful! Payment ID: ${response.razorpay_payment_id || response.rayorpay_payment_id}`
            );
          },
          prefill: {
            name: value.name,
            email: value.email,
            contact: value.mobile,
          },
          modal: {
            ondismiss: () => {
              setIsProcessing(false);
            },
          },
          theme: {
            color: "#09090b",
          },
        };

        const rzp = new rzWindow.Razorpay(options);
        rzp.open();
      } catch (err: unknown) {
        setIsProcessing(false);
        console.error("Razorpay trigger error:", err);
      }
    },
  });

  // Prefill details from auth state if logged in
  useEffect(() => {
    if (auth?.user) {
      form.setFieldValue("name", auth.user.name || "");
      form.setFieldValue("email", auth.user.email || "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth]);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponError("");

    validateCoupon.mutate(
      {
        code: couponCode,
        courseId: courseId,
        coursePrice: initialDiscountPrice,
      },
      {
        onSuccess: (data: PublicCouponValidation) => {
          if (data.valid) {
            setCouponDiscount(data.discountAmount);
            setAppliedCoupon(data.code);
            setCouponError("");
          } else {
            setCouponError(data.error || "Invalid coupon code");
            setCouponDiscount(0);
            setAppliedCoupon("");
          }
        },
        onError: (err: unknown) => {
          const axiosErr = err as AxiosError<{ error?: string; message?: string }>;
          const serverMsg = axiosErr.response?.data?.error || axiosErr.response?.data?.message;
          setCouponError(serverMsg || "Failed to validate coupon code. Please try again.");
          setCouponDiscount(0);
          setAppliedCoupon("");
        },
      }
    );
  };

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-xl relative overflow-hidden">
      <h3 className="font-bold text-lg text-foreground mb-5 flex items-center gap-2">
        <CreditCard className="size-4" />
        Checkout & Purchase
      </h3>

      {/* TanStack Form Submission wrapper */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
        className="space-y-6"
      >
        {/* 1. Billing Information (First as requested: "fist show the Billing Information") */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
            Billing Information
          </h4>

          <FieldGroup>
            {/* Name Field */}
            <form.Field name="name">
              {(field) => {
                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Full Name</FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      disabled={!!auth?.user || isProcessing}
                      aria-invalid={isInvalid}
                      placeholder="John Doe"
                    />
                    <FormError isInvalid={isInvalid} errors={field.state.meta.errors} />
                  </Field>
                );
              }}
            </form.Field>

            {/* Email Field */}
            <form.Field name="email">
              {(field) => {
                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Email Address</FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      type="email"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      disabled={!!auth?.user || isProcessing}
                      aria-invalid={isInvalid}
                      placeholder="you@example.com"
                    />
                    <FormError isInvalid={isInvalid} errors={field.state.meta.errors} />
                  </Field>
                );
              }}
            </form.Field>

            {/* Mobile Field */}
            <form.Field name="mobile">
              {(field) => {
                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Mobile Number</FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      type="tel"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      disabled={isProcessing}
                      aria-invalid={isInvalid}
                      placeholder="e.g. 9876543210"
                    />
                    <FormError isInvalid={isInvalid} errors={field.state.meta.errors} />
                  </Field>
                );
              }}
            </form.Field>
          </FieldGroup>
        </div>

        {/* 2. Checkout details (Second as requested: "and after it show the Checkout details") */}
        <div className="space-y-4 border-t border-border/60 pt-5">
          <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
            Checkout Details
          </h4>

          {/* Coupon Input */}
          <div className="space-y-2">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Coupon Code
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter coupon code..."
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                disabled={isProcessing}
                className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20"
              />
              <Button
                size="sm"
                type="button"
                variant="outline"
                onClick={handleApplyCoupon}
                disabled={validateCoupon.isPending || isProcessing}
                className="h-8 text-xs font-semibold px-4"
              >
                {validateCoupon.isPending ? "Applying..." : "Apply"}
              </Button>
            </div>
            {couponError && (
              <p className="text-xs text-destructive mt-1 font-medium">{couponError}</p>
            )}
            {appliedCoupon && (
              <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-1 font-medium">
                Coupon code &quot;{appliedCoupon}&quot; applied successfully!
              </p>
            )}
          </div>

          {/* Pricing break-up */}
          <div className="space-y-3 pt-3 border-t border-border/60 text-xs">
            <div className="flex justify-between text-muted-foreground">
              <span>Base Price</span>
              <span className="line-through">₹{basePrice.toLocaleString()}</span>
            </div>
            {isDiscounted && (
              <div className="flex justify-between text-muted-foreground">
                <span>Discount Applied</span>
                <span>-₹{(basePrice - initialDiscountPrice).toLocaleString()}</span>
              </div>
            )}
            {couponDiscount > 0 && (
              <div className="flex justify-between text-emerald-600 dark:text-emerald-500 font-medium">
                <span>Coupon Discount ({appliedCoupon})</span>
                <span>-₹{couponDiscount.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-extrabold text-foreground pt-3 border-t border-border/60">
              <span>Total Amount</span>
              <span>₹{finalAmount.toLocaleString()}</span>
            </div>
            {totalSavings > 0 && (
              <div className="text-[10px] text-muted-foreground/80 mt-1">
                You save ₹{totalSavings.toLocaleString()} on this order!
              </div>
            )}
          </div>
        </div>

        {/* Buy Course Submit Button */}
        <Button
          type="submit"
          disabled={isProcessing || validateCoupon.isPending}
          className="w-full h-11 bg-foreground text-background hover:bg-foreground/90 font-bold text-sm gap-2 mt-4"
        >
          {isProcessing ? (
            <>
              <Loader2 className="animate-spin size-4" />
              Processing payment...
            </>
          ) : (
            <>
              Buy Course
              <ArrowRight className="size-4" />
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
