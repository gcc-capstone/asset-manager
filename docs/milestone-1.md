# Milestone 1 Target

## Milestone 1 Functionality

By the end of Milestone 1, the following functionality will be implemented:

1. **Outages:** A user can pick a unit and create an outage with a start date, end date, type (Major or Minor), description, and the tags on that unit that the outage covers. The outage is saved to the database. The user can then view a list of existing outages, both for one unit and across all units. Each listed outage shows its dates, type, and covered tags.
2. **Tasks:** A user can create a task with a title, plant, assignee, due date, category, description, and optionally a linked outage. The task is saved to the database. The user can view a list of existing tasks, filtered by plant, and mark a task as completed. That change is also saved to the database.
3. **2x Database:** The application uses two databases (see above).
4. **Auto-Create Task:** When a user creates an outage, the system automatically creates the standard follow-up tasks for it (for example, ordering parts, reviewing the bill of sale, and submitting the service report). Each task is linked to the outage, has a due date set relative to the outage dates, and is saved. Tasks whose due dates have already passed are not created.
5. **PDF + Service --> Obj:** A user can upload a Top Assembly Drawing (TAD) PDF or submit an outage service report.

## Individual Responsibilities

- **Tony:** Build the auto-create task feature: generate the standard follow-up tasks with correct due dates when an outage is created, and save them.
- **Gideon:** Build the backend API endpoints for creating and retrieving outages by unit and tag, including server-side validation (and possibly work on PDF + Service --> Obj).
- **Michael:** Build the backend API endpoints for creating and retrieving tasks, including server-side validation (and possibly work on PDF + Service --> Obj).
- **Wyn:** Build the React frontend for creating an outage and displaying the list of outages.
- **Aiden:** Build the React frontend for creating a task and displaying the list of tasks.