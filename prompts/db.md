---

# 1. Better Auth (Authentication)

## users

Managed by Better Auth.

**Use**

* Login
* Register
* Authentication

---

## sessions

Better Auth table.

**Use**

* User sessions

---

# 2. Student Profile

## student_profiles

| Column    |
| --------- |
| id        |
| userId    |
| bio       |
| headline  |
| phone     |
| country   |
| website   |
| createdAt |
| updatedAt |

**Use**

Student profile page.

---

user_roles

user_roles

id UUID PK

userId FK -> users.id

role
-- STUDENT
-- TEACHER

createdAt


# 3. Instructor Profile

## instructor_profiles

| Column      |
| ----------- |
| id          |
| userId      |
| slug        |
| displayName |
| headline    |
| bio         |
| avatar      |
| coverImage  |
| socail meida|array of object JSON
| isVerified  |
| createdAt   |
| updatedAt   |

**Use**

```
/instructors

/instructors/:slug
```

---

# 4. Categories

## course_categories

| Column      |
| ----------- |
| id          |
| name        |
| slug        |
| icon        |
| description |

**Use**

Course filtering.

---

# 5. Courses

## courses

| Column             |
| ------------------ |
| id                 |
| instructorId       |
| categoryId         |
| title              |
| slug               |
| shortDescription   |
| description        |
| thumbnail          |
| trailerVideo       |
| language           |
| level              |
| status             |
| price              |
| discountPrice      |
| currency           |
| durationSeconds    |
| totalLectures      |
| certificateEnabled |
| publishedAt        |
| createdAt          |
| updatedAt          |

**Use**

Main course table.

---

# 6. Course Sections

## course_sections

| Column      |
| ----------- |
| id          |
| courseId    |
| title       |
| description |
| position    |
| createdAt   |

**Use**

Organize lectures.

---

# 7. Course Lectures

## course_lectures

| Column      |
| ----------- |
| id          |
| sectionId   |
| title       |
| slug        |
| description |
| videoUrl    |
| thumbnail   |
| duration    |
| isPreview   |
| position    |
| createdAt   |
| updatedAt   |

**Use**

Video lessons.

---

# 8. Lecture Resources

## lecture_resources

| Column    |
| --------- |
| id        |
| lectureId |
| title     |
| type      |
| url       |
| size      |

**Use**

PDF

ZIP

Slides

Code

Images

---


---



**Use**

What students learn.

---

# 11. Course FAQ

## course_faqs

| Column   |
| -------- |
| id       |
| courseId |
| question |
| answer   |
| position |

**Use**

FAQ.

---

# 12. Course Tags

## course_tags

| Column |
| ------ |
| id     |
| name   |
| slug   |

---

## course_tag_relations

| Column   |
| -------- |
| courseId |
| tagId    |

**Use**

Many-to-many tags.

---

# 13. Enrollments

## course_enrollments

| Column      |
| ----------- |
| id          |
| courseId    |
| studentId   |
| paymentId   |
| progress    |
| status      |
| completedAt |
| createdAt   |

**Use**

Purchased courses.

---

# 14. Lecture Progress

## lecture_progress

| Column       |
| ------------ |
| id           |
| lectureId    |
| studentId    |
| watchSeconds |
| lastPosition |
| completed    |
| updatedAt    |

**Use**

Resume watching.

---

# 15. Reviews

## course_reviews

| Column    |
| --------- |
| id        |
| courseId  |
| studentId |
| rating    |
| review    |
| createdAt |

**Use**

Ratings.

---

# 18. Payments

## payments

| Column            |
| ----------------- |
| id                |
studentId
metaData
discound
orignal price
currency
courseId
currency
| orderId           |
| provider          |
| providerPaymentId |
| amount            |
| currency          |
| status            |
| createdAt         |

**Use**

Stripe

Razorpay

PayPal

---

# 19. Feed Posts

## posts

| Column     |
| ---------- |
| id         |
| authorId   |
| content    |
| image      |
| video      |
| isEableComment|
| visibility |
| createdAt  |

**Use**

Student feed.

---

# 20. Post Comments

## post_comments

| Column    |
| --------- |
| id        |
| postId    |
| userId    |
| comment   |
| parentId  |
| createdAt |

---

# 21. Post Likes

## post_likes

| Column |
| ------ |
| postId |
| userId |

---

# 22. Lecture Comments

## lecture_comments

| Column       |
| ------------ |
| id           |
| lectureId    |
| userId       |
| parentId     |
| content      |
| attachmentId |
| isEdited     |
| createdAt    |
| updatedAt    |

**Use**

Lecture discussion.

---

# 23. Lecture Comment Reactions

## lecture_comment_reactions

| Column    |
| --------- |
| commentId |
| userId    |
| reaction  |

---

# 24. Lecture Questions (Q&A)

## lecture_questions

| Column                       |
| ---------------------------- |
| id                           |
| lectureId                    |
| studentId                    |
| title                        |
| description (Rich Text JSON) |
| attachmentId                 |
| status                       |
| viewsCount                   |
| answersCount                 |
| acceptedAnswerId             |
| createdAt                    |
| updatedAt                    |

**Use**

Ask Question.

---

# 25. Lecture Answers

## lecture_question_answers

| Column                   |
| ------------------------ |
| id                       |
| questionId               |
| userId                   |
| content (Rich Text JSON) |
| attachmentId             |
| isInstructorAnswer       |
| isAccepted               |
| upvotes                  |
| createdAt                |
| updatedAt                |

**Use**

Students answer.

Teachers answer.

---

# 26. Answer Reactions

## lecture_question_answer_reactions

| Column   |
| -------- |
| answerId |
| userId   |
| reaction |

---

# 27. Notifications

## notifications

| Column    |
| --------- |
| id        |
| userId    |
| title     |
| body      |
| type      |
| link      |
| isRead    |
| createdAt |

**Use**

All notifications.

---

# 28. Attachments

## attachments

| Column       |
| ------------ |
| id           |
| userId       |
| originalName |
| fileName     |
| mimeType     |
| size         |
| url          |
| createdAt    |

**Use**

Reusable uploads for:

* Questions
* Answers
* Comments
* Resources
---

# 29. Organization

## organization

| Column     |
| ---------- |
| id         |
| name       |
| logo       |
| coverImage |
| email      |
| phone      |
| website    |
| address    |
| facebook   |
| linkedin   |
| youtube    |
| createdAt  |

**Use**

Organization settings.

---