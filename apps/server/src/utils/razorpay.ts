export interface RazorpayOrderInput {
  amount: number; // in paise
  currency: string;
  receipt?: string;
  notes?: Record<string, string | number | boolean>;
}

export interface RazorpayOrderResponse {
  id: string;
  entity: "order";
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string | null;
  status: string;
  attempts: number;
  notes: Record<string, string | number | boolean>;
  created_at: number;
}

export interface RazorpayRefundInput {
  amount?: number; // optional, defaults to full refund
  notes?: Record<string, string | number | boolean>;
}

export interface RazorpayRefundResponse {
  id: string;
  entity: "refund";
  amount: number;
  currency: string;
  payment_id: string;
  notes: Record<string, string | number | boolean>;
  created_at: number;
}

/**
 * Common fetch helper for Razorpay API calls
 */
async function callRazorpayApi<T>(
  path: string,
  method: "GET" | "POST" | "PUT" | "DELETE",
  body: unknown,
  keyId: string,
  keySecret?: string
): Promise<T> {
  const secret = keySecret || "";
  const authHeader = `Basic ${Buffer.from(`${keyId}:${secret}`).toString("base64")}`;

  const response = await fetch(`https://api.razorpay.com/v1${path}`, {
    method,
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Razorpay API Error (${response.status}): ${errText}`);
  }

  return response.json() as Promise<T>;
}

/**
 * Creates an order in Razorpay
 */
export async function createRazorpayOrder(
  input: RazorpayOrderInput,
  keyId: string,
  keySecret?: string
): Promise<RazorpayOrderResponse> {
  return callRazorpayApi<RazorpayOrderResponse>("/orders", "POST", input, keyId, keySecret);
}

/**
 * Processes a refund for a payment in Razorpay
 */
export async function createRazorpayRefund(
  paymentId: string,
  input: RazorpayRefundInput,
  keyId: string,
  keySecret?: string
): Promise<RazorpayRefundResponse> {
  return callRazorpayApi<RazorpayRefundResponse>(
    `/payments/${paymentId}/refund`,
    "POST",
    input,
    keyId,
    keySecret
  );
}
