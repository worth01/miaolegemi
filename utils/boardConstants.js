// utils/boardConstants.js
// P0: 棋盘渲染系统 — 核心视觉常量
// 顶点对中坐标系 + 5级冷暖渐变边框
//
// 坐标系说明（顶点对中 Vertex-on-Center）：
//   - 上层牌的左上角落在下层牌的中心点上
//   - 每张底层牌最多被4张上层牌覆盖
//   - 高层自然向内收缩，永不超出底座边界
//   - 牌坐标存储绝对像素值 (card.x, card.y)
//   - genBaseCoords() 按 HW/HH 步长生成底座层合法位置
//   - getValidUpperPositions() 提供4个候选上层位置

(function () {
  'use strict';

  // ═══════════════════════════════════════
  // 核心尺寸常量
  // ═══════════════════════════════════════
  var TW = 50;            // 牌宽 = 格子宽
  var TH = 50;            // 牌高 = 格子高
  var HW = 25;            // 顶点对中偏移量（半格），上层牌每层偏移 HW
  var HH = 25;            // 顶点对中偏移量（半格）
  var CELL_W = 50;        // 底座层格子宽度（8列，每格 50px）
  var CELL_H = 50;        // 底座层格子高度（6行，每格 50px）
  var BOARD_MARGIN = 12;  // 对称四边距 12px

  // ═══════════════════════════════════════
  // 5级冷暖渐变边框色
  // blockedCount = 该牌上方有多少层牌遮挡
  // 消除上层牌后 blockedCount ↓ → 颜色自动升级
  // ═══════════════════════════════════════
  var LAYER_BORDER_COLORS = [
    '#4ECDC4',  // blockedCount=0：青 — 可点击，附带呼吸脉冲动画
    '#7BC67E',  // blockedCount=1：黄绿 — 1层在上
    '#F7B731',  // blockedCount=2：琥珀 — 2层在上
    '#E05252',  // blockedCount=3：红 — 3层在上
    '#9B59B6',  // blockedCount≥4：紫 — 4层在上，最深处锁定
  ];

  // ═══════════════════════════════════════
  // 逐层图片滤镜参数（亮度/饱和度衰减）
  // ═══════════════════════════════════════
  var LAYER_FILTERS = [
    { brightness: 1.0,  saturation: 1.0  },  // 层0：原始
    { brightness: 0.92, saturation: 0.95 },  // 层1：轻微衰减
    { brightness: 0.85, saturation: 0.88 },  // 层2：中度衰减
    { brightness: 0.78, saturation: 0.80 },  // 层3：深度衰减
    { brightness: 0.70, saturation: 0.70 },  // 层4+：最深衰减
  ];

  // ═══════════════════════════════════════
  // 棋盘尺寸（底座层内容区）
  // BOARD_W = (8-1)*HW + TW = 7*30+60 = 270
  // BOARD_H = (6-1)*HH + TH = 5*30+60 = 210
  // ═══════════════════════════════════════
  var BOARD_CONTENT_W = (8 - 1) * HW + TW;   // 7×25+50 = 225
  var BOARD_CONTENT_H = (6 - 1) * HH + TH;   // 5×25+50 = 175

  // ═══════════════════════════════════════
  // 工具函数
  // ═══════════════════════════════════════

  /**
   * 获取层级对应的边框颜色
   * @param {number} layer — 层级 0-based
   * @returns {string} 十六进制颜色
   */
  function getLayerBorderColor(layer) {
    var idx = Math.min(layer, LAYER_BORDER_COLORS.length - 1);
    return LAYER_BORDER_COLORS[idx];
  }

  /**
   * 获取层级对应的图片滤镜参数
   * @param {number} layer — 层级 0-based
   * @returns {{brightness:number, saturation:number}}
   */
  function getLayerFilter(layer) {
    var idx = Math.min(layer, LAYER_FILTERS.length - 1);
    return LAYER_FILTERS[idx];
  }

  /**
   * 根据可用宽度动态计算牌尺寸（小屏降级）
   * @param {number} availW — 可用宽度(px)
   * @returns {number} 动态牌尺寸，最大60px
   */
  function calcDynamicTW(availW) {
    return Math.min(60, Math.max(48, Math.floor(availW / 5.5 / 4) * 4));
  }

  /**
   * 生成底座层（layer=0）的合法像素坐标集合
   * 按 HW/HH 步长遍历棋盘网格
   * @param {Array<{row:1-6, col:1-8}>} validCells — 合法格子列表
   * @returns {Array<{x:number, y:number, row:number, col:number}>}
   */
  function genBaseCoords(validCells) {
    var coords = [];
    for (var i = 0; i < validCells.length; i++) {
      var cell = validCells[i];
      coords.push({
        x: BOARD_MARGIN + (cell.col - 1) * HW,
        y: BOARD_MARGIN + (cell.row - 1) * HH,
        row: cell.row,
        col: cell.col,
      });
    }
    return coords;
  }

  /**
   * 获取上层牌的4个候选顶点对中位置
   * 上层牌的左上角落在下层牌的中心点
   * @param {{x:number, y:number}} baseCoord — 底座牌像素坐标
   * @returns {Array<{x:number, y:number}>} 4个候选位置（右下/左下/右上/左上）
   */
  function getValidUpperPositions(baseCoord) {
    return [
      { x: baseCoord.x + HW, y: baseCoord.y + HH },  // 右下
      { x: baseCoord.x - HW, y: baseCoord.y + HH },  // 左下
      { x: baseCoord.x + HW, y: baseCoord.y - HH },  // 右上
      { x: baseCoord.x - HW, y: baseCoord.y - HH },  // 左上
    ];
  }

  /**
   * 判断像素坐标是否在棋盘形状内
   * @param {{x:number, y:number}} pos — 像素坐标
   * @param {Set<string>} shapeSet — 合法位置集合 (key: "x,y")
   * @returns {boolean}
   */
  function isInShape(pos, shapeSet) {
    return shapeSet.has(pos.x + ',' + pos.y);
  }

  /**
   * 将棋盘形状的合法格子集合转换为像素位置集合（用于上层牌位置约束）
   * 以 HW/HH 为粒度，存储每张底座牌覆盖的所有像素格索引
   * @param {Array<{row:1-6, col:1-8}>} validCells — 形状合法格子列表
   * @returns {Set<string>} 像素格索引集合 (key: "pxIdx_pyIdx")
   */
  function getShapePixelSet(validCells) {
    var set = new Set();
    for (var i = 0; i < validCells.length; i++) {
      var cell = validCells[i];
      var bx = BOARD_MARGIN + (cell.col - 1) * HW;
      var by = BOARD_MARGIN + (cell.row - 1) * HH;
      // 存储该底座牌覆盖的 2×2 个半格索引（每张牌覆盖 4 个 HW×HH 格子）
      for (var dx = 0; dx <= 1; dx++) {
        for (var dy = 0; dy <= 1; dy++) {
          var ix = Math.floor((bx + dx * HW) / HW);
          var iy = Math.floor((by + dy * HH) / HH);
          set.add(ix + '_' + iy);
        }
      }
    }
    return set;
  }

  /**
   * 检查上层牌在顶点对中坐标系下是否在形状边界内
   * @param {{row:number, col:number, layer:number}} slot — 候选槽位
   * @param {Set<string>} shapeSet — 形状像素格集合
   * @returns {boolean}
   */
  function isUpperSlotInShape(slot, shapeSet) {
    var px = BOARD_MARGIN + (slot.col - 1) * HW + slot.layer * HW;
    var py = BOARD_MARGIN + (slot.row - 1) * HH + slot.layer * HH;
    // 检查牌的 4 个角是否至少有一个在形状内
    var corners = [
      Math.floor(px / HW) + '_' + Math.floor(py / HH),
      Math.floor((px + TW) / HW) + '_' + Math.floor(py / HH),
      Math.floor(px / HW) + '_' + Math.floor((py + TH) / HH),
      Math.floor((px + TW) / HW) + '_' + Math.floor((py + TH) / HH),
    ];
    for (var ci = 0; ci < corners.length; ci++) {
      if (shapeSet.has(corners[ci])) return true;
    }
    return false;
  }

  // ═══════════════════════════════════════
  // 导出
  // ═══════════════════════════════════════
  var api = {
    TW: TW,
    TH: TH,
    HW: HW,
    HH: HH,
    CELL_W: CELL_W,
    CELL_H: CELL_H,
    BOARD_MARGIN: BOARD_MARGIN,
    BOARD_CONTENT_W: BOARD_CONTENT_W,
    BOARD_CONTENT_H: BOARD_CONTENT_H,
    LAYER_BORDER_COLORS: LAYER_BORDER_COLORS,
    LAYER_FILTERS: LAYER_FILTERS,
    getLayerBorderColor: getLayerBorderColor,
    getLayerFilter: getLayerFilter,
    calcDynamicTW: calcDynamicTW,
    genBaseCoords: genBaseCoords,
    getValidUpperPositions: getValidUpperPositions,
    isInShape: isInShape,
    getShapePixelSet: getShapePixelSet,
    isUpperSlotInShape: isUpperSlotInShape,
  };

  if (typeof window !== 'undefined') {
    window.BoardConstants = api;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})();
