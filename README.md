# OpenEduLog Backend ⚙️

Welcome to the backend of OpenEduLog, our school project! This server handles the core logic, data storage, and APIs for the OpenEduLog platform.

We know it's not fully finished (we might have been a bit too ambitious 😅), but the core functionality is in place.

---

## 🚀 Getting Started

To get the backend up and running, follow these steps:

### Prerequisites

* **Node.js:** Version 20 is required. Version 21 might cause compatibility issues.
* **PostgreSQL:** A running PostgreSQL database server is necessary. You'll need to create a database for this project.
* **Frontend:** To interact with this backend visually, you'll need the [OpenEduLog Frontend](https://github.com/wChoros/OpenEduLog-frontend) (or a tool like Postman).


### 1. Install Dependencies

Install all the necessary Node.js packages:

```bash
npm install
```

### 2. Environment Variables

You'll need to set up environment variables. Create a `.env` file in the project root and configure it with your local settings. Here’s a template:

```env
# PostgreSQL Connection URL
# Replace 'user', 'password', 'localhost', '5432', and 'open_edu_log' with your actual database credentials and name
DATABASE_URL="postgresql://user:password@localhost:5432/open_edu_log?schema=public"

# Port for the backend server
PORT="2137"

```
**Note:** Ensure the database specified in `DATABASE_URL` (e.g., `open_edu_log`) exists on your PostgreSQL server.

### 3. Database Migration

Apply the database schema migrations using Prisma:

```bash
npx prisma migrate dev
```
This command will also create the database if it doesn't exist, based on some database providers, but it's good practice to create it manually first.

### 4. Seed the Database 

To populate your database with initial data (e.g., for testing), run the seed script:

```bash
npm run seed
```

### 5. Run the Development Server

Start the backend server:

```bash
npm run dev
```

Once the server is running (typically on `http://localhost:2137` or the `PORT` you specified), it will be ready to accept connections from the frontend or API testing tools.

---

## ✨ Features (Highlights)

* **Core API:** Provides essential endpoints for managing educational data.
* **Role-Based Authorization (RBA):** Implements access control based on user roles (student, teacher, admin). A big thing by **@Korshi06** 
* **Session System** The backend utilizes sessions to authenticate users.

---

## 📝 Important Notes

* **Functionality:** The backend is largely functional. You can interact with all its features using an API client like Postman if you wish to explore it independently of the frontend.
* **Frontend Integration:** While the backend is robust, the [OpenEduLog Frontend](https://github.com/wChoros/OpenEduLog-frontend) is still under development and might not yet support all backend features.
* **Ambitious Scope:** As mentioned, this was an ambitious project, so there might be areas for further development and refinement.

Have fun grading us! 😊