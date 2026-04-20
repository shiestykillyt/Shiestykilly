// ═══════════════════════════════════════════════════════
//  SHiesty — JS complet : Auth + Panier + API
// ═══════════════════════════════════════════════════════

const API = 'http://localhost:3000/api';

// ── État global ────────────────────────────────────────
let sessionId    = localStorage.getItem('session_id') || crypto.randomUUID();
let authToken    = localStorage.getItem('auth_token')  || null;
let currentUser  = JSON.parse(localStorage.getItem('current_user') || 'null');
let cartCount    = 0;
let panierData   = null;   // { panier_id, lignes, sous_total, nb_articles }
let promoApplied = false;
let promoResult  = null;   // { promo_id, remise, total_ttc }
let sidebarOpen  = true;

localStorage.setItem('session_id', sessionId);

// ── Headers API ────────────────────────────────────────
function headers() {
  const h = { 'Content-Type': 'application/json', 'x-session-id': sessionId };
  if (authToken) h['Authorization'] = `Bearer ${authToken}`;
  return h;
}

// ══════════════════════════════════════════════════════
//  AUTH MODAL
// ══════════════════════════════════════════════════════

function openAuth(tab = 'login') {
  const overlay = document.getElementById('auth-overlay');
  overlay.classList.add('open');
  switchAuthTab(tab, document.querySelector(`.auth-tab${tab === 'register' ? ':last-child' : ':first-child'}`));
  closeCompteMenu();
}

function closeAuth() {
  document.getElementById('auth-overlay').classList.remove('open');
  clearAuthMsgs();
}

function closeAuthOnOverlay(e) {
  if (e.target === document.getElementById('auth-overlay')) closeAuth();
}

function clearAuthMsgs() {
  ['login-msg', 'register-msg'].forEach(id => {
    const el = document.getElementById(id);
    el.className = 'auth-msg';
    el.textContent = '';
  });
}

function switchAuthTab(tab, btn) {
  document.querySelectorAll('.auth-tab').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.auth-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('auth-' + tab).classList.add('active');
  if (btn) btn.classList.add('active');
  clearAuthMsgs();
}

function showAuthMsg(id, text, type) {
  const el = document.getElementById(id);
  el.textContent = text;
  el.className = 'auth-msg ' + type;
}

function setAuthLoading(btnId, loading, label) {
  const btn = document.getElementById(btnId);
  btn.disabled = loading;
  btn.innerHTML = loading
    ? `<span class="auth-loader"></span> Chargement...`
    : label;
}

// ── Connexion ──────────────────────────────────────────
async function doLogin() {
  const email = document.getElementById('login-email').value.trim();
  const mdp   = document.getElementById('login-password').value;

  if (!email || !mdp) { showAuthMsg('login-msg', 'Email et mot de passe requis.', 'error'); return; }

  setAuthLoading('login-btn', true, 'Se connecter →');

  try {
    const res  = await fetch(`${API}/auth/connexion`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, mot_de_passe: mdp }),
    });
    const data = await res.json();

    if (!res.ok) { showAuthMsg('login-msg', data.erreur, 'error'); return; }

    // Sauvegarder token + user
    authToken   = data.token;
    currentUser = data.client;
    localStorage.setItem('auth_token',    authToken);
    localStorage.setItem('current_user',  JSON.stringify(currentUser));

    showAuthMsg('login-msg', data.message, 'success');
    setTimeout(() => {
      closeAuth();
      updateUIConnecte();
      chargerPanier();
      showNotification('👋', `Bienvenue, ${currentUser.prenom} !`, 'Vous êtes connecté.', 'success');
    }, 700);

  } catch {
    showAuthMsg('login-msg', '⚠️ Serveur inaccessible.', 'error');
  } finally {
    setAuthLoading('login-btn', false, 'Se connecter →');
  }
}

// ── Inscription ────────────────────────────────────────
async function doRegister() {
  const prenom    = document.getElementById('reg-prenom').value.trim();
  const nom       = document.getElementById('reg-nom').value.trim();
  const email     = document.getElementById('reg-email').value.trim();
  const mdp       = document.getElementById('reg-password').value;
  const naissance = document.getElementById('reg-naissance').value;
  const tel       = document.getElementById('reg-tel').value.trim();

  if (!prenom || !nom || !email || !mdp || !naissance) {
    showAuthMsg('register-msg', 'Tous les champs obligatoires doivent être remplis.', 'error'); return;
  }
  if (mdp.length < 8) {
    showAuthMsg('register-msg', 'Le mot de passe doit faire au moins 8 caractères.', 'error'); return;
  }

  setAuthLoading('register-btn', true, 'Créer mon compte →');

  try {
    const res  = await fetch(`${API}/auth/inscription`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prenom, nom, email, mot_de_passe: mdp, date_naissance: naissance, telephone: tel || undefined }),
    });
    const data = await res.json();

    if (!res.ok) { showAuthMsg('register-msg', data.erreur, 'error'); return; }

    authToken   = data.token;
    currentUser = { id: data.client_id, prenom, nom, email };
    localStorage.setItem('auth_token',   authToken);
    localStorage.setItem('current_user', JSON.stringify(currentUser));

    showAuthMsg('register-msg', '✅ Compte créé avec succès !', 'success');
    setTimeout(() => {
      closeAuth();
      updateUIConnecte();
      chargerPanier();
      showNotification('🎉', `Bienvenue, ${prenom} !`, 'Compte créé avec succès.', 'success');
    }, 800);

  } catch {
    showAuthMsg('register-msg', '⚠️ Serveur inaccessible.', 'error');
  } finally {
    setAuthLoading('register-btn', false, 'Créer mon compte →');
  }
}

// ── Déconnexion ────────────────────────────────────────
function doLogout() {
  authToken   = null;
  currentUser = null;
  localStorage.removeItem('auth_token');
  localStorage.removeItem('current_user');
  updateUIDeconnecte();
  closeCompteMenu();
  chargerPanier();
  showNotification('👋', 'À bientôt !', 'Vous êtes déconnecté.', 'success');
}

// ── Mise à jour UI ─────────────────────────────────────
function updateUIConnecte() {
  const initiales = `${currentUser.prenom[0]}${currentUser.nom[0]}`.toUpperCase();

  // Bouton top-bar
  document.getElementById('compte-btn-content').innerHTML =
    `<span class="avatar">${initiales}</span> ${currentUser.prenom}`;

  // Sidebar
  const sidebarUser = document.getElementById('sidebar-user');
  sidebarUser.classList.add('visible');
  document.getElementById('sidebar-avatar').textContent = initiales;
  document.getElementById('sidebar-name').textContent   = `${currentUser.prenom} ${currentUser.nom}`;

  // Cacher l'alerte de connexion sur la page paiement
  const alert = document.getElementById('pay-login-alert');
  if (alert) alert.style.display = 'none';
}

function updateUIDeconnecte() {
  document.getElementById('compte-btn-content').textContent = '👤 Connexion';
  document.getElementById('sidebar-user').classList.remove('visible');

  cartCount = 0;
  document.getElementById('cart-count').textContent = '0';
  document.getElementById('cart-items-list').innerHTML =
    `<div style="text-align:center;padding:24px;color:#6b6b80;font-family:'Space Mono',monospace;font-size:0.8rem;">Votre panier est vide</div>`;
  document.getElementById('sous-total-display').textContent = '0 XOF';
  document.getElementById('total-display').textContent = '0 XOF';
  document.getElementById('pay-amount').textContent = '0 XOF';

  const alert = document.getElementById('pay-login-alert');
  if (alert) alert.style.display = 'block';
}

// ── Menu compte déroulant ──────────────────────────────
function toggleCompteMenu() {
  if (!authToken) { openAuth('login'); return; }
  document.getElementById('compte-menu').classList.toggle('open');
}

function closeCompteMenu() {
  document.getElementById('compte-menu').classList.remove('open');
}

document.addEventListener('click', (e) => {
  if (!e.target.closest('.compte-dropdown')) closeCompteMenu();
});

// ══════════════════════════════════════════════════════
//  UI NAVIGATION
// ══════════════════════════════════════════════════════

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const main    = document.getElementById('main');
  sidebarOpen   = !sidebarOpen;
  sidebar.classList.toggle('collapsed', !sidebarOpen);
  main.classList.toggle('expanded', !sidebarOpen);
  document.getElementById('toggle-btn').style.left = sidebarOpen
    ? 'calc(var(--sidebar-w) + 16px)' : '16px';
}

function showPage(name, btn) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('page-' + name).classList.add('active');
  if (btn) btn.classList.add('active');
  const titles = {
    home: 'Accueil', address: 'Adresse & Horaires',
    info: 'Informations', contact: 'Contact', payment: 'Paiement'
  };
  document.getElementById('page-title').textContent = titles[name] || name;

  if (name === 'payment') {
    chargerPanier();
    // Afficher alerte si non connecté
    const alert = document.getElementById('pay-login-alert');
    if (alert) alert.style.display = authToken ? 'none' : 'block';
  }
}

function switchTab(tab, btn) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + tab).classList.add('active');
  btn.classList.add('active');
}

function toggleFaq(el) {
  const item    = el.closest('.faq-item');
  const wasOpen = item.classList.contains('open');
  document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
  if (!wasOpen) item.classList.add('open');
}

function selectMethod(el, method) {
  document.querySelectorAll('.pay-method').forEach(m => m.classList.remove('active'));
  el.classList.add('active');
  ['card', 'paypal', 'apple', 'wave'].forEach(m => {
    const f = document.getElementById(m + '-form');
    if (f) f.style.display = 'none';
  });
  const preview = document.getElementById('card-preview');
  if (preview) preview.style.display = method === 'card' ? 'block' : 'none';
  const target = document.getElementById(method + '-form');
  if (target) target.style.display = 'block';
}

function formatCardNumber(input) {
  let v = input.value.replace(/\D/g, '').substring(0, 16);
  input.value = v.match(/.{1,4}/g)?.join(' ') || v;
  const display = v.padEnd(16, '•');
  document.getElementById('card-num-display').textContent =
    display.match(/.{1,4}/g)?.join(' ') || '•••• •••• •••• ••••';
  const net = document.getElementById('card-network');
  net.textContent = v.startsWith('4') ? '💙' : (v.startsWith('5') || v.startsWith('2')) ? '🔴'
    : v.startsWith('3') ? '🟡' : '💳';
}

function formatExpiry(input) {
  let v = input.value.replace(/\D/g, '').substring(0, 4);
  if (v.length >= 2) v = v.slice(0, 2) + '/' + v.slice(2);
  input.value = v;
  document.getElementById('card-exp-display').textContent = v || 'MM/AA';
}

// ══════════════════════════════════════════════════════
//  PANIER
// ══════════════════════════════════════════════════════

async function addToCart(name, price, produit_id) {
  try {
    const res  = await fetch(`${API}/panier/ajouter`, {
      method: 'POST', headers: headers(),
      body: JSON.stringify({ produit_id, quantite: 1 }),
    });
    const data = await res.json();

    if (!res.ok) {
      showNotification('❌', 'Erreur', data.erreur || 'Impossible d\'ajouter.', 'error'); return;
    }

    if (data.session_id) {
      sessionId = data.session_id;
      localStorage.setItem('session_id', sessionId);
    }

    cartCount = data.nb_articles || cartCount + 1;
    document.getElementById('cart-count').textContent = cartCount;
    panierData = data;
    showNotification('✅', name, `Ajouté au panier — ${price}`, 'success');

  } catch {
    showNotification('⚠️', 'Hors ligne', 'Vérifiez votre connexion au serveur.', 'error');
  }
}

async function chargerPanier() {
  try {
    const res  = await fetch(`${API}/panier`, { headers: headers() });
    const data = await res.json();
    if (!res.ok) return;

    panierData = data;
    cartCount  = data.nb_articles || 0;
    document.getElementById('cart-count').textContent = cartCount;

    const sousTotal = Number(data.sous_total) || 0;
    const total     = promoResult ? promoResult.total_ttc : sousTotal;

    document.getElementById('sous-total-display').textContent = `${sousTotal.toLocaleString('fr-FR')} XOF`;
    document.getElementById('total-display').textContent      = `${total.toLocaleString('fr-FR')} XOF`;
    document.getElementById('pay-amount').textContent         = `${total.toLocaleString('fr-FR')} XOF`;

    renderCartItems(data.lignes || []);

  } catch { /* silencieux */ }
}

function renderCartItems(lignes) {
  const container = document.getElementById('cart-items-list');
  if (!container) return;

  if (!lignes.length) {
    container.innerHTML = `<div style="text-align:center;padding:24px;color:#6b6b80;font-family:'Space Mono',monospace;font-size:0.8rem;">Votre panier est vide</div>`;
    return;
  }

  container.innerHTML = lignes.map(l => `
    <div class="cart-item" data-ligne="${l.id}">
      <div class="cart-item-img">${l.emoji || '📦'}</div>
      <div>
        <div class="cart-item-name">${l.nom}</div>
        <div class="cart-item-sub">Qté : ${l.quantite}</div>
      </div>
      <div style="margin-left:auto;display:flex;align-items:center;gap:10px;">
        <div class="cart-item-price">${Number(l.total_ligne).toLocaleString('fr-FR')} XOF</div>
        <button onclick="supprimerLigne(${l.id})" style="background:none;border:none;color:#6b6b80;cursor:pointer;font-size:1rem;transition:color 0.2s;" onmouseover="this.style.color='#f87171'" onmouseout="this.style.color='#6b6b80'">✕</button>
      </div>
    </div>
  `).join('');
}

async function supprimerLigne(ligneId) {
  try {
    await fetch(`${API}/panier/supprimer/${ligneId}`, { method: 'DELETE', headers: headers() });
    await chargerPanier();
  } catch { /* silencieux */ }
}

// ══════════════════════════════════════════════════════
//  PROMO
// ══════════════════════════════════════════════════════

function showPromoMsg(text, type) {
  const el = document.getElementById('promo-msg');
  el.textContent = text;
  el.className   = 'promo-msg ' + type;
}

async function applyPromo() {
  if (promoApplied) { showPromoMsg('Un code est déjà appliqué.', 'error'); return; }

  const code      = document.getElementById('promo-input').value.trim().toUpperCase();
  const sousTotal = panierData?.sous_total || 0;

  if (!code)     { showPromoMsg('Entrez un code promo.', 'error'); return; }
  if (!sousTotal){ showPromoMsg('Votre panier est vide.', 'error'); return; }

  try {
    const res  = await fetch(`${API}/promo/valider`, {
      method: 'POST', headers: headers(),
      body: JSON.stringify({ code, sous_total: sousTotal }),
    });
    const data = await res.json();

    if (!res.ok) { showPromoMsg(`❌ ${data.erreur}`, 'error'); return; }

    promoApplied = true;
    promoResult  = data;

    document.getElementById('discount-row').style.display = 'flex';
    document.getElementById('discount-val').textContent   = `-${data.remise.toLocaleString('fr-FR')} XOF`;
    document.getElementById('total-display').textContent  = `${data.total_ttc.toLocaleString('fr-FR')} XOF`;
    document.getElementById('pay-amount').textContent     = `${data.total_ttc.toLocaleString('fr-FR')} XOF`;

    showPromoMsg(`✅ Code "${code}" appliqué !`, 'success');

  } catch {
    showPromoMsg('⚠️ Serveur inaccessible.', 'error');
  }
}

// ══════════════════════════════════════════════════════
//  COMMANDE & PAIEMENT
// ══════════════════════════════════════════════════════

async function processPayment() {
  if (!authToken) {
    openAuth('login');
    showNotification('🔒', 'Connexion requise', 'Connectez-vous pour payer.', 'error');
    return;
  }

  if (!panierData?.panier_id || !panierData?.lignes?.length) {
    showNotification('🛒', 'Panier vide', 'Ajoutez des articles avant de payer.', 'error');
    return;
  }

  // Méthode sélectionnée
  const methodMap = { card: 'carte', paypal: 'paypal', apple: 'apple_pay', wave: 'wave' };
  let methode = 'carte';
  document.querySelectorAll('.pay-method').forEach(m => {
    if (m.classList.contains('active')) {
      const match = m.getAttribute('onclick')?.match(/'(\w+)'\)/);
      if (match) methode = methodMap[match[1]] || 'carte';
    }
  });

  try {
    const res  = await fetch(`${API}/commandes`, {
      method: 'POST', headers: headers(),
      body: JSON.stringify({
        panier_id:        panierData.panier_id,
        methode_paiement: methode,
        promo_id:         promoResult?.promo_id || null,
        remise:           promoResult?.remise   || 0,
      }),
    });
    const data = await res.json();

    if (!res.ok) { showNotification('❌', 'Paiement refusé', data.erreur, 'error'); return; }

    showNotification('🎉', 'Commande confirmée !',
      `#${data.commande_id} — ${Number(data.total_ttc).toLocaleString('fr-FR')} XOF`, 'success');

    // Reset
    promoApplied = false;
    promoResult  = null;
    panierData   = null;
    document.getElementById('discount-row').style.display = 'none';
    document.getElementById('promo-input').value = '';
    document.getElementById('promo-msg').textContent = '';
    setTimeout(chargerPanier, 1500);

  } catch {
    showNotification('⚠️', 'Erreur réseau', 'Vérifiez votre connexion.', 'error');
  }
}

// ══════════════════════════════════════════════════════
//  CONTACT
// ══════════════════════════════════════════════════════

async function sendContact() {
  const nom     = document.getElementById('contact-nom')?.value.trim()     || '';
  const email   = document.getElementById('contact-email')?.value.trim()   || '';
  const sujet   = document.getElementById('contact-sujet')?.value          || '';
  const message = document.getElementById('contact-message')?.value.trim() || '';

  if (!nom || !email || !message) {
    showNotification('⚠️', 'Champs manquants', 'Remplissez tous les champs.', 'error'); return;
  }

  try {
    const res  = await fetch(`${API}/contact`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nom, email, sujet, message }),
    });
    const data = await res.json();

    if (!res.ok) { showNotification('❌', 'Erreur', data.erreur, 'error'); return; }
    showNotification('📩', 'Message envoyé !', 'Nous répondrons sous 24h.', 'success');

  } catch {
    showNotification('⚠️', 'Erreur réseau', 'Vérifiez votre connexion.', 'error');
  }
}

// ══════════════════════════════════════════════════════
//  NOTIFICATIONS
// ══════════════════════════════════════════════════════

function showNotification(icon, text, sub, type) {
  const notif = document.getElementById('notification');
  document.getElementById('notif-icon').textContent = icon;
  document.getElementById('notif-text').textContent = text;
  document.getElementById('notif-sub').textContent  = sub;
  notif.className = `notification ${type} show`;
  setTimeout(() => notif.classList.remove('show'), 3500);
}

// ── Mes commandes ──────────────────────────────────────
async function voirCommandes() {
  if (!authToken) { openAuth('login'); return; }
  try {
    const res  = await fetch(`${API}/commandes`, { headers: headers() });
    const data = await res.json();
    if (!res.ok) return;
    const nb = data.commandes?.length || 0;
    showNotification('📦', `${nb} commande(s)`, nb ? 'Historique chargé.' : 'Aucune commande.', 'success');
  } catch { /* silencieux */ }
}

// ══════════════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  // Fixer la date max du champ naissance (aujourd'hui - 18 ans)
  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() - 18);
  const input = document.getElementById('reg-naissance');
  if (input) input.max = maxDate.toISOString().split('T')[0];

  // Restaurer la session
  if (authToken && currentUser) {
    updateUIConnecte();
  } else {
    updateUIDeconnecte();
  }

  chargerPanier();
});
