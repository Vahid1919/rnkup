# RNKUP

RNKUP presents recent Valorant competitive performance for a player
identified by their Riot ID.

## Language

**Player**:
A Valorant account whose competitive performance is viewed in RNKUP.
_Avoid_: User, account

**Riot ID**:
The player name and tag that identify a Player in Valorant.
_Avoid_: Username, handle

**Player Profile**:
The Player's identity, region, account level, and card artwork.

**Player Dashboard**:
The view of a Player Profile, Insights, Competitive Summary, trends,
breakdowns and Match Log.

**Competitive History**:
The recent Competitive Matches with full round-by-round detail. Every stat and
Insight is calculated from it.
_Avoid_: Match list, career

**Stored Match**:
A lighter record of a Competitive Match: result, score, Agent and Map, but no
rounds or kill feed.

**Match Log**:
The list of Stored Matches on the Player Dashboard. It can reach further back
than the Competitive History.
_Avoid_: Match history (ambiguous)

**Match Detail**:
One Competitive Match in full: both teams, every round, and who killed whom,
seen from one Player's side.

**Round Replay**:
A round shown as a series of still frames, one per kill, plant and defuse,
with every living player's position and facing at that moment. HenrikDev only
records positions at those events, so it is not continuous movement.

**Buy Type**:
How much a team spent in a round, from its total loadout value: Eco (under
5,000), Semi-eco (under 10,000), Half buy (under 20,000) or Full buy.
_Avoid_: Force buy (not detected)

**Economy Swing**:
A round won while buying at least two Buy Types below the enemy, or lost
while buying at least two above them.

**Competitive Match**:
One completed Valorant competitive game in a Player's Competitive History.
_Avoid_: Game

**Competitive Summary**:
Performance measures calculated across a Player's Competitive History.
_Avoid_: Performance snapshot

**Agent**:
The playable Valorant character used by the Player in a Competitive Match.
_Avoid_: Character

**Map**:
The Valorant battleground on which a Competitive Match is played.

**Rank Rating (RR)**:
The points a Player has within their competitive tier, gained or lost each
Competitive Match.

**Leaderboard**:
A region's ranked list of Immortal and Radiant Players, ordered by Rank
Rating. Players can hide their Riot ID on it.
_Avoid_: Ladder, rankings

**Rank Threshold**:
The minimum Rank Rating and highest Leaderboard position that hold a rank,
such as Radiant, at the moment the Leaderboard was updated.

**Placement**:
A Player's position among the ten players in a match by combat score. First
place is the MVP.

**Match Outcome**:
The win, loss, or draw recorded for a Player in a Competitive Match.
_Avoid_: Result

**Average Combat Score (ACS)**:
The Player's combat score per round in a Competitive Match or Competitive
Summary.

**Average Damage per Round (ADR)**:
The Player's damage dealt per round in a Competitive Match or Competitive
Summary.

**Headshot Percentage**:
The percentage of the Player's recorded hits that are headshots.
_Avoid_: Headshot rate, HS%

**First Blood**:
The first enemy elimination in a round credited to the Player.

**First Death**:
Being the first player eliminated in a round.

**Opening Duel**:
The round's first kill, seen from one Player: won if they got the First
Blood, lost if it was their First Death.

**First Kills per First Death**:
First Bloods divided by First Deaths. Above 1.0 means the Player wins more
opening duels than they lose.

**KAST**:
The percentage of rounds in which the Player got a kill, an assist, survived,
or had their death traded.

**Traded Death**:
A death where a teammate kills the Player's killer within 5 seconds.

**Damage Delta**:
Damage dealt minus damage received, per round.

**Lobby Average**:
The mean of the other nine players in the same Competitive Matches.

**Insight**:
A coaching note that names one thing to fix or keep and the numbers it is
based on.
_Avoid_: Tip, recommendation

**Available History**:
The Competitive Matches currently returned for a Player, which can differ from
the Player's complete career history.

**Kill/Death Ratio (K/D)**:
The Player's kills divided by deaths.

**Kill/Assist/Death Ratio (KDA)**:
The Player's kills plus assists divided by deaths. A zero death count uses one
as the denominator.
