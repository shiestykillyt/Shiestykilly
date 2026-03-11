let sidebarOpen = true;
  let cartCount = 3;
  let totalBase = 105.60;
  let currentTotal = 105.60;
  let promoApplied = false;

  const promoCodes = {
    'VAPORA10': { type: 'percent', value: 10, label: '-10%' },
    'BIENVENUE': { type: 'percent', value: 15, label: '-15%' },
    'VAPE20': { type: 'flat', value: 20, label: '-20€' },
    'NEWCLIENT': { type: 'percent', value: 20, label: '-20%' },
  };

  function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const main = document.getElementById('main');
    const btn = document.getElementById('toggle-btn');
    sidebarOpen = !sidebarOpen;
    sidebar.classList.toggle('collapsed', !sidebarOpen);
    main.classList.toggle('expanded', !sidebarOpen);
    btn.style.left = sidebarOpen
      ? 'calc(var(--sidebar-w) + 16px)'
      : '16px';
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
  }

  function switchTab(tab, btn) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('tab-' + tab).classList.add('active');
    btn.classList.add('active');
  }

  function toggleFaq(el) {
    const item = el.closest('.faq-item');
    const wasOpen = item.classList.contains('open');
    document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
    if (!wasOpen) item.classList.add('open');
  }

  function selectMethod(el, method) {
    document.querySelectorAll('.pay-method').forEach(m => m.classList.remove('active'));
    el.classList.add('active');
    document.getElementById('card-form').style.display = method === 'card' ? 'block' : 'none';
    document.getElementById('paypal-form').style.display = method === 'paypal' ? 'block' : 'none';
    document.getElementById('apple-form').style.display = method === 'apple' ? 'block' : 'none';
    document.getElementById('card-preview').style.display = method === 'card' ? 'block' : 'none';
  }

  function formatCardNumber(input) {
    let v = input.value.replace(/\D/g, '').substring(0, 16);
    let formatted = v.match(/.{1,4}/g)?.join(' ') || v;
    input.value = formatted;
    const display = v.padEnd(16, '•');
    const groups = display.match(/.{1,4}/g);
    document.getElementById('card-num-display').textContent = groups?.join(' ') || '•••• •••• •••• ••••';
    const net = document.getElementById('card-network');
    if (v.startsWith('4')) net.textContent = '💙';
    else if (v.startsWith('5') || v.startsWith('2')) net.textContent = '🔴';
    else if (v.startsWith('3')) net.textContent = '🟡';
    else net.textContent = '💳';
  }

  function formatExpiry(input) {
    let v = input.value.replace(/\D/g, '').substring(0, 4);
    if (v.length >= 2) v = v.slice(0, 2) + '/' + v.slice(2);
    input.value = v;
    document.getElementById('card-exp-display').textContent = v || 'MM/AA';
  }

  function applyPromo() {
    if (promoApplied) {
      showPromoMsg('Un code promo est déjà appliqué.', 'error'); return;
    }
    const code = document.getElementById('promo-input').value.trim().toUpperCase();
    const msg = document.getElementById('promo-msg');
    if (!code) { showPromoMsg('Entrez un code promo.', 'error'); return; }
    if (promoCodes[code]) {
      const promo = promoCodes[code];
      let discount = promo.type === 'percent'
        ? totalBase * promo.value / 100
        : Math.min(promo.value, totalBase);
      discount = Math.round(discount * 100) / 100;
      currentTotal = Math.max(0, totalBase - discount);
      promoApplied = true;
      document.getElementById('discount-row').style.display = 'flex';
      document.getElementById('discount-val').textContent = `-${discount.toFixed(2).replace('.',',')} €`;
      document.getElementById('total-display').textContent = `${currentTotal.toFixed(2).replace('.',',')} €`;
      document.getElementById('pay-amount').textContent = `${currentTotal.toFixed(2).replace('.',',')} €`;
      showPromoMsg(`✅ Code "${code}" appliqué ! ${promo.label}`, 'success');
    } else {
      showPromoMsg('❌ Code invalide. Réessayez.', 'error');
    }
  }

  function showPromoMsg(text, type) {
    const el = document.getElementById('promo-msg');
    el.textContent = text;
    el.className = 'promo-msg ' + type;
  }

  function processPayment() {
    showNotification('🎉', 'Paiement accepté !', `Merci pour votre commande — ${currentTotal.toFixed(2).replace('.',',')} €`, 'success');
    setTimeout(() => {
      document.getElementById('total-display').textContent = '0,00 €';
      document.getElementById('pay-amount').textContent = '0,00 €';
      cartCount = 0;
      document.getElementById('cart-count').textContent = '0';
    }, 1500);
  }

  function addToCart(name, price) {
    cartCount++;
    document.getElementById('cart-count').textContent = cartCount;
    showNotification('✅', name, `Ajouté au panier — ${price}`, 'success');
  }

  function sendContact() {
    showNotification('📩', 'Message envoyé !', 'Nous vous répondrons sous 24h.', 'success');
  }

  function showNotification(icon, text, sub, type) {
    const notif = document.getElementById('notification');
    document.getElementById('notif-icon').textContent = icon;
    document.getElementById('notif-text').textContent = text;
    document.getElementById('notif-sub').textContent = sub;
    notif.className = `notification ${type} show`;
    setTimeout(() => notif.classList.remove('show'), 3500);
  }