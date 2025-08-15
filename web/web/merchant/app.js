(() => { console.log('[Foody] auth patch loaded');
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
  const on = (sel, evt, fn) => { const el = $(sel); if (el) el.addEventListener(evt, fn, { passive: false }); };

  const state = {
    api: (window.__FOODY__ && window.__FOODY__.FOODY_API) || window.foodyApi || 'https://foodyback-production.up.railway.app',
    rid: localStorage.getItem('foody_restaurant_id') || '',
    key: localStorage.getItem('foody_key') || '',
  };

  function activateTab(tab) {
    $$('.seg-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    $$('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    $$('.pane').forEach(p => p.classList.toggle('active', p.id === tab));
  }

  function toggleLogout(visible){
    const btn = $('#logoutBtn'); if (!btn) return;
    btn.style.display = visible ? '' : 'none';
  }

  function gate() {
    if (!state.rid || !state.key) {
      activateTab('auth');
      const tabs = $('#tabs'); if (tabs) tabs.style.display = 'none';
      const bn = $('.bottom-nav'); if (bn) bn.style.display = 'none';
      toggleLogout(false);
      return false;
    }
    const tabs = $('#tabs'); if (tabs) tabs.style.display = '';
    const bn = $('.bottom-nav'); if (bn) bn.style.display = '';
    activateTab('offers');
    toggleLogout(true);
    return true;
  }

  async function api(path, { method='GET', headers={}, body=null } = {}) {
    const url = `${state.api}${path}`;
    const h = { 'Content-Type': 'application/json', ...headers };
    if (state.key) h['X-Foody-Key'] = state.key;
    try {
      const res = await fetch(url, { method, headers: h, body });
      const ct = res.headers.get('content-type')||'';
      let data = null;
      if (ct.includes('application/json')) { data = await res.json().catch(()=>null); }
      else { data = await res.text().catch(()=>null); }
      if (!res.ok) {
        let msg = `${res.status}`;
        if (data && typeof data === 'object' && (data.detail || data.message)) msg += ` — ${data.detail || data.message}`;
        throw new Error(msg);
      }
      return data;
    } catch (err) {
      if (String(err.message).includes('Failed to fetch')) {
        throw new Error('net — Не удалось связаться с сервером');
      }
      throw err;
    }
  }

  function bindAuthToggle(){
    const loginForm = $('#loginForm');
    const regForm = $('#registerForm');
    const modeLogin = $('#mode-login');
    const modeReg = $('#mode-register');
    const forms = $('.auth-forms');
    function apply(){
      if (modeLogin && modeLogin.checked) {
        loginForm.style.display='grid'; regForm.style.display='none';
        forms.setAttribute('data-mode','login');
      } else {
        regForm.style.display='grid'; loginForm.style.display='none';
        forms.setAttribute('data-mode','register');
      }
      hideError('#loginError'); hideError('#registerError');
    }
    if (modeLogin) modeLogin.addEventListener('change', apply);
    if (modeReg) modeReg.addEventListener('change', apply);
    apply();
  }

  function showError(id, text){
    const el = $(id); if (!el) return;
    el.textContent = text;
    el.classList.remove('hidden');
  }
  function hideError(id){
    const el = $(id); if (!el) return;
    el.classList.add('hidden');
    el.textContent = '';
  }

  on('#registerForm','submit', async (e) => {
    e.preventDefault();
    hideError('#registerError');
    const fd = new FormData(e.currentTarget);
    const payload = { name: fd.get('name')?.trim(), login: fd.get('login')?.trim(), password: fd.get('password')?.trim() };
    try {
      const r = await api('/api/v1/merchant/register_public', { method: 'POST', body: JSON.stringify(payload) });
      if (!r.restaurant_id || !r.api_key) throw new Error('Unexpected API response');
      state.rid = r.restaurant_id; state.key = r.api_key;
      localStorage.setItem('foody_restaurant_id', state.rid);
      localStorage.setItem('foody_key', state.key);
      gate();
    } catch (err) {
      const msg = String(err.message||'');
      if (/409/.test(msg)) showError('#registerError','Такой телефон/email уже зарегистрирован.');
      else if (/password/i.test(msg)) showError('#registerError','Пароль слишком короткий (мин. 6 символов).');
      else if (/phone|email/i.test(msg)) showError('#registerError','Введите корректный телефон или email.');
      else showError('#registerError', msg.replace(/^\d+\s?—?\s?/, '') || 'Ошибка регистрации');
      console.error(err);
    }
  });

  on('#loginForm','submit', async (e) => {
    e.preventDefault();
    hideError('#loginError');
    const fd = new FormData(e.currentTarget);
    const payload = { login: fd.get('login')?.trim(), password: fd.get('password')?.trim() };
    try {
      const r = await api('/api/v1/merchant/login', { method: 'POST', body: JSON.stringify(payload) });
      state.rid = r.restaurant_id; state.key = r.api_key;
      localStorage.setItem('foody_restaurant_id', state.rid);
      localStorage.setItem('foody_key', state.key);
      gate();
    } catch (err) {
      let msg = String(err.message||'');
      if (/401/.test(msg) || /invalid login or password/i.test(msg)) {
        showError('#loginError', 'Неверный логин или пароль.');
      } else if (/400/.test(msg) && /login and password are required/i.test(msg)) {
        showError('#loginError', 'Введите логин и пароль.');
      } else if (/net —/.test(msg)) {
        showError('#loginError', 'Не удалось связаться с сервером. Проверьте соединение.');
      } else {
        showError('#loginError', msg.replace(/^\d+\s?—?\s?/, '') || 'Ошибка входа');
      }
      console.error(err);
    }
  });

  on('#tabs','click', (e) => {
    const btn = e.target.closest('.seg-btn'); if (!btn) return;
    if (btn.dataset.tab) activateTab(btn.dataset.tab);
  });
  on('.bottom-nav','click', (e) => {
    const btn = e.target.closest('.nav-btn'); if (!btn) return;
    if (btn.dataset.tab) activateTab(btn.dataset.tab);
  });

  document.addEventListener('DOMContentLoaded', () => {
    bindAuthToggle();
    gate();
  });
})();
