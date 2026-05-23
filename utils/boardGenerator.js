// utils/boardGenerator.js
// 棋盘牌型生成器：配额随机 + 可解性验证
// P0: 棋盘系统重构 - 第二章

(function () {
  'use strict';

  // ═══════════════════════════════════════
  // 关卡配置常量
  // ═══════════════════════════════════════

  var LAYER_CONFIG = {
    '1-10':  { 0: 20, 1: 16, 2: 12 },
    '11-20': { 0: 22, 1: 20, 2: 12 },
    '21-30': { 0: 26, 1: 22, 2: 12 },
  };

  var LEVEL_CONFIG_TABLE = {
    '1-10':  { totalCount: 48, typeCount: 8,  types: ['毛线球','猫粮碗','饮水机','储存桶','猫砂盆','宠物梳子','猫抓板','猫窝'] },
    '11-20': { totalCount: 54, typeCount: 9,  types: ['毛线球','猫爬架','猫粮碗','饮水机','储存桶','猫砂盆','宠物梳子','猫抓板','猫窝'] },
    '21-30': { totalCount: 60, typeCount: 10, types: ['毛线球','猫抓板','猫粮碗','饮水机','储存桶','猫砂盆','宠物梳子','猫爬架','猫窝','猫罐头'] },
  };

  // 第1关教学关：简化配置
  var LEVEL_1_CONFIG = { totalCount: 12, typeCount: 3, types: ['猫爪印','猫罐头','逗猫棒'] };

  /**
   * 获取关卡段配置
   */
  function getLevelSegmentConfig(levelNum) {
    if (levelNum === 1) return LEVEL_1_CONFIG;
    if (levelNum >= 2 && levelNum <= 10) return LEVEL_CONFIG_TABLE['1-10'];
    if (levelNum >= 11 && levelNum <= 20) return LEVEL_CONFIG_TABLE['11-20'];
    return LEVEL_CONFIG_TABLE['21-30'];
  }

  /**
   * 获取层卡牌数量配置
   */
  function getLayerConfig(levelNum) {
    if (levelNum === 1) return { 0: 6, 1: 4, 2: 2 };
    if (levelNum >= 1 && levelNum <= 10) return LAYER_CONFIG['1-10'];
    if (levelNum >= 11 && levelNum <= 20) return LAYER_CONFIG['11-20'];
    return LAYER_CONFIG['21-30'];
  }

  // ═══════════════════════════════════════
  // 核心：配额随机生成
  // ═══════════════════════════════════════

  /**
   * 生成合法牌组（配额随机 + 可解性验证）
   */
  function generateTiles(totalCount, typeCount, maxRetry) {
    maxRetry = maxRetry || 10;
    for (var attempt = 1; attempt <= maxRetry; attempt++) {
      var tiles = buildQuotaTiles(totalCount, typeCount);
      shuffleArray(tiles);
      if (isSolvable(tiles, typeCount)) {
        console.log('[BoardGen] 第' + attempt + '次生成成功');
        return tiles;
      }
    }
    console.warn('[BoardGen] 超过重试次数，返回未验证局面');
    return buildQuotaTiles(totalCount, typeCount);
  }

  /**
   * 按配额生成牌型（保证每种图案数量是3的倍数）
   */
  function buildQuotaTiles(totalCount, typeCount) {
    var tiles = [];
    var remaining = totalCount;

    // 每种图案先分配3张
    for (var t = 0; t < typeCount && remaining >= 3; t++) {
      tiles.push(t, t, t);
      remaining -= 3;
    }

    // 剩余数量按3的倍数随机补充
    while (remaining >= 3) {
      var t = Math.floor(Math.random() * typeCount);
      tiles.push(t, t, t);
      remaining -= 3;
    }

    return tiles;
  }

  /**
   * Fisher-Yates 洗牌算法
   */
  function shuffleArray(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
  }

  /**
   * 可解性验证：检查所有图案数量是否为3的倍数
   */
  function isSolvable(tiles, typeCount) {
    var counts = new Array(typeCount).fill(0);
    for (var i = 0; i < tiles.length; i++) {
      counts[tiles[i]]++;
    }
    for (var j = 0; j < counts.length; j++) {
      if (counts[j] % 3 !== 0) return false;
    }
    return true;
  }

  /**
   * 为指定关卡生成完整牌型（带类型名）
   */
  function generateLevelTiles(levelNum, maxRetry) {
    var config = getLevelSegmentConfig(levelNum);
    var tiles = generateTiles(config.totalCount, config.typeCount, maxRetry);
    return {
      tiles: tiles,
      typeNames: config.types,
      typeCount: config.typeCount,
      totalCount: config.totalCount,
      layerConfig: getLayerConfig(levelNum),
    };
  }

  // 浏览器环境：仅暴露 BoardGenerator 到全局
  if (typeof window !== 'undefined') {
    window.BoardGenerator = {
      generateTiles: generateTiles,
      buildQuotaTiles: buildQuotaTiles,
      shuffleArray: shuffleArray,
      isSolvable: isSolvable,
      generateLevelTiles: generateLevelTiles,
      getLevelSegmentConfig: getLevelSegmentConfig,
      getLayerConfig: getLayerConfig,
    };
  }

  // CommonJS 环境
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      generateTiles: generateTiles,
      buildQuotaTiles: buildQuotaTiles,
      shuffleArray: shuffleArray,
      isSolvable: isSolvable,
      generateLevelTiles: generateLevelTiles,
      getLevelSegmentConfig: getLevelSegmentConfig,
      getLayerConfig: getLayerConfig,
    };
  }
})();
