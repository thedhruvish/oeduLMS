import { useMutation } from "@tanstack/react-query";
import { axiosClient } from "@/lib/axios-client";

export interface CreateOrderInput {
  courseId: string;
  couponCode?: string;
  name?: string;
  email?: string;
  mobile?: string;
  userId?: string;
}

export interface CreateOrderResponse {
  paymentId: string;
  orderId: string;
  amount: number;
  currency: string;
  isNewUser: boolean;
  email: string;
  keyId: string;
}

export interface VerifyPaymentInput {
  paymentId: string;
  razorpayPaymentId: string;
  razorpayOrderId: string;
  razorpaySignature: string;
}

export interface VerifyPaymentResponse {
  success: boolean;
  isNewUser: boolean;
  email: string;
  error?: string;
}

async function createOrder(payload: CreateOrderInput): Promise<CreateOrderResponse> {
  const { data } = await axiosClient.post<CreateOrderResponse>(
    "/public/payments/create-order",
    payload
  );
  return data;
}

async function verifyPayment(payload: VerifyPaymentInput): Promise<VerifyPaymentResponse> {
  const { data } = await axiosClient.post<VerifyPaymentResponse>(
    "/public/payments/verify-payment",
    payload
  );
  return data;
}

export function useCreateOrder() {
  return useMutation({
    mutationFn: createOrder,
  });
}

export function useVerifyPayment() {
  return useMutation({
    mutationFn: verifyPayment,
  });
}
