import { useState, useEffect } from "react";
import { useForm } from "@tanstack/react-form";
import { CreditCard, ArrowRight } from "lucide-react";
import { Spinner } from "@oedulms/ui/components/spinner";
import { AxiosError } from "axios";
import { Button } from "@oedulms/ui/components/button";
import { Field, FieldGroup, FieldLabel } from "@oedulms/ui/components/field";
import { Input } from "@oedulms/ui/components/input";
import { FormError } from "@/components/ui/form-error";
import { useValidatePublicCoupon } from "@/api/coupons";
import { useMe } from "@/api/auth";
import { useCheckEnrollment } from "@/api/enrollments";
import { billingSchema } from "@oedulms/validator/public";
import type { PublicCouponValidation } from "@/types/public";

interface CheckoutSidebarProps {
  courseId: string;
  courseTitle: string;
  coursePrice: number; // original price in INR
  discountPrice?: number | null; // final price in INR
}

import { triggerRazorpayCheckout } from "@/lib/razorpay";
import { useCreateOrder, useVerifyPayment } from "@/api/payments";
import { useConfirm } from "@/store/confirm-store";

export function CheckoutSidebar({
  courseId,
  courseTitle,
  coursePrice,
  discountPrice,
}: CheckoutSidebarProps) {
  const { data: auth, isLoading: isAuthLoading } = useMe();
  const validateCoupon = useValidatePublicCoupon();
  const { data: enrollmentCheck, isLoading: isEnrollmentChecking } = useCheckEnrollment(
    courseId,
    !!auth?.user
  );
  const isChecking = isAuthLoading || (!!auth?.user && isEnrollmentChecking);
  const isEnrolled = !!enrollmentCheck?.isEnrolled;
  const createOrderMutation = useCreateOrder();
  const verifyPaymentMutation = useVerifyPayment();
  const confirm = useConfirm();

  // Coupon calculations
  const [couponCode, setCouponCode] = useState("");
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [appliedCoupon, setAppliedCoupon] = useState("");
  const [couponError, setCouponError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [successInfo, setSuccessInfo] = useState<{
    success: boolean;
    isNewUser: boolean;
    email: string;
  } | null>(null);

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
        // 1. Create order on the backend using TanStack Mutation
        const orderData = await createOrderMutation.mutateAsync({
          courseId,
          couponCode: appliedCoupon || undefined,
          userId: auth?.user?.id || undefined,
          name: value.name,
          email: value.email,
          mobile: value.mobile,
        });

        // 2. Open Razorpay payment gateway using the trigger utility helper
        await triggerRazorpayCheckout({
          keyId: orderData.keyId,
          amount: orderData.amount,
          currency: orderData.currency,
          orderId: orderData.orderId,
          courseTitle: courseTitle,
          prefill: {
            name: value.name,
            email: value.email,
            contact: `+91${value.mobile}`,
          },
          onSuccess: async (response) => {
            try {
              setIsProcessing(true);

              // 3. Verify signature on the backend using TanStack Mutation
              const verifyData = await verifyPaymentMutation.mutateAsync({
                paymentId: orderData.paymentId,
                razorpayPaymentId:
                  response.razorpay_payment_id || response.rayorpay_payment_id || "",
                razorpayOrderId: orderData.orderId,
                razorpaySignature: response.razorpay_signature || "",
              });

              setIsProcessing(false);

              if (verifyData.success) {
                setSuccessInfo({
                  success: true,
                  isNewUser: verifyData.isNewUser,
                  email: verifyData.email,
                });
              } else {
                await confirm({
                  title: "Payment Verification Failed",
                  desc: verifyData.error || "Unknown payment verification error.",
                  confirmText: "Close",
                  destructive: true,
                });
              }
            } catch (verifyErr: unknown) {
              setIsProcessing(false);
              const axiosErr = verifyErr as AxiosError<{ error?: string; message?: string }>;
              const errMsg =
                axiosErr.response?.data?.error ||
                axiosErr.response?.data?.message ||
                axiosErr.message ||
                "Verification failed";
              await confirm({
                title: "Payment Verification Error",
                desc: errMsg,
                confirmText: "Close",
                destructive: true,
              });
            }
          },
          onDismiss: () => {
            setIsProcessing(false);
          },
          onLoadFailed: async () => {
            await confirm({
              title: "Razorpay Failed to Load",
              desc: "Razorpay checkout failed to load. Please verify your connection.",
              confirmText: "Close",
              destructive: true,
            });
            setIsProcessing(false);
          },
        });
      } catch (err: unknown) {
        setIsProcessing(false);
        const axiosErr = err as AxiosError<{ error?: string; message?: string }>;
        const serverMsg =
          axiosErr.response?.data?.error || axiosErr.response?.data?.message || axiosErr.message;
        await confirm({
          title: "Order Creation Failed",
          desc: serverMsg || "Please check your inputs and try again.",
          confirmText: "Close",
          destructive: true,
        });
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

  if (successInfo) {
    return (
      <div className="rounded-2xl border border-emerald-500/20 bg-card p-6 shadow-xl relative overflow-hidden text-center space-y-6">
        <div className="mx-auto my-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400">
          <svg
            className="h-8 w-8 animate-bounce"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="3"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <div className="space-y-2">
          <h3 className="font-extrabold text-xl text-foreground">Purchase Successful!</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            You have successfully purchased and enrolled in{" "}
            <strong className="text-foreground">{courseTitle}</strong>.
          </p>
        </div>

        {successInfo.isNewUser && (
          <div className="rounded-xl bg-muted/40 p-4 text-left border border-border/40 space-y-3">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Access Details
            </p>
            <div className="space-y-2 text-xs text-foreground/90">
              <p>
                We have generated a new account for you. A temporary password has been sent to your
                email:
              </p>
              <p className="font-mono font-bold text-xs text-primary break-all bg-background px-3 py-2 rounded-lg border border-border">
                {successInfo.email}
              </p>
              <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                Please check your inbox (and spam/promotions folder) for your temporary password to
                login.
              </p>
            </div>
          </div>
        )}

        <Button
          onClick={() => {
            if (auth?.user) {
              window.location.href = "/dash";
            } else {
              window.location.href = `/auth/login?email=${encodeURIComponent(successInfo.email)}`;
            }
          }}
          className="w-full h-11 bg-foreground text-background hover:bg-foreground/90 font-bold text-sm gap-2 mt-4"
        >
          {auth?.user ? "Go to Dashboard" : "Log In Now"}
          <ArrowRight className="size-4" />
        </Button>
      </div>
    );
  }

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
                      disabled={!!auth?.user || isProcessing || isEnrolled}
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
                      disabled={!!auth?.user || isProcessing || isEnrolled}
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
                      disabled={isProcessing || isEnrolled}
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
                disabled={isProcessing || isEnrolled}
                className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20"
              />
              <Button
                size="sm"
                type="button"
                variant="outline"
                onClick={handleApplyCoupon}
                disabled={validateCoupon.isPending || isProcessing || isEnrolled}
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
          disabled={isProcessing || validateCoupon.isPending || isChecking || isEnrolled}
          className="w-full h-11 bg-foreground text-background hover:bg-foreground/90 font-bold text-sm gap-2 mt-4"
        >
          {isProcessing ? (
            <>
              <Spinner data-icon="inline-start" aria-hidden="true" />
              Processing payment...
            </>
          ) : isChecking ? (
            <>
              <Spinner data-icon="inline-start" aria-hidden="true" />
              Checking status...
            </>
          ) : isEnrolled ? (
            <>Already Purchased</>
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
