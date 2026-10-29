# Game rules implemented in the engine (src/lib/game)

Confirmed by the product owner:
- Roles: عضو مافيا, مافيا التسكيت, الطبيب, القناص, عمدة الصالحين, الولد الصالح, مواطن صالح. Teams: المافيا / الصالحين.
- Mafia kill turn rotates among living regular mafia each night; the silent mafia counts as mafia and takes the kill turn only when no regular mafia are alive (and needs at least 2 mafia in the game).
- Doctor heals one player per night, can heal himself, cannot heal the same player two nights in a row.
- Mayor's vote counts three. There is no "skip vote" option.
- Private screens must never reveal role or task to onlookers.
- Players: 4 to 24 (shared device: 4 to 12), 1 to 6 mafia.
- XP only on wins (see level-and-xp-system.md in the project).

ASSUMPTIONS (please confirm or correct):
1. Mafia wins when mafia count >= town count; town wins when no mafia remain.
2. Vote tie or no votes: nobody is eliminated.
3. Sniper: one bullet; killing a mafia member is safe; killing a town member also kills the sniper.
4. Doctor's save also stops the sniper's bullet that night.
5. Good boy: survives the first mafia attack on him (once), then is a normal citizen.
6. Silent mafia: silences one player for the next day discussion.
7. A player killed at night or voted out has their role revealed publicly.
8. A mafia member cannot choose another mafia member as the kill target.
