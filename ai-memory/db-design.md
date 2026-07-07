# Database Design & Table Specification

This document outlines the detailed configuration and architecture of all 32 database tables implemented within the `@oedulms/db` package.

---

## 1. Authentication (`auth.ts`)
- **`user`**: Stores user account status, credentials, and profile basics.
  - Columns: `id` (PK, text), `name` (text, not null), `email` (text, not null, unique), `emailVerified` (boolean, default false), `image` (text), `banAt` (timestamp), `banReason` (text), `createdAt` (timestamp), `updatedAt` (timestamp).
- **`session`**: Tracks login sessions.
  - Columns: `id` (PK, text), `expiresAt` (timestamp, not null), `token` (text, not null, unique), `ipAddress` (text), `userAgent` (text), `userId` (text, FK -> user.id, cascade), `createdAt` (timestamp), `updatedAt` (timestamp).
- **`account`**: Connects OAuth providers.
  - Columns: `id` (PK, text), `accountId` (text, not null), `providerId` (text, not null), `userId` (text, FK -> user.id, cascade), `accessToken`/`refreshToken`/`idToken` (text), `createdAt` (timestamp), `updatedAt` (timestamp).
- **`verification`**: Email and token verification challenges.
  - Columns: `id` (PK, text), `identifier` (text, not null), `value` (text, not null), `expiresAt` (timestamp, not null), `createdAt` (timestamp), `updatedAt` (timestamp).

---

## 2. Profiles (`profiles.ts`)
- **`user_roles`**: Maps users to roles.
  - Columns: `id` (PK, uuid), `userId` (text, FK -> user.id, cascade), `role` (text, STUDENT or TEACHER), `createdAt` (timestamp). Unique index on `(user_id, role)`.
- **`student_profiles`**: Extended student details.
  - Columns: `id` (PK, uuid), `userId` (text, FK -> user.id, cascade, unique), `bio` (text), `headline` (text), `phone` (text), `country` (text), `socialMedia` (jsonb), `createdAt` (timestamp), `updatedAt` (timestamp).
- **`instructor_profiles`**: Instructor details.
  - Columns: `id` (PK, uuid), `userId` (text, FK -> user.id, cascade, unique), `slug` (text, unique), `displayName` (text, not null), `headline` (text), `bio` (text), `avatar`/`coverImage` (text), `socialMedia` (jsonb), `isVerified` (boolean, default false), `createdAt` (timestamp), `updatedAt` (timestamp).

---

## 3. Courses & Lectures (`courses.ts`)
- **`courses`**: Course catalog details.
  - Columns: `id` (PK, uuid), `instructorId` (uuid, FK -> instructor_profiles.id, cascade), `title` (text, not null), `slug` (text, unique), `shortDescription`/`description` (text), `thumbnail`/`trailerVideo` (text), `language`/`level` (text), `validateDays` (integer), `status` (text, default DRAFT), `price`/`discountPrice` (integer in cents), `currency` (text), `durationSeconds` (integer), `totalLectures` (integer), `certificateEnabled` (boolean), `publishedAt` (timestamp), `createdAt` (timestamp), `updatedAt` (timestamp).
- **`course_sections`**: Core sections grouping lectures.
  - Columns: `id` (PK, uuid), `courseId` (uuid, FK -> courses.id, cascade), `title` (text, not null), `description` (text), `position` (integer), `createdAt` (timestamp).
- **`course_lectures`**: Lectures inside sections.
  - Columns: `id` (PK, uuid), `sectionId` (uuid, FK -> course_sections.id, cascade), `title` (text), `slug` (text, unique), `description`/`videoUrl`/`thumbnail` (text), `duration` (integer), `isPreview` (boolean), `position` (integer), `createdAt`/`updatedAt` (timestamp).
- **`lecture_resources`**: Handouts and assets.
  - Columns: `id` (PK, uuid), `lectureId` (uuid, FK -> course_lectures.id, cascade), `title` (text), `type` (text), `url` (text), `size` (integer bytes).
- **`course_faqs`**: Frequently asked questions.
  - Columns: `id` (PK, uuid), `courseId` (uuid, FK -> courses.id, cascade), `question`/`answer` (text), `position` (integer).
- **`course_tags`**: Metadata tags.
  - Columns: `id` (PK, uuid), `name` (text), `slug` (text, unique).
- **`course_tag_relations`**: Junction table for tags.
  - Columns: `courseId` (uuid, FK -> courses.id, cascade), `tagId` (uuid, FK -> course_tags.id, cascade). Composite PK.

---

## 4. Enrollments & Progress (`enrollments.ts`)
- **`course_enrollments`**: Course participation logs.
  - Columns: `id` (PK, uuid), `courseId` (uuid, FK -> courses.id, cascade), `studentId` (text, FK -> user.id, cascade), `paymentId` (uuid, FK -> payments.id, set null), `progress` (integer), `status` (text), `completedAt`/`expiredAt`/`createdAt` (timestamp).
- **`lecture_progress`**: Playback state tracker.
  - Columns: `id` (PK, uuid), `lectureId` (uuid, FK -> course_lectures.id, cascade), `studentId` (text, FK -> user.id, cascade), `watchSeconds`/`lastPosition` (integer), `completed` (boolean), `updatedAt` (timestamp).
- **`course_reviews`**: Ratings and feedback.
  - Columns: `id` (PK, uuid), `courseId` (uuid, FK -> courses.id, cascade), `studentId` (text, FK -> user.id, cascade), `rating` (integer), `review` (text), `createdAt` (timestamp).

---

## 5. Discussions & Q&A (`discussions.ts`)
- **`lecture_comments`**: Lecture feedback and thread structure.
  - Columns: `id` (PK, uuid), `lectureId`/`parentId` (uuid), `userId` (text), `content` (text), `attachmentId` (uuid), `isEdited` (boolean), `createdAt`/`updatedAt`/`deletedAt` (timestamp).
- **`lecture_comment_reactions`**: Reactions on comments.
  - Columns: `commentId` (uuid), `userId` (text), `reaction` (text). Composite PK.
- **`lecture_questions`**: Discussions thread questions.
  - Columns: `id` (PK, uuid), `lectureId`/`attachmentId`/`acceptedAnswerId` (uuid), `studentId` (text), `title` (text), `description` (jsonb), `status` (text), `viewsCount`/`answersCount` (integer), `createdAt`/`updatedAt`/`deletedAt` (timestamp).
- **`lecture_question_answers`**: Q&A Answers.
  - Columns: `id` (PK, uuid), `questionId`/`attachmentId` (uuid), `userId` (text), `content` (jsonb), `isInstructorAnswer`/`isAccepted` (boolean), `upvotes` (integer), `createdAt`/`updatedAt`/`deletedAt` (timestamp).
- **`lecture_question_answer_reactions`**: Reactions on answers.
  - Columns: `answerId` (uuid), `userId` (text), `reaction` (text). Composite PK.

---

## 6. Social Feed (`posts.ts`)
- **`posts`**: Community board posts.
  - Columns: `id` (PK, uuid), `authorId` (text), `content` (text), `image`/`video` (text), `isEnableComment` (boolean), `visibility` (text), `createdAt` (timestamp).
- **`post_comments`**: Post replies.
  - Columns: `id` (PK, uuid), `postId`/`parentId` (uuid), `userId` (text), `comment` (text), `createdAt`/`deletedAt` (timestamp).
- **`post_likes`**: Likes on feed posts.
  - Columns: `postId` (uuid), `userId` (text). Composite PK.

---

## 7. Payments (`payments.ts`)
- **`payments`**: Payment records.
  - Columns: `id` (PK, uuid), `studentId` (text), `courseId` (uuid), `amount`/`discount` (integer in cents), `currency` (text), `orderId` (text), `provider` (text), `providerPaymentId` (text), `status` (text), `metadata` (jsonb), `createdAt` (timestamp).

---

## 8. Coupons (`coupons.ts`)
- **`coupons`**: Discount templates.
  - Columns: `id` (PK, uuid), `code` (text, unique), `name` (text), `description` (text), `discountType` (text), `discountValue` (integer), `maxDiscount`/`minimumAmount`/`usageLimit`/`usedCount` (integer), `isActive` (boolean), `createdBy` (text), `createdAt`/`updatedAt` (timestamp).
- **`coupon_courses`**: Restricts coupons to courses.
  - Columns: `couponId` (uuid), `courseId` (uuid). Composite PK.
- **`coupon_redemptions`**: Redeemed coupons.
  - Columns: `id` (PK, uuid), `couponId` (uuid), `studentId` (text), `paymentId` (uuid), `discountAmount` (integer), `createdAt` (timestamp).

---

## 9. Media & Settings
- **`attachments`** (`attachments.ts`): Tracks uploads.
  - Columns: `id` (PK, uuid), `userId` (text), `originalName`/`fileName`/`mimeType`/`url` (text), `size` (integer bytes), `createdAt`/`deletedAt` (timestamp).
- **`notifications`** (`notifications.ts`): App alerts.
  - Columns: `id` (PK, uuid), `userId` (text), `title`/`body`/`type`/`link` (text), `isRead` (boolean), `createdAt` (timestamp).
- **`organization`** (`organizations.ts`): Tenant details.
  - Columns: `id` (PK, uuid), `name` (text, not null), `logo`/`coverImage`/`email`/`phone` (text), `socialMediaLink` (jsonb), `createdAt` (timestamp).
