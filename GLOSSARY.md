# Radiant Stats

Radiant Stats presents recent Valorant competitive performance for a player
identified by their Riot ID.

## Language

**Player**:
A Valorant account whose competitive performance is viewed in Radiant Stats.
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
A coaching note that names one thing to fix or keep, why it matters, and a
drill for the next game.
_Avoid_: Tip, recommendation

**Available History**:
The Competitive Matches currently returned for a Player, which can differ from
the Player's complete career history.

**Kill/Death Ratio (K/D)**:
The Player's kills divided by deaths.

**Kill/Assist/Death Ratio (KDA)**:
The Player's kills plus assists divided by deaths. A zero death count uses one
as the denominator.
