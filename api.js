/* ═══════════════════════════════════════
   喵了个咪 · API 工具层
   封装所有后端接口，带 localStorage 回退
   ═══════════════════════════════════════ */

const API_BASE = 'http://localhost:3001/api';

const MiaolegemiAPI = {
  // ─── Token 管理 ───
  getToken() { return localStorage.getItem('miaolegemi_token'); },
  setToken(t) { localStorage.setItem('miaolegemi_token', t); },
  clearToken() { localStorage.removeItem('miaolegemi_token'); },
  isLoggedIn() { return !!this.getToken(); },

  // ─── 通用请求 ───
  async request(path, opts = {}) {
    const token = this.getToken();
    const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    try {
      const res = await fetch(`${API_BASE}${path}`, { ...opts, headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `请求失败 (${res.status})`);
      return data;
    } catch (e) {
      if (e.message.includes('Failed to fetch') || e.message.includes('NetworkError')) {
        throw new Error('无法连接服务器，使用本地模式');
      }
      throw e;
    }
  },

  // ─── 认证 ───
  async register(username, password) {
    const data = await this.request('/auth/register', {
      method: 'POST', body: JSON.stringify({ username, password }),
    });
    this.setToken(data.token);
    return data;
  },

  async login(username, password) {
    const data = await this.request('/auth/login', {
      method: 'POST', body: JSON.stringify({ username, password }),
    });
    this.setToken(data.token);
    return data;
  },

  logout() { this.clearToken(); },

  // ─── 用户 ───
  async getProfile() { return this.request('/user/profile'); },

  async checkin() { return this.request('/user/checkin', { method: 'POST' }); },

  async getMilestones() { return this.request('/user/milestones'); },

  // ─── 猫咪 ───
  async getCats() { return this.request('/cats'); },
  async getNurturing() { return this.request('/cats/nurturing'); },
  async getBag() { return this.request('/cats/bag'); },

  async adoptCat(catId) {
    return this.request(`/cats/${catId}/adopt`, { method: 'POST' });
  },

  async feedCat(catId) {
    return this.request(`/cats/${catId}/feed`, { method: 'POST' });
  },

  async releaseCat(catId) {
    return this.request(`/cats/${catId}/release`, { method: 'POST' });
  },

  async getCatDetail(catId) {
    return this.request(`/cats/${catId}/detail`);
  },

  async getLineage(serialId) {
    return this.request(`/cats/${serialId}/lineage`);
  },

  async getMemorial() { return this.request('/cats/memorial'); },

  // ─── 抽卡 ───
  async pullGacha() { return this.request('/gacha/pull', { method: 'POST' }); },
  async firstPullGacha() { return this.request('/gacha/first-pull', { method: 'POST' }); },
  async getPity() { return this.request('/gacha/pity'); },

  // ─── 消消乐 ───
  async startGame() { return this.request('/game/start', { method: 'POST' }); },
  async endGame(result) {
    return this.request('/game/end', { method: 'POST', body: JSON.stringify(result) });
  },
};
