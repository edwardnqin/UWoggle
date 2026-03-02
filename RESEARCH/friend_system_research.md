# Research Report

## Friend System Design

### Summary of Work

I researched how to design a friend system for a backend application. I
looked at how friendships are modeled in relational databases and how
friend requests are typically handled. I found that most systems use a
single table with a status field (PENDING, ACCEPTED, REJECTED). I also
reviewed REST API design rules to understand how to structure endpoints
correctly for sending and accepting friend requests.

### Motivation

Our project needs a working friend feature where users can send, accept,
and remove friends. I wanted to make sure we design the database
correctly to prevent duplicate friendships and invalid requests like
self-friending. I also needed to understand how to structure the API
routes in a clean and scalable way before starting implementation.

### Time Spent

\~60 minutes total

### Results

-   **Database structure:** Use one `Friend` table with `requester_id`,
    `receiver_id`, and `status`.
-   **Rules applied:** No self-friending, no duplicate requests, only
    show friendships when status = ACCEPTED.
-   **API structure:** Use RESTful endpoints such as:
    -   `POST /friends/request`
    -   `POST /friends/accept`
    -   `DELETE /friends/{user_id}/{friend_id}`
    -   `GET /friends/{user_id}`
-   **Key finding:** Friend relationships are symmetric after
    acceptance, so database queries must check both directions.

### Sources

- [Microsoft – Relationships Many-to-Many (Power BI guidance)](https://learn.microsoft.com/en-us/power-bi/guidance/relationships-many-to-many)

- [Swift.org – API Design Guidelines](https://www.swift.org/documentation/api-design-guidelines/)

- [DBA StackExchange – Designing a friendships database structure](https://dba.stackexchange.com/questions/135941/designing-a-friendships-database-structure-should-i-use-a-multivalued-column)
