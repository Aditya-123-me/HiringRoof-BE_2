# Addons & Services APIs Documentation

This document describes the API endpoints, requests, and response payloads for managing the dynamic Addons/Services catalog, submitting feedback, and retrieving analytics in the Super Admin and Recruiter panels.

---

## Base Path
All endpoints are relative to:
`/api`

---

## 1. Create Addon
Used by the Super Admin to create a new service package.
*   **URL:** `/addon/create`
*   **Method:** `POST`
*   **Access:** Super Admin / Admin (`adminAuthorization` required)
*   **Request Headers:**
    *   `Content-Type: application/json`
    *   `Authorization: Bearer <token>`
*   **Request Body:**
    ```json
    {
      "title": "Automated Tech Screening",
      "amount": 350,
      "desc": "Pre-screen candidates with coding tasks",
      "points": [
        "Python test", 
        "JS test", 
        "Automatic grading"
      ],
      "type": "general" // Options: "general" or "jobPostAddon"
    }
    ```
*   **Response Body (200 OK):**
    ```json
    {
      "status": true,
      "msg": "Addon created successfully!",
      "data": {
        "_id": "6a8c07576856830c28fbf4cf",
        "title": "Automated Tech Screening",
        "amount": 350,
        "desc": "Pre-screen candidates with coding tasks",
        "points": ["Python test", "JS test", "Automatic grading"],
        "type": "general",
        "createdBy": "6a5f0edda73a45cdc81cc4e6",
        "isActive": true,
        "createdAt": "2026-08-24T08:56:55.225Z",
        "updatedAt": "2026-08-24T08:56:55.225Z"
      }
    }
    ```

---

## 2. Update Addon
Used to modify any properties of an existing addon.
*   **URL:** `/addon/update/:id`
*   **Method:** `PUT`
*   **Access:** Super Admin / Admin (`adminAuthorization` required)
*   **Request Headers:**
    *   `Content-Type: application/json`
    *   `Authorization: Bearer <token>`
*   **Request Body:** *(All fields are optional)*
    ```json
    {
      "title": "Automated Tech Screening Pro",
      "amount": 400,
      "desc": "Pre-screen candidates with pro coding tasks",
      "points": ["All test tiers", "Proctoring checks"],
      "isActive": true
    }
    ```
*   **Response Body (200 OK):**
    ```json
    {
      "status": true,
      "msg": "Addon updated successfully!",
      "data": {
        "_id": "6a8c07576856830c28fbf4cf",
        "title": "Automated Tech Screening Pro",
        "amount": 400,
        "desc": "Pre-screen candidates with pro coding tasks",
        "points": ["All test tiers", "Proctoring checks"],
        "type": "general",
        "createdBy": "6a5f0edda73a45cdc81cc4e6",
        "isActive": true,
        "createdAt": "2026-08-24T08:56:55.225Z",
        "updatedAt": "2026-08-24T08:56:56.120Z"
      }
    }
    ```

---

## 3. Deactivate Addon (Soft-Delete)
Hides the addon from recruiters so it cannot be purchased anymore, while keeping existing purchase records linked.
*   **URL:** `/addon/delete/:id`
*   **Method:** `DELETE`
*   **Access:** Super Admin / Admin (`adminAuthorization` required)
*   **Request Headers:**
    *   `Authorization: Bearer <token>`
*   **Response Body (200 OK):**
    ```json
    {
      "status": true,
      "msg": "Addon deactivated successfully!",
      "data": {
        "_id": "6a8c07576856830c28fbf4cf",
        "title": "Automated Tech Screening Pro",
        "amount": 400,
        "desc": "Pre-screen candidates with pro coding tasks",
        "points": ["All test tiers", "Proctoring checks"],
        "type": "general",
        "createdBy": "6a5f0edda73a45cdc81cc4e6",
        "isActive": false,
        "createdAt": "2026-08-24T08:56:55.225Z",
        "updatedAt": "2026-08-24T08:56:57.010Z"
      }
    }
    ```

---

## 4. List All Addons (Admin Catalog)
Fetches all addons (active and inactive) for listing in the Super Admin settings page.
*   **URL:** `/addon/admin/list`
*   **Method:** `GET`
*   **Access:** Super Admin / Admin (`adminAuthorization` required)
*   **Request Headers:**
    *   `Authorization: Bearer <token>`
*   **Response Body (200 OK):**
    ```json
    {
      "status": true,
      "msg": "All addons fetched successfully!",
      "data": [
        {
          "_id": "6a8c07576856830c28fbf4cf",
          "title": "Automated Tech Screening Pro",
          "amount": 400,
          "desc": "Pre-screen candidates with pro coding tasks",
          "points": ["All test tiers", "Proctoring checks"],
          "type": "general",
          "createdBy": {
            "_id": "6a5f0edda73a45cdc81cc4e6",
            "name": "Super Admin",
            "email": "superadmin@hiringroof.com"
          },
          "isActive": true,
          "createdAt": "2026-08-24T08:56:55.225Z",
          "updatedAt": "2026-08-24T08:56:55.225Z"
        }
      ]
    }
    ```

---

## 5. Addon Earnings & Popularity Analytics
Aggregated dashboard statistics for overall earnings, popularity, and recruiter reviews.
*   **URL:** `/addon/analytics`
*   **Method:** `GET`
*   **Access:** Super Admin / Admin (`adminAuthorization` required)
*   **Request Headers:**
    *   `Authorization: Bearer <token>`
*   **Response Body (200 OK):**
    ```json
    {
      "status": true,
      "msg": "Analytics computed successfully!",
      "data": {
        "totalEarnings": 3056.94,
        "totalPurchasesCount": 8,
        "popularAddons": [
          {
            "_id": "6a8c07576856830c28fbf4cf",
            "title": "Automated Tech Screening Pro",
            "amount": 400,
            "type": "general",
            "purchaseCount": 1,
            "earnings": 408.00,
            "averageRating": 5,
            "feedbacks": [
              {
                "buyerName": "Deb Mandal",
                "buyerEmail": "debsmandal10@gmail.com",
                "rating": 5,
                "reviewText": "Excellent tool! Saved us hours of technical screening.",
                "date": "2026-08-24"
              }
            ]
          }
        ],
        "monthlyEarnings": {
          "2026-08": 3056.94
        }
      }
    }
    ```

---

## 6. Specific Addon Purchases List
Returns details of all recruiters who purchased a specific addon.
*   **URL:** `/addon/:id/purchases`
*   **Method:** `GET`
*   **Access:** Super Admin / Admin (`adminAuthorization` required)
*   **Request Headers:**
    *   `Authorization: Bearer <token>`
*   **Response Body (200 OK):**
    ```json
    {
      "status": true,
      "msg": "Addon purchases list fetched successfully!",
      "data": [
        {
          "_id": "6a8c07576856830c28fbf4d8",
          "userId": {
            "_id": "6a75d229a5ba7db834e17ea0",
            "name": "Deb Mandal",
            "email": "debsmandal10@gmail.com",
            "phone": "9876543210",
            "profileImage": "https://..."
          },
          "addonId": "6a8c07576856830c28fbf4cf",
          "date": "2026-08-24",
          "expireDate": "2026-09-24",
          "time": "14:00",
          "totalAmount": 408,
          "paymentScreenshot": "https://...",
          "paymentStatus": "APPROVED",
          "rating": 5,
          "reviewText": "Excellent tool! Saved us hours of technical screening.",
          "createdAt": "2026-08-24T08:56:55.250Z",
          "updatedAt": "2026-08-24T08:56:55.250Z"
        }
      ]
    }
    ```

---

## 7. List Active Addons (Recruiter Catalog)
Lists all currently active Addons/Services available to buy.
*   **URL:** `/addon/list`
*   **Method:** `GET`
*   **Access:** Recruiters (`authorization` required)
*   **Request Headers:**
    *   `Authorization: Bearer <token>`
*   **Response Body (200 OK):**
    ```json
    {
      "status": true,
      "msg": "Active addons fetched successfully!",
      "data": [
        {
          "_id": "6a8c07576856830c28fbf4cf",
          "title": "Automated Tech Screening Pro",
          "amount": 400,
          "desc": "Pre-screen candidates with pro coding tasks",
          "points": ["All test tiers", "Proctoring checks"],
          "type": "general",
          "createdBy": "6a5f0edda73a45cdc81cc4e6",
          "isActive": true
        }
      ]
    }
    ```

---

## 8. Submit Recruiter Feedback
Allows a recruiter to rate and review their purchased addon package.
*   **URL:** `/addon/feedback/:serviceId`
*   **Method:** `POST`
*   **Access:** Recruiters (`authorization` required)
*   **Request Headers:**
    *   `Content-Type: application/json`
    *   `Authorization: Bearer <token>`
*   **Request Body:**
    ```json
    {
      "rating": 5, // Integer between 1 and 5
      "reviewText": "Amazing support, highly recommended!"
    }
    ```
*   **Response Body (200 OK):**
    ```json
    {
      "status": true,
      "msg": "Feedback and rating submitted successfully!",
      "data": {
        "_id": "6a8c07576856830c28fbf4d8",
        "userId": "6a75d229a5ba7db834e17ea0",
        "addonId": "6a8c07576856830c28fbf4cf",
        "date": "2026-08-24",
        "totalAmount": 408,
        "paymentStatus": "APPROVED",
        "rating": 5,
        "reviewText": "Amazing support, highly recommended!"
      }
    }
    ```
