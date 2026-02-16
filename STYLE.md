# Coding Standards & Conventions

This document defines the coding standards, naming conventions, and
architectural decisions for this project.

------------------------------------------------------------------------

# 1. General Principles

-   Follow clean code principles
-   Prefer readability over cleverness
-   Keep functions small and single-responsibility
-   Avoid duplication (DRY)
-   Write self-documenting code
-   Use meaningful names

------------------------------------------------------------------------

# 2. Repository Structure

    /client        → React SPA
    /backend       → Python Flask API
    /game-service  → Java Spring Boot Game Engine
    /docker        → Docker / Compose configs

Each service must be independently runnable and testable.

------------------------------------------------------------------------

# 3. Naming Conventions

## 3.1 General

-   Use descriptive names
-   Avoid unclear abbreviations
-   Use nouns for classes
-   Use verbs for functions

------------------------------------------------------------------------

## 3.2 React (JavaScript / TypeScript)

### Files

-   Components: `PascalCase.jsx`
-   Hooks: `useSomething.js`
-   Utilities: `camelCase.js`

### Variables

-   `camelCase`
-   Boolean variables start with `is`, `has`, or `can`

Example:

``` javascript
const isAuthenticated = true;
```

### Components

-   Functional components only
-   Use React hooks instead of class components

------------------------------------------------------------------------

## 3.3 Python (Flask Backend)

### Files

-   `snake_case.py`

### Variables & Functions

-   `snake_case`

### Constants

-   `UPPER_CASE`

Example:

``` python
MAX_LOGIN_ATTEMPTS = 5
```

### Classes

-   `PascalCase`

### API Routes

-   Follow REST conventions
-   Use plural nouns

Examples:

    POST   /api/users
    POST   /api/login
    GET    /api/leaderboard

------------------------------------------------------------------------

## 3.4 Java (Spring Boot Game Engine)

### Files

-   One public class per file
-   Filename must match class name

### Classes

-   `PascalCase`

### Methods & Variables

-   `camelCase`

### Constants

-   `UPPER_CASE`

### Packages

-   Lowercase
-   Organized by layer:

```{=html}
<!-- -->
```
    controller
    service
    repository
    model

------------------------------------------------------------------------

# 4. Architecture Rules

## 4.1 Flask Backend Structure

    routes → services → models

-   Routes handle HTTP logic only
-   Services contain business logic
-   Models define database schema
-   No business logic inside route files

------------------------------------------------------------------------

## 4.2 Spring Boot Game Engine Structure

    Controller → Service → Repository

-   Controllers handle API requests
-   Services contain game logic
-   Repositories handle database access
-   No business logic inside controllers

------------------------------------------------------------------------

# 5. Database Conventions (MySQL)

-   Table names: `snake_case`
-   Primary key: `id`
-   Foreign keys: `<entity>_id`
-   Timestamps:
    -   `created_at`
    -   `updated_at`

------------------------------------------------------------------------

# 6. Authentication Standards

-   JWT for stateless authentication
-   Passwords hashed using BCrypt
-   Never store plain-text passwords
-   Tokens stored in HTTP-only cookies

------------------------------------------------------------------------

# 7. Error Handling

All APIs must return consistent JSON error responses.

Example:

``` json
{
  "error": "Invalid credentials",
  "status": 401
}
```

-   Do not expose stack traces in production
-   Use appropriate HTTP status codes

------------------------------------------------------------------------

# 8. Logging

-   No print() statements in production
-   Use structured logging
-   Log levels:
    -   INFO
    -   WARN
    -   ERROR

------------------------------------------------------------------------

# 9. Docker Standards

-   Each service has its own Dockerfile
-   Use `.env` for configuration
-   Never commit secrets
-   Use Docker Compose for orchestration

------------------------------------------------------------------------

# 10. Code Formatting

## Java

-   Follow Google Java Style Guide
-   4 spaces indentation
-   No wildcard imports

## Python

-   Follow PEP8
-   4 spaces indentation
-   Maximum line length: 100 characters

## JavaScript

-   Use ESLint
-   2 spaces indentation
-   Use Prettier for formatting

------------------------------------------------------------------------

# 11. Git Workflow

-   Use feature branches:

```{=html}
<!-- -->
```
    feature/<short-description>

-   No direct commits to `main`
-   All changes require a pull request
-   At least one review required before merge

------------------------------------------------------------------------

# 12. Testing Standards

-   Unit tests required for:
    -   Game engine logic
    -   Authentication logic
-   Backend endpoints must be testable
-   No untested critical logic

------------------------------------------------------------------------

# 13. Performance Guidelines

-   Dictionary loaded into memory at startup
-   Avoid repeated database queries
-   Use indexing for leaderboard queries
-   Keep API response time under 200ms for non-game operations

------------------------------------------------------------------------

# 14. Documentation

-   All public methods must include documentation comments
-   Complex logic must include explanation comments
-   Keep README updated when architecture changes
