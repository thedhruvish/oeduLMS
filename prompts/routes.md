Now build a oedulms (open education learning management system) system. 
On the first was the apps/web. 
This are the  all the routes.

- /home page (laading page)
- /course course list page
- /course/:slug courss details page 
- /instructors Instructor list
- /instructors/:name instructor full details
- /checkout/:paymentId
- /about
- /privacy-policy
- /terms-condition

## In the /dashboard/* are  the all router are the private it only access by the login user who has a role of the STUDENT. 
- /courses   listed all the course and also show that are the pursed or not pursed that all the course.
- /courses/:courseId/details In the not a video it list all the courss lectures and meta data. 
- /courses/:courseId?lecturer=id On the single video play on the here. 
- /scroll it was the feed that teacher posted.
- /proflie In the here are the show the profile. 
- /notifications list of the notification. 

## /admin/* in this are the only access by the TEACHER
- /students list of the all the student.
- /students/:id details of the student. 
- /courses list of the student.
- /courses/new create a new coures
- /courses/:id details of courses
- /courses/:id/edit edit of the courses
- /instructors/ list
- /instructors/:id details of the instructor
- /instructors/new added a new 
- /instructors/:id/edit edit a details.
- /settings/orgs orgnation profie changed. 
- /settings/profiles they teacher profile improved.
- /notifications/

## auth 

- /auth/login - login
- /auth/register - register
- /auth/reset-password - reset paw
- /auth/email-verification

