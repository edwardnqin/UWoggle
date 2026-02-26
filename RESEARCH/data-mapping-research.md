## Research Report: Game Session Persistence & Data Mapping

### Summary of Work
I researched the most efficient ways to persist a 2D game board (Boggle grid) into a relational database using **Spring Data JPA**. I looked into **Object-Relational Mapping (ORM)** strategies to decide whether to store the board as a complex collection or a serialized string. I also investigated **JPA Entity lifecycles** to ensure that game metadata, like the `maxScore` calculated by the backend solver, is captured accurately at the moment of board generation.

### Motivation
Our project requires that every game session is unique and traceable for future features like leaderboards and game history. Since the `BoardController` generates a new board every time the endpoint is hit, I needed to ensure this data isn't lost if the user refreshes the page. My goal was to design a "Vertical Slice" that proves the backend can successfully take calculated data from the `BoggleSolver` and write it to the `uwoggle` database.

### Time Spent
~75 minutes total

### Results
* **Data Modeling**: Chose to store the 4x4 board as a **Flat String** (e.g., "A,B,C...") to simplify database queries and reduce storage overhead compared to nested tables.
* **Entity Mapping**: Used `@Entity` and `@Table` annotations to map the Java `GameSession` class directly to Edward's MySQL schema.
* **Persistence Logic**: Identified that the `maxScore` must be stored immediately upon generation to prevent redundant recalculations during later data retrieval.
* **Key Finding**: To maintain data integrity across the Docker network, the Spring Boot `datasource` must be configured to use the **Docker Service Name** (`db`) rather than `localhost`.

### Sources
* [Baeldung – Guide to Spring Data JPA](https://www.baeldung.com/the-persistence-layer-with-spring-data-jpa)
* [Docker Documentation – Networking in Compose](https://docs.docker.com/compose/networking/)
* [Hibernate ORM – Mapping Types and Strategies](https://hibernate.org/orm/documentation/6.2/)