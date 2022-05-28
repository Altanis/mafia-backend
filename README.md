# Mafia Backend

## This GitHub commit is untested and may contain flawed code.

This project is a WIP and is not fully finished yet.
This will implement a previous project I was working on ([see here](https://github.com/CoderSudaWuda/chat-backend)) for players to communicate to eachother.

To Do List:
- [x] Create a registration system with email verification.
   - [x] Create registration system.
   - [x] Create E-Mail verification.
   - [x] Login to account.
   - [x] Resend verification E-Mail.
   - [x] Create a "Forgot Password" system.
- [x] Create a profile system for players to give themselves bios and avatars.
   - [x] Create Online indicator.
   - [x] Create an Biography and Avatar.
   - [x] Update Username, Avatar, or Biography.
- [x] Create a lobby system to join different setups.
   - [x] List all lobbies.
   - [x] Create a lobby.
   - [x] Join a lobby.
   - [x] Leave a lobby.
   - [x] Check when lobby fills.
   - [x] Chat when waiting for players to fill up.
- [ ] Create a Mafia Game.
   - [x] Roles
      - [x] Assign roles.
      - [x] Create JSON format of how roles should work.
      - [x] Implement role typings and make them funcitonal.
   - [ ] Phases
      - [x] Create a functional Night and Day phase.
      - [x] Make specific parties able to talk to eachother during the day.
      - [x] Give Mafia ability to vote a player to murder.
      - [x] Give Town ability to vote a player to lynch.
      - [x] Add a timer to lobbies.
   - [ ] Items
      - [x] Create a JSON format of how items should work.
      - [ ] Implement item typings and make them functional.
   - [ ] Create a Win Condition.
      - [ ] Create a Win Condition for both Town and Mafia.
- [ ] Create a competition system.
   - [ ] Give "points" to people who win for their party.
   - [ ] Give prizes for different point counts (after 10,000 points rainbow text for a week, etc)
- [ ] Create a system where you can share setups (example 2 Mafias and 5 Villagers, or 2 Mafias 4 Villagers 1 Cop).
- [ ] Create more complicated roles based off of EpicMafia (Oracle, Bomb, Sheriff, Lawyer, Stalker, etc).

**More complicated systems will be implemented later.**

**PROTOCOL**

As of so far, the only protocol being implemented is a WebSocket protocol which sends JSON payloads.

The WSS will be responsible for: checking for client disconnects and messaging.
The Express server will be responsible for everything else which includes verification, lobbies, setups, and games.