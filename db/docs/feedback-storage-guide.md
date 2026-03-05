# Feedback Storage Guide

## Overview

The feedback feature allows players to submit comments, bug reports, or suggestions from the frontend.
These feedback entries are sent to the backend API and stored in a database.

The purpose of this document is to explain how feedback should be stored and how the backend should be configured to support **online storage**.

---

# Architecture

The feedback system follows this architecture:

Frontend → Backend API → Database

1. The player submits feedback through the UI.
2. The frontend sends a request to the backend.
3. The backend receives the request and stores it in the database.
4. The team can later retrieve feedback entries for debugging and improvement.

---

# API Endpoint

Feedback is submitted using the following endpoint:

```
POST /api/feedback
```

Example request body:

```json
{
  "category": "bug",
  "message": "The game freezes after submitting a word",
  "contact": "player@email.com"
}
```

The backend will create a new `Feedback` record and store it in the database.

---

# Database Configuration

The backend connects to the database using the environment variable:

```
DATABASE_URL
```

Example configuration:

```
DATABASE_URL=mysql+pymysql://username:password@localhost:3306/uwoggle
```

Format:

```
mysql+pymysql://<username>:<password>@<host>:<port>/<database>
```

When the backend starts, SQLAlchemy will automatically create the required tables if they do not exist.

---

# Example Database Table

The `feedback` table contains the following fields:

| Column     | Description                              |
| ---------- | ---------------------------------------- |
| id         | Primary key                              |
| category   | Type of feedback (bug, suggestion, etc.) |
| message    | The feedback message                     |
| contact    | Optional contact information             |
| created_at | Timestamp when feedback was submitted    |

---

# Backend Deployment Requirements

To enable feedback storage in a shared environment:

1. Deploy the backend on the server.
2. Set the `DATABASE_URL` environment variable.
3. Ensure the backend can connect to the MySQL database.
4. Restart the backend service.

After deployment, all submitted feedback will be stored in the shared database.

---

# Verification

To confirm that feedback is being stored correctly:

Submit a feedback entry from the frontend.

Then check the database:

```sql
SELECT * FROM feedback ORDER BY created_at DESC;
```

If records appear, the system is working correctly.

---

# Notes

* The `.env` file should **not be committed to GitLab**.
* Each developer should configure their own local environment variables.
* The production server should define `DATABASE_URL` in its deployment configuration.

---

# Status

The frontend feedback UI and backend API already exist.

The remaining step is configuring the backend database connection so that feedback is stored in a shared MySQL database.
