import { motion } from "motion/react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Star, Clock, Users, BookOpen, ArrowRight, Tag } from "lucide-react";
import { Button } from "@oedulms/ui/components/button";
import { getThumbClass } from "@/config/utils";

export interface CourseCardData {
  id: string;
  title: string;
  slug: string;
  shortDescription?: string | null;
  thumbnail?: string | null;
  price: number; // in dollars (normalized by API fetcher)
  discountPrice?: number | null; // in dollars (normalized by API fetcher)
  durationSeconds?: number;
  instructorName?: string | null;
  // Optional / mockable properties
  rating?: number;
  reviews?: number;
  students?: string;
  thumbClass?: string;
}

interface CourseCardProps {
  course: CourseCardData;
  index: number;
  onEnroll?: (course: CourseCardData) => void;
}

export function CourseCard({ course, index }: CourseCardProps) {
  const navigate = useNavigate();
  const finalPrice =
    course.discountPrice && course.discountPrice > 0 ? course.discountPrice : course.price;
  const originalPrice = course.price;
  const hasDiscount =
    course.discountPrice && course.discountPrice > 0 && course.discountPrice < course.price;

  // Calculate discount percentage
  const discountPercentage = hasDiscount
    ? Math.round(((originalPrice - finalPrice) / originalPrice) * 100)
    : 10; // Default to 10% if no discount is stored in DB

  // Format duration
  const durationHours = course.durationSeconds
    ? `${Math.round(course.durationSeconds / 3600)}h`
    : "30h";

  // Safe fallback values
  const instructor = course.instructorName || "ProTech Faculty";
  const rating = course.rating || 4.8;
  const reviewsCount = course.reviews || 120;
  const studentsCount = course.students || "1,200";
  const thumbClass = course.thumbClass || getThumbClass(course.id);

  return (
    <Link
      to={"/courses/$slug"}
      params={{ slug: course.slug }}
      className="block h-full cursor-pointer group"
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 24 }}
        transition={{ delay: index * 0.05, duration: 0.5, ease: "easeOut" }}
        whileHover={{ y: -6, scale: 1.01 }}
        className="rounded-2xl border border-border/60 bg-card overflow-hidden transition-shadow hover:shadow-xl flex flex-col h-full"
      >
        {/* Thumbnail */}
        <div
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            navigate({
              to: "/courses/$slug",
              params: { slug: course.slug },
              hash: "curriculum",
            });
          }}
          className={`relative h-44 ${course.thumbnail ? "bg-muted" : `bg-gradient-to-br ${thumbClass}`} overflow-hidden shrink-0 cursor-pointer`}
        >
          {course.thumbnail ? (
            <img
              src={course.thumbnail}
              alt={course.title}
              className="w-full h-full object-cover absolute inset-0 transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <>
              {/* Dot pattern overlay */}
              <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_50%_50%,white_1px,transparent_1px)] bg-[size:20px_20px]" />

              {/* Course icon */}
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  className="size-16 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center"
                >
                  <BookOpen className="size-8 text-white/80" />
                </motion.div>
              </div>
            </>
          )}

          {/* Badges */}
          {/* <span className="absolute top-3 left-3 rounded-md bg-foreground text-background text-[10px] font-bold px-2 py-0.5 shadow">
            {badge}
          </span> */}
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col flex-1">
          <h3 className="font-semibold text-foreground text-base leading-snug mb-1 group-hover:text-foreground/80 transition-colors line-clamp-2">
            {course.title}
          </h3>
          <p className="text-sm text-muted-foreground mb-2">by {instructor}</p>

          {course.shortDescription && (
            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mb-3">
              {course.shortDescription}
            </p>
          )}

          {/* Meta info */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
            <span className="flex items-center gap-1">
              <Star className="size-3.5 fill-foreground/60 text-foreground/60" />
              <span className="font-medium text-foreground">{rating}</span>
              <span className="text-muted-foreground/70">({reviewsCount})</span>
            </span>
            <span className="flex items-center gap-1">
              <Users className="size-3.5" />
              {studentsCount}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="size-3.5" />
              {durationHours}
            </span>
          </div>

          {/* Discount & CTA  */}
          <div className="flex items-center justify-between border-t border-border/60 pt-4 mt-auto">
            <div className="flex items-center gap-1.5 rounded-full bg-foreground/[0.08] text-foreground text-xs font-semibold px-3 py-1">
              <Tag className="size-3.5" />
              <span>{discountPercentage}% Discount</span>
            </div>
            <Button
              size="sm"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                navigate({
                  to: "/fast-checkout/$slug",
                  params: { slug: course.slug },
                });
              }}
              className="bg-foreground text-background hover:bg-foreground/90 gap-1.5"
            >
              Enroll Now
              <ArrowRight className="size-3.5" />
            </Button>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}
