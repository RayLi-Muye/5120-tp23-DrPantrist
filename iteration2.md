epic3

As a user, I want to share inventory for me and my housemates.

(Must Have):
1.As a user, I want to create a household for me and my housemates.

Given I am authenticated and on the dashboard,

When I select “Create Household”,

Then a new household is created.


2.Given the household has been created,

When the creation succeeds and I open the Household Management screen,

Then a unique, randomly generated PIN is displayed. (implemented from backend)

As a housemate, I want to join a household to access shared groceries.

3.Given I have entered a valid PIN,

When I tap Confirm,

Then I’m added to the household and can view the shared inventory.


4.Given I enter an invalid or expired PIN,

When I tap Confirm,

Then an error message is displayed and I am not added.

5.As the owner, I want to view and remove members so that I can control access.

As the owner, I want to view and remove members so that I can control access.

Given I am the owner,

When I open Household Management,

Then I see a list of current members.

6.As the owner, I want to view and remove members so that I can control access.

Given the list is displayed, 

when I tap “Remove” next to a member, 

then a confirmation prompt appears.

7.As the owner, I want to view and remove members so that I can control access.

Given the confirmation prompt is visible,

When I confirm removal,

Then the member is removed and can no longer access the shared inventory.

EPIC4
1.As a housemate, I want to see one Shared section and Private sections per housemate so that ownership is clear.

Given I am a member of a household,
When I open the Inventory screen,
Then I see exactly one Shared section and one Private section for each current member (including mine).

2.
Given I am viewing another member’s Private section,
When I try to edit, delete, or change any of those items,
Then those actions are unavailable (read-only) and the system prevents the change.

3.
As a user, I want to choose Shared or Private when adding an item so that ownership is correct from the start.
Given I open Add Item,
When the form is displayed,
Then I must choose either “Shared Items” or “My Private Items” (mutually exclusive) before I can save.

4.
Given I selected Private in Add Item
When I save the item,
Then the item appears under my Private section.

5.
Given I selected Shared in Add Item
When I save the item,
Then the item appears under the Shared section (visible to all household members).

Backend Implementation Proposal

See docs/epic4-backend-api-proposal.md for a concrete, backward-compatible API design to support Shared and Private items, including data model changes, endpoint updates, and permission rules.
