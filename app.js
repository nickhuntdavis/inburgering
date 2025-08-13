/* KNM Flashcards - Minimal yet engaging trainer
   Features: flip, keyboard controls, TTS, mark known, filters, shuffle, progress, light confetti
*/

(function(){
  const STORAGE_KEYS = {
    known: 'knm_known_cards_v1',
    hard: 'knm_hard_cards_v1',
    lastCategory: 'knm_last_category_v1',
    lastFilter: 'knm_last_filter_v1',
    order: 'knm_card_order_v1'
  };

  // Global card data - will be populated from descriptions.json
  let ALL_CARDS = [];
  
  // Elements
  const categoryMulti = document.getElementById('categoryMulti');
  const categoryDropdown = document.getElementById('categoryDropdown');
  const categoryDropdownToggle = document.getElementById('categoryDropdownToggle');
  const knownFilterSelect = document.getElementById('knownFilterSelect');
  const shuffleBtn = document.getElementById('shuffleBtn');
  const resetKnownBtn = document.getElementById('resetKnownBtn');

  const cardEl = document.getElementById('card');
  const cardInner = document.getElementById('cardInner');
  const termEl = document.getElementById('term');
  const defEl = document.getElementById('definition');
  const contextHintEl = document.getElementById('contextHint');
  const categoryChip = document.getElementById('categoryChip');
  const subcategoryChip = document.getElementById('subcategoryChip');

  const againBtn = document.getElementById('againBtn');
  const hardBtn = document.getElementById('hardBtn');
  const goodBtn = document.getElementById('goodBtn');
  const unmarkBtn = document.getElementById('unmarkBtn');
  const nextBtn = document.getElementById('nextBtn');
  const flipBtn = document.getElementById('flipBtn');
  const speakBtn = document.getElementById('speakBtn');
  const skipBtnTop = document.getElementById('skipBtnTop');

  const progressFill = document.getElementById('progressFill');
  const countRemaining = document.getElementById('countRemaining');
  const countKnown = document.getElementById('countKnown');
  const countTotal = document.getElementById('countTotal');
  const categoryStatsEl = document.getElementById('categoryStats');
  const countRemainingCat = document.getElementById('countRemainingCat');
  const countKnownCat = document.getElementById('countKnownCat');
  const countTotalCat = document.getElementById('countTotalCat');

  const avatarImg = document.getElementById('avatarImg');
  const avatarCaption = document.getElementById('avatarCaption');
  const milestoneToast = document.getElementById('milestoneToast');
  const modeToggle = document.getElementById('modeToggle');
  const flagBtn = document.getElementById('flagBtn');
  const suggestModal = document.getElementById('suggestModal');
  const sugSlug = document.getElementById('sugSlug');
  const sugFront = document.getElementById('sugFront');
  const sugBack = document.getElementById('sugBack');
  const sugDesc = document.getElementById('sugDesc');
  const sugName = document.getElementById('sugName');
  const sugNotes = document.getElementById('sugNotes');
  const suggestSubmit = document.getElementById('suggestSubmit');
  const suggestCancel = document.getElementById('suggestCancel');
  const suggestClose = document.getElementById('suggestClose');

  const confettiCanvas = document.getElementById('confettiCanvas');
  const ctx = confettiCanvas.getContext('2d');
  let confettiAnimationId = null;
  let confettiTimeoutId = null;

  // Bonus card state
  function randInt(min, max){ return Math.floor(Math.random()*(max-min+1))+min; }
  const BONUS_TEMPLATES = [
    'Time for a tiny break: stand up and stretch your arms. ✨',
    'Hydration check: take a sip of water. 💧',
    'Nice pace! You’ve learnt {known}/{total} terms so far. 🙌',
    'Roll your shoulders, unclench your jaw, breathe in… and out. 😌',
    'Two minutes of movement beats none. 10 jumping jacks? 🏃',
    'Eyes off screen: look at something far away for 20 seconds. 👀',
    'Mini reward: think of one thing you’re doing well. You got this. 💪',
    'Quick reset: tidy your desk space for 30 seconds. 🌿',
    'Posture check: sit tall, relax the neck. 🧘',
    'You already marked {known} as known. That’s progress! 🎉',
    'Snack idea: a handful of nuts or fruit for brain fuel. 🍎',
    'Micro-challenge: can you recall the last 3 terms without looking?',
    'Walk to the window and take one deep breath of fresh air. 🌬️',
    'Noise check: lower distractions for 10 minutes, then reward. 🎧',
    'High five! You’re showing up. That’s the hardest part. 🙏',
    // More variety
    'Mini game: find 3 blue items in the room in 10 seconds. 💙',
    'Stretch: neck circles, then wrist rolls. 20 seconds total. 🔄',
    'Breathing: inhale 4, hold 4, exhale 4 — twice. 🫁',
    'Music moment: queue your favorite focus track for later. 🎵',
    'Reward idea: after 10 cards, make tea or coffee. ☕',
    'Nature glance: look outside and name one detail you hadn’t noticed. 🌳',
    'Micro-mobility: stand up and sway side to side for 20 seconds. 🕺',
    'Smile break: smile intentionally for 5 seconds; it helps mood. 🙂'
  ];
  function resizeCanvas(){
    const stage = document.querySelector('.stage');
    if(!stage) return;
    const rect = stage.getBoundingClientRect();
    confettiCanvas.width = rect.width;
    confettiCanvas.height = rect.height;
    confettiCanvas.style.width = rect.width + 'px';
    confettiCanvas.style.height = rect.height + 'px';
  }
  window.addEventListener('resize', resizeCanvas);
  setTimeout(resizeCanvas, 0);

  // Restore saved categories (backward compatible with single string)
  const savedCatRaw = localStorage.getItem(STORAGE_KEYS.lastCategory);
  let savedCategorySet = new Set();
  try{
    if(savedCatRaw){
      const trimmed = String(savedCatRaw).trim();
      if(trimmed.startsWith('[')){
        JSON.parse(trimmed).forEach(c=> savedCategorySet.add(c));
      } else if(trimmed && trimmed !== 'All'){
        savedCategorySet.add(trimmed);
      }
    }
  }catch{}

  const state = {
    order: [], // array of card ids in current order
    idx: 0,
    knownSet: new Set(JSON.parse(localStorage.getItem(STORAGE_KEYS.known) || '[]')),
    hardSet: new Set(JSON.parse(localStorage.getItem(STORAGE_KEYS.hard) || '[]')),
    skipSet: new Set(JSON.parse(localStorage.getItem('knm_skip_cards_v1') || '[]')),
    categorySet: savedCategorySet, // empty = All categories
    category: 'All', // legacy field, unused but kept for safety
    filter: localStorage.getItem(STORAGE_KEYS.lastFilter) || 'unknown',
    // bonus scheduling
    stepsSinceBonus: 0,
    stepsUntilBonus: randInt(18, 30),
    bonusActive: false,
    bonusCard: null,
  };

  // Build categories
  function uniqueCategories(){
    const cats = new Set(ALL_CARDS.map(c=>c.category));
    return Array.from(cats);
  }

  function populateCategorySelect(){
    const cats = uniqueCategories();
    categoryDropdown.innerHTML = '';
    const selected = state.categorySet || new Set();
    for(const c of cats){
      const row = document.createElement('div');
      row.className = 'option-row';
      const id = 'cat_'+c.replace(/[^a-z0-9]+/gi,'_');
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.id = id;
      cb.value = c;
      cb.checked = selected.size===0 ? true : selected.has(c);
      const label = document.createElement('label');
      label.htmlFor = id;
      label.textContent = c;
      row.appendChild(cb); row.appendChild(label);
      categoryDropdown.appendChild(row);
    }
    updateCategoryToggleText();
  }

  function updateCategoryToggleText(){
    const cats = uniqueCategories();
    if(state.categorySet && state.categorySet.size>0){
      const count = state.categorySet.size;
      categoryDropdownToggle.textContent = `${count} selected`;
    } else {
      categoryDropdownToggle.textContent = 'All categories';
    }
  }

  // Build working deck based on filters
  function getFilteredCards(){
    let cards = ALL_CARDS;
    const basicCategoryNames = new Set(['Basic vocabulary','Basic Vocabulary','basic vocabulary']);
    if(!state.categorySet || state.categorySet.size === 0){
      cards = cards.filter(c=> !basicCategoryNames.has(String(c.category)));
    }
    if(state.categorySet && state.categorySet.size > 0){
      cards = cards.filter(c=> state.categorySet.has(c.category));
    }
    // Globally remove skipped
    cards = cards.filter(c=>!state.skipSet.has(c.id));
    if(state.filter === 'unknown') cards = cards.filter(c=>!state.knownSet.has(c.id));
    if(state.filter === 'known') cards = cards.filter(c=>state.knownSet.has(c.id));
    if(state.filter === 'hard') cards = cards.filter(c=>state.hardSet.has(c.id));
    return cards;
  }

  function restoreOrBuildOrder(cards){
    // If saved order belongs to same set, reuse; else shuffle
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEYS.order) || '[]');
    const setIds = new Set(cards.map(c=>c.id));
    const same = saved.length === cards.length && saved.every(id=>setIds.has(id));
    if(same){
      return saved;
    } else {
      const shuffled = [...cards.map(c=>c.id)];
      for(let i=shuffled.length-1;i>0;i--){
        const j = Math.floor(Math.random()*(i+1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      localStorage.setItem(STORAGE_KEYS.order, JSON.stringify(shuffled));
      return shuffled;
    }
  }

  function saveOrder(){
    localStorage.setItem(STORAGE_KEYS.order, JSON.stringify(state.order));
  }

  function computeProgress(){
    // Overall persistent progress, independent of current filter
    const totalCards = ALL_CARDS.length;
    const totalKnownOverall = ALL_CARDS.filter(c=>state.knownSet.has(c.id)).length;
    const totalRemaining = totalCards - totalKnownOverall;
    countKnown.textContent = String(totalKnownOverall);
    countTotal.textContent = String(totalCards);
    countRemaining.textContent = String(totalRemaining);
    const overallPct = totalCards === 0 ? 0 : (totalKnownOverall / totalCards);

    // Keep avatar in sync with overall progress
    updateAvatar(overallPct);

    // Per-category stats (for current selection)
    let scope = ALL_CARDS;
    if(state.categorySet && state.categorySet.size > 0){
      scope = ALL_CARDS.filter(c=> state.categorySet.has(c.category));
    }
    const catTotal = scope.length;
    const catKnown = scope.filter(c=>state.knownSet.has(c.id)).length;
    const catRemaining = catTotal - catKnown;
    if(countKnownCat && countTotalCat && countRemainingCat){
      countKnownCat.textContent = String(catKnown);
      countTotalCat.textContent = String(catTotal);
      countRemainingCat.textContent = String(catRemaining);
    }
    if(categoryStatsEl){
      categoryStatsEl.style.display = (state.categorySet && state.categorySet.size > 0) ? '' : 'none';
    }

    // Progress bar reflects selected category when filtered; otherwise overall
    const catPct = catTotal === 0 ? 0 : (catKnown / catTotal);
    const barPct = (state.categorySet && state.categorySet.size > 0) ? catPct : overallPct;
    progressFill.style.width = (barPct * 100).toFixed(1) + '%';
  }

  function showToast(message){
    if(!milestoneToast) return;
    milestoneToast.textContent = message;
    milestoneToast.classList.add('show');
    setTimeout(()=> milestoneToast.classList.remove('show'), 1800);
  }

  function updateAvatar(ratio){
    // ratio in [0,1]
    const steps = 15; // 15 images: 1.png..15.png
    const idx = Math.max(1, Math.min(steps, Math.ceil(ratio * steps)));
    // Lazy: if user hasn't added assets yet, avoid broken image icon
    const url = `assets/avatars/${idx}.png`;
    if(!avatarImg._bound){
      avatarImg.addEventListener('error', ()=>{ avatarImg.style.visibility = 'hidden'; });
      avatarImg.addEventListener('load', ()=>{ avatarImg.style.visibility = 'visible'; });
      avatarImg._bound = true;
    }
    avatarImg.style.visibility = 'hidden';
    avatarImg.src = url;
    const percent = Math.round(ratio * 100);
    avatarCaption.textContent = `${percent}% Dutchified`;

    // Celebrate on milestone change
    if(typeof updateAvatar.lastIdx === 'number' && updateAvatar.lastIdx !== idx){
      // Stronger confetti
      confetti();
      // Toast message
      const messages = [
        'Milestone reached! 🎉',
        'Lekker bezig! 🧡',
        'Mooi zo! Keep going! ✅',
        'New level unlocked! ⭐',
        'Goed gedaan! 🚀'
      ];
      showToast(messages[Math.floor(Math.random()*messages.length)]);
    }
    updateAvatar.lastIdx = idx;
  }

  // Suggestion helpers
  function openSuggestModal(){
    const c = currentCard(); if(!c) return;
    // Prefill
    sugSlug.value = c.id || '';
    sugFront.value = c.term || '';
    sugBack.value = c.definition || '';
    sugDesc.value = c.description || '';
    sugName.value = '';
    if(sugNotes) sugNotes.innerHTML = '';
    // Track original values for change detection
    openSuggestModal._orig = { front: sugFront.value, back: sugBack.value, description: sugDesc.value };
    validateSuggestion();
    suggestModal.classList.remove('hidden');
  }

  function closeSuggestModal(){ suggestModal.classList.add('hidden'); }

  function validateSuggestion(){
    const orig = openSuggestModal._orig || {front:'',back:'',description:''};
    const edited = (sugFront.value !== orig.front) || (sugBack.value !== orig.back) || (sugDesc.value !== orig.description);
    const hasNotes = (sugNotes && sugNotes.innerHTML.trim().length > 0);
    suggestSubmit.disabled = !(edited || hasNotes);
    const err = document.getElementById('sugError');
    if(!suggestSubmit.disabled){ err.classList.add('hidden'); }
  }

  async function submitSuggestion(){
    const payload = {
      slug: sugSlug.value,
      front: sugFront.value,
      back: sugBack.value,
      description: sugDesc.value,
      name: sugName.value,
      anything_else: (sugNotes && sugNotes.innerHTML) || ''
    };
    try{
      const res = await fetch('/.netlify/functions/suggest', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)});
      if(!res.ok) throw new Error(await res.text());
      showToast('Thanks! Your suggestion was sent.');
      closeSuggestModal();
    }catch(e){
      console.error('Suggest error', e);
      showToast('Sorry, could not send that. Try again later.');
    }
  }

  function currentCard(){
    const cards = getFilteredCards();
    if(cards.length === 0) return null;
    // Find the next order id that exists in the filtered set
    const maxTries = state.order.length;
    for(let t=0;t<maxTries;t++){
      const id = state.order[(state.idx + t) % state.order.length];
      const found = cards.find(c=>c.id === id);
      if(found) return found;
    }
    return cards[0];
  }

  function showCard(card){
    if(card && card.bonus){
      termEl.textContent = card.term;
      defEl.textContent = card.definition;
      contextHintEl.textContent = 'Mini break — press Next to continue';
      categoryChip.textContent = 'Bonus';
      subcategoryChip.textContent = 'Break';
      return;
    }
    if(!card){
      termEl.textContent = 'All done 🎉';
      defEl.textContent = 'Change filters or reset Known to review again.';
      contextHintEl.textContent = '';
      categoryChip.textContent = '';
      subcategoryChip.textContent = '';
      cardEl.classList.remove('flipped');
      return;
    }
    termEl.textContent = card.term;
    defEl.textContent = card.definition;
    const rich = getRichDescription(card);
    contextHintEl.textContent = rich || buildContextHint(card);
    categoryChip.textContent = card.category;
    subcategoryChip.textContent = card.subcategory;
  }

  function normTerm(s){
    try{ s = s.normalize('NFD').replace(/[\u0300-\u036f]/g,''); }catch{}
    return String(s)
      .replace(/[‘’'"`]/g,'')
      .replace(/\(.*?\)/g,'')
      .replace(/\s+/g,' ')
      .trim()
      .toLowerCase();
  }

  function parseDescriptions(txt){
    const map = {};
    const lines = txt.split(/\r?\n/);
    for(const raw of lines){
      let line = raw.trim();
      if(!line || line.startsWith('```') || line.startsWith('###')) continue;
      if(!line.startsWith('*')) continue;
      // strip citation markers
      line = line.replace(/\[cite_start\]/g,'').replace(/\[cite:[^\]]*\]/g,'');
      line = line.replace(/^\*\s*/, '');
      const colonIdx = line.indexOf(':');
      if(colonIdx === -1) continue;
      const left = line.slice(0, colonIdx).replace(/\*\*/g,'').trim();
      const right = line.slice(colonIdx+1).trim();
      const termDutch = left.split(' - ')[0].trim();
      const desc = right.replace(/\[[^\]]*\]/g,'').trim();
      if(termDutch && desc){
        map[normTerm(termDutch)] = desc;
      }
    }
    return map;
  }

  function getRichDescription(card){
    // Since we're now building cards from JSON data, use the description field directly
    if(card && card.description) {
      return card.description;
    }
    
    // Fallback to old text format if somehow description is missing
    if(window.RICH_DESCRIPTIONS_NORM) {
      const norm = normTerm(card.term);
      return window.RICH_DESCRIPTIONS_NORM[norm] || null;
    }
    
    return null;
  }

  // Normalize a value from Baserow (string | number | object | array) into a displayable string
  function toLabelString(value){
    if(value == null) return '';
    const t = typeof value;
    if(t === 'string' || t === 'number') return String(value);
    if(Array.isArray(value)){
      // Prefer first meaningful label to keep filtering stable
      for(const v of value){
        const s = toLabelString(v);
        if(s) return s;
      }
      return '';
    }
    if(t === 'object'){
      // Common Baserow shapes: {value: 'Label'}, {name: 'Label'}, {label: 'Label'}
      if('value' in value) return toLabelString(value.value);
      if('name' in value) return toLabelString(value.name);
      if('label' in value) return toLabelString(value.label);
      // Fallback: pick first primitive-ish field
      for(const k of Object.keys(value)){
        const s = toLabelString(value[k]);
        if(s) return s;
      }
      return '';
    }
    return '';
  }

  // Map a Baserow row to our internal card format, coercing fields to expected shapes
  function normalizeBaserowRow(r){
    const category = toLabelString(r.category);
    const subcategory = toLabelString(r.subcategory);
    // pos can be string, array of strings, or array of objects — coerce to string[]
    let pos = r.pos;
    if(pos == null) pos = undefined;
    else if(typeof pos === 'string') pos = [pos];
    else if(Array.isArray(pos)) pos = pos.map(p=> toLabelString(p)).filter(Boolean);
    else if(typeof pos === 'object') pos = [toLabelString(pos)].filter(Boolean);

    // tags may be string, array of strings, or array of objects
    let tags = r.tags;
    if(typeof tags === 'string'){
      tags = tags.split(',').map(s=>s.trim()).filter(Boolean);
    } else if(Array.isArray(tags)){
      tags = tags.map(t=> toLabelString(t)).filter(Boolean);
    } else if(tags && typeof tags === 'object'){
      const asStr = toLabelString(tags);
      tags = asStr ? [asStr] : undefined;
    }

    return {
      id: r.slug || r.id,
      term: r.front,
      definition: r.back,
      category,
      subcategory,
      description: r.description,
      pos,
      priority: r.priority,
      tags,
    };
  }

  async function loadDescriptions(){
    // Helper to fetch rows from a Baserow Public Grid View using pagination
    async function fetchBaserowPublicRows(viewSlug){
      // Prefer the API host to avoid CORS issues and try both view endpoints
      const HOSTS = ['https://api.baserow.io'];
      const PATHS = [
        `/api/public/grid/views/${viewSlug}/`,
        `/api/public/grid/views/${viewSlug}/rows/`,
      ];
      const SIZE = 200;
      let lastErr = null;
      for(const host of HOSTS){
        for(const path of PATHS){
          try{
            let page = 1; let all = [];
            while(true){
              const url = `${host}${path}?page=${page}&size=${SIZE}&user_field_names=true`;
              console.log('Fetching Baserow:', url);
              const res = await fetch(url, { cache: 'no-cache', headers: { 'Accept': 'application/json' } });
              if(!res.ok) throw new Error(`Baserow public fetch failed: ${res.status}`);
              const json = await res.json();
              // For the /rows/ endpoint results are in json.results; for /views/ sometimes in json.results too
              const results = Array.isArray(json.results) ? json.results : (Array.isArray(json.rows) ? json.rows : []);
              all = all.concat(results);
              if(!json.next) break;
              page += 1;
            }
            return all;
          }catch(e){
            lastErr = e;
            console.warn('Baserow fetch failed on endpoint, trying next...', host+path, e);
          }
        }
      }
      throw lastErr || new Error('Baserow public fetch failed');
    }

    try{
      // 1) Try deployed Netlify function (production)
      try{
        const hosted = await fetch('/.netlify/functions/cards', { cache: 'no-cache' });
        if(hosted.ok){
          const json = await hosted.json();
          const rows = Array.isArray(json.results) ? json.results : (Array.isArray(json) ? json : []);
          if(rows.length){
            ALL_CARDS = rows.map(normalizeBaserowRow);
            const seen = new Set();
            ALL_CARDS = ALL_CARDS.filter(c=>{ const k = normTerm(c.term); if(seen.has(k)) return false; seen.add(k); return true; });
            console.log(`Loaded ${ALL_CARDS.length} cards from Netlify function`);
            return true;
          }
        }
      }catch(e){ /* ignore; fall through */ }

      // 2) Try local proxy with private token (development): http://localhost:8788/cards
      try{
        const proxyRes = await fetch('http://localhost:8788/cards', { cache: 'no-cache' });
        if(proxyRes.ok){
          const json = await proxyRes.json();
          const rows = Array.isArray(json.results) ? json.results : (Array.isArray(json) ? json : []);
          if(rows.length){
            ALL_CARDS = rows.map(normalizeBaserowRow);
            const seen = new Set();
            ALL_CARDS = ALL_CARDS.filter(c=>{ const k = normTerm(c.term); if(seen.has(k)) return false; seen.add(k); return true; });
            console.log(`Loaded ${ALL_CARDS.length} cards from local Baserow proxy`);
            return true;
          }
        }
      }catch(e){
        console.warn('Local Baserow proxy not available, trying public view...', e);
      }

      // 3) Try Baserow public view (no token) if available
      const PUBLIC_VIEW_SLUG = 'N8Fret6vpyrFIIdF7BUiXop-OMXM_QL1f-NKBBJCSMk';
      try{
        const rows = await fetchBaserowPublicRows(PUBLIC_VIEW_SLUG);
        ALL_CARDS = rows.map(normalizeBaserowRow);
        const seen = new Set();
        ALL_CARDS = ALL_CARDS.filter(c=>{ const k = normTerm(c.term); if(seen.has(k)) return false; seen.add(k); return true; });
        console.log(`Loaded ${ALL_CARDS.length} cards from Baserow public view`);
        return true;
      }catch(e){
        // Only log a compact note to avoid noise in console
        console.info('Public view not available; using local file.');
      }

      // 4) Fallback to local JSON file
      console.log('Loading descriptions from descriptions.json...');
      const res = await fetch('descriptions/descriptions.json', { cache: 'no-cache' });
      if(res.ok){
        const json = await res.json();
        window.RICH_DESCRIPTIONS_JSON = json;
        ALL_CARDS = json.cards.map(card=>({
          id: card.id,
          term: card.front,
          definition: card.back,
          category: card.category,
          subcategory: card.subcategory,
          description: card.description
        }));
        const seen = new Set();
        ALL_CARDS = ALL_CARDS.filter(c=>{ const k = normTerm(c.term); if(seen.has(k)) return false; seen.add(k); return true; });
        console.log(`Loaded ${ALL_CARDS.length} cards from local JSON`);
        return true;
      }

      // 5) Legacy fallback (old text format)
      console.warn('descriptions.json not found, falling back to old format');
      const txtRes = await fetch('descriptions/sentences.txt', { cache: 'no-cache' });
      if(!txtRes.ok) return false;
      const txt = await txtRes.text();
      window.RICH_DESCRIPTIONS_NORM = parseDescriptions(txt);
      return false;
    }catch(e){
      console.error('Error loading descriptions:', e);
      return false;
    }
  }

  function makeBonusCard(){
    const totalKnownOverall = ALL_CARDS.filter(c=>state.knownSet.has(c.id)).length;
    const totalCards = ALL_CARDS.length;
    const remaining = totalCards - totalKnownOverall;
    const template = BONUS_TEMPLATES[randInt(0, BONUS_TEMPLATES.length-1)];
    const msg = template
      .replace('{known}', String(totalKnownOverall))
      .replace('{total}', String(totalCards))
      .replace('{remaining}', String(remaining));
    return { bonus: true, term: '✨ Mini break', definition: msg, category: 'Bonus', subcategory: 'Wellbeing' };
  }

  function buildContextHint(card){
    // Human, real-life explanations (what it is + when/why it matters), no exam references.
    const t = card.term.toLowerCase();
    const rules = [
      [/huurtoeslag/i, 'Government rent benefit for low income households. You apply via Belastingdienst; helps reduce your monthly rent.'],
      [/huurcontract/i, 'Your rental agreement with the landlord. It sets rent, rules, service costs and the notice period—read before signing.'],
      [/servicekosten/i, 'Extra monthly costs for shared services (e.g., stairwell cleaning, maintenance). Paid on top of basic rent.'],
      [/opzegtermijn/i, 'The notice period to end a contract (e.g., rent or job). You must inform the other party X months in advance.'],
      [/woningcorporatie|woningbouwvereniging/i, 'Non‑profit housing association renting social housing. You register and often wait on a list before getting an offer.'],
      [/wachtlijst/i, 'Queue for services such as social housing or healthcare. You may need proof of registration and wait your turn.'],
      [/urgentieverklaring/i, 'Official paper that gives priority on the housing list due to urgent need (e.g., safety/medical reasons). Hard to obtain.'],
      [/vrije sector/i, 'Rental homes outside social housing. Usually higher rent and fewer eligibility rules.'],
      [/huisbaas/i, 'The landlord: person or company that rents the property to you and handles repairs/communication.'],
      [/makelaar/i, 'Real‑estate agent who helps rent/buy a home and negotiate contracts. You may pay a fee.'],
      [/hypotheekrenteaftrek/i, 'Tax rule: you can deduct mortgage interest from your taxable income. Lowers your tax when you own a home.'],
      [/hypotheek|rente\b/i, 'Mortgage = loan to buy a home; rente = interest you pay monthly. Affects your monthly costs and tax.'],
      [/notaris/i, 'Independent legal official who validates important deeds (house transfer, mortgage, wills). You sign here when buying a home.'],
      [/aansprakelijkheidsverzekering/i, 'Insurance that pays if you accidentally damage others or their property. Example: you break a neighbor’s window.'],
      [/inboedelverzekering/i, 'Insurance for belongings inside your home (theft, fire, water damage). Building itself is not included.'],
      [/verzekering\b|premie|eigen risico|eigen bijdrage/i, 'Insurance basics: you pay a monthly premium. You may first pay a part yourself (eigen risico/bijdrage) before coverage starts.'],
      [/uwv werkbedrijf|\buwv\b|wia|\bww\b|uitkering/i, 'Employment agency/benefits: register after job loss or disability to get help and possibly a WW/WIA allowance.'],
      [/sollicit|vacature/i, 'Applying for a job: respond to a vacancy with CV/motivation, then interview with the employer.'],
      [/cao/i, 'Collective labour agreement for a sector. Sets salary, hours, overtime, and holidays that your contract must follow.'],
      [/kvk-nummer|kamer van koophandel|kvk\b/i, 'Business registration number from the Chamber of Commerce. You need it to run a company or send invoices.'],
      [/gemeente|gba|uittreksel|vergunning/i, 'Municipal services: register your address, request official extracts, and apply for permits (e.g., parking).'],
      [/verblijfsvergunning|onbepaalde tijd|bepaalde tijd|permanente/i, 'Residence permits: temporary or permanent permission to live in NL. Keep track of conditions and expiry.'],
      [/naturalisatie/i, 'Process to become a Dutch citizen (after meeting residence, language and integration conditions).'],
      [/bsn/i, 'Citizen service number used on official forms for tax, healthcare and government services—keep it private.'],
      [/digid/i, 'Secure login for Dutch government portals (taxes, allowances, DUO). Treat it like a password.'],
      [/zorgverzekering|basisverzekering/i, 'Mandatory health insurance. You choose an insurer, pay a premium, and have an annual deductible (eigen risico).'],
      [/zorgtoeslag/i, 'Government allowance to help pay your health insurance premium if your income is low. Apply via Belastingdienst.'],
      [/tandartsverzekering/i, 'Optional dental insurance. Useful if you expect dental costs; not all treatments are in the basic package.'],
      [/huisartsenpost/i, 'After‑hours GP center for urgent care when your own GP is closed. Call first for advice.'],
      [/verwijsbrief/i, 'Referral letter from your GP to see a specialist so your insurance will reimburse the costs.'],
      [/poliklin/i, 'Hospital outpatient clinic where you see a specialist without staying overnight.'],
      [/ggz|geestelijke/i, 'Mental healthcare services. Usually start via your GP, who can refer you for treatment covered by insurance.'],
      [/soa/i, 'Sexually transmitted infection. The GGD offers confidential testing/treatment.'],
      [/arbo|bedrijfsarts/i, 'Workplace health and safety. The bedrijfsarts supports sickness absence and safe return to work.'],
      [/aow\b/i, 'State pension paid from AOW age based on years lived in NL. Plan how it combines with any private pension.'],
      [/belastingdienst|belastingaangifte|belasting\b/i, 'Tax authority and returns. Each year you may file a return to settle income tax and deductions.'],
      [/grondwet|vrijheid van|rechters|parlement|regering|minister/i, 'Dutch constitutional system: your basic rights and how laws and government decisions are made and checked.'],
      [/tweede kamer|eerste kamer/i, 'Two chambers of parliament: Tweede Kamer debates/changes laws; Eerste Kamer checks and approves.'],
      [/koning\b/i, 'Constitutional monarch with mainly ceremonial roles; the elected government sets policy.'],
      [/referendum/i, 'A public vote on a proposal. Rare in NL; rules can change.'],
      [/randstad|waddeneilanden|veluwe|schiphol|rotterdam|den haag|utrecht|amsterdam/i, 'Common names for Dutch regions, cities and the main airport that you’ll hear in the news and daily life.'],
      [/storing/i, 'Technical outage (energy/telecom). You may need to report it and wait for service to be restored.'],
      [/glasbak|papierbak|gft|chemisch afval/i, 'Waste separation rules: put glass, paper, GFT, and chemical waste in the correct containers.'],
      [/ontheffing/i, 'Official exemption from a rule or tax in special situations. You must apply and meet conditions.'],
      [/vwo|havo|vmbo|hbo|mbo|roc|voortgezet|middelbare|basisschool/i, 'Education pathways: VMBO→MBO, HAVO→HBO, VWO→University. Parents hear these often when choosing schools.'],
      [/leerplicht/i, 'Compulsory education: children must attend school. Parents can be fined for unjustified absence.'],
      [/kinderopvangtoeslag|kinderbijslag|svb/i, 'Family allowances: Kinderopvangtoeslag helps pay daycare; SVB pays Kinderbijslag every quarter.'],
      [/advocatenkantoor/i, 'A law firm where lawyers work. You hire them for contracts, disputes, or going to court.'],
      [/juridisch loket/i, 'Public service that gives free basic legal advice and points you to next steps. Not the same as hiring your own lawyer.'],
      [/10\s*-?minuten/i, 'A short, scheduled meeting (about 10 minutes) between parents and the child’s teacher to discuss progress and wellbeing. Schools expect parents to attend.'],
      [/ouderavonden/i, 'Evening meetings at school where teachers inform parents about the class, learning goals, and activities.'],
      [/loonstrookje|jaaropgave/i, 'Payslip and yearly income statement from your employer. You use them to check pay and for tax administration.'],
      [/abonnement/i, 'A subscription you pay periodically (e.g., phone, internet, public transport). Check the notice period to cancel.'],
      [/npo/i, 'Dutch public broadcaster (TV/radio channels like NPO 1/2/3). You see it in program listings and news.'],
      [/energiebedrijf|energierekening|termijnbedrag|jaarrekening/i, 'Your energy supplier and bills: monthly advance (termijnbedrag) and a yearly settlement (jaarrekening).'],
      [/energierekening|termijnbedrag|jaarrekening/i, 'Energy bills: you pay a monthly amount (termijnbedrag) and get a yearly settlement (jaarrekening).'],
    ];

    for(const [pattern, hint] of rules){
      if(pattern.test(t)) return hint;
    }
    // Default: real‑life fallback
    return `${card.term}: everyday Dutch term related to ${card.category.toLowerCase()} (${card.subcategory.toLowerCase()}).`;
  }

  function flip(){
    cardEl.classList.toggle('flipped');
  }

  function speak(text){
    if(!('speechSynthesis' in window)) return;
    try{
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = 'nl-NL';
      utter.rate = 0.95;
      speechSynthesis.cancel();
      speechSynthesis.speak(utter);
    }catch(e){/* ignore */}
  }

  // Lightweight confetti burst
  function clearConfetti(){
    if(confettiAnimationId){
      cancelAnimationFrame(confettiAnimationId);
      confettiAnimationId = null;
    }
    if(confettiTimeoutId){
      clearTimeout(confettiTimeoutId);
      confettiTimeoutId = null;
    }
    ctx.clearRect(0,0,confettiCanvas.width, confettiCanvas.height);
  }

  function confetti(){
    resizeCanvas();
    clearConfetti();
    const pieces = Array.from({length: 40}, ()=>({
      x: Math.random()*confettiCanvas.width,
      y: -10,
      r: 2 + Math.random()*3,
      c: `hsl(${Math.floor(Math.random()*360)},90%,60%)`,
      vy: 2 + Math.random()*2,
      vx: -1 + Math.random()*2,
    }));
    let frame = 0;
    const maxFrames = 60; // ~1 second at 60fps
    function step(){
      ctx.clearRect(0,0,confettiCanvas.width, confettiCanvas.height);
      pieces.forEach(p=>{
        p.x += p.vx;
        p.y += p.vy;
        ctx.beginPath();
        ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
        ctx.fillStyle = p.c;
        ctx.fill();
      });
      frame++;
      if(frame < maxFrames){
        confettiAnimationId = requestAnimationFrame(step);
      } else {
        clearConfetti();
      }
    }
    confettiAnimationId = requestAnimationFrame(step);
    // Fallback: ensure canvas clears even if rAF is throttled/inactive
    confettiTimeoutId = setTimeout(clearConfetti, 2000);
  }

  function markKnown(card){
    state.knownSet.add(card.id);
    persistKnown();
    computeProgress();
    confetti();
  }

  function markUnknown(card){
    state.knownSet.delete(card.id);
    persistKnown();
    computeProgress();
  }

  function markSkipped(card){
    state.skipSet.add(card.id);
    localStorage.setItem('knm_skip_cards_v1', JSON.stringify(Array.from(state.skipSet)));
    computeProgress();
  }

  function updateActionVisibility(){
    // Know it visible on unknown or all
    const showKnow = state.filter === 'unknown' || state.filter === 'all';
    goodBtn.style.display = showKnow ? '' : 'none';
    // Make Unknown visible on known or all
    const showUnmark = state.filter === 'known' || state.filter === 'all';
    const unmarkBtn = document.getElementById('unmarkBtn');
    if(unmarkBtn) unmarkBtn.style.display = showUnmark ? '' : 'none';
    // Show Reset Known only when viewing Known
    if(resetKnownBtn) resetKnownBtn.style.display = (state.filter === 'known') ? '' : 'none';
  }

  function next(){
    // If a bonus card is showing, close it and return to the real deck
    if(state.bonusActive){
      state.bonusActive = false;
      state.bonusCard = null;
      cardEl.classList.remove('flipped');
      showCard(currentCard());
      return;
    }

    const cards = getFilteredCards();
    if(cards.length === 0){ showCard(null); return; }
    state.idx = (state.idx + 1) % state.order.length;

    // Schedule occasional bonuses
    state.stepsSinceBonus += 1;
    if(state.stepsSinceBonus >= state.stepsUntilBonus){
      state.stepsSinceBonus = 0;
      state.stepsUntilBonus = randInt(18, 30);
      state.bonusActive = true;
      state.bonusCard = makeBonusCard();
      cardEl.classList.remove('flipped');
      showCard(state.bonusCard);
      return;
    }

    const c = currentCard();
    cardEl.classList.remove('flipped');
    showCard(c);
  }

  function prev(){
    // If a bonus is visible, just dismiss it
    if(state.bonusActive){
      state.bonusActive = false;
      state.bonusCard = null;
      cardEl.classList.remove('flipped');
      showCard(currentCard());
      return;
    }
    const cards = getFilteredCards();
    if(cards.length === 0){ showCard(null); return; }
    if(state.order.length === 0){ showCard(currentCard()); return; }
    state.idx = (state.idx - 1 + state.order.length) % state.order.length;
    const c = currentCard();
    cardEl.classList.remove('flipped');
    showCard(c);
  }

  function again(){
    // If a bonus is visible, just dismiss it
    if(state.bonusActive){ next(); return; }
    // Move current card a few positions ahead
    const c = currentCard(); if(!c) return;
    const i = state.order.indexOf(c.id);
    if(i >= 0){
      state.order.splice(i,1);
      const insertAt = Math.min(state.idx + 3, state.order.length);
      state.order.splice(insertAt, 0, c.id);
      saveOrder();
    }
    next();
  }

  function hard(){
    if(state.bonusActive){ next(); return; }
    // Move current card slightly ahead
    const c = currentCard(); if(!c) return;
    // Add to hard set
    state.hardSet.add(c.id);
    persistHard();
    const i = state.order.indexOf(c.id);
    if(i >= 0){
      state.order.splice(i,1);
      const insertAt = Math.min(state.idx + 8, state.order.length);
      state.order.splice(insertAt, 0, c.id);
      saveOrder();
    }
    next();
  }

  function good(){
    if(state.bonusActive){ next(); return; }
    const c = currentCard(); if(!c) return;
    markKnown(c);
    next();
  }

  function shuffle(){
    const cards = getFilteredCards();
    state.order = cards.map(c=>c.id);
    for(let i=state.order.length-1;i>0;i--){
      const j=Math.floor(Math.random()*(i+1));
      [state.order[i], state.order[j]] = [state.order[j], state.order[i]];
    }
    state.idx = 0;
    saveOrder();
    showCard(currentCard());
  }

  function resetKnown(){
    state.knownSet.clear();
    persistKnown();
    computeProgress();
    showCard(currentCard());
  }

  // Optional: helper to clear hard list from UI via console if needed
  window.knmClearHard = function(){
    state.hardSet.clear();
    localStorage.setItem(STORAGE_KEYS.hard, JSON.stringify([]));
    refreshDeck();
  }

  function refreshDeck(){
    const cards = getFilteredCards();
    state.order = restoreOrBuildOrder(cards);
    state.idx = 0;
    saveOrder();
    computeProgress();
    showCard(currentCard());
    updateActionVisibility();
  }

  // IndexedDB persistence for robustness across cache refreshes
  let idbDb = null;
  function idbOpen(){
    return new Promise((resolve)=>{
      if(!('indexedDB' in window)) return resolve(null);
      const req = indexedDB.open('knm_store_v1', 1);
      req.onupgradeneeded = (e)=>{
        const db = req.result;
        if(!db.objectStoreNames.contains('kv')) db.createObjectStore('kv');
      };
      req.onsuccess = ()=> resolve(req.result);
      req.onerror = ()=> resolve(null);
    });
  }
  function idbGet(key){
    return new Promise((resolve)=>{
      if(!idbDb) return resolve(null);
      const tx = idbDb.transaction('kv', 'readonly');
      const store = tx.objectStore('kv');
      const rq = store.get(key);
      rq.onsuccess = ()=> resolve(rq.result || null);
      rq.onerror = ()=> resolve(null);
    });
  }
  function idbSet(key, value){
    return new Promise((resolve)=>{
      if(!idbDb) return resolve(false);
      const tx = idbDb.transaction('kv', 'readwrite');
      const store = tx.objectStore('kv');
      const rq = store.put(value, key);
      rq.onsuccess = ()=> resolve(true);
      rq.onerror = ()=> resolve(false);
    });
  }

  async function syncSetsFromIdb(){
    idbDb = await idbOpen();
    if(!idbDb) return; // fallback: localStorage only
    const known = await idbGet('known');
    if(Array.isArray(known)){
      // Merge to avoid losing progress
      known.forEach(id=> state.knownSet.add(id));
      localStorage.setItem(STORAGE_KEYS.known, JSON.stringify(Array.from(state.knownSet)));
    } else {
      // Write local to IDB if IDB empty
      await idbSet('known', Array.from(state.knownSet));
    }
    const hard = await idbGet('hard');
    if(Array.isArray(hard)){
      hard.forEach(id=> state.hardSet.add(id));
      localStorage.setItem(STORAGE_KEYS.hard, JSON.stringify(Array.from(state.hardSet)));
    } else {
      await idbSet('hard', Array.from(state.hardSet));
    }
    const skip = await idbGet('skip');
    if(Array.isArray(skip)){
      skip.forEach(id=> state.skipSet.add(id));
      localStorage.setItem('knm_skip_cards_v1', JSON.stringify(Array.from(state.skipSet)));
    } else {
      await idbSet('skip', Array.from(state.skipSet));
    }
  }

  function persistKnown(){
    localStorage.setItem(STORAGE_KEYS.known, JSON.stringify(Array.from(state.knownSet)));
    idbSet('known', Array.from(state.knownSet));
  }
  function persistHard(){
    localStorage.setItem(STORAGE_KEYS.hard, JSON.stringify(Array.from(state.hardSet)));
    idbSet('hard', Array.from(state.hardSet));
  }
  function persistSkip(){
    localStorage.setItem('knm_skip_cards_v1', JSON.stringify(Array.from(state.skipSet)));
    idbSet('skip', Array.from(state.skipSet));
  }

  async function init(){
    // restore theme
    const savedTheme = localStorage.getItem('knm_theme_v1');
    if(savedTheme === 'light') document.body.classList.add('theme-light');
    if(modeToggle){
      modeToggle.textContent = document.body.classList.contains('theme-light') ? '☀️' : '🌙';
    }
    populateCategorySelect();
    knownFilterSelect.value = state.filter;
    await syncSetsFromIdb();
    
    // Load descriptions first, then refresh deck
    await loadDescriptions();
    // After data loads, categories may change (coming from Baserow). Repopulate now.
    populateCategorySelect();
    
    // Now refresh deck with loaded cards
    refreshDeck();
    
    // Initial avatar update
    const totalKnownOverall = ALL_CARDS.filter(c=>state.knownSet.has(c.id)).length;
    updateAvatar(ALL_CARDS.length === 0 ? 0 : totalKnownOverall / ALL_CARDS.length);
  }

  // Event handlers
  if(modeToggle){
    modeToggle.addEventListener('click', ()=>{
      document.body.classList.toggle('theme-light');
      const isLight = document.body.classList.contains('theme-light');
      localStorage.setItem('knm_theme_v1', isLight ? 'light' : 'dark');
      modeToggle.textContent = isLight ? '☀️' : '🌙';
    });
  }
  if(flagBtn){ flagBtn.addEventListener('click', openSuggestModal); }
  if(suggestCancel){ suggestCancel.addEventListener('click', closeSuggestModal); }
  if(suggestClose){ suggestClose.addEventListener('click', closeSuggestModal); }
  if(suggestSubmit){ suggestSubmit.addEventListener('click', submitSuggestion); }
  if(sugFront){ sugFront.addEventListener('input', validateSuggestion); }
  if(sugBack){ sugBack.addEventListener('input', validateSuggestion); }
  if(sugDesc){ sugDesc.addEventListener('input', validateSuggestion); }
  if(sugNotes){ sugNotes.addEventListener('input', validateSuggestion); }
  if(suggestSubmit){
    suggestSubmit.addEventListener('click', (e)=>{
      if(suggestSubmit.disabled){
        const err = document.getElementById('sugError');
        if(err) err.classList.remove('hidden');
        e.preventDefault();
      }
    }, { capture:true });
  }
  if(categoryDropdownToggle){
    categoryDropdownToggle.addEventListener('click', ()=>{
      const open = categoryMulti.classList.toggle('open');
      categoryDropdownToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }
  if(categoryDropdown){
    categoryDropdown.addEventListener('change', ()=>{
      const checks = Array.from(categoryDropdown.querySelectorAll('input[type="checkbox"]'));
      const selected = checks.filter(c=>c.checked).map(c=>c.value);
      // If everything is checked, treat as All (empty set) for simplicity
      const allCats = uniqueCategories();
      state.categorySet = (selected.length===allCats.length) ? new Set() : new Set(selected);
      localStorage.setItem(STORAGE_KEYS.lastCategory, JSON.stringify(Array.from(state.categorySet)));
      updateCategoryToggleText();
      refreshDeck();
      computeProgress();
    });
  }

  // Close dropdown on outside click
  document.addEventListener('click', (e)=>{
    if(!categoryMulti.contains(e.target)){
      categoryMulti.classList.remove('open');
      categoryDropdownToggle.setAttribute('aria-expanded','false');
    }
  });

  knownFilterSelect.addEventListener('change', ()=>{
    state.filter = knownFilterSelect.value;
    localStorage.setItem(STORAGE_KEYS.lastFilter, state.filter);
    refreshDeck();
    updateActionVisibility();
  });

  shuffleBtn.addEventListener('click', shuffle);
  resetKnownBtn.addEventListener('click', resetKnown);

  cardEl.addEventListener('click', flip);
  // flip button removed from UI; keep keyboard shortcut
  speakBtn.addEventListener('click', ()=>{ const c = currentCard(); if(c) speak(c.term); });

  // removed Again button
  hardBtn.addEventListener('click', hard);
  goodBtn.addEventListener('click', good);
  unmarkBtn.addEventListener('click', ()=>{ const c = currentCard(); if(c && !c.bonus){ markUnknown(c); refreshDeck(); showCard(currentCard()); }});
  // removed skip icon button
  nextBtn.addEventListener('click', next);
  const prevBtn = document.getElementById('prevBtn');
  if(prevBtn) prevBtn.addEventListener('click', prev);

  document.addEventListener('keydown', (e)=>{
    if(e.target && ['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)) return;
    if(e.code === 'Space' || e.key === 'ArrowUp'){ e.preventDefault(); flip(); return; }
    const key = e.key.toLowerCase();
    if(key === 'h'){ hard(); }
    else if(key === 'k' || e.key === 'ArrowDown'){ good(); }
    else if(e.key === 'ArrowRight'){ next(); }
    else if(e.key === 'ArrowLeft'){ prev(); }
    else if(key === 's'){ shuffle(); }
    else if(key === 'u'){ const c = currentCard(); if(c && !c.bonus){ markUnknown(c); refreshDeck(); showCard(currentCard()); }}
    else if(key === 'x'){ const c = currentCard(); if(c && !c.bonus){ markSkipped(c); refreshDeck(); showCard(currentCard()); }}
    else if(key === 'l'){ const c = currentCard(); if(c) speak(c.term); }
  });

  // Kickoff
  init();
})();


