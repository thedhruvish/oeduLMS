export interface RazorpayResponse {
  razorpay_payment_id?: string;
  razorpay_order_id?: string;
  razorpay_signature?: string;
  rayorpay_payment_id?: string; // fallback for typos in integrations
}

export interface RazorpayPrefill {
  name?: string;
  email?: string;
  contact?: string;
}

export interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpayResponse) => void;
  prefill?: RazorpayPrefill;
  modal?: {
    ondismiss?: () => void;
  };
  theme?: {
    color?: string;
  };
}

export interface RazorpayInstance {
  open: () => void;
}

export interface RazorpayWindow extends Window {
  Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
}

/**
 * Dynamically loads the Razorpay checkout script if not already present.
 */
export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    const rzWindow = window as unknown as RazorpayWindow;
    if (rzWindow.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => {
      resolve(!!rzWindow.Razorpay);
    };
    script.onerror = () => {
      resolve(false);
    };
    document.body.appendChild(script);
  });
}

interface TriggerCheckoutParams {
  keyId: string;
  amount: number;
  currency: string;
  orderId: string;
  courseTitle: string;
  prefill: RazorpayPrefill;
  onSuccess: (response: RazorpayResponse) => void;
  onDismiss?: () => void;
  onLoadFailed?: () => void;
}

/**
 * Loads Razorpay script and opens the checkout modal.
 */
export async function triggerRazorpayCheckout({
  keyId,
  amount,
  currency,
  orderId,
  courseTitle,
  prefill,
  onSuccess,
  onDismiss,
  onLoadFailed,
}: TriggerCheckoutParams): Promise<void> {
  const scriptLoaded = await loadRazorpayScript();
  if (!scriptLoaded) {
    onLoadFailed?.();
    return;
  }

  const rzWindow = window as unknown as RazorpayWindow;
  if (!rzWindow.Razorpay) {
    onLoadFailed?.();
    return;
  }

  const options: RazorpayOptions = {
    key: keyId,
    amount: amount,
    currency: currency,
    name: "ProTech",
    description: `Enrollment for ${courseTitle}`,
    order_id: orderId,
    handler: onSuccess,
    prefill,
    modal: {
      ondismiss: onDismiss,
    },
    theme: {
      color: "#09090b",
    },
  };

  const rzp = new rzWindow.Razorpay(options);
  rzp.open();
}
