const SCORING = [10, 8, 6, 4, 3, 2, 1];

async function fetchTournaments() {
  const res = await fetch('tournaments.json');
  const { tournaments } = await res.json();
  return tournaments;
}

async function fetchTournamentResults(tournamentId) {
  const url = `https://lichess.org/api/tournament/${tournamentId}/results?nb=200`;
  const res = await fetch(url, {
    headers: {
      'Accept': 'application/x-ndjson'
    }
  });

  const text = await res.text();
  const players = text.trim().split('\n').map(line => JSON.parse(line));

  // Collect scores by team
  const teamScores = {};

  for (const player of players) {
    const team = player.team || 'No team';
    if (!teamScores[team]) {
      teamScores[team] = [];
    }
    teamScores[team].push(player.score || 0);
  }

  // Keep only top 3 scores per team
  const top3TeamTotals = Object.entries(teamScores).map(([team, scores]) => {
    const top3 = scores.sort((a, b) => b - a).slice(0, 3);
    const total = top3.reduce((sum, s) => sum + s, 0);
    return { team, total };
  });

  // Sort teams by their top-3 totals
  const rankedTeams = top3TeamTotals.sort((a, b) => b.total - a.total);

  // Assign placement points
  return rankedTeams.map(({ team }, index) => ({
    team,
    points: SCORING[index] || 0
  }));
}

async function buildDetailedLeaderboard() {
  const tournaments = await fetchTournaments();
  const leaderboard = {}; // { team: { total: number, [roundX]: number } }

  for (let i = 0; i < tournaments.length; i++) {
    const tournamentId = tournaments[i];
    const roundKey = `R${i + 1}`;
    const results = await fetchTournamentResults(tournamentId);

    for (const { team, points } of results) {
      if (!leaderboard[team]) {
        leaderboard[team] = { total: 0 };
      }
      leaderboard[team][roundKey] = points;
      leaderboard[team].total += points;
    }
  }

  return { leaderboard, roundLabels: tournaments.map((_, i) => `R${i + 1}`) };
}

async function displayLeaderboardTable() {
  const { leaderboard, roundLabels } = await buildDetailedLeaderboard();
  const sorted = Object.entries(leaderboard)
    .sort((a, b) => b[1].total - a[1].total);

  const container = document.getElementById('results');

  const table = document.createElement('table');
  const headers = ['Rank', 'Team', ...roundLabels, 'Total'];
  table.innerHTML = `
    <thead>
      <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
    </thead>
    <tbody>
      ${sorted.map(([team, scores], idx) => {
        const roundCells = roundLabels.map(r => `<td>${scores[r] || 0}</td>`).join('');
        return `
          <tr>
            <td>${idx + 1}</td>
            <td>${team}</td>
            ${roundCells}
            <td>${scores.total}</td>
          </tr>
        `;
      }).join('')}
    </tbody>
  `;
  container.appendChild(table);
}

displayLeaderboardTable();
