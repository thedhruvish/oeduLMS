import { Hono } from "hono";
import crypto from "crypto";
import { createDb } from "@oedulms/db";
import { payments } from "@oedulms/db/schema/payments";
import { user } from "@oedulms/db/schema/auth";
import { userRoles, studentProfiles } from "@oedulms/db/schema/profiles";
import { courses } from "@oedulms/db/schema/courses";
import { coupons, couponCourses, couponRedemptions } from "@oedulms/db/schema/coupons";
import { courseEnrollments } from "@oedulms/db/schema/enrollments";
import { eq, and } from "@oedulms/db/dzl";
import { createAuth } from "@oedulms/auth";
import type { AppVariables } from "../types";
import { sendEmail } from "../utils/resend";
import { createRazorpayOrder } from "../utils/razorpay";

export const publicPaymentsRouter = new Hono<AppVariables>();

// Type safe interface for payment metadata
interface PaymentMetadata {
  isNewUser: boolean;
  generatedPassword?: string;
  emailSent: boolean;
  couponId: string | null;
  couponDiscount: number;
  name: string;
  email: string;
  courseTitle: string;
  razorpayPaymentId?: string;
  failedReason?: string;
}

// Helper to verify Razorpay signatures
function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string,
  secret: string
): boolean {
  const generatedSignature = crypto
    .createHmac("sha256", secret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  return generatedSignature === signature;
}

// Helper to verify Webhook signatures
function verifyWebhookSignature(rawBody: string, signature: string, secret: string): boolean {
  const generatedSignature = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  return generatedSignature === signature;
}

// Order fulfillment logic (shared between API and Webhook)
async function fulfillOrder(
  db: ReturnType<typeof createDb>,
  paymentId: string,
  providerPaymentId: string,
  status: "verified" | "completed",
  env: AppVariables["Bindings"]
) {
  const paymentRecord = await db.query.payments.findFirst({
    where: eq(payments.id, paymentId),
  });

  if (!paymentRecord) {
    console.error(`[Fulfillment Failed] Payment record not found for ID: ${paymentId}`);
    return;
  }

  // If already webhook-completed, do not update status or perform actions again
  if (paymentRecord.status === "completed") {
    return;
  }

  const meta = (paymentRecord.metadata || {}) as unknown as PaymentMetadata;

  // 1. Update payment status (e.g. verified or completed)
  await db
    .update(payments)
    .set({
      status,
      providerPaymentId: providerPaymentId,
      metadata: {
        ...meta,
        razorpayPaymentId: providerPaymentId,
      },
    })
    .where(eq(payments.id, paymentId));

  // 2. Create course enrollment if not exists
  const existingEnrollment = await db.query.courseEnrollments.findFirst({
    where: and(
      eq(courseEnrollments.courseId, paymentRecord.courseId),
      eq(courseEnrollments.studentId, paymentRecord.studentId)
    ),
  });

  if (!existingEnrollment) {
    await db.insert(courseEnrollments).values({
      courseId: paymentRecord.courseId,
      studentId: paymentRecord.studentId,
      paymentId: paymentRecord.id,
      progress: 0,
      status: "active",
    });
  }

  // 3. Redeem coupon if couponId exists in metadata
  if (meta.couponId) {
    const couponRecord = await db.query.coupons.findFirst({
      where: eq(coupons.id, meta.couponId),
    });
    if (couponRecord) {
      // Increment coupon usedCount
      await db
        .update(coupons)
        .set({ usedCount: couponRecord.usedCount + 1 })
        .where(eq(coupons.id, meta.couponId));

      // Record coupon redemption
      await db.insert(couponRedemptions).values({
        couponId: meta.couponId,
        studentId: paymentRecord.studentId,
        paymentId: paymentRecord.id,
        discountAmount: meta.couponDiscount || 0,
      });
    }
  }

  // 4. Send email if not already sent
  if (!meta.emailSent) {
    const frontendUrl = env.CORS_ORIGIN || "http://localhost:3001";
    let subject = "";
    let html = "";

    if (meta.isNewUser) {
      subject = `Welcome to ProTech! Your account & course access details`;
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #09090b; margin-top: 0;">Congratulations on enrolling!</h2>
          <p>Hello <strong>${meta.name || "Student"}</strong>,</p>
          <p>You have successfully purchased the course: <strong>${meta.courseTitle}</strong>.</p>
          <p>Since you are a new user, we have created an account for you to access the course dashboard. Here are your login details:</p>
          <div style="background-color: #f4f4f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Login URL:</strong> <a href="${frontendUrl}/auth/login" style="color: #000; font-weight: bold; text-decoration: underline;">Click here to login</a></p>
            <p style="margin: 5px 0;"><strong>Email:</strong> ${meta.email}</p>
            <p style="margin: 5px 0;"><strong>Temporary Password:</strong> <code style="background-color: #e4e4e7; padding: 2px 6px; border-radius: 4px; font-family: monospace;">${meta.generatedPassword}</code></p>
          </div>
          <p style="color: #ef4444; font-size: 13px; font-weight: bold;"><em>Important: Please change your password as soon as you log in for security reasons.</em></p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 12px; color: #71717a; margin-bottom: 0;">This is an automated email from ProTech. If you have any questions, please contact support.</p>
        </div>
      `;
    } else {
      subject = `Enrollment Confirmed: ${meta.courseTitle}`;
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #09090b; margin-top: 0;">Congratulations on enrolling!</h2>
          <p>Hello <strong>${meta.name || "Student"}</strong>,</p>
          <p>You have successfully purchased and enrolled in: <strong>${meta.courseTitle}</strong>.</p>
          <p>You can access the course by logging into your dashboard:</p>
          <div style="background-color: #f4f4f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Dashboard URL:</strong> <a href="${frontendUrl}/dashboard" style="color: #000; font-weight: bold; text-decoration: underline;">Click here to access your courses</a></p>
            <p style="margin: 5px 0;"><strong>Account Email:</strong> ${meta.email}</p>
          </div>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 12px; color: #71717a; margin-bottom: 0;">This is an automated email from ProTech. If you have any questions, please contact support.</p>
        </div>
      `;
    }

    await sendEmail({
      to: meta.email,
      subject,
      html,
      apiKey: env.RESEND_API_KEY,
    });

    // Mark email as sent in metadata
    await db
      .update(payments)
      .set({
        metadata: {
          ...meta,
          emailSent: true,
        },
      })
      .where(eq(payments.id, paymentId));
  }
}

// 1. POST /create-order — Creates Razorpay order & registers/resolves user
publicPaymentsRouter.post("/create-order", async (c) => {
  try {
    const payload = await c.req.json<{
      courseId: string;
      couponCode?: string;
      name?: string;
      email?: string;
      mobile?: string;
      userId?: string;
    }>();

    const { courseId, couponCode, name, email, mobile, userId } = payload;

    if (!courseId) {
      return c.json({ error: "Course ID is required" }, 400);
    }

    const db = createDb();

    // Find course
    const courseRecord = await db.query.courses.findFirst({
      where: and(eq(courses.id, courseId), eq(courses.status, "PUBLISHED")),
    });

    if (!courseRecord) {
      return c.json({ error: "Course not found or not published" }, 404);
    }

    const basePrice =
      courseRecord.discountPrice !== null && courseRecord.discountPrice > 0
        ? courseRecord.discountPrice
        : courseRecord.price;

    // Validate Coupon if passed
    let couponDiscount = 0;
    let couponRecord: typeof coupons.$inferSelect | null = null;

    if (couponCode) {
      const [coupon] = await db
        .select()
        .from(coupons)
        .where(and(eq(coupons.code, couponCode), eq(coupons.isActive, true)))
        .limit(1);

      if (coupon) {
        const now = new Date();
        const isExpired = coupon.expiresAt && new Date(coupon.expiresAt) < now;
        const limitReached = coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit;

        // basePrice is in cents, coupon.minimumAmount is in cents
        const isBelowMin = coupon.minimumAmount !== null && basePrice < coupon.minimumAmount;

        // Restriction check
        const restrictions = await db
          .select()
          .from(couponCourses)
          .where(eq(couponCourses.couponId, coupon.id));

        const isCourseAllowed =
          restrictions.length === 0 || restrictions.some((r) => r.courseId === courseId);

        if (!isExpired && !limitReached && !isBelowMin && isCourseAllowed) {
          couponRecord = coupon;
          if (coupon.discountType === "PERCENTAGE") {
            couponDiscount = Math.round((basePrice * coupon.discountValue) / 100);
            if (coupon.maxDiscount !== null && couponDiscount > coupon.maxDiscount) {
              couponDiscount = coupon.maxDiscount;
            }
          } else {
            couponDiscount = coupon.discountValue;
          }

          if (couponDiscount > basePrice) {
            couponDiscount = basePrice;
          }
        }
      }
    }

    const finalAmount = Math.max(0, basePrice - couponDiscount);

    // User resolution/signup
    const auth = createAuth();
    const session = await auth.api.getSession({
      headers: c.req.raw.headers,
    });

    let studentId = "";
    let studentEmail = "";
    let studentName = "";
    let isNewUser = false;
    let generatedPassword = "";

    if (userId) {
      studentId = userId;
      studentEmail = email || "";
      studentName = name || "";
    } else if (session?.user) {
      studentId = session.user.id;
      studentEmail = session.user.email;
      studentName = session.user.name;
    } else {
      if (!email || !name) {
        return c.json({ error: "Name and email are required for guest checkout" }, 400);
      }

      const normalizedEmail = email.trim().toLowerCase();
      const existingUser = await db.query.user.findFirst({
        where: eq(user.email, normalizedEmail),
      });

      if (existingUser) {
        studentId = existingUser.id;
        studentEmail = existingUser.email;
        studentName = existingUser.name;
      } else {
        // Register new user
        isNewUser = true;
        generatedPassword = Math.random().toString(36).substring(2, 10);

        const signupRes = await auth.api.signUpEmail({
          body: {
            email: normalizedEmail,
            password: generatedPassword,
            name: name,
          },
        });

        if (!signupRes || !signupRes.user) {
          return c.json({ error: "Failed to sign up guest user" }, 500);
        }

        studentId = signupRes.user.id;
        studentEmail = signupRes.user.email;
        studentName = signupRes.user.name;

        // Assign role
        await db.insert(userRoles).values({
          userId: studentId,
          role: "STUDENT",
        });

        // Create student profile
        await db.insert(studentProfiles).values({
          userId: studentId,
          phone: mobile || null,
        });
      }
    }

    // Check if the student is already enrolled in this course and the enrollment is not expired (check by studentId and studentEmail)
    const enrollmentCheckUserIds: string[] = [];
    if (studentId) {
      enrollmentCheckUserIds.push(studentId);
    }
    if (studentEmail) {
      const userRecord = await db.query.user.findFirst({
        where: eq(user.email, studentEmail.trim().toLowerCase()),
      });
      if (userRecord && !enrollmentCheckUserIds.includes(userRecord.id)) {
        enrollmentCheckUserIds.push(userRecord.id);
      }
    }

    if (enrollmentCheckUserIds.length > 0) {
      for (const checkUserId of enrollmentCheckUserIds) {
        const activeEnrollment = await db.query.courseEnrollments.findFirst({
          where: and(
            eq(courseEnrollments.courseId, courseId),
            eq(courseEnrollments.studentId, checkUserId),
            eq(courseEnrollments.status, "active")
          ),
        });

        if (activeEnrollment) {
          const now = new Date();
          const isExpired =
            activeEnrollment.expiredAt !== null && new Date(activeEnrollment.expiredAt) < now;
          if (!isExpired) {
            return c.json({ error: "You are already enrolled in this course." }, 400);
          }
        }
      }
    }

    const paymentId = crypto.randomUUID();

    // Create Razorpay order
    const keyId = c.env.RAZORPAY_KEY_ID || "rzp_test_defaultkey";
    const keySecret = c.env.RAZORPAY_KEY_SECRET;
    let rzpOrderId = `order_mock_${crypto.randomUUID().substring(0, 8)}`;

    if (keyId !== "rzp_test_defaultkey" && keySecret) {
      try {
        const orderData = await createRazorpayOrder(
          {
            amount: finalAmount, // in paise
            currency: "INR",
            receipt: paymentId,
          },
          keyId,
          keySecret
        );
        rzpOrderId = orderData.id;
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : "Failed to call Razorpay API";
        console.error("Failed to call Razorpay API:", errMsg);
        return c.json({ error: errMsg }, 500);
      }
    }

    // Insert payment record
    await db.insert(payments).values({
      id: paymentId,
      studentId,
      courseId,
      amount: finalAmount,
      discount: couponDiscount,
      currency: "INR",
      orderId: rzpOrderId,
      provider: "razorpay",
      status: "pending",
      metadata: {
        isNewUser,
        generatedPassword,
        emailSent: false,
        couponId: couponRecord?.id || null,
        couponDiscount,
        name: studentName,
        email: studentEmail,
        courseTitle: courseRecord.title,
      },
    });

    return c.json({
      paymentId,
      orderId: rzpOrderId,
      amount: finalAmount,
      currency: "INR",
      isNewUser,
      email: studentEmail,
      keyId,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Order creation failed";
    console.error("Create order error:", msg);
    return c.json({ error: msg }, 500);
  }
});

// 2. POST /verify-payment — Verifies client-side Razorpay signature
publicPaymentsRouter.post("/verify-payment", async (c) => {
  try {
    const payload = await c.req.json<{
      paymentId: string;
      razorpayPaymentId: string;
      razorpayOrderId: string;
      razorpaySignature: string;
    }>();

    const { paymentId, razorpayPaymentId, razorpayOrderId, razorpaySignature } = payload;

    if (!paymentId || !razorpayPaymentId || !razorpayOrderId || !razorpaySignature) {
      return c.json({ error: "Missing verification parameters" }, 400);
    }

    const db = createDb();

    // Query payment record
    const paymentRecord = await db.query.payments.findFirst({
      where: eq(payments.id, paymentId),
    });

    if (!paymentRecord) {
      return c.json({ error: "Payment record not found" }, 404);
    }

    // If already marked as completed (by webhook), skip and return success immediately without downgrading status
    const paymentMeta = (paymentRecord.metadata || {}) as unknown as PaymentMetadata;
    if (paymentRecord.status === "completed") {
      return c.json({
        success: true,
        isNewUser: paymentMeta.isNewUser || false,
        email: paymentMeta.email,
      });
    }

    // Verify signature
    const keySecret = c.env.RAZORPAY_KEY_SECRET;
    const isSignatureValid = keySecret
      ? verifyRazorpaySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature, keySecret)
      : true; // Bypass signature verification in development if keySecret is missing

    if (!isSignatureValid) {
      // Mark payment as failed
      await db.update(payments).set({ status: "failed" }).where(eq(payments.id, paymentId));

      return c.json({ success: false, error: "Invalid payment signature" }, 400);
    }

    // Fulfill the order using status "verified" for Frontend Verification
    await fulfillOrder(db, paymentId, razorpayPaymentId, "verified", c.env);

    // Fetch updated record for metadata response
    const updatedRecord = await db.query.payments.findFirst({
      where: eq(payments.id, paymentId),
    });

    const updatedMeta = (updatedRecord?.metadata || {}) as unknown as PaymentMetadata;

    return c.json({
      success: true,
      isNewUser: updatedMeta.isNewUser || false,
      email: updatedMeta.email,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Payment verification failed";
    console.error("Verify payment error:", msg);
    return c.json({ error: msg }, 500);
  }
});

// 3. POST /webhook — Webhook endpoint for Razorpay payment notifications
publicPaymentsRouter.post("/webhook", async (c) => {
  try {
    const signature = c.req.header("x-razorpay-signature");
    const rawBody = await c.req.text();

    if (!signature) {
      return c.json({ error: "Webhook signature header missing" }, 400);
    }

    const webhookSecret = c.env.RAZORPAY_WEBHOOK_SECRET;
    const isSignatureValid = webhookSecret
      ? verifyWebhookSignature(rawBody, signature, webhookSecret)
      : true; // Bypass in dev if no secret

    if (!isSignatureValid) {
      return c.json({ error: "Invalid webhook signature" }, 400);
    }

    const body = JSON.parse(rawBody) as {
      event: string;
      payload: {
        payment?: {
          entity?: {
            id?: string;
            order_id?: string;
            status?: string;
            error_description?: string;
          };
        };
        order?: {
          entity?: {
            id?: string;
            status?: string;
          };
        };
      };
    };

    const event = body.event;

    if (event === "payment.captured" || event === "order.paid") {
      const orderId = body.payload.payment?.entity?.order_id || body.payload.order?.entity?.id;
      const providerPaymentId = body.payload.payment?.entity?.id || body.payload.order?.entity?.id;

      if (orderId && providerPaymentId) {
        const db = createDb();
        const paymentRecord = await db.query.payments.findFirst({
          where: eq(payments.orderId, orderId),
        });

        if (paymentRecord) {
          // Fulfill order with status "completed" for Webhook Verification
          await fulfillOrder(db, paymentRecord.id, providerPaymentId, "completed", c.env);
        }
      }
    } else if (event === "payment.failed") {
      const entity = body.payload.payment?.entity;
      const orderId = entity?.order_id;
      const providerPaymentId = entity?.id;
      const errorDescription = entity?.error_description || "Payment failed";

      if (orderId) {
        const db = createDb();
        const paymentRecord = await db.query.payments.findFirst({
          where: eq(payments.orderId, orderId),
        });

        if (paymentRecord && paymentRecord.status === "pending") {
          const paymentMeta = (paymentRecord.metadata || {}) as unknown as PaymentMetadata;
          await db
            .update(payments)
            .set({
              status: "failed",
              providerPaymentId: providerPaymentId,
              metadata: {
                ...paymentMeta,
                failedReason: errorDescription,
              },
            })
            .where(eq(payments.id, paymentRecord.id));
        }
      }
    }

    return c.json({ received: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Webhook error";
    console.error("Webhook processing failed:", msg);
    return c.json({ error: msg }, 500);
  }
});
