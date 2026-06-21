/**
 * P5: 喵了个咪 API 客户端
 * 用于连接后端服务
 */

// API配置 — 自动适配：本地用 localhost:3001，线上用当前域名
const API_BASE_URL = (() => {
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') {
    return 'http://' + host + ':3001/api';
  }
  return window.location.origin + '/api';
})();
const TOKEN_KEY = 'miaolegemi_token';

// Token管理
function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

// 通用请求函数
async function request(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers
  };

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers
    });
  } catch (e) {
    throw new Error('网络连接失败，请检查网络或稍后重试');
  }

  let data;
  try {
    data = await response.json();
  } catch (e) {
    throw new Error('服务器响应异常，请稍后重试');
  }

  if (!response.ok) {
    throw new Error(data.error || '请求失败');
  }

  return data;
}

// MiaolegemiAPI - 完整的API接口
const MiaolegemiAPI = {
  // ═══════════════════════════════════════
  // 认证相关
  // ═══════════════════════════════════════

  /**
   * 注册
   * @param {string} username - 用户名
   * @param {string} password - 密码
   * @returns {Promise<{token: string, user: object}>}
   */
  register: async (username, password) => {
    const data = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    setToken(data.token);
    return data;
  },

  /**
   * 登录
   * @param {string} username - 用户名
   * @param {string} password - 密码
   * @returns {Promise<{token: string, user: object, fishBalance: number}>}
   */
  login: async (username, password) => {
    const data = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    setToken(data.token);
    return data;
  },

  /**
   * 获取当前用户信息
   * @returns {Promise<object>}
   */
  getProfile: async () => {
    return request('/auth/me');
  },

  /**
   * 更新昵称
   * @param {string} nickname - 新昵称
   * @returns {Promise<object>}
   */
  updateNickname: async (nickname) => {
    return request('/auth/nickname', {
      method: 'PUT',
      body: JSON.stringify({ nickname })
    });
  },

  /**
   * 检查是否已登录
   * @returns {boolean}
   */
  isLoggedIn: () => {
    return !!getToken();
  },

  /**
   * 登出
   */
  logout: () => {
    clearToken();
  },

  /**
   * 清除Token
   */
  clearToken,

  // ═══════════════════════════════════════
  // 猫咪相关
  // ═══════════════════════════════════════

  /**
   * 获取所有猫咪
   * @returns {Promise<Array>}
   */
  getCats: async () => {
    const [battle, home, bag] = await Promise.all([
      request('/cats/battle'),
      request('/cats/home'),
      request('/cats/bag')
    ]);
    return [...(battle.cats || []), ...(home.cats || []), ...(bag.cats || [])];
  },

  /**
   * 获取出战席猫咪
   * @returns {Promise<Array>}
   */
  getBattleCats: async () => {
    const data = await request('/cats/battle');
    return data.cats || [];
  },

  /**
   * 获取家园猫咪
   * @returns {Promise<Array>}
   */
  getHomeCats: async () => {
    const data = await request('/cats/home');
    return data.cats || [];
  },

  /**
   * 获取包裹区猫咪
   * @returns {Promise<Array>}
   */
  getBagCats: async () => {
    const data = await request('/cats/bag');
    return data.cats || [];
  },

  /**
   * 获取猫咪详情
   * @param {string} catId - 猫咪ID
   * @returns {Promise<object>}
   */
  getCatDetail: async (catId) => {
    const data = await request(`/cats/${catId}`);
    return data.cat;
  },

  /**
   * 领养猫咪（包裹区 → 家园）
   * @param {string} catId - 猫咪ID
   * @returns {Promise<object>}
   */
  adoptCat: async (catId) => {
    return request(`/cats/${catId}/adopt`, { method: 'POST' });
  },

  /**
   * 部署猫咪（家园 → 出战席）
   * @param {string} catId - 猫咪ID
   * @param {number} slot - 出战位 (1-3)
   * @returns {Promise<object>}
   */
  deployCat: async (catId, slot) => {
    return request(`/cats/${catId}/deploy`, {
      method: 'POST',
      body: JSON.stringify({ slot })
    });
  },

  /**
   * 撤回猫咪（出战席 → 家园）
   * @param {string} catId - 猫咪ID
   * @returns {Promise<object>}
   */
  withdrawCat: async (catId) => {
    return request(`/cats/${catId}/withdraw`, { method: 'POST' });
  },

  /**
   * 喂食猫咪
   * @param {string} catId - 猫咪ID
   * @returns {Promise<object>}
   */
  feedCat: async (catId) => {
    return request(`/cats/${catId}/feed`, { method: 'POST' });
  },

  /**
   * 批量喂食
   * @param {string} catId - 猫咪ID
   * @returns {Promise<object>}
   */
  feedCatAll: async (catId) => {
    return request(`/cats/${catId}/feed-all`, { method: 'POST' });
  },

  /**
   * 送走猫咪（家园 → 告别）
   * @param {string} catId - 猫咪ID
   * @returns {Promise<object>}
   */
  releaseCat: async (catId) => {
    return request(`/cats/${catId}/release`, { method: 'POST' });
  },

  /**
   * 获取血统记录
   * @param {string} serialId - 序列号ID
   * @returns {Promise<Array>}
   */
  getLineage: async (serialId) => {
    const data = await request(`/cats/${serialId}/lineage`);
    return data.lineage || [];
  },

  // ═══════════════════════════════════════
  // 抽卡相关
  // ═══════════════════════════════════════

  /**
   * 抽卡
   * @param {string} type - 'single' 或 'ten'
   * @returns {Promise<{cats: Array, fishBalance: number, pityCount: number}>}
   */
  pullGacha: async (type = 'single') => {
    return request('/gacha/pull', {
      method: 'POST',
      body: JSON.stringify({ type })
    });
  },

  /**
   * 获取保底进度
   * @returns {Promise<{pityCount: number, nextPity: number, isPity: boolean}>}
   */
  getPity: async () => {
    return request('/gacha/pity');
  },

  /**
   * 获取猫咪品种列表
   * @returns {Promise<Array>}
   */
  getSpecies: async () => {
    const data = await request('/gacha/species');
    return data.species || [];
  },

  // ═══════════════════════════════════════
  // 游戏相关
  // ═══════════════════════════════════════

  /**
   * 开始游戏
   * @returns {Promise<{seed: string, date: string, battleCats: Array}>}
   */
  startGame: async () => {
    return request('/game/start', { method: 'POST' });
  },

  /**
   * 提交游戏结果
   * @param {object} result - 游戏结果
   * @returns {Promise<object>}
   */
  endGame: async (result) => {
    return request('/game/end', {
      method: 'POST',
      body: JSON.stringify(result)
    });
  },

  /**
   * 获取今日榜单
   * @returns {Promise<{leaderboard: Array, date: string}>}
   */
  getLeaderboard: async () => {
    return request('/game/leaderboard/today');
  },

  /**
   * 获取历史战绩
   * @param {number} limit - 限制数量
   * @param {number} offset - 偏移量
   * @returns {Promise<{games: Array, total: number}>}
   */
  getGameHistory: async (limit = 20, offset = 0) => {
    return request(`/game/history?limit=${limit}&offset=${offset}`);
  },

  // ═══════════════════════════════════════
  // 用户相关
  // ═══════════════════════════════════════

  /**
   * 获取用户统计
   * @returns {Promise<object>}
   */
  getStats: async () => {
    return request('/user/stats');
  },

  /**
   * 获取里程碑进度
   * @returns {Promise<{milestones: Array}>}
   */
  getMilestones: async () => {
    return request('/user/milestones');
  },

  /**
   * 获取鱼干账本
   * @param {number} limit - 限制数量
   * @param {number} offset - 偏移量
   * @returns {Promise<{records: Array, total: number, balance: number}>}
   */
  getFishHistory: async (limit = 50, offset = 0) => {
    return request(`/user/fish-history?limit=${limit}&offset=${offset}`);
  },

  /**
   * 获取完整游戏状态（猫 + 铃铛 + gameData）
   * @returns {Promise<{cats: Array, bells: number, activeTitle: string, gameData: object}>}
   */
  getState: async () => {
    return request('/user/state');
  },

  /**
   * 同步游戏状态到服务器
   * @param {object} state - { bells, activeTitle, pityCount, gameData }
   * @returns {Promise<{success: boolean}>}
   */
  syncState: async (state) => {
    return request('/user/sync', {
      method: 'POST',
      body: JSON.stringify(state)
    });
  },

  /**
   * 每日签到
   * @returns {Promise<{fishEarned: number, bellsEarned: number, streak: number}>}
   */
  checkin: async () => {
    return request('/user/checkin', {
      method: 'POST'
    });
  },

  /**
   * 查询签到状态
   * @returns {Promise<{checkedIn: boolean, streak: number}>}
   */
  getCheckinStatus: async () => {
    return request('/user/checkin');
  },

  // ═══════════════════════════════════════
  // 通用请求方法
  // ═══════════════════════════════════════

  /**
   * 通用GET请求
   * @param {string} endpoint - API端点
   * @returns {Promise<any>}
   */
  get: (endpoint) => request(endpoint),

  /**
   * 通用POST请求
   * @param {string} endpoint - API端点
   * @param {object} data - 请求数据
   * @returns {Promise<any>}
   */
  post: (endpoint, data = {}) => request(endpoint, {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  /**
   * 通用PUT请求
   * @param {string} endpoint - API端点
   * @param {object} data - 请求数据
   * @returns {Promise<any>}
   */
  put: (endpoint, data = {}) => request(endpoint, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),

  /**
   * 通用DELETE请求
   * @param {string} endpoint - API端点
   * @returns {Promise<any>}
   */
  delete: (endpoint) => request(endpoint, { method: 'DELETE' }),

  // ═══════════════════════════════════════
  // 工具方法
  // ═══════════════════════════════════════

  /**
   * 清理猫咪性格数据（修正旧数据）
   * @returns {Promise<{success: boolean, message: string, details: Array}>}
   */
  cleanupCatPersonalities: async () => {
    return request('/cats/cleanup-personalities', { method: 'POST' });
  },
};

// 导出
window.MiaolegemiAPI = MiaolegemiAPI;
