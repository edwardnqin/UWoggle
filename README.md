## UWoggle

### Project Abstract

<!--A one paragraph summary of what the software will do.-->

A basic application of the game Boggle. Users will be able to participate in real-time games with other users. There will be an algorithm to randomly shuffle the letter dice and lay them out; an interface for entering your words; a scoring feature displaying everyone's wordlists and highlighting unique entries; etc.

Additional features may include customizable game settings, user accounts, tracking user stats, playing against a computer, and the ability to design custom boards for others to play, choosing different alphabets, incorporating a shared "definitive" dictionary, etc.

### Customer

<!--A brief description of the customer for this software, both in general (the population who might eventually use such a system) and specifically for this document (the customer(s) who informed this document). Every project will have a customer from the CS506 instructional staff. Requirements should not be derived simply from discussion among team members. Ideally your customer should not only talk to you about requirements but also be excited later in the semester to use the system.-->

The customer is anyone who wants to have fun with this word finding game.
Our main customer is someone from the CS506 instructional staff.

### Specification

<!--A detailed specification of the system. UML, or other diagrams, such as finite automata, or other appropriate specification formalisms, are encouraged over natural language.-->

<!--Include sections, for example, illustrating the database architecture (with, for example, an ERD).-->

<!--Included below are some sample diagrams, including some example tech stack diagrams.-->

#### Technology Stack

![alt text](./techStack.jpeg)

#### Database

```mermaid
---
title: User Database ERD
---
erDiagram
    User {
        int user_id PK
        string username
        string password
        string email
        int high_score
        int number_of_games_played
    }

    Friends {
        int friendship_id PK
        int user1_id FK
        int user2_id FK
    }
```

#### Class Diagram

#### Flowchart

```mermaid
---
title: Basic Game Selection Flowchart
---
flowchart TD
    A[Start] -->B{Play}
    B -->D[Singleplayer]
    B -->E[Multiplayer]
    B -->F[Player vs. Computer]
    D --> G[End]
    E --> G[End]
    F --> G[End]
    G --> B
```

#### Behavior

#### Sequence Diagram

```mermaid
sequenceDiagram

participant ReactFrontend
participant DjangoBackend
participant MySQLDatabase
participant JavaApp
participant Dictionary

ReactFrontend ->> DjangoBackend: HTTP Request (e.g., GET /api/data)
activate DjangoBackend

DjangoBackend ->> MySQLDatabase: Query (e.g., SELECT * FROM data_table)
activate MySQLDatabase

DjangoBackend ->> JavaApp:Game Request
activate JavaApp

JavaApp ->> Dictionary:Look Up
activate Dictionary

Dictionary ->> JavaApp:Validate
deactivate Dictionary

JavaApp ->> DjangoBackend:Return Game
deactivate JavaApp

MySQLDatabase -->> DjangoBackend: Result Set
deactivate MySQLDatabase

DjangoBackend -->> ReactFrontend: JSON Response
deactivate DjangoBackend
```

### Standards & Conventions

<!--This is a link to a seperate coding conventions document / style guide-->

[Style Guide & Conventions](STYLE.md)
