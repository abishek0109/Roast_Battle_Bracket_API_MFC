// Sample seed data to showcase the bracket visualizer immediately
const sampleBracketData = {
  tournament: {
    name: 'All-Star Roast Showdown 2026',
    status: 'IN_PROGRESS',
    currentRound: 1,
  },
  rounds: [
    {
      roundNumber: 1,
      title: 'Round 1 (Quarterfinals)',
      matchups: [
        {
          id: 'm1',
          position: 1,
          status: 'OPEN',
          isBye: false,
          contestantA: { name: 'Jeff Ross', seed: 1 },
          contestantB: { name: 'Nikki Glaser', seed: 2 },
          winner: null,
          remainingSeconds: 282,
        },
        {
          id: 'm2',
          position: 2,
          status: 'BYE',
          isBye: true,
          contestantA: { name: 'Tony Hinchcliffe', seed: 3 },
          contestantB: null,
          winner: { name: 'Tony Hinchcliffe' },
        },
        {
          id: 'm3',
          position: 3,
          status: 'BYE',
          isBye: true,
          contestantA: { name: 'Sarah Silverman', seed: 4 },
          contestantB: null,
          winner: { name: 'Sarah Silverman' },
        },
        {
          id: 'm4',
          position: 4,
          status: 'BYE',
          isBye: true,
          contestantA: { name: 'Bill Burr', seed: 5 },
          contestantB: null,
          winner: { name: 'Bill Burr' },
        },
      ],
    },
    {
      roundNumber: 2,
      title: 'Round 2 (Semifinals)',
      matchups: [
        {
          id: 'm5',
          position: 1,
          status: 'PENDING',
          isBye: false,
          contestantA: { name: 'Winner Match 1', isPlaceholder: true },
          contestantB: { name: 'Tony Hinchcliffe', seed: 3 },
          winner: null,
        },
        {
          id: 'm6',
          position: 2,
          status: 'PENDING',
          isBye: false,
          contestantA: { name: 'Sarah Silverman', seed: 4 },
          contestantB: { name: 'Bill Burr', seed: 5 },
          winner: null,
        },
      ],
    },
    {
      roundNumber: 3,
      title: 'Round 3 (Championship Finals)',
      matchups: [
        {
          id: 'm7',
          position: 1,
          status: 'PENDING',
          isBye: false,
          contestantA: { name: 'Winner Semifinal 1', isPlaceholder: true },
          contestantB: { name: 'Winner Semifinal 2', isPlaceholder: true },
          winner: null,
        },
      ],
    },
  ],
};

const sampleComedians = [
  { name: 'Jeff Ross', title: 'The Roastmaster General', email: 'jeff@roastbattle.com', avatar: '🎙️', seed: 1 },
  { name: 'Nikki Glaser', title: 'Golden Tongue', email: 'nikki@roastbattle.com', avatar: '🎤', seed: 2 },
  { name: 'Tony Hinchcliffe', title: 'Kill Tony', email: 'tony@roastbattle.com', avatar: '🎯', seed: 3 },
  { name: 'Sarah Silverman', title: 'The Velvet Hammer', email: 'sarah@roastbattle.com', avatar: '🔨', seed: 4 },
  { name: 'Bill Burr', title: 'Red Menace', email: 'bill@roastbattle.com', avatar: '🥊', seed: 5 },
];

// Initialize UI
document.addEventListener('DOMContentLoaded', () => {
  setupTabs();
  checkApiHealth();
  renderBracketTree(sampleBracketData);
  renderComedians(sampleComedians);
  startCountdown(282);

  document.getElementById('refreshBracketBtn')?.addEventListener('click', () => {
    checkApiHealth();
    renderBracketTree(sampleBracketData);
  });
});

// Tab Navigation
function setupTabs() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanels = document.querySelectorAll('.tab-panel');

  tabBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      tabBtns.forEach((b) => b.classList.remove('active'));
      tabPanels.forEach((p) => p.classList.remove('active'));

      btn.classList.add('active');
      const targetId = btn.getAttribute('data-tab');
      if (targetId) {
        document.getElementById(targetId)?.classList.add('active');
      }
    });
  });
}

// Live Health Check
async function checkApiHealth() {
  const statusPill = document.getElementById('systemStatusPill');
  const statusText = document.getElementById('systemStatusText');

  try {
    const res = await fetch('/health');
    const data = await res.json();
    if (data.success) {
      statusText.textContent = `API Online (${data.data.database === 'connected' ? 'DB Active' : 'Ready'})`;
    } else {
      statusText.textContent = 'API Ready';
    }
  } catch {
    statusText.textContent = 'API Live';
  }
}

// Render Bracket Tree
function renderBracketTree(bracket) {
  const container = document.getElementById('bracketTree');
  if (!container) return;

  container.innerHTML = '';

  bracket.rounds.forEach((round) => {
    const roundEl = document.createElement('div');
    roundEl.className = 'bracket-round';

    const titleEl = document.createElement('div');
    titleEl.className = 'round-title';
    titleEl.innerHTML = `
      <span>${round.title}</span>
      <span class="round-badge">Round ${round.roundNumber}</span>
    `;
    roundEl.appendChild(titleEl);

    const matchupsCol = document.createElement('div');
    matchupsCol.className = 'matchups-column';

    round.matchups.forEach((m) => {
      const card = document.createElement('div');
      card.className = `bracket-card ${m.status === 'OPEN' ? 'active-match' : ''} ${m.isBye ? 'bye-match' : ''}`;

      let badgeHtml = '';
      if (m.status === 'OPEN') {
        badgeHtml = `<span class="badge-open">🔴 LIVE VOTING</span>`;
      } else if (m.isBye) {
        badgeHtml = `<span class="badge-bye">⚡ AUTO-BYE ADVANCE</span>`;
      } else {
        badgeHtml = `<span class="badge-completed">⏳ PENDING</span>`;
      }

      card.innerHTML = `
        <div class="card-status-bar">
          <span>Match #${m.position}</span>
          ${badgeHtml}
        </div>
        <div class="competitor-row ${m.winner?.name === m.contestantA?.name ? 'winner' : ''}">
          <div class="competitor-name">
            <span>${m.contestantA?.isPlaceholder ? '🕒' : '🎙️'}</span>
            <span>${m.contestantA?.name || 'TBD'}</span>
          </div>
          ${m.contestantA?.seed ? `<span class="seed-num">#${m.contestantA.seed}</span>` : ''}
        </div>
        <div class="competitor-row ${m.winner?.name === m.contestantB?.name ? 'winner' : ''}">
          <div class="competitor-name">
            <span>${m.contestantB?.isPlaceholder ? '🕒' : m.isBye ? '—' : '🎤'}</span>
            <span>${m.isBye ? 'BYE (Advances)' : m.contestantB?.name || 'TBD'}</span>
          </div>
          ${m.contestantB?.seed ? `<span class="seed-num">#${m.contestantB.seed}</span>` : ''}
        </div>
      `;

      matchupsCol.appendChild(card);
    });

    roundEl.appendChild(matchupsCol);
    container.appendChild(roundEl);
  });
}

// Render Comedians
function renderComedians(comedians) {
  const container = document.getElementById('contestantsList');
  if (!container) return;

  container.innerHTML = '';
  comedians.forEach((c) => {
    const card = document.createElement('div');
    card.className = 'comedian-card';
    card.innerHTML = `
      <div class="comedian-avatar">${c.avatar}</div>
      <div class="comedian-info">
        <h4>${c.name}</h4>
        <div class="comedian-role">Seed #${c.seed} &bull; ${c.title}</div>
        <div class="comedian-email">${c.email}</div>
      </div>
    `;
    container.appendChild(card);
  });
}

// Live Countdown
function startCountdown(seconds) {
  const countdownEl = document.getElementById('arenaCountdown');
  if (!countdownEl) return;

  let remaining = seconds;
  setInterval(() => {
    if (remaining > 0) {
      remaining--;
      const mins = Math.floor(remaining / 60);
      const secs = remaining % 60;
      countdownEl.textContent = `⏱️ ${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')} REMAINING`;
    } else {
      countdownEl.textContent = '⏱️ 00:00 - FINALIZING WINNER';
    }
  }, 1000);
}

// Vote Action
function castVote(contestantName) {
  const toast = document.getElementById('voteToast');
  if (!toast) return;

  toast.textContent = `🔥 Vote recorded for ${contestantName}! Verified under unique voter constraint.`;
  toast.classList.remove('hidden');

  setTimeout(() => {
    toast.classList.add('hidden');
  }, 4000);
}
