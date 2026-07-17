export interface PublicCourse {
  id: string;
  title: string;
  slug: string;
  shortDescription?: string | null;
  thumbnail?: string | null;
  price: number;
  discountPrice?: number | null;
  durationSeconds: number;
  instructorName?: string | null;
}

export interface PublicLecture {
  id: string;
  title: string;
  slug: string;
  duration: number;
  isPreview: boolean;
  videoUrl?: string | null;
  hlsUrl?: string | null;
}

export interface PublicSection {
  id: string;
  title: string;
  description?: string | null;
  position: number;
  lectures: PublicLecture[];
}

export interface PublicFaq {
  id: string;
  question: string;
  answer: string;
  position: number;
}

export interface PublicCourseDetail {
  id: string;
  title: string;
  slug: string;
  shortDescription?: string | null;
  description?: string | null;
  thumbnail?: string | null;
  trailerVideo?: string | null;
  price: number;
  discountPrice?: number | null;
  durationSeconds: number;
  instructorName: string;
}

export interface PublicCouponValidation {
  valid: boolean;
  code: string;
  discountType: "PERCENTAGE" | "FIXED";
  discountValue: number;
  discountAmount: number;
  error?: string;
}

export interface ValidateCoupon {
  code: string;
  courseId: string;
  coursePrice: number;
}
