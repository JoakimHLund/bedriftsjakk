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

  const teamScores = {};

  for (const player of players) {
    const team = player.team || 'No team';
    teamScores[team] = (teamScores[team] || 0) + (player.score || 0);
  }

  // Convert team scores into sorted array
  const sortedTeams = Object.entries(teamScores)
    .sort((a, b) => b[1] - a[1])
    .map(([team], index) => ({
      team,
      tournamentPoints: SCORING[index] || 0
    }));

  return sortedTeams;
}

async function buildOverallLeaderboard() {
  const tournaments = await fetchTournaments();
  const overall = {};

  for (const tournamentId of tournaments) {
    const tournamentLeaders = await fetchTournamentResults(tournamentId);
    for (const { team, tournamentPoints } of tournamentLeaders) {
      overall[team] = (overall[team] || 0) + tournamentPoints;
    }
  }

  return Object.entries(overall)
    .sort((a, b) => b[1] - a[1]); // Sort by total points
}

async function displayOverallLeaderboard() {
  const leaderboard = await buildOverallLeaderboard();
  const container = document.getElementById('results');
  const table = document.createElement('table');
  table.innerHTML = `
    <thead>
      <tr><th>Rank</th><th>Team</th><th>Total Points</th></tr>
    </thead>
    <tbody>
      ${leaderboard.map(([team, points], i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${team}</td>
          <td>${points}</td>
        </tr>
      `).join('')}
    </tbody>
  `;
  container.appendChild(table);
}

displayOverallLeaderboard();
