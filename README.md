# Mafia Backend

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
   - [ ] Chat when waiting for players to fill up.
- [ ] Create a chat system for players to communicate to other people.
- [ ] Create basic Mafia roles (Mafia, Roleblocker, Villager, Cop, Doctor, Gunsmith).
- [ ] Create a system where you can share setups (example 2 Mafias and 5 Villagers, or 2 Mafias 4 Villagers 1 Cop).
- [ ] Create special abilities for roles (Mafia to kill, Cop to investigate, Doctor to save, Gunsmith to give Gun, etc).
- [ ] Assign random roles to players.
- [ ] Create phases and a timer to signify when to end each phase.
- [ ] Create a voting system for town to decide who to lynch.
- [ ] Create more complicated roles based off of EpicMafia (Oracle, Bomb, Sheriff, Lawyer, Stalker, etc).
- [ ] Create options for setups (Daystart, Timers).

**More complicated systems will be implemented later.**

**PROTOCOL**

As of so far, the only protocol being implemented is a WebSocket protocol which sends JSON payloads.

The WSS will be responsible for: checking for client disconnects and messaging.
The Express server will be responsible for everything else which includes verification, lobbies, setups, and games.