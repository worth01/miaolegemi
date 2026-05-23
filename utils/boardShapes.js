// utils/boardShapes.js
// P1: 异形棋盘坐标系重构 — 合法格子集合定义
// 所有层的牌只能放在合法格子内，从根本上保证异形轮廓正确

(function () {
  'use strict';

  // ═══════════════════════════════════════
  // 标准棋盘（6行×8列，所有格子合法）
  // ═══════════════════════════════════════
  function shapeStandard() {
    var cells = [];
    for (var r = 1; r <= 6; r++) {
      for (var c = 1; c <= 8; c++) {
        cells.push({ row: r, col: c });
      }
    }
    return cells;
  }

  // ═══════════════════════════════════════
  // 爱心棋盘（第4,14,24关） — 30格
  // ═══════════════════════════════════════
  function shapeLove() {
    return [
      { row: 1, col: 2 }, { row: 1, col: 3 }, { row: 1, col: 6 }, { row: 1, col: 7 },
      { row: 2, col: 1 }, { row: 2, col: 2 }, { row: 2, col: 3 }, { row: 2, col: 4 },
      { row: 2, col: 5 }, { row: 2, col: 6 }, { row: 2, col: 7 }, { row: 2, col: 8 },
      { row: 3, col: 1 }, { row: 3, col: 2 }, { row: 3, col: 3 }, { row: 3, col: 4 },
      { row: 3, col: 5 }, { row: 3, col: 6 }, { row: 3, col: 7 }, { row: 3, col: 8 },
      { row: 4, col: 2 }, { row: 4, col: 3 }, { row: 4, col: 4 },
      { row: 4, col: 5 }, { row: 4, col: 6 }, { row: 4, col: 7 },
      { row: 5, col: 3 }, { row: 5, col: 4 }, { row: 5, col: 5 }, { row: 5, col: 6 },
      { row: 6, col: 4 }, { row: 6, col: 5 },
    ];
  }

  // ═══════════════════════════════════════
  // 菱形棋盘（第7,17,27关） — 24格
  // ═══════════════════════════════════════
  function shapeDiamond() {
    return [
      { row: 1, col: 4 }, { row: 1, col: 5 },
      { row: 2, col: 3 }, { row: 2, col: 4 }, { row: 2, col: 5 }, { row: 2, col: 6 },
      { row: 3, col: 2 }, { row: 3, col: 3 }, { row: 3, col: 4 },
      { row: 3, col: 5 }, { row: 3, col: 6 }, { row: 3, col: 7 },
      { row: 4, col: 2 }, { row: 4, col: 3 }, { row: 4, col: 4 },
      { row: 4, col: 5 }, { row: 4, col: 6 }, { row: 4, col: 7 },
      { row: 5, col: 3 }, { row: 5, col: 4 }, { row: 5, col: 5 }, { row: 5, col: 6 },
      { row: 6, col: 4 }, { row: 6, col: 5 },
    ];
  }

  // ═══════════════════════════════════════
  // 波斯双域棋盘（第10,20,30关） — 42格
  // 中间第4列空白，左右独立
  // zoneId: 0=左域(col≤3)  1=右域(col≥5)
  // ═══════════════════════════════════════
  function shapePersia() {
    var cells = [];
    for (var r = 1; r <= 6; r++) {
      for (var c = 1; c <= 3; c++) {
        cells.push({ row: r, col: c, zoneId: 0 });
      }
      for (var c2 = 5; c2 <= 8; c2++) {
        cells.push({ row: r, col: c2, zoneId: 1 });
      }
    }
    return cells;
  }

  // ═══════════════════════════════════════
  // 蝴蝶棋盘（第2,12,22关） — 30格
  // ═══════════════════════════════════════
  function shapeButterfly() {
    return [
      { row: 1, col: 2 }, { row: 1, col: 3 }, { row: 1, col: 6 }, { row: 1, col: 7 },
      { row: 2, col: 1 }, { row: 2, col: 2 }, { row: 2, col: 3 }, { row: 2, col: 4 },
      { row: 2, col: 5 }, { row: 2, col: 6 }, { row: 2, col: 7 }, { row: 2, col: 8 },
      { row: 3, col: 1 }, { row: 3, col: 2 }, { row: 3, col: 7 }, { row: 3, col: 8 },
      { row: 4, col: 1 }, { row: 4, col: 2 }, { row: 4, col: 7 }, { row: 4, col: 8 },
      { row: 5, col: 2 }, { row: 5, col: 3 }, { row: 5, col: 4 },
      { row: 5, col: 5 }, { row: 5, col: 6 }, { row: 5, col: 7 },
      { row: 6, col: 3 }, { row: 6, col: 4 }, { row: 6, col: 5 }, { row: 6, col: 6 },
    ];
  }

  // ═══════════════════════════════════════
  // 花瓣棋盘（第6,16,26关） — 30格
  // ═══════════════════════════════════════
  function shapePetal() {
    return [
      { row: 1, col: 3 }, { row: 1, col: 4 }, { row: 1, col: 5 }, { row: 1, col: 6 },
      { row: 2, col: 2 }, { row: 2, col: 3 }, { row: 2, col: 4 },
      { row: 2, col: 5 }, { row: 2, col: 6 }, { row: 2, col: 7 },
      { row: 3, col: 1 }, { row: 3, col: 2 }, { row: 3, col: 3 },
      { row: 3, col: 6 }, { row: 3, col: 7 }, { row: 3, col: 8 },
      { row: 4, col: 1 }, { row: 4, col: 2 }, { row: 4, col: 3 },
      { row: 4, col: 6 }, { row: 4, col: 7 }, { row: 4, col: 8 },
      { row: 5, col: 2 }, { row: 5, col: 3 }, { row: 5, col: 4 },
      { row: 5, col: 5 }, { row: 5, col: 6 }, { row: 5, col: 7 },
      { row: 6, col: 3 }, { row: 6, col: 4 }, { row: 6, col: 5 }, { row: 6, col: 6 },
    ];
  }

  // ═══════════════════════════════════════
  // 沙漏棋盘（第9,19,29关） — 36格
  // ═══════════════════════════════════════
  function shapeHourglass() {
    return [
      { row: 1, col: 1 }, { row: 1, col: 2 }, { row: 1, col: 3 }, { row: 1, col: 4 },
      { row: 1, col: 5 }, { row: 1, col: 6 }, { row: 1, col: 7 }, { row: 1, col: 8 },
      { row: 2, col: 2 }, { row: 2, col: 3 }, { row: 2, col: 4 },
      { row: 2, col: 5 }, { row: 2, col: 6 }, { row: 2, col: 7 },
      { row: 3, col: 3 }, { row: 3, col: 4 }, { row: 3, col: 5 }, { row: 3, col: 6 },
      { row: 4, col: 3 }, { row: 4, col: 4 }, { row: 4, col: 5 }, { row: 4, col: 6 },
      { row: 5, col: 2 }, { row: 5, col: 3 }, { row: 5, col: 4 },
      { row: 5, col: 5 }, { row: 5, col: 6 }, { row: 5, col: 7 },
      { row: 6, col: 1 }, { row: 6, col: 2 }, { row: 6, col: 3 }, { row: 6, col: 4 },
      { row: 6, col: 5 }, { row: 6, col: 6 }, { row: 6, col: 7 }, { row: 6, col: 8 },
    ];
  }

  // ═══════════════════════════════════════
  // 关卡 → 棋盘形状 映射表（30关完整配置）
  // ═══════════════════════════════════════
  var LEVEL_SHAPE_MAP = {
    1:  'standard',
    2:  'butterfly',
    3:  'standard',
    4:  'love',
    5:  'standard',
    6:  'petal',
    7:  'diamond',
    8:  'standard',
    9:  'hourglass',
    10: 'persia',
    11: 'standard',
    12: 'butterfly',
    13: 'standard',
    14: 'love',
    15: 'standard',
    16: 'petal',
    17: 'diamond',
    18: 'standard',
    19: 'hourglass',
    20: 'persia',
    21: 'standard',
    22: 'butterfly',
    23: 'standard',
    24: 'love',
    25: 'standard',
    26: 'petal',
    27: 'diamond',
    28: 'standard',
    29: 'hourglass',
    30: 'persia',
  };

  // ═══════════════════════════════════════
  // 形状注册表
  // ═══════════════════════════════════════
  var BOARD_SHAPES = {
    standard:  shapeStandard,
    love:      shapeLove,
    diamond:   shapeDiamond,
    persia:    shapePersia,
    butterfly: shapeButterfly,
    petal:     shapePetal,
    hourglass: shapeHourglass,
  };

  /**
   * 统一获取棋盘形状的合法格子集合
   * @param {string} shapeKey — 'standard'|'love'|'diamond'|'persia'|'butterfly'|'petal'|'hourglass'
   * @returns {Array<{row:1-6, col:1-8, zoneId?:0|1}>} 合法格子数组
   */
  function getBoardShape(shapeKey) {
    var fn = BOARD_SHAPES[shapeKey];
    if (!fn) {
      console.error('[BoardShapes] 未知棋盘形状: ' + shapeKey + '，回退到 standard');
      fn = BOARD_SHAPES.standard;
    }
    return fn();
  }

  /**
   * 获取关卡对应的棋盘形状键名
   * @param {number} levelNum — 关卡号 1-30
   * @returns {string} shapeKey
   */
  function getShapeKeyForLevel(levelNum) {
    // 轮回机制：31关起循环复用
    var cycleLevel = ((levelNum - 1) % 30) + 1;
    return LEVEL_SHAPE_MAP[cycleLevel] || 'standard';
  }

  /**
   * 获取各形状的合法格子数量（用于验证）
   * @returns {Object}
   */
  function getShapeCellCounts() {
    var counts = {};
    Object.keys(BOARD_SHAPES).forEach(function (key) {
      counts[key] = BOARD_SHAPES[key]().length;
    });
    return counts;
  }

  // 浏览器环境
  if (typeof window !== 'undefined') {
    window.BoardShapes = {
      getBoardShape: getBoardShape,
      getShapeKeyForLevel: getShapeKeyForLevel,
      getShapeCellCounts: getShapeCellCounts,
      BOARD_SHAPES: BOARD_SHAPES,
      LEVEL_SHAPE_MAP: LEVEL_SHAPE_MAP,
    };
  }

  // CommonJS 环境
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      getBoardShape: getBoardShape,
      getShapeKeyForLevel: getShapeKeyForLevel,
      getShapeCellCounts: getShapeCellCounts,
      BOARD_SHAPES: BOARD_SHAPES,
      LEVEL_SHAPE_MAP: LEVEL_SHAPE_MAP,
    };
  }
})();
