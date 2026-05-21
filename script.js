// ══════════════════════════════════════════════
//  Krishna Book Store – Gift Card Management
// ══════════════════════════════════════════════

// ── WEBAPP URL ──
// After deploying code.gs as a Web App, paste the URL here:
const WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbwTEptp9ZbLUlsbsE-vH2p3BSpjokAHM1y1ZfV8gnFq5qzCXrBYRfEkWC--gqqYPjyZ/exec';

// ── State ──
let entriesOffset = 0;
let generateLocked = false;
let redeemLocked = false;
let ledgerStatusFilter = 'all';

// ── Theme Management ──
function toggleTheme() {
  const isLight = document.body.classList.toggle('light-mode');
  localStorage.setItem('gsheet_theme', isLight ? 'light' : 'dark');
  document.getElementById('theme-icon').textContent = isLight ? 'dark_mode' : 'light_mode';
  
  if (typeof cachedAnalyticsData !== 'undefined' && cachedAnalyticsData) {
    renderHeatmap();
    renderReturnAnalysis(cachedAnalyticsData);
    renderSegmentation(cachedAnalyticsData);
  }
}

function initTheme() {
  const savedTheme = localStorage.getItem('gsheet_theme');
  if (savedTheme === 'dark') {
    document.body.classList.remove('light-mode');
    const icon = document.getElementById('theme-icon');
    if (icon) icon.textContent = 'light_mode';
  } else {
    document.body.classList.add('light-mode');
    const icon = document.getElementById('theme-icon');
    if (icon) icon.textContent = 'dark_mode';
  }
}
initTheme();

// Restrict Customer Mobile and Amount input fields to digits only
function setupNumericInputs() {
  const genMobile = document.getElementById('genMobile');
  const genAmount = document.getElementById('genAmount');
  
  if (genMobile) {
    genMobile.addEventListener('input', function() {
      this.value = this.value.replace(/\D/g, '');
    });
  }
  
  if (genAmount) {
    genAmount.addEventListener('input', function() {
      this.value = this.value.replace(/\D/g, '');
    });
  }
}
setupNumericInputs();

// ══════════════════════════════════════════════
//  NAVIGATION
// ══════════════════════════════════════════════
function navigate(page) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-btn, .bnav-btn').forEach(b => b.classList.remove('active'));

  document.getElementById('section-' + page).classList.add('active');
  document.getElementById('nav-' + page).classList.add('active');
  
  const bnav = document.getElementById('bnav-' + page);
  if (bnav) {
    bnav.classList.add('active');
    const index = bnav.getAttribute('data-index');
    const indicator = document.querySelector('.bnav-indicator');
    if (indicator) {
      indicator.style.transform = `translateX(calc(${index} * 100%))`;
    }
  }

  // Sync Cache button is now visible on ALL pages including admin

  if (page === 'entries') {
    entriesOffset = 0;
    document.getElementById('entriesList').innerHTML = '';
    loadEntries();
  }
  if (page === 'admin') {
    loadAdminStats();
    generateAnalytics();
  }
}

// ══════════════════════════════════════════════
//  ENCODING MAPS
// ══════════════════════════════════════════════
const DIGIT_REPLACEMENTS = {
  0: ['0', 'Z', 'J', 'T', 'X'],
  1: ['1', 'A', 'K', 'Y'],
  2: ['2', 'B', 'L', 'W'],
  3: ['3', 'C', 'M'],
  4: ['4', 'D', 'N'],
  5: ['5', 'E', 'V'],
  6: ['6', 'F', 'P'],
  7: ['7', 'G', 'Q'],
  8: ['8', 'H', 'R'],
  9: ['9', 'U', 'S']
};

const HOUR_MAP = ['A','B','C','D','E','F','G','H','J','K','L','M','N','P','Q','R','S','T','U','V','W','X','Y','Z'];

const YEAR_MAP = ['A','B','C','D','E','F','G','H','J','K','L','M','N','P','Q','R','S','T','U','V','W','X','Y','Z','0','1','2','3','4','5','6','7','8','9'];

const MONTH_MAP = {
  1:  ['1', 'E'],
  2:  ['2', 'F'],
  3:  ['3', 'G'],
  4:  ['4', 'H'],
  5:  ['5', 'J'],
  6:  ['6', 'K'],
  7:  ['7', 'L'],
  8:  ['8', 'M'],
  9:  ['9', 'A'],
  10: ['B'],
  11: ['C'],
  12: ['D']
};

const DATE_MAP = {
  1:'1',2:'2',3:'3',4:'4',5:'5',6:'6',7:'7',8:'8',9:'9',
  10:'A',11:'B',12:'C',13:'D',14:'E',15:'F',16:'G',17:'H',
  18:'J',19:'K',20:'L',21:'M',22:'N',23:'P',24:'Q',25:'R',
  26:'S',27:'T',28:'U',29:'V',30:'W',31:'X'
};

// ── Reverse maps for decoding ──
const CHAR_TO_DIGIT = {};
for (const [digit, chars] of Object.entries(DIGIT_REPLACEMENTS)) {
  for (const ch of chars) CHAR_TO_DIGIT[ch] = digit;
}

const HOUR_REVERSE = {};
HOUR_MAP.forEach((ch, i) => HOUR_REVERSE[ch] = i);

const YEAR_REVERSE = {};
YEAR_MAP.forEach((ch, i) => YEAR_REVERSE[ch] = 2026 + i);

const MONTH_REVERSE = {};
for (const [m, chars] of Object.entries(MONTH_MAP)) {
  for (const ch of chars) MONTH_REVERSE[ch] = parseInt(m);
}

const DATE_REVERSE = {};
for (const [d, ch] of Object.entries(DATE_MAP)) {
  DATE_REVERSE[ch] = parseInt(d);
}

// ══════════════════════════════════════════════
//  ENCODING
// ══════════════════════════════════════════════
function encodeDigit(d) {
  const opts = DIGIT_REPLACEMENTS[d];
  return opts[Math.floor(Math.random() * opts.length)];
}

function encodeTime(now) {
  const sec = String(now.getSeconds()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const hr = now.getHours();
  const yr = now.getFullYear();
  const mo = now.getMonth() + 1;
  const dt = now.getDate();

  const c1 = encodeDigit(parseInt(sec[0]));
  const c2 = encodeDigit(parseInt(sec[1]));
  const c3 = encodeDigit(parseInt(min[0]));
  const c4 = encodeDigit(parseInt(min[1]));
  const c5 = HOUR_MAP[hr];

  // Year: map last 2 digits offset from 2026, cycle every 34
  const yearOffset = ((yr % 100) - 26 + 34) % 34;
  const c6 = YEAR_MAP[yearOffset];

  const moOpts = MONTH_MAP[mo];
  const c7 = moOpts[Math.floor(Math.random() * moOpts.length)];
  const c8 = DATE_MAP[dt];

  return ('GIFT-' + c1 + c2 + c3 + c4 + c5 + c6 + c7 + c8).toUpperCase();
}

// ══════════════════════════════════════════════
//  DECODING
// ══════════════════════════════════════════════
function decodeGiftCard(code) {
  if (!code || code.length !== 13 || !code.startsWith('GIFT-')) return null;
  const enc = code.substring(5);

  const s1 = CHAR_TO_DIGIT[enc[0]];
  const s2 = CHAR_TO_DIGIT[enc[1]];
  const m1 = CHAR_TO_DIGIT[enc[2]];
  const m2 = CHAR_TO_DIGIT[enc[3]];
  const hr = HOUR_REVERSE[enc[4]];
  const yr = YEAR_REVERSE[enc[5]];
  const mo = MONTH_REVERSE[enc[6]];
  const dt = DATE_REVERSE[enc[7]];

  if ([s1, s2, m1, m2, hr, yr, mo, dt].some(v => v === undefined)) return null;

  const seconds = parseInt(s1 + '' + s2);
  const minutes = parseInt(m1 + '' + m2);

  const dateStr = String(dt).padStart(2, '0') + '/' + String(mo).padStart(2, '0') + '/' + yr;
  const timeStr = String(hr).padStart(2, '0') + ':' + String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');

  return { date: dateStr, time: timeStr, year: yr, month: mo, day: dt };
}

function getDecodedTimestamp(code) {
  const decoded = decodeGiftCard(code);
  if (!decoded) return 0;
  const [day, month, year] = decoded.date.split('/').map(Number);
  const [hour, min, sec] = decoded.time.split(':').map(Number);
  return new Date(year, month - 1, day, hour, min, sec).getTime();
}

function printGeneratedCard() {
  document.body.classList.add('printing-card');
  window.print();
}

window.addEventListener('afterprint', () => {
  document.body.classList.remove('printing-card');
});

function setLedgerStatusFilter(status) {
  ledgerStatusFilter = status;
  document.getElementById('filterStatusAll').classList.toggle('active', status === 'all');
  document.getElementById('filterStatusActive').classList.toggle('active', status === 'active');
  document.getElementById('filterStatusRedeemed').classList.toggle('active', status === 'redeemed');
  entriesOffset = 0;
  document.getElementById('entriesList').innerHTML = '';
  loadEntries();
}

function handleLedgerFilters() {
  entriesOffset = 0;
  document.getElementById('entriesList').innerHTML = '';
  loadEntries();
}

// ══════════════════════════════════════════════
//  AUTO-UPDATE DATE / TIME
// ══════════════════════════════════════════════
function updateDateTime() {
  const now = new Date();
  const dateStr = String(now.getDate()).padStart(2, '0') + '/' + String(now.getMonth() + 1).padStart(2, '0') + '/' + now.getFullYear();
  const timeStr = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0') + ':' + String(now.getSeconds()).padStart(2, '0');
  const dateEl = document.getElementById('genDate');
  const timeEl = document.getElementById('genTime');
  if (dateEl) dateEl.textContent = dateStr;
  if (timeEl) timeEl.textContent = timeStr;
}
setInterval(updateDateTime, 1000);
updateDateTime();

// ══════════════════════════════════════════════
//  API HELPER
// ══════════════════════════════════════════════
async function apiCall(payload) {
  const res = await fetch(WEBAPP_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload),
    redirect: 'follow'
  });
  return res.json();
}

// ══════════════════════════════════════════════
//  TOAST
// ══════════════════════════════════════════════
function showToast(msg, type) {
  const t = document.createElement('div');
  t.className = 'toast toast-' + type;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

// ══════════════════════════════════════════════
//  CACHE MANAGEMENT
// ══════════════════════════════════════════════
async function syncCache() {
  const btn = document.getElementById('btn-sync-cache');
  if (btn) { btn.style.pointerEvents = 'none'; btn.style.opacity = '0.5'; }
  
  // Clear the cache first
  localStorage.removeItem('gsheet_cache_data');
  showToast('Clearing cache and fetching new data...', 'success');
  
  try {
    let allData = [];
    let offset = 0;
    let hasMore = true;
    
    while(hasMore) {
      const resp = await apiCall({ action: 'getAllEntries', offset: offset });
      if(resp.success) {
        if (!resp.data || resp.data.length === 0) break;
        allData = allData.concat(resp.data);
        offset += resp.data.length;
        hasMore = resp.hasMore === true || resp.hasMore === 'true';
        if (offset > 50000) break; // safeguard
      } else {
        throw new Error(resp.error || 'Fetch failed');
      }
    }
    
    localStorage.setItem('gsheet_cache_data', JSON.stringify(allData));
    showToast('Sync complete! Data cached.', 'success');
    
    // Refresh whichever page is currently active
    if (document.getElementById('section-entries').classList.contains('active')) {
      entriesOffset = 0;
      document.getElementById('entriesList').innerHTML = '';
      loadEntries();
    }
    if (document.getElementById('section-admin').classList.contains('active')) {
      loadAdminStats();
      generateAnalytics();
    }
  } catch (err) {
    showToast('Failed to sync data', 'error');
  }
  
  if (btn) { btn.style.pointerEvents = 'auto'; btn.style.opacity = '1'; }
}

// ══════════════════════════════════════════════
//  GENERATE GIFT CARD
// ══════════════════════════════════════════════
async function generateGiftCard() {
  if (generateLocked) return;

  const mobile = document.getElementById('genMobile').value.trim();
  const amount = document.getElementById('genAmount').value.trim();
  const message = document.getElementById('genMessage').value.trim() || 'Thank You, Visit Again';

  if (!/^\d{10}$/.test(mobile)) { showToast('Enter a valid 10-digit mobile number', 'error'); return; }
  if (!amount || Number(amount) <= 0) { showToast('Enter a valid amount', 'error'); return; }

  const now = new Date();
  const code = encodeTime(now);
  const dateStr = String(now.getDate()).padStart(2, '0') + '/' + String(now.getMonth() + 1).padStart(2, '0') + '/' + now.getFullYear();
  const timeStr = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0') + ':' + String(now.getSeconds()).padStart(2, '0');

  // Lock button and show loading spinner immediately
  generateLocked = true;
  const btn = document.getElementById('btnGenerate');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Generating…';

  let apiFinished = false;
  let apiSuccess = false;
  let apiError = null;

  // 1. Trigger background database save asynchronously (non-blocking)
  apiCall({ action: 'generate', mobile, code, message, amount })
    .then(resp => {
      apiFinished = true;
      if (resp.success) {
        apiSuccess = true;
        // Update local cache asynchronously
        const cachedStr = localStorage.getItem('gsheet_cache_data');
        if (cachedStr) {
          try {
            const cachedData = JSON.parse(cachedStr);
            cachedData.unshift({ code, mobile, amount, message, redeemStatus: 1 });
            localStorage.setItem('gsheet_cache_data', JSON.stringify(cachedData));
          } catch(e) {}
        }
        showToast('Gift card saved to database!', 'success');
        
        // Save complete: Re-enable the Generate button
        generateLocked = false;
        btn.disabled = false;
        btn.innerHTML = 'Generate Code';
      } else {
        apiSuccess = false;
        apiError = resp.error || 'Generation failed';
        handleGenerationFailure(apiError);
      }
    })
    .catch(err => {
      apiFinished = true;
      apiSuccess = false;
      apiError = 'Network error. Check connection.';
      handleGenerationFailure(apiError);
    });

  // 2. Open Success Popup after intentional 1 second UI delay (perceived speed increase)
  setTimeout(() => {
    // If saving failed immediately during the 1-second delay, don't show the modal
    if (apiFinished && !apiSuccess) {
      return;
    }

    // Build the success popup content
    const waLink = buildWhatsappGenerate(mobile, code, amount, dateStr, timeStr, message);
    document.getElementById('modalGenWhatsapp').href = waLink;

    const tgLink = buildTelegramGenerate(mobile, code, amount, dateStr, timeStr, message);
    document.getElementById('modalGenTelegram').href = tgLink;

    const smsLink = buildSmsGenerate(mobile, code, amount, dateStr, timeStr, message);
    document.getElementById('modalGenSms').href = smsLink;

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const cardDateStr = now.getDate() + ' ' + months[now.getMonth()] + ' ' + now.getFullYear();

    document.getElementById('modalGenCodeDisplay').textContent = code;
    document.getElementById('modalGenMsgDisplay').textContent = `"${message}"`;
    document.getElementById('modalGenPhoneDisplay').textContent = `+91 ${mobile}`;
    document.getElementById('modalGenAmountDisplay').textContent = `₹${amount}`;
    document.getElementById('modalGenDateDisplay').textContent = cardDateStr;

    // Open Modal
    document.getElementById('generateModal').classList.add('show');
    resetGenerate();

    // If backend operation is still syncing, update button text to show progress
    if (!apiFinished) {
      btn.innerHTML = '<span class="spinner"></span> Syncing to database…';
    }
  }, 1000);

  function handleGenerationFailure(errorMsg) {
    showToast(errorMsg, 'error');
    // Hide modal if shown
    document.getElementById('generateModal').classList.remove('show');
    // Unlock button to allow user to retry
    generateLocked = false;
    btn.disabled = false;
    btn.innerHTML = 'Generate Code';
  }
}

function resetGenerate() {
  document.getElementById('genMobile').value = '';
  document.getElementById('genAmount').value = '';
  document.getElementById('genMessage').value = 'Thank You, Visit Again';
  document.getElementById('genMobile').focus();
}

function closeGenerateModal() {
  document.getElementById('generateModal').classList.remove('show');
  document.body.classList.remove('printing-card');
}

// ══════════════════════════════════════════════
//  SEARCH GIFT CARD
// ══════════════════════════════════════════════
async function searchGiftCard() {
  const code = document.getElementById('searchCode').value.trim().toUpperCase();
  if (!/^GIFT-[A-Z0-9]{8}$/.test(code)) { showToast('Enter a valid code: GIFT-XXXXXXXX', 'error'); return; }

  const btn = document.getElementById('btnSearch');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Searching…';

  try {
    let d = null;
    let fromCache = false;
    const cachedStr = localStorage.getItem('gsheet_cache_data');
    if (cachedStr) {
      try {
        const cachedData = JSON.parse(cachedStr);
        d = cachedData.find(item => item.code === code);
        if (d) fromCache = true;
      } catch(e) {}
    }

    if (!fromCache) {
      const resp = await apiCall({ action: 'search', code });
      if (resp.success) {
        d = resp.data;
      } else {
        showToast(resp.error || 'Card not found', 'error');
        document.getElementById('searchResult').classList.remove('show');
        btn.disabled = false;
        btn.innerHTML = '🔍 Search';
        return;
      }
    }

    if (d) {
      const decoded = decodeGiftCard(d.code);
      const isRedeemed = (d.redeemStatus === 0 || d.redeemStatus === '0');

      document.getElementById('resCodeDisplay').textContent = d.code;
      document.getElementById('resPhoneDisplay').textContent = '+91 ' + d.mobile;
      document.getElementById('resAmountDisplay').textContent = '₹' + d.amount;
      document.getElementById('resMsgDisplay').textContent = `"${d.message}"`;
      document.getElementById('resMsgDisplay').title = d.message;

      const statusEl = document.getElementById('resStatus');
      statusEl.textContent = isRedeemed ? 'Redeemed' : 'Active ✓';
      statusEl.className = isRedeemed ? 'status-badge redeemed' : 'status-badge active';

      document.getElementById('resBalanceLabel').textContent = isRedeemed ? 'Redeemed' : 'Balance';
      document.getElementById('resDateLabel').textContent = isRedeemed ? 'Redeemed On' : 'Issued';
      
      const dateValue = isRedeemed && d.redeemDate ? formatCardDate(d.redeemDate) : (decoded ? formatCardDate(decoded.date) : '—');
      document.getElementById('resDateDisplay').textContent = dateValue;

      // Redeem actions
      if (isRedeemed) {
        document.getElementById('btnRedeem').style.display = 'none';
      } else {
        const btnRedeem = document.getElementById('btnRedeem');
        btnRedeem.style.display = '';
        btnRedeem.setAttribute('data-code', d.code);
        btnRedeem.setAttribute('data-mobile', d.mobile);
        btnRedeem.setAttribute('data-amount', d.amount);
        btnRedeem.setAttribute('data-message', d.message);
        if (redeemLocked) {
          btnRedeem.disabled = true;
          btnRedeem.innerHTML = '<span class="spinner"></span> Syncing to database…';
        } else {
          btnRedeem.disabled = false;
          btnRedeem.innerHTML = '✅ Redeem Card';
        }
      }

      document.getElementById('searchResult').classList.add('show');
    }
  } catch (err) {
    showToast('Network error. Check connection.', 'error');
  }

  btn.disabled = false;
  btn.innerHTML = '🔍 Search';
}

function resetSearch() {
  document.getElementById('searchResult').classList.remove('show');
  document.getElementById('searchCode').value = 'GIFT-';
  document.getElementById('searchCode').focus();
}

function closeRedeemModal() {
  document.getElementById('redeemModal').classList.remove('show');
  resetSearch();
}

// ══════════════════════════════════════════════
//  REDEEM GIFT CARD
// ══════════════════════════════════════════════
async function redeemGiftCard() {
  if (redeemLocked) return;

  const btn = document.getElementById('btnRedeem');
  const code = btn.getAttribute('data-code') || document.getElementById('searchCode').value.trim().toUpperCase();

  redeemLocked = true;
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Redeeming…';

  let apiFinished = false;
  let apiSuccess = false;
  let apiError = null;

  // 1. Trigger background database redeem asynchronously (non-blocking)
  apiCall({ action: 'redeem', code })
    .then(resp => {
      apiFinished = true;
      if (resp.success) {
        apiSuccess = true;
        // Update local cache asynchronously
        const cachedStr = localStorage.getItem('gsheet_cache_data');
        if (cachedStr) {
          try {
            const cachedData = JSON.parse(cachedStr);
            const item = cachedData.find(i => i.code === code);
            if (item) {
              item.redeemStatus = 0;
              item.redeemDate = new Date().toLocaleDateString('en-GB'); // DD/MM/YYYY
              localStorage.setItem('gsheet_cache_data', JSON.stringify(cachedData));
            }
          } catch(e) {}
        }
        showToast('Redemption saved to database!', 'success');
        
        // Sync complete: Re-enable the Redeem button
        redeemLocked = false;
        btn.disabled = false;
        btn.innerHTML = '✅ Redeem Card';
      } else {
        apiSuccess = false;
        apiError = resp.error || 'Redeem failed';
        handleRedeemFailure(apiError);
      }
    })
    .catch(err => {
      apiFinished = true;
      apiSuccess = false;
      apiError = 'Network error. Check connection.';
      handleRedeemFailure(apiError);
    });

  // 2. Open Success Popup after intentional 0.5 second UI delay
  setTimeout(() => {
    // If redeeming failed immediately during the 0.5-second delay, don't show the modal
    if (apiFinished && !apiSuccess) {
      return;
    }

    showToast('Gift card redeemed successfully!', 'success');
    const statusEl = document.getElementById('resStatus');
    statusEl.textContent = 'Redeemed';
    statusEl.className = 'status-badge redeemed';
    document.getElementById('resBalanceLabel').textContent = 'Redeemed';
    document.getElementById('resDateLabel').textContent = 'Redeemed On';
    document.getElementById('resDateDisplay').textContent = formatCardDate(new Date().toISOString());
    btn.style.display = 'none';

    // Open Modal and populate links
    const mobile = btn.getAttribute('data-mobile');
    const amount = btn.getAttribute('data-amount');
    const message = btn.getAttribute('data-message');

    document.getElementById('modalWhatsapp').href = buildWhatsappRedeem(mobile, code, amount, message);
    document.getElementById('modalTelegram').href = buildTelegramRedeem(mobile, code, amount, message);
    document.getElementById('modalSms').href = buildSmsRedeem(mobile, code, amount, message);
    
    document.getElementById('redeemModal').classList.add('show');
  }, 500);

  function handleRedeemFailure(errorMsg) {
    showToast(errorMsg, 'error');
    // Hide modal if shown
    document.getElementById('redeemModal').classList.remove('show');
    // Unlock button to allow user to retry
    redeemLocked = false;
    btn.disabled = false;
    btn.innerHTML = '✅ Redeem Card';

    // If the user is still viewing the same card, restore active state in the UI
    if (document.getElementById('resCodeDisplay').textContent === code) {
      const statusEl = document.getElementById('resStatus');
      statusEl.textContent = 'Active ✓';
      statusEl.className = 'status-badge active';
      document.getElementById('resBalanceLabel').textContent = 'Balance';
      document.getElementById('resDateLabel').textContent = 'Issued';
      const decoded = decodeGiftCard(code);
      document.getElementById('resDateDisplay').textContent = decoded ? formatCardDate(decoded.date) : '—';
      btn.style.display = '';
    }
  }
}

// Helper to format date string to "17 May 2025" style
function formatCardDate(dateStr) {
  if (!dateStr || dateStr === '—') return '—';
  const clean = dateStr.split(' ')[0];
  const parts = clean.split('/');
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const monthIdx = parseInt(parts[1], 10) - 1;
    const year = parts[2];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    if (months[monthIdx]) {
      return `${day} ${months[monthIdx]} ${year}`;
    }
  }
  return dateStr;
}

// ══════════════════════════════════════════════
//  ALL ENTRIES
// ══════════════════════════════════════════════
async function loadEntries() {
  const btn = document.getElementById('btnLoadMore');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Loading…';

  try {
    let dataToDisplay = [];
    let hasMore = false;
    let fromCache = false;

    const cachedStr = localStorage.getItem('gsheet_cache_data');
    if (cachedStr) {
      try {
        let cachedData = JSON.parse(cachedStr);
        fromCache = true;

        // 1. Filter by Status
        cachedData = cachedData.filter(item => {
          const isRedeemed = (item.redeemStatus === 0 || item.redeemStatus === '0');
          if (ledgerStatusFilter === 'active') {
            return !isRedeemed;
          } else if (ledgerStatusFilter === 'redeemed') {
            return isRedeemed;
          }
          return true;
        });

        // 2. Filter by Search Query
        const searchText = (document.getElementById('ledgerSearchInput')?.value || '').toLowerCase().trim();
        if (searchText) {
          cachedData = cachedData.filter(item => {
            const codeMatch = item.code ? item.code.toLowerCase().includes(searchText) : false;
            const mobileMatch = item.mobile ? String(item.mobile).toLowerCase().includes(searchText) : false;
            const amountMatch = item.amount ? String(item.amount).toLowerCase().includes(searchText) : false;
            return codeMatch || mobileMatch || amountMatch;
          });
        }

        // 3. Sort
        const sortOption = document.getElementById('ledgerSortSelect')?.value || 'date_newest';
        cachedData.sort((a, b) => {
          if (sortOption.startsWith('amount_')) {
            const amtA = parseFloat(a.amount) || 0;
            const amtB = parseFloat(b.amount) || 0;
            return sortOption === 'amount_highest' ? amtB - amtA : amtA - amtB;
          } else {
            const timeA = getDecodedTimestamp(a.code);
            const timeB = getDecodedTimestamp(b.code);
            return sortOption === 'date_newest' ? timeB - timeA : timeA - timeB;
          }
        });

        // 4. Paginate
        const pageSize = 50;
        dataToDisplay = cachedData.slice(entriesOffset, entriesOffset + pageSize);
        hasMore = (entriesOffset + pageSize) < cachedData.length;
      } catch(e) {
        console.error(e);
      }
    }

    if (!fromCache) {
      const resp = await apiCall({ action: 'getAllEntries', offset: entriesOffset });
      if (resp.success) {
        dataToDisplay = resp.data;
        hasMore = resp.hasMore;
      } else {
        throw new Error('Failed to load');
      }
    }

    const list = document.getElementById('entriesList');
    if (dataToDisplay.length === 0 && entriesOffset === 0) {
      document.getElementById('entriesEmpty').style.display = '';
      if (!cachedStr) {
        document.getElementById('entriesEmpty').querySelector('p').textContent = 'No cached data. Please click the Sync Cache button at the top of the page first!';
      } else {
        document.getElementById('entriesEmpty').querySelector('p').textContent = 'No records found matching filters';
      }
      document.getElementById('loadMoreWrap').style.display = 'none';
      btn.disabled = false;
      btn.innerHTML = 'Load More';
      return;
    }
    document.getElementById('entriesEmpty').style.display = 'none';

    dataToDisplay.forEach(entry => {
      const decoded = decodeGiftCard(entry.code);
      const isRedeemed = (entry.redeemStatus === 0 || entry.redeemStatus === '0');
      const card = document.createElement('div');
      card.className = 'gift-card-demo';
      
      const statusText = isRedeemed ? 'Redeemed' : 'Active ✓';
      const statusClass = isRedeemed ? 'status-badge redeemed' : 'status-badge active';
      const balanceLabel = isRedeemed ? 'Redeemed' : 'Balance';
      const dateLabel = isRedeemed ? 'Redeemed On' : 'Issued';
      const dateValue = isRedeemed && entry.redeemDate ? formatCardDate(entry.redeemDate) : (decoded ? formatCardDate(decoded.date) : '—');
      
      card.innerHTML = `
        <div class="gift-card-header">
          <div>
            <div class="brand-title">Krishna Book Store</div>
            <div class="card-type">Gift Card</div>
          </div>
          <div class="${statusClass}">${statusText}</div>
        </div>
        
        <div class="gift-card-code-wrap">
          <div class="gift-card-code">${entry.code}</div>
          <button class="btn-icon-only copy-btn" onclick="copyText('${entry.code}')" title="Copy Code">
            <span class="material-icons-round">content_copy</span>
          </button>
        </div>
        
        <div class="gift-card-meta-ribbon">
          <div class="gift-card-msg" title="${entry.message}">"${entry.message}"</div>
          <div class="gift-card-phone">+91 ${entry.mobile}</div>
        </div>
        
        <div class="gift-card-footer">
          <div>
            <div class="gift-card-label">${balanceLabel}</div>
            <div class="gift-card-amount">₹${entry.amount}</div>
          </div>
          <div>
            <div class="gift-card-label">${dateLabel}</div>
            <div class="gift-card-date">${dateValue}</div>
          </div>
        </div>
      `;
      list.appendChild(card);
    });

    entriesOffset += dataToDisplay.length;
    document.getElementById('loadMoreWrap').style.display = hasMore ? '' : 'none';
  } catch (err) {
    showToast('Failed to load entries', 'error');
  }

  btn.disabled = false;
  btn.innerHTML = 'Load More';
}

function loadMoreEntries() {
  loadEntries();
}

// ══════════════════════════════════════════════
//  ADMIN STATS (from cache)
// ══════════════════════════════════════════════
function loadAdminStats() {
  const cacheStr = localStorage.getItem('gsheet_cache_data');
  if (!cacheStr) {
    showToast('No cached data. Please tap Sync Cache first!', 'error');
    return;
  }

  try {
    const cache = JSON.parse(cacheStr);
    if (cache.length === 0) {
      showToast('Cache is empty. Please Sync Cache.', 'error');
      return;
    }

    // Unique customers by mobile
    const uniqueMobiles = new Set(cache.map(e => e.mobile));
    document.getElementById('statCustomers').textContent = uniqueMobiles.size;

    // Total amount issued
    const totalIssued = cache.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
    document.getElementById('statTotalAmount').textContent = '₹' + totalIssued.toLocaleString('en-IN');

    // Today's entries & amount
    const today = new Date();
    const todayStr = String(today.getDate()).padStart(2, '0') + '/' + String(today.getMonth() + 1).padStart(2, '0') + '/' + today.getFullYear();
    let todayEntries = 0;
    let todayAmount = 0;
    cache.forEach(e => {
      const decoded = decodeGiftCard(e.code);
      if (decoded && decoded.date === todayStr) {
        todayEntries++;
        todayAmount += parseFloat(e.amount) || 0;
      }
    });
    document.getElementById('statTodayEntries').textContent = todayEntries;
    document.getElementById('statTodayAmount').textContent = '₹' + todayAmount.toLocaleString('en-IN');

    // Average billing
    const avgBilling = cache.length > 0 ? Math.round(totalIssued / cache.length) : 0;
    document.getElementById('statAvgBilling').textContent = '₹' + avgBilling.toLocaleString('en-IN');

    // Claimed (redeemed) amount
    const claimed = cache
      .filter(e => e.redeemStatus === 0 || e.redeemStatus === '0')
      .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
    document.getElementById('statClaimed').textContent = '₹' + claimed.toLocaleString('en-IN');

    // Profit (remaining = issued - claimed)
    const remaining = totalIssued - claimed;
    document.getElementById('statRemaining').textContent = '₹' + remaining.toLocaleString('en-IN');

    // Conversion KPI
    const redeemedCount = cache.filter(e => e.redeemStatus === 0 || e.redeemStatus === '0').length;
    const conv = cache.length > 0 ? ((redeemedCount / cache.length) * 100).toFixed(1) : '0.0';
    document.getElementById('statConversion').textContent = conv + '%';

  } catch (err) {
    showToast('Error reading cache data', 'error');
  }
}

// ══════════════════════════════════════════════
//  ADVANCED ANALYTICS
// ══════════════════════════════════════════════
let heatmapChartInst = null;
let returnChartInst = null;
let segmentChartInst = null;
let currentHeatmapMetric = 'issued';
let cachedAnalyticsData = null;

// calculateAdminPage removed — admin now uses Sync Cache button

function parseDateStr(str) {
  if(!str) return null;
  const parts = str.split('/');
  if(parts.length !== 3) return null;
  return new Date(parts[2], parseInt(parts[1])-1, parts[0]);
}

function generateAnalytics() {
  const cacheStr = localStorage.getItem('gsheet_cache_data');
  if (!cacheStr) {
    showToast('Please Sync Cache first!', 'error');
    return;
  }
  
  const cache = JSON.parse(cacheStr);
  if (cache.length === 0) {
    showToast('No data to analyze', 'error');
    return;
  }
  
  cachedAnalyticsData = cache;
  
  renderHeatmap();
  renderReturnAnalysis(cache);
  renderSegmentation(cache);
  renderLoyalists(cache);
}

function toggleHeatmap(metric) {
  currentHeatmapMetric = metric;
  document.getElementById('btnToggleIssued').classList.remove('active');
  document.getElementById('btnToggleRedeemed').classList.remove('active');
  if(metric === 'issued') document.getElementById('btnToggleIssued').classList.add('active');
  else document.getElementById('btnToggleRedeemed').classList.add('active');
  
  if (cachedAnalyticsData) {
    renderHeatmap();
  }
}

function renderHeatmap() {
  const data = cachedAnalyticsData || [];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  const matrix = Array.from({length: 12}, () => Array(31).fill(0));
  const now = new Date();
  
  data.forEach(entry => {
    let d = null;
    if (currentHeatmapMetric === 'issued') {
      const decoded = decodeGiftCard(entry.code);
      if (decoded) d = parseDateStr(decoded.date);
    } else {
      if ((entry.redeemStatus === 0 || entry.redeemStatus === '0') && entry.redeemDate) {
        d = parseDateStr(entry.redeemDate);
      }
    }
    
    if (d) {
      const diffMonths = (now.getFullYear() - d.getFullYear()) * 12 + now.getMonth() - d.getMonth();
      if (diffMonths >= 0 && diffMonths < 12) {
        const m = d.getMonth();
        const day = d.getDate() - 1;
        matrix[m][day] += parseFloat(entry.amount) || 0;
      }
    }
  });

  const series = [];
  for (let m = 0; m < 12; m++) {
    const daysData = [];
    for (let d = 0; d < 31; d++) {
      daysData.push({ x: (d+1).toString(), y: matrix[m][d] });
    }
    series.push({
      name: monthNames[m],
      data: daysData
    });
  }
  
  const isLight = document.body.classList.contains('light-mode');
  const textColor = isLight ? '#64748b' : '#94a3b8';
  const colorScale = '#8b5cf6';

  const options = {
    series: series.reverse(),
    chart: { 
      height: 300, 
      type: 'heatmap', 
      toolbar: { show: false }, 
      background: 'transparent',
      animations: { enabled: false }
    },
    dataLabels: { enabled: false },
    theme: { mode: isLight ? 'light' : 'dark' },
    colors: [colorScale],
    xaxis: { labels: { style: { colors: textColor } } },
    yaxis: { labels: { style: { colors: textColor } } }
  };
  
  if (heatmapChartInst) heatmapChartInst.destroy();
  heatmapChartInst = new ApexCharts(document.querySelector("#heatmapChart"), options);
  heatmapChartInst.render();
}

function renderReturnAnalysis(cache) {
  const counts = { 'Same Day': 0, '1-3 Days': 0, '4-7 Days': 0, '8-14 Days': 0, '15+ Days': 0 };
  
  cache.forEach(entry => {
    if ((entry.redeemStatus === 0 || entry.redeemStatus === '0') && entry.redeemDate) {
      const decoded = decodeGiftCard(entry.code);
      if (decoded && decoded.date) {
        const issueD = parseDateStr(decoded.date);
        const redeemD = parseDateStr(entry.redeemDate);
        if (issueD && redeemD) {
          const diffTime = Math.abs(redeemD - issueD);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          if (diffDays === 0) counts['Same Day']++;
          else if (diffDays <= 3) counts['1-3 Days']++;
          else if (diffDays <= 7) counts['4-7 Days']++;
          else if (diffDays <= 14) counts['8-14 Days']++;
          else counts['15+ Days']++;
        }
      }
    }
  });

  const isLight = document.body.classList.contains('light-mode');
  const textColor = isLight ? '#64748b' : '#94a3b8';

  const options = {
    series: [{ name: 'Redemptions', data: Object.values(counts) }],
    chart: { type: 'bar', height: 280, toolbar: { show: false }, background: 'transparent' },
    theme: { mode: isLight ? 'light' : 'dark' },
    plotOptions: { bar: { borderRadius: 4, horizontal: false } },
    colors: ['#8b5cf6'],
    dataLabels: { enabled: true, style: { colors: ['#fff'] } },
    xaxis: { categories: Object.keys(counts), labels: { style: { colors: textColor } } },
    yaxis: { labels: { style: { colors: textColor } } }
  };

  if (returnChartInst) returnChartInst.destroy();
  returnChartInst = new ApexCharts(document.querySelector("#returnChart"), options);
  returnChartInst.render();
}

function renderSegmentation(cache) {
  const mobCounts = {};
  cache.forEach(c => {
    mobCounts[c.mobile] = (mobCounts[c.mobile] || 0) + 1;
  });
  
  let newCust = 0;
  let repeatCust = 0;
  Object.values(mobCounts).forEach(count => {
    if (count === 1) newCust++;
    else repeatCust++;
  });

  const isLight = document.body.classList.contains('light-mode');
  const textColor = isLight ? '#64748b' : '#94a3b8';

  const options = {
    series: [newCust, repeatCust],
    labels: ['New Customers', 'Repeat Customers'],
    chart: { type: 'pie', height: 280, background: 'transparent' },
    theme: { mode: isLight ? 'light' : 'dark' },
    colors: ['#10b981', '#8b5cf6'],
    legend: { position: 'bottom', labels: { colors: textColor } },
    stroke: { show: false }
  };

  if (segmentChartInst) segmentChartInst.destroy();
  segmentChartInst = new ApexCharts(document.querySelector("#segmentChart"), options);
  segmentChartInst.render();
}

function renderLoyalists(cache) {
  const mobCounts = {};
  cache.forEach(c => {
    mobCounts[c.mobile] = (mobCounts[c.mobile] || 0) + 1;
  });
  
  const sorted = Object.entries(mobCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
    
  const list = document.getElementById('loyalistsList');
  if (sorted.length === 0) {
    list.innerHTML = '<div class="empty-state"><p>No loyalists found.</p></div>';
    return;
  }
  
  list.innerHTML = '';
  sorted.forEach((item, index) => {
    const rank = index + 1;
    const rankDisplay = rank === 1 ? '👑' : '#' + rank;
    list.innerHTML += `
      <div class="loyalist-item">
        <div class="loyalist-rank">${rankDisplay}</div>
        <div class="loyalist-mobile">${item[0]}</div>
        <div class="loyalist-count">${item[1]} Entries</div>
      </div>
    `;
  });
}

// ══════════════════════════════════════════════
//  WHATSAPP & SMS TEMPLATES (Hardcoded)
// ══════════════════════════════════════════════

// -- Generating --
function buildWhatsappGenerate(number, code, amount, date, time, message) {
  const template = `https://api.whatsapp.com/send?phone=91<number>&text=%2AKrishna%20Book%20Centre%2A%F0%9F%93%9A%F0%9F%8E%92%F0%9F%96%8A%EF%B8%8F%0A%0A%23%E2%83%A3%20Gift%20Card%20Code%20%3A%20%3Ccode%3E%0A%F0%9F%92%B0%C2%A0Gift%20Card%20Amount%20%3A%20%E2%82%B9%3Camount%3E%0A%F0%9F%97%93%EF%B8%8F%20Date%20%3A%20%3Cdate%3E%0A%E2%8F%B0%20Time%20%3A%20%3Ctime%3E%0A%E2%9C%89%EF%B8%8F%20%3Cmessage%3E%0A%0A%E2%9D%A4%EF%B8%8F%20Instapage%20%3A%20https%3A%2F%2Finstagram.com%2Fkrishnabookcentre%0A%E2%98%8E%EF%B8%8F%20Phone%20No%3A%20%2B919827640600`;
  return template
    .replace('<number>', encodeURIComponent(number))
    .replace('%3Ccode%3E', encodeURIComponent(code))
    .replace('%3Camount%3E', encodeURIComponent(amount))
    .replace('%3Cdate%3E', encodeURIComponent(date))
    .replace('%3Ctime%3E', encodeURIComponent(time))
    .replace('%3Cmessage%3E', encodeURIComponent(message));
}

function buildSmsGenerate(number, code, amount, date, time, message) {
  const template = `sms:+91<number>?&body=Krishna%20Book%20Centre%F0%9F%93%9A%F0%9F%8E%92%F0%9F%96%8A%0A%23%23%23%20Gift%20Card%20Code%20%3A%20%3Ccode%3E%0A%F0%9F%92%B0%20Gift%20Card%20Amount%20%3A%20%3Camount%3E%0A%F0%9F%97%93%20Date%20%3A%20%3Cdate%3E%0A%EF%B8%8F%20Time%20%3A%20%3Ctime%3E%0A%E2%9C%89%EF%B8%8F%20%3Cmessage%3E%0A%0A%E2%9D%A4%EF%B8%8F%20Instapage%20%3A%20https%3A%2F%2Finstagram.com%2Fkrishnabookcentre%0A%E2%98%9E%EF%B8%8F%20Phone%20No%3A%20%2B919827640600`;
  return template
    .replace('<number>', encodeURIComponent(number))
    .replace('%3Ccode%3E', encodeURIComponent(code))
    .replace('%3Camount%3E', encodeURIComponent(amount))
    .replace('%3Cdate%3E', encodeURIComponent(date))
    .replace('%3Ctime%3E', encodeURIComponent(time))
    .replace('%3Cmessage%3E', encodeURIComponent(message));
}

function buildTelegramGenerate(number, code, amount, date, time, message) {
  const template = `https://t.me/+91<number>?text=%2AKrishna%20Book%20Centre%2A%F0%9F%93%9A%F0%9F%8E%92%F0%9F%96%8A%EF%B8%8F%0A%0A%23%E2%83%A3%20Gift%20Card%20Code%20%3A%20%3Ccode%3E%0A%F0%9F%92%B0%C2%A0Gift%20Card%20Amount%20%3A%20%E2%82%B9%3Camount%3E%0A%F0%9F%97%93%EF%B8%8F%20Date%20%3A%20%3Cdate%3E%0A%E2%8F%B0%20Time%20%3A%20%3Ctime%3E%0A%E2%9C%89%EF%B8%8F%20%3Cmessage%3E%0A%0A%E2%9D%A4%EF%B8%8F%20Instapage%20%3A%20https%3A%2F%2Finstagram.com%2Fkrishnabookcentre%0A%E2%98%8E%EF%B8%8F%20Phone%20No%3A%20%2B919827640600`;
  return template
    .replace('<number>', encodeURIComponent(number))
    .replace('%3Ccode%3E', encodeURIComponent(code))
    .replace('%3Camount%3E', encodeURIComponent(amount))
    .replace('%3Cdate%3E', encodeURIComponent(date))
    .replace('%3Ctime%3E', encodeURIComponent(time))
    .replace('%3Cmessage%3E', encodeURIComponent(message));
}

// -- Redeeming --
function buildWhatsappRedeem(number, code, amount, message) {
  const template = `https://api.whatsapp.com/send?phone=91<number>&text=%2AKrishna%20Book%20Centre%2A%F0%9F%93%9A%F0%9F%8E%92%F0%9F%96%8A%EF%B8%8F%0A%0A%23%E2%83%A3%20Your%20Gift%20card%20%3Ccode%3E%20has%20been%20Successfully%20Redeemed%0A%F0%9F%92%B0%C2%A0Gift%20Card%20Amount%20%3A%20%E2%82%B9%3Camount%3E%0A%E2%9C%89%EF%B8%8F%20%3Cmessage%3E%0A%0A%E2%9D%A4%EF%B8%8F%20Instapage%20%3A%20https%3A%2F%2Finstagram.com%2Fkrishnabookcentre%0A%E2%98%8E%EF%B8%8F%20Phone%20No%3A%20%2B919827640600`;
  return template
    .replace('<number>', encodeURIComponent(number))
    .replace('%3Ccode%3E', encodeURIComponent(code))
    .replace('%3Camount%3E', encodeURIComponent(amount))
    .replace('%3Cmessage%3E', encodeURIComponent(message));
}

function buildSmsRedeem(number, code, amount, message) {
  const template = `sms:+91<number>?&body=Krishna%20Book%20Centre%F0%9F%93%9A%F0%9F%8E%92%F0%9F%96%8A%0A%23%23%23%20Your%20Gift%20card%20%3Ccode%3E%20has%20been%20Successfully%20Redeemed%0A%F0%9F%92%B0%20Gift%20Card%20Amount%20%3A%20%3Camount%3E%0A%E2%9C%89%EF%B8%8F%20%3Cmessage%3E%0A%0A%E2%9D%A4%EF%B8%8F%20Instapage%20%3A%20https%3A%2F%2Finstagram.com%2Fkrishnabookcentre%0A%E2%98%9E%EF%B8%8F%20Phone%20No%3A%20%2B919827640600`;
  return template
    .replace('<number>', encodeURIComponent(number))
    .replace('%3Ccode%3E', encodeURIComponent(code))
    .replace('%3Camount%3E', encodeURIComponent(amount))
    .replace('%3Cmessage%3E', encodeURIComponent(message));
}

function buildTelegramRedeem(number, code, amount, message) {
  const template = `https://t.me/+91<number>?text=%2AKrishna%20Book%20Centre%2A%F0%9F%93%9A%F0%9F%8E%92%F0%9F%96%8A%EF%B8%8F%0A%0A%23%E2%83%A3%20Your%20Gift%20card%20%3Ccode%3E%20has%20been%20Successfully%20Redeemed%0A%F0%9F%92%B0%C2%A0Gift%20Card%20Amount%20%3A%20%E2%82%B9%3Camount%3E%0A%E2%9C%89%EF%B8%8F%20%3Cmessage%3E%0A%0A%E2%9D%A4%EF%B8%8F%20Instapage%20%3A%20https%3A%2F%2Finstagram.com%2Fkrishnabookcentre%0A%E2%98%8E%EF%B8%8F%20Phone%20No%3A%20%2B919827640600`;
  return template
    .replace('<number>', encodeURIComponent(number))
    .replace('%3Ccode%3E', encodeURIComponent(code))
    .replace('%3Camount%3E', encodeURIComponent(amount))
    .replace('%3Cmessage%3E', encodeURIComponent(message));
}
