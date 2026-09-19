# Event-Driven Social Feed

An event-driven social feed application built around **command services, a read model, and an event bus**.

The application separates write operations (creating posts and comments) from read operations (building and serving the feed). Changes are propagated through events, allowing the feed and moderation logic to react asynchronously.

## Architecture

![System Architecture](./diagram.png)

### High-level flow

```text
Browser
   │
   ▼
React Client
   │
   ▼
Ingress Router
   │
   ├──────────────► Query Service ─────────► Feed Read Model
   │                     ▲
   │                     │
   │                 reads feed
   │
   ├──────────────► Posts Service ─────────► Posts Store
   │                     │
   │                     └──────── publishes events
   │
   └──────────────► Comments Service ──────► Comments Store
                         │
                         └──────── publishes events

                    Events
                       │
                       ▼
                   Event Bus
                       │
             ┌─────────┴─────────┐
             ▼                   ▼
      Moderation Service     Event Log
             │
             └──── publishes decisions / updates
```

## Main Components

### 1. React Client

The frontend is the entry point for users.

It communicates with the backend through the ingress router and is responsible for interacting with the feed, posts, and comments functionality.

### 2. Ingress Router

The ingress layer receives requests from the React client and routes them to the appropriate backend service.

Routes are separated by responsibility:

- **Feed** → Query Service
- **Posts** → Posts Service
- **Comments** → Comments Service

The diagram uses `ingress-srv.yaml` for the ingress configuration.

### 3. Query Service

The Query Service is responsible for **reading the feed**.

Instead of querying the write stores directly, it uses a dedicated **Feed Read Model**.

This follows a read/write separation approach:

```text
Command side                    Query side

Posts Service ──┐
                 ├── events ──► Feed Read Model
Comments Service ┘                    ▲
                                      │
                               Query Service
```

When relevant events are received, the read model is updated so that feed queries can be served efficiently.

### 4. Posts Service

The Posts Service handles post-related commands.

Responsibilities include:

- Creating posts
- Writing post data to the Posts Store
- Publishing post-related events
- Updating relevant state based on event processing

### 5. Comments Service

The Comments Service handles comment-related commands.

Responsibilities include:

- Creating comments
- Writing comment data to the Comments Store
- Publishing comment-related events
- Updating status when required
- Triggering downstream event processing

### 6. Event Bus

The Event Bus is the communication layer between the different parts of the application.

Services publish events instead of directly depending on every other service.

For example:

```text
Posts Service
     │
     │ publishes PostCreated
     ▼
 Event Bus
     │
     ├──► Feed Read Model
     ├──► Moderation Service
     └──► Other consumers
```

This makes it possible for multiple consumers to react to the same event.

### 7. Event Log

The Event Log stores events produced by the system.

The stored events can be used for **event replay**, allowing downstream state such as the read model to be rebuilt by processing historical events again.

Conceptually:

```text
Event Log
   │
   │ replay events
   ▼
Consumers / Read Models
```

This is useful when rebuilding a read model or recovering derived state.

### 8. Moderation Service

The Moderation Service processes events related to content moderation.

It can:

1. Receive events from the Event Bus.
2. Evaluate the relevant content.
3. Publish moderation decisions.
4. Trigger status updates when required.

The service is therefore decoupled from the request path: moderation can react to events without the command services needing to directly call it.

---

## Request and Event Flow

### Creating a Post

A simplified post-creation flow looks like this:

```text
Browser
   │
   ▼
React Client
   │
   ▼
Ingress Router
   │
   ▼
Posts Service
   │
   ├──► Posts Store
   │
   └──► Event Bus
           │
           ├──► Feed Read Model
           │
           └──► Moderation Service
```

The post is first handled by the command service. The resulting event can then be consumed independently by other parts of the system.

### Creating a Comment

```text
Browser
   │
   ▼
React Client
   │
   ▼
Ingress Router
   │
   ▼
Comments Service
   │
   ├──► Comments Store
   │
   └──► Event Bus
           │
           ├──► Feed / Read Model
           │
           └──► Moderation Service
```

### Reading the Feed

Feed reads follow a separate path:

```text
Browser
   │
   ▼
React Client
   │
   ▼
Ingress Router
   │
   ▼
Query Service
   │
   ▼
Feed Read Model
   │
   ▼
Feed response
```

The Query Service does not need to reconstruct the feed by querying every command-side store.

---

## Architectural Concepts

This project demonstrates several important backend architecture concepts:

### Event-Driven Architecture

Services communicate through events, reducing direct coupling between components.

### Command / Query Separation

Write operations and read operations are handled separately:

- **Commands:** Posts Service and Comments Service
- **Queries:** Query Service and Feed Read Model

### Read Model

The Feed Read Model is a projection of information required to efficiently answer feed queries.

Instead of treating it as the primary source of truth, it is maintained from events.

### Event Replay

The Event Log provides a history of events that can be replayed to rebuild derived state.

### Service Decoupling

The Posts and Comments services do not need to know every consumer of the events they produce. New consumers can be connected to the Event Bus without changing the original command flow.

---

## Project Structure

The architecture is organized conceptually into the following areas:

```text
Frontend
└── React Client

Routing
└── Ingress Router

Read Model
├── Query Service
└── Feed Read Model

Command Services
├── Posts Service
│   └── Posts Store
└── Comments Service
    └── Comments Store

Event Processing
├── Moderation Service
├── Event Bus
└── Event Log
```

The exact source-code structure may differ from this logical architecture; the diagram represents the runtime responsibilities and communication between components.

---

## Why This Architecture?

A traditional implementation could place posts, comments, feed queries, and moderation logic behind a single application.

This architecture separates those responsibilities so that each part can evolve independently.

For example:

- Feed reads can be optimized independently from writes.
- Moderation can process events asynchronously.
- Additional event consumers can be added without changing the command services.
- The event history can be replayed to rebuild derived data.
- Services have clearer responsibilities and boundaries.

The trade-off is additional complexity: event-driven systems introduce concerns such as asynchronous processing, event ordering, duplicate events, consistency between read models, and failure/retry handling.

---

<img width="4869" height="6246" alt="diagram" src="https://github.com/user-attachments/assets/d9aeaa9b-b0d7-485e-b1ca-ba5df9e81b7d" /><img width="4869" height="6246" alt="diagram" src="https://github.com/user-attachments/assets/6d68ab0f-2010-4053-91fd-c8296defac42" />
