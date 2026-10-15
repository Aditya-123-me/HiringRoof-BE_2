# Campus Hiring APIs Documentation

This document describes the API endpoints, HTTP methods, request bodies, query parameters, and response structures for the **Campus Hiring Section** of the HiringRoof platform.

---

## Base Path
All endpoints are mounted under Express router prefix:
```
/api
```

---

## 1. College & University Management

### 1.1 Register College
Register a new college/university and its placement officer TPO.
* **Method:** `POST`
* **URL:** `/campus/colleges/register` (or `/campus/colleges`)
* **Request Body (JSON):**
```json
{
  "collegeName": "Indian Institute of Technology (IIT) Delhi",
  "university": "Autonomous Institute of National Importance",
  "collegeCode": "IITD",
  "state": "Delhi",
  "city": "New Delhi",
  "address": "Hauz Khas, New Delhi, Delhi 110016",
  "nirfRank": "2",
  "accreditation": "Institute of National Importance",
  "placementOfficerName": "Dr. Arvind Swaminathan",
  "placementOfficerEmail": "tpo@iitd.ac.in",
  "placementOfficerPhone": "+91 98112 34567",
  "website": "https://home.iitd.ac.in",
  "brochureUrl": ""
}
```
* **Response (201 Created):**
```json
{
  "status": true,
  "msg": "College registered successfully! Placement portal access activated.",
  "data": {
    "_id": "670cfa92a1...",
    "collegeName": "Indian Institute of Technology (IIT) Delhi",
    "university": "Autonomous Institute of National Importance",
    "status": "verified",
    "totalStudents": 0,
    "activeDrives": 0
  }
}
```

### 1.2 Get All Colleges
* **Method:** `GET`
* **URL:** `/campus/colleges`
* **Query Parameters:**
  * `search` (optional): Filter by name, university, or city.
* **Response (200 OK):**
```json
{
  "status": true,
  "data": [ ...colleges ]
}
```

### 1.3 Get College by ID
* **Method:** `GET`
* **URL:** `/campus/colleges/:id`

### 1.4 Update College
* **Method:** `PUT`
* **URL:** `/campus/colleges/:id`

### 1.5 Delete College
* **Method:** `DELETE`
* **URL:** `/campus/colleges/:id`

---

## 2. Corporate Campus Recruiters Management

### 2.1 Register Company for Campus Hiring
* **Method:** `POST`
* **URL:** `/campus/companies/register` (or `/campus/companies`)
* **Request Body (JSON):**
```json
{
  "companyName": "Google India",
  "industry": "Technology / Cloud & AI",
  "website": "https://careers.google.com",
  "location": "Bangalore & Hyderabad",
  "hrLeadName": "Pooja Malhotra",
  "hrEmail": "campus-india@google.com",
  "hrPhone": "+91 98200 11223",
  "expectedHires": 45,
  "targetCourses": ["B.Tech CSE", "B.Tech IT", "M.Tech CSE"],
  "avgPackage": "32 LPA - 55 LPA",
  "description": "Hiring Software Engineers, Site Reliability Engineers, and Data Analysts."
}
```
* **Response (201 Created):**
```json
{
  "status": true,
  "msg": "Company registered for campus recruitment successfully!",
  "data": { ... }
}
```

### 2.2 Get Registered Companies
* **Method:** `GET`
* **URL:** `/campus/companies`
* **Query Parameters:**
  * `search` (optional): Filter by company name, industry, or location.

### 2.3 Get Company by ID
* **Method:** `GET`
* **URL:** `/campus/companies/:id`

### 2.4 Update Company
* **Method:** `PUT`
* **URL:** `/campus/companies/:id`

### 2.5 Delete Company
* **Method:** `DELETE`
* **URL:** `/campus/companies/:id`

---

## 3. Student Talent Pool & Bulk Upload

### 3.1 Add Single Student Profile
* **Method:** `POST`
* **URL:** `/campus/students/add` (or `/campus/students`)
* **Request Body (JSON):**
```json
{
  "fullName": "Aarav Sharma",
  "email": "aarav.sharma@dtu.ac.in",
  "phone": "+91 98765 11111",
  "collegeName": "Delhi Technological University (DTU)",
  "university": "DTU",
  "rollNo": "2022/BCST/042",
  "course": "B.Tech",
  "department": "Computer Engineering",
  "graduationYear": 2025,
  "cgpa": 9.15,
  "skills": ["React", "Node.js", "Python", "Data Structures"],
  "location": "Delhi NCR",
  "resumeUrl": ""
}
```

### 3.2 Bulk Upload Students (CSV / Excel / JSON)
* **Method:** `POST`
* **URL:** `/campus/students/bulk-upload`
* **Payload Type 1 (Multipart Form / File):**
  * Key: `file` (Excel `.xlsx` or `.csv` file)
  * Key: `defaultCollege` (optional string fallback)
* **Payload Type 2 (JSON):**
```json
{
  "defaultCollege": "Delhi Technological University (DTU)",
  "students": [
    {
      "fullName": "Student One",
      "email": "s1@dtu.ac.in",
      "phone": "+91 98765 00001",
      "course": "B.Tech",
      "department": "CSE",
      "graduationYear": 2025,
      "cgpa": 8.5,
      "skills": ["Java", "SQL"]
    }
  ]
}
```
* **Response (200 OK):**
```json
{
  "status": true,
  "msg": "Successfully imported 1 student profiles!",
  "importedCount": 1,
  "errors": []
}
```

### 3.3 Get Students Directory
* **Method:** `GET`
* **URL:** `/campus/students`
* **Query Parameters:**
  * `college` (e.g. `Delhi Technological University (DTU)`)
  * `course` (e.g. `B.Tech`, `MCA`)
  * `location` (e.g. `Delhi`)
  * `skill` (e.g. `React`, `Python`)
  * `graduationYear` (e.g. `2025`)
  * `status` (e.g. `Not Placed`, `Shortlisted`, `Interview Scheduled`, `Placed`)
  * `search` (Full-text search by name, email, college, department, skill)

### 3.4 Get Student by ID
* **Method:** `GET`
* **URL:** `/campus/students/:id`

### 3.5 Update Student Details
* **Method:** `PUT`
* **URL:** `/campus/students/:id`

### 3.6 Update Student Placement Status
* **Method:** `PATCH`
* **URL:** `/campus/students/:studentId/status`
* **Request Body:**
```json
{
  "placementStatus": "Placed",
  "placedCompany": "Microsoft India",
  "packageOffered": "44 LPA"
}
```

### 3.7 Delete Student Profile
* **Method:** `DELETE`
* **URL:** `/campus/students/:id`

---

## 4. Campus Hiring Requirements (Job Postings)

### 4.1 Publish Requirement
* **Method:** `POST`
* **URL:** `/campus/requirements/publish` (or `/campus/requirements`)
* **Request Body (JSON):**
```json
{
  "companyName": "Microsoft India",
  "title": "Software Engineer (SDE-1) - University Recruitment",
  "jobRole": "Core Engineering",
  "description": "Develop cutting-edge cloud and AI software at Microsoft IDC.",
  "eligibleCourses": ["B.Tech", "MCA", "M.Tech"],
  "targetGraduationYears": [2025, 2026],
  "minCgpa": 7.5,
  "requiredSkills": ["OOP", "System Design", "Cloud", "C#"],
  "workLocation": "Hyderabad / Bangalore",
  "jobType": "Full Time",
  "ctcOrStipend": "28 - 45 LPA",
  "openings": 40,
  "deadline": "2026-11-30"
}
```

### 4.2 Get Campus Requirements
* **Method:** `GET`
* **URL:** `/campus/requirements`
* **Query Parameters:**
  * `company`
  * `course`
  * `search`

### 4.3 Get Requirement by ID
* **Method:** `GET`
* **URL:** `/campus/requirements/:id`

### 4.4 Update Requirement
* **Method:** `PUT`
* **URL:** `/campus/requirements/:id`

### 4.5 Update Requirement Status
* **Method:** `PATCH`
* **URL:** `/campus/requirements/:id/status`
* **Request Body:**
```json
{
  "status": "Closed" // "Open" | "In Review" | "Closed"
}
```

### 4.6 Student Apply to Campus Requirement
* **Method:** `POST`
* **URL:** `/campus/requirements/:id/apply`
* **Request Body:**
```json
{
  "studentId": "670cfa92a1...",
  "studentName": "Aarav Sharma",
  "studentEmail": "aarav.sharma@dtu.ac.in"
}
```

### 4.7 View Requirement Applicants
* **Method:** `GET`
* **URL:** `/campus/requirements/:id/applicants`

### 4.8 Delete Campus Requirement
* **Method:** `DELETE`
* **URL:** `/campus/requirements/:id`

---

## 5. Campus Placement & Recruitment Drives

### 5.1 Schedule Recruitment Drive
* **Method:** `POST`
* **URL:** `/campus/drives/create` (or `/campus/drives`)
* **Request Body (JSON):**
```json
{
  "driveTitle": "Microsoft 2025 Campus Engineering Drive",
  "companyName": "Microsoft India",
  "collegeName": "Delhi Technological University (DTU)",
  "driveType": "On-Campus", // "On-Campus" | "Virtual" | "Pool Campus"
  "driveDate": "2026-10-25T10:00:00Z",
  "venueOrLink": "DTU Auditorium & Online Test Labs",
  "rolesOffered": ["Software Development Engineer (SDE-1)", "Cloud Engineer"],
  "packageRange": "28 - 48 LPA",
  "rounds": ["Online Coding Test", "Technical Interview 1", "HR Round"],
  "instructions": "All students must carry college ID and 2 hard copies of resume."
}
```

### 5.2 Get Recruitment Drives
* **Method:** `GET`
* **URL:** `/campus/drives`
* **Query Parameters:**
  * `college`
  * `status` ("Upcoming", "Ongoing", "Completed", "Cancelled")
  * `search`

### 5.3 Get Drive by ID
* **Method:** `GET`
* **URL:** `/campus/drives/:id`

### 5.4 Update Drive Details
* **Method:** `PUT`
* **URL:** `/campus/drives/:id`

### 5.5 Update Drive Status
* **Method:** `PATCH`
* **URL:** `/campus/drives/:id/status`
* **Request Body:**
```json
{
  "status": "Ongoing"
}
```

### 5.6 Register Student for Drive
* **Method:** `POST`
* **URL:** `/campus/drives/:id/register`
* **Request Body:**
```json
{
  "studentId": "670cfa92a1...",
  "studentName": "Ananya Iyer",
  "studentEmail": "ananya.iyer@vit.ac.in"
}
```

### 5.7 Delete Drive
* **Method:** `DELETE`
* **URL:** `/campus/drives/:id`

---

## 6. Interview Scheduling & Candidate Status Tracking

### 6.1 Schedule Interview Slot
* **Method:** `POST`
* **URL:** `/campus/interviews/schedule` (or `/campus/interviews`)
* **Request Body (JSON):**
```json
{
  "candidateName": "Ananya Iyer",
  "candidateEmail": "ananya.iyer@vit.ac.in",
  "candidatePhone": "+91 98765 22222",
  "collegeName": "Vellore Institute of Technology (VIT)",
  "companyName": "Microsoft India",
  "role": "Software Engineer (SDE-1)",
  "interviewRound": "Technical Round 2 (Algorithms & System Design)",
  "scheduledDate": "2026-10-22",
  "timeSlot": "11:30 AM - 12:30 PM",
  "mode": "Online (Google Meet / Zoom)",
  "meetingLinkOrVenue": "https://meet.google.com/xyz-camp-msft",
  "interviewerName": "Siddharth Rao (Principal Engineering Lead)"
}
```

### 6.2 Get Interviews
* **Method:** `GET`
* **URL:** `/campus/interviews`
* **Query Parameters:**
  * `status` ("Scheduled", "In Progress", "Shortlisted", "Rejected", "Selected", "Offer Extended")
  * `company`
  * `search`

### 6.3 Get Interview by ID
* **Method:** `GET`
* **URL:** `/campus/interviews/:id`

### 6.4 Update Interview / Reschedule
* **Method:** `PUT`
* **URL:** `/campus/interviews/:id`

### 6.5 Update Interview Status & Candidate Offer
* **Method:** `PATCH`
* **URL:** `/campus/interviews/:id/status`
* **Request Body:**
```json
{
  "status": "Offer Extended",
  "feedback": "Outstanding performance in system design and data structures. Recommended for 44 LPA offer."
}
```

### 6.6 Cancel & Delete Interview
* **Method:** `DELETE`
* **URL:** `/campus/interviews/:id`

---

## 7. Reports, Analytics & Dashboard Stats

### 7.1 Placement Reports & Department Analytics
* **Method:** `GET`
* **URL:** `/campus/reports` (or `/campus/analytics`)
* **Query Parameters:**
  * `college` (optional: filter by specific college or "All")
* **Response (200 OK):**
```json
{
  "status": true,
  "data": {
    "summary": {
      "totalStudents": 120,
      "placedStudents": 85,
      "interviewingStudents": 24,
      "notPlacedStudents": 11,
      "placementRate": "78.4%",
      "highestPackage": "52 LPA (Google)",
      "averagePackage": "14.2 LPA",
      "totalCompaniesVisited": 18,
      "totalDrives": 12,
      "upcomingDrives": 4
    },
    "departmentStats": [
      { "department": "Computer Science & Engg", "total": 45, "placed": 40, "percentage": 89 },
      { "department": "Information Technology", "total": 35, "placed": 29, "percentage": 83 }
    ],
    "topRecruiters": [
      { "company": "Microsoft India", "offers": 18, "avgCtc": "42 LPA" },
      { "company": "Google India", "offers": 12, "avgCtc": "48 LPA" }
    ],
    "recentPlaced": [ ... ]
  }
}
```

### 7.2 Quick Campus KPI Stats Overview
* **Method:** `GET`
* **URL:** `/campus/stats`
* **Response (200 OK):**
```json
{
  "status": true,
  "data": {
    "totalColleges": 3,
    "totalCompanies": 3,
    "totalStudents": 6,
    "placedStudents": 2,
    "activeDrives": 3,
    "openRequirements": 3,
    "scheduledInterviews": 2,
    "placementRate": "33.3%"
  }
}
```
