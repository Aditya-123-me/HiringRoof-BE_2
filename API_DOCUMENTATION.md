# HiringRoof Backend API Documentation

Complete API Reference for the HiringRoof Backend Server. Includes all endpoints for authentication, job management, candidate management, pipeline workflows, admin operations, and the **Soft Delete / Hard Delete / Restore / Recycle Bin** architecture.

---

## Table of Contents
1. [Base Configuration & Authentication](#1-base-configuration--authentication)
2. [Soft Delete vs Hard Delete Overview](#2-soft-delete-vs-hard-delete-overview)
3. [User Deletion & Restoration APIs](#3-user-deletion--restoration-apis)
4. [Job Post Deletion & Restoration APIs](#4-job-post-deletion--restoration-apis)
5. [SuperAdmin Deletion & Bin APIs](#5-superadmin-deletion--bin-apis)
6. [User & Authentication APIs](#6-user--authentication-apis)
7. [Job Post Management APIs](#7-job-post-management-apis)
8. [Job Application & Pipeline APIs](#8-job-application--pipeline-apis)
9. [SuperAdmin Management APIs](#9-superadmin-management-apis)
10. [HR & Admin Management APIs](#10-hr--admin-management-apis)
11. [Sub-Admin Management APIs](#11-sub-admin-management-apis)
12. [Addons, Services & Payment APIs](#12-addons-services--payment-apis)
13. [Campus, Chat, Notification & Utility APIs](#13-campus-chat-notification--utility-apis)

---

## 1. Base Configuration & Authentication

*   **Base URL (Local):** `http://localhost:8520/api`
*   **Base URL (Production):** `https://hiringroof.hansrajventures.com/api`
*   **Request Headers:**
    *   `Content-Type: application/json` (or `multipart/form-data` for file uploads)
    *   `Authorization: Bearer <TOKEN>`

### Authentication Types
*   **User Token (`authorization`):** Generated upon candidate or recruiter login/OTP verification.
*   **Admin/SuperAdmin Token (`adminAuthorization`):** Generated upon SuperAdmin, Admin, Sub-Admin, or HR login. Token must be supplied in headers: `Authorization: Bearer <TOKEN>` or `HSA_token`.

---

## 2. Soft Delete vs Hard Delete Overview

| Feature | Soft Delete (`DELETE /soft-delete/:id`) | Hard Delete / Permanent Delete (`DELETE /hard-delete/:id`) |
| :--- | :--- | :--- |
| **Database Action** | Sets `isDeleted: true`, records `deletedAt`, `deletedBy`, `deleteType: "soft"` | Completely removes document from MongoDB via `findByIdAndDelete` / `deleteOne` |
| **Reversibility** | **Reversible** at any time via `PUT /restore/:id` | **Irreversible** — data cannot be recovered |
| **Visibility** | Hidden from regular search, active listings, and public queries. Visible in **Recycle Bin** (`/bin`) | Permanently erased from all listings and the database |
| **Associated Records** | **Jobs:** Inactivates job, retains applications for audit until restored or permanently purged.<br>**Recruiters:** Soft-deletes user account and automatically suspends all active jobs posted by that recruiter. | **Jobs:** Erases job document and permanently deletes all related applications.<br>**Recruiters:** Erases recruiter profile, all posted jobs, and related applications. |
| **Restore Behavior** | Re-activates user/job (`isDeleted: false`). If recruiter, automatically re-activates their suspended jobs. | Not restorable. |

---

## 3. User Deletion & Restoration APIs

### 3.1 Soft Delete User
Deactivates candidate or recruiter account and marks document as deleted without erasing data.
*   **URL:** `/user/soft-delete/:_id`
*   **Method:** `DELETE`
*   **Access:** Authenticated User (Self) or Administrator / SuperAdmin
*   **Headers:** `Authorization: Bearer <token>`
*   **Path Parameter:** `_id` (User MongoDB ObjectId)
*   **Query Parameters (Optional):**
    *   `reason`: Text explanation for deletion.
*   **Response (200 OK):**
    ```json
    {
      "status": true,
      "msg": "User soft deleted successfully !!",
      "data": {
        "_id": "6a8c07576856830c28fbf4cf",
        "name": "Jane Doe",
        "isDeleted": true,
        "deletedAt": "2026-10-15T13:40:00.000Z",
        "deleteType": "soft"
      }
    }
    ```

---

### 3.2 Hard Delete User (Permanent Delete)
Permanently purges the user profile, resume/profile images, applications, and posted jobs from the database.
*   **URL:** `/user/hard-delete/:_id`
    *   *Alias:* `/user/permanently-delete/:_id`
*   **Method:** `DELETE`
*   **Access:** SuperAdmin / Admin (or authenticated account owner)
*   **Headers:** `Authorization: Bearer <token>`
*   **Path Parameter:** `_id` (User MongoDB ObjectId)
*   **Response (200 OK):**
    ```json
    {
      "status": true,
      "msg": "User permanently deleted from database !!"
    }
    ```

---

### 3.3 Generic Delete User (Backward Compatible)
*   **URL:** `/user/delete/:_id`
*   **Method:** `DELETE`
*   **Access:** Authenticated User or Admin
*   **Query Parameter:**
    *   `type`: `soft` (default) or `hard`
*   **Response (200 OK):** Dispatches to Soft Delete or Hard Delete based on query.

---

### 3.4 Restore User
Restores a soft-deleted user account. If user is a recruiter, automatically reactivates all jobs associated with the recruiter.
*   **URL:** `/user/restore/:_id`
*   **Method:** `PUT`
*   **Access:** SuperAdmin / Admin
*   **Headers:** `Authorization: Bearer <token>`
*   **Path Parameter:** `_id` (User MongoDB ObjectId)
*   **Response (200 OK):**
    ```json
    {
      "status": true,
      "msg": "User restored successfully !!",
      "data": {
        "_id": "6a8c07576856830c28fbf4cf",
        "isDeleted": false,
        "deletedAt": null,
        "deleteType": ""
      }
    }
    ```

---

### 3.5 Get Deleted Users (Bin Feed)
Retrieves a paginated list of soft-deleted users for the SuperAdmin Recycle Bin.
*   **URL:** `/user/deleted-users`
*   **Method:** `GET`
*   **Access:** SuperAdmin / Admin
*   **Headers:** `Authorization: Bearer <token>`
*   **Query Parameters:**
    *   `page`: Page number (default: `1`)
    *   `limit`: Items per page (default: `25`, max: `200`)
    *   `type`: `jobSeeker`, `companyRecruiter`, `individualRecruiter` (optional)
    *   `search`: Search string (matches name, email, phone, companyName)
*   **Response (200 OK):**
    ```json
    {
      "status": true,
      "msg": "Deleted users fetched successfully !!",
      "totalUser": 1,
      "totalPage": 1,
      "currentPage": 1,
      "data": [
        {
          "_id": "6a8c07576856830c28fbf4cf",
          "name": "Alex Smith",
          "email": "alex@example.com",
          "phone": "+919876543210",
          "userType": "jobSeeker",
          "isDeleted": true,
          "deletedAt": "2026-10-14T08:20:00.000Z",
          "deletedBy": {
            "_id": "6a5f0edda73a45cdc81cc4e6",
            "name": "Super Admin",
            "type": "superAdmin"
          }
        }
      ]
    }
    ```

---

## 4. Job Post Deletion & Restoration APIs

### 4.1 Soft Delete Job Post
Hides a job post from candidate search listings and marks it as inactive and soft-deleted.
*   **URL:** `/job/soft-delete/:_id`
*   **Method:** `DELETE`
*   **Access:** Job Owner (Recruiter) or SuperAdmin / Admin
*   **Headers:** `Authorization: Bearer <token>`
*   **Path Parameter:** `_id` (Job MongoDB ObjectId)
*   **Query Parameters (Optional):**
    *   `reason`: Reason for deactivating/soft-deleting.
*   **Response (200 OK):**
    ```json
    {
      "status": true,
      "msg": "Job post soft deleted successfully !!",
      "data": {
        "_id": "6a749240550f7a7b766f68ac",
        "jobTittle": "Frontend Developer",
        "isDeleted": true,
        "isActive": false,
        "deletedAt": "2026-10-15T12:00:00.000Z",
        "deleteType": "soft"
      }
    }
    ```

---

### 4.2 Hard Delete Job Post (Permanent Delete)
Permanently deletes the job post and all candidate applications associated with this job.
*   **URL:** `/job/hard-delete/:_id`
    *   *Alias:* `/job/permanently-delete/:_id`
*   **Method:** `DELETE`
*   **Access:** Job Owner (Recruiter) or SuperAdmin / Admin
*   **Headers:** `Authorization: Bearer <token>`
*   **Path Parameter:** `_id` (Job MongoDB ObjectId)
*   **Response (200 OK):**
    ```json
    {
      "status": true,
      "msg": "Job post and all associated applications permanently deleted !!"
    }
    ```

---

### 4.3 Generic Delete Job (Backward Compatible)
*   **URL:** `/job/delete/:_id`
*   **Method:** `DELETE`
*   **Access:** Job Owner or SuperAdmin / Admin
*   **Query Parameter:** `type=soft` (default) or `type=hard`
*   **Response (200 OK):** Dispatches to soft or hard delete.

---

### 4.4 Restore Job Post
Restores a soft-deleted job post, setting `isDeleted: false` and `isActive: true`.
*   **URL:** `/job/restore/:_id`
*   **Method:** `PUT`
*   **Access:** Job Owner (Recruiter) or SuperAdmin / Admin
*   **Headers:** `Authorization: Bearer <token>`
*   **Path Parameter:** `_id` (Job MongoDB ObjectId)
*   **Response (200 OK):**
    ```json
    {
      "status": true,
      "msg": "Job post restored successfully !!",
      "data": {
        "_id": "6a749240550f7a7b766f68ac",
        "jobTittle": "Frontend Developer",
        "isDeleted": false,
        "isActive": true,
        "deletedAt": null,
        "deleteType": ""
      }
    }
    ```

---

### 4.5 Get Deleted Job Posts (Bin Feed)
Retrieves soft-deleted job postings for the Recycle Bin.
*   **URL:** `/job/deleted-jobs`
*   **Method:** `GET`
*   **Access:** Recruiter (sees own deleted jobs) or SuperAdmin / Admin (sees all deleted jobs)
*   **Headers:** `Authorization: Bearer <token>`
*   **Query Parameters:**
    *   `page`: Page number (default: `1`)
    *   `limit`: Items per page (default: `10`, max: `200`)
    *   `search`: Search string (matches job title, company name, location)
*   **Response (200 OK):**
    ```json
    {
      "status": true,
      "msg": "Deleted jobs fetched successfully !!",
      "totalCount": 66,
      "pageCount": 1,
      "currentPage": 1,
      "data": [
        {
          "_id": "6a749240550f7a7b766f68ac",
          "jobTittle": "Frontend Developer",
          "companyName": "ABC Company",
          "location": "Bangalore",
          "pay": "600000",
          "isDeleted": true,
          "deletedAt": "2026-10-12T14:30:00.000Z",
          "userId": {
            "_id": "6a748c00550f7a7b766f6801",
            "name": "Recruiter User",
            "email": "recruiter@abc.com",
            "companyName": "ABC Company"
          }
        }
      ]
    }
    ```

---

## 5. SuperAdmin Deletion & Bin APIs

These dedicated endpoints are routed directly through `superAdmin.routes.js` with `adminAuthorization` middleware.

| Action | HTTP Method | URL Endpoint | Description |
| :--- | :--- | :--- | :--- |
| **Soft Delete User** | `DELETE` | `/superAdmin/user/soft-delete/:id` | Soft deletes any candidate or recruiter. |
| **Hard Delete User** | `DELETE` | `/superAdmin/user/hard-delete/:id` | Permanently deletes user and associated jobs. |
| **Permanent Delete User** | `DELETE` | `/superAdmin/user/permanently-delete/:id` | Alias for hard delete user. |
| **Restore User** | `PUT` | `/superAdmin/user/restore/:id` | Restores soft-deleted user and recruiter jobs. |
| **Get Deleted Users** | `GET` | `/superAdmin/deleted-users?limit=100` | Returns soft-deleted users for the Bin section. |
| **Soft Delete Job** | `DELETE` | `/superAdmin/job/soft-delete/:id` | Soft deletes any job post. |
| **Hard Delete Job** | `DELETE` | `/superAdmin/job/hard-delete/:id` | Permanently deletes job and applications. |
| **Permanent Delete Job**| `DELETE` | `/superAdmin/job/permanently-delete/:id` | Alias for hard delete job. |
| **Restore Job** | `PUT` | `/superAdmin/job/restore/:id` | Restores soft-deleted job to active listings. |
| **Get Deleted Jobs** | `GET` | `/superAdmin/deleted-jobs?limit=100` | Returns soft-deleted jobs for the Bin section. |
| **Get Complete Analytics**| `GET` | `/superAdmin/getCompleteAnalytics?status=deleted` | Returns analytics payload with `status=deleted`. |

---

## 6. User & Authentication APIs

### 6.1 User Login
*   **URL:** `/user/login`
*   **Method:** `POST`
*   **Body:**
    ```json
    {
      "phone": "+919876543210",
      "userType": "jobSeeker" // Options: "jobSeeker", "companyRecruiter", "individualRecruiter"
    }
    ```
*   **Response (200 OK):** Sends OTP and returns user registration status.

---

### 6.2 Verify OTP & Issue Token
*   **URL:** `/user/verify`
*   **Method:** `PUT`
*   **Body:**
    ```json
    {
      "phone": "+919876543210",
      "otp": "123456"
    }
    ```
*   **Response (200 OK):** Returns JWT token and populated user object. Note: If the account is soft-deleted, login is rejected with a 403 error.

---

### 6.3 Get Self Profile
*   **URL:** `/user/user`
*   **Method:** `GET`
*   **Headers:** `Authorization: Bearer <token>`
*   **Response (200 OK):** Returns profile, projects, education, application history, and purchased services.

---

### 6.4 Update Profile
*   **URL:** `/user/update/:_id`
*   **Method:** `PUT`
*   **Content-Type:** `multipart/form-data`
*   **Supported Form Fields:**
    *   `name`, `email`, `about`, `skills`, `experience`, `location`, `gender`, `dob`, `currentPay`, `expectationPay`
    *   Files: `profileImage`, `videoUrl`, `resume`, `letter`, `companyLogo`

---

### 6.5 Block / Unblock User
*   **URL:** `/user/block-unblock`
*   **Method:** `PUT`
*   **Access:** SuperAdmin / Admin
*   **Body:**
    ```json
    {
      "id": "6a8c07576856830c28fbf4cf",
      "block": true,
      "reason": "Violated terms of service"
    }
    ```

---

### 6.6 Candidate Video Reels / Intro Videos
*   **List Videos:** `GET /user/intro-videos?page=1&limit=50&search=keyword`
*   **Stream Video Proxy:** `GET /user/video-stream?userId=<userId>` or `?url=<videoUrl>` (Supports HTTP 206 Partial Content byte ranges).

---

## 7. Job Post Management APIs

### 7.1 Create / Update Job Post
*   **URL:** `/job/createUpdate`
*   **Method:** `PUT`
*   **Access:** Recruiter (`authorization`)
*   **Content-Type:** `multipart/form-data`
*   **Form Fields:**
    *   `_id` (optional for edits)
    *   `jobTittle`: Job title string
    *   `companyName`: Company name
    *   `location`: City / Remote
    *   `jobType`: Full-Time / Part-Time / Internship
    *   `workType`: Remote / Onsite / Hybrid
    *   `pay`: Salary/stipend amount
    *   `experience`: Required experience in years
    *   `vacancies`: Number of openings
    *   `skills`: Array of required skill strings
    *   `jobDescription`: HTML/Markdown string
    *   `companyLogo`: File attachment

---

### 7.2 Get All Active Jobs (Public)
*   **URL:** `/job/all`
*   **Method:** `GET`
*   **Query Parameters:**
    *   `page`: Page index
    *   `limit`: Page size
    *   `category`: Category filter
    *   `location`: Location filter
    *   `jobType`: Job type filter
*   **Behavior:** Excludes all jobs where `isDeleted === true` or `isActive === false`.

---

### 7.3 Get Single Job Details
*   **URL:** `/job/:id`
*   **Method:** `GET`
*   **Behavior:** If the job has been soft-deleted, candidate requests return `404 Job Post not found or has been deactivated`. Administrators and the job-owner recruiter can inspect deleted jobs.

---

### 7.4 Generate Job Description PDF
*   **URL:** `/job/generate-jd-pdf/:id`
*   **Method:** `GET`
*   **Response:** Streams a formatted PDF document containing the Job Description.

---

### 7.5 Close Job Post
*   **URL:** `/job/close/:id`
*   **Method:** `PUT`
*   **Body:** `{ "isActive": false }`

---

## 8. Job Application & Pipeline APIs

### 8.1 Candidate Apply for Job
*   **URL:** `/jobApplication/apply/:id`
*   **Method:** `POST`
*   **Path Parameter:** `id` (Job ObjectId)
*   **Headers:** `Authorization: Bearer <CandidateToken>`

---

### 8.2 Candidate Application History
*   **All Applications:** `GET /jobApplication/job-seeker/get-applications-list/:page`
*   **Shortlisted:** `GET /jobApplication/job-seeker/get-shortlist/:page`
*   **Interview Round 1:** `GET /jobApplication/job-seeker/get-interviews-list/:page`
*   **Interview Round 2:** `GET /jobApplication/job-seeker/get-interviews-2-list/:page`
*   **Selected:** `GET /jobApplication/job-seeker/get-selected-candidates/:page`

---

### 8.3 Recruiter Pipeline Actions
*   **Shortlist:** `PUT /jobApplication/shortlist/:_id`
*   **Schedule Interview 1:**
    *   `PUT /jobApplication/interview-select/:_id`
    *   **Body:** `{ "date": "2026-10-20", "time": "14:00", "link": "https://meet.google.com/xyz" }`
*   **Schedule Interview 2:**
    *   `PUT /jobApplication/interview-2-select/:_id`
    *   **Body:** `{ "date": "2026-10-22", "time": "16:00", "link": "https://meet.google.com/abc" }`
*   **Select Candidate:** `PUT /jobApplication/selected/:_id`
*   **Reject Candidate:** `PUT /jobApplication/not-selected/:_id`

---

### 8.4 Admin/HR Interview Pipeline Actions
*   **Update Pipeline Stage:** `PUT /jobApplication/pipeline-status/:applicationId`
*   **Today's Scheduled Interviews:** `GET /jobApplication/today-interviews`
*   **Past Interviews:** `GET /jobApplication/past_interviews`
*   **Submit Interview Feedback:** `POST /jobApplication/addFeedback`
*   **Respond to Reschedule Request:** `POST /jobApplication/accept-reject-reschedule`

---

## 9. SuperAdmin Management APIs

### 9.1 SuperAdmin Login
*   **URL:** `/superAdmin/login`
*   **Method:** `POST`
*   **Body:**
    ```json
    {
      "email": "superadmin@hiringroof.com",
      "password": "<PASSWORD>"
    }
    ```
*   **Response (200 OK):** Returns admin profile and JWT token.

---

### 9.2 Complete Analytics (All Jobs, Recruiters & Revenue)
*   **URL:** `/superAdmin/getCompleteAnalytics`
*   **Method:** `GET`
*   **Access:** SuperAdmin / Admin
*   **Query Parameters:**
    *   `status`: `all` (default), `active`, `expired`, or `deleted` (fetches soft-deleted jobs for the Bin)
    *   `serviceType`: `all`, `Urgent`, `Immediate`, `Premium`, `Contact Deal`
    *   `search`: Keyword search string
    *   `page`: Page index
    *   `limit`: Page limit (default `50`, up to `200`)
*   **Response Summary Structure:**
    ```json
    {
      "status": true,
      "summary": {
        "totalJobs": 136,
        "totalRecruiters": 42,
        "totalCandidates": 512,
        "totalHRs": 8,
        "totalAddonRevenue": 24500
      },
      "jobs": [
        {
          "jobId": "6a749240550f7a7b766f68ac",
          "jobTitle": "Frontend Developer",
          "companyName": "ABC Company",
          "isActive": true,
          "isDeleted": false,
          "serviceType": "Premium",
          "candidatesAnalytics": {
            "totalApplicants": 14,
            "shortlisted": 5,
            "selected": 1,
            "rejected": 2
          }
        }
      ]
    }
    ```

---

### 9.3 Candidate Analytics Graph & Percentages
*   **URL:** `/superAdmin/getCandidateAnalytics/:userId`
*   **Method:** `GET` (or `POST`)
*   **Response:** Returns application stage timeline and percentage distribution.

---

### 9.4 Manual Payment Verification
*   **Pending Payments List:** `GET /superAdmin/manual-payments`
*   **Verify/Approve Payment:** `PUT /superAdmin/verify-manual-payment/:id` (`{ "status": "APPROVED" }`)

---

## 10. HR & Admin Management APIs

*   **HR Login:** `POST /admin/hr/login`
*   **Create Admin/HR User:** `POST /adminUser/create`
*   **Get All HR Admins:** `GET /adminUser/get-all-hr-admin`
*   **Update HR Profile:** `PUT /adminUser/update/:id`
*   **Soft Delete HR:** `DELETE /adminUser/delete/:id`
*   **Permanent Delete HR:** `DELETE /adminUser/permanently-delete/:id`
*   **Get Deleted HRs:** `GET /adminUser/delete/users`
*   **Assign Job to HR:** `PUT /adminUser/assign-job`
*   **Remove Assigned Job:** `PUT /adminUser/remove-assign-job`
*   **Set Monthly Job Targets:** `PUT /adminUser/set-job-target-by-month-year/:id`

---

## 11. Sub-Admin Management APIs

*   **Sub-Admin Login:** `POST /subAdmin/login`
*   **Create Sub-Admin:** `POST /subAdmin/create`
*   **List Sub-Admins:** `GET /subAdmin/all`
*   **Soft Delete Sub-Admin:** `DELETE /subAdmin/delete/:id`
*   **Permanent Delete Sub-Admin:** `DELETE /subAdmin/permanent-delete/:id`
*   **List Deleted Sub-Admins:** `GET /subAdmin/deleted`
*   **Get Permissions:** `GET /subAdmin/permissions/:id`
*   **Set Permissions Array:** `PUT /subAdmin/permissions/:id`
    ```json
    {
      "permissions": ["all_jobs", "manage_users", "interviews", "payments"]
    }
    ```

---

## 12. Addons, Services & Payment APIs

*   **Create Addon Catalog Item:** `POST /addon/create`
*   **Update Addon:** `PUT /addon/update/:id`
*   **List Addons (Public):** `GET /addon/all`
*   **Purchase Service Addon:** `POST /service/purchase`
*   **Initiate PhonePe Payment:** `POST /payment/pay`
*   **PhonePe Callback / Status Webhook:** `POST /payment/callback`
*   **Check Payment Status:** `GET /payment/status/:transactionId`

---

## 13. Campus, Chat, Notification & Utility APIs

### 13.1 Campus Hiring
*   **Register Campus Drive:** `POST /campus/register`
*   **Get Campus Drives:** `GET /campus/drives`
*   **Student Bulk Upload:** `POST /campus/upload-students`

### 13.2 Realtime Chat & Audit
*   **Get Conversations (SuperAdmin):** `GET /superAdmin/all-conversations`
*   **Get Room Messages:** `GET /superAdmin/conversation-messages/:roomId`
*   **Send Message:** `POST /chat/send-message`

### 13.3 Notifications & Support Tickets
*   **Get My Notifications:** `GET /notification/all`
*   **Mark Notification Read:** `PUT /notification/read/:id`
*   **Create Support Ticket:** `POST /ticket/create`
*   **Get Support Queries (SuperAdmin):** `GET /ticket/all`
*   **Resolve Ticket:** `PUT /ticket/resolve/:id`

### 13.4 Server Health Check
*   **Ping Server:** `GET /api`
*   **Response:**
    ```json
    {
      "msg": "HIRING ROOF Backend Server is Running!"
    }
    ```
