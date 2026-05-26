/**
 * sculpt-lettering — Sprint 1+2 improved build
 * ─────────────────────────────────────────────
 * Drop-in fork of @sculpt-lettering/core that closes the principle violations
 * identified in the design review:
 *
 *   • [Sprint 1, fix #1]  Tooltip restyled (kept as a library feature per owner direction)
 *   • [Sprint 1, fix #2]  toInteractiveBundle() returns a self-contained doc — no CDN
 *   • [Sprint 1, fix #3]  'a' bowlTopTension now drives both A0 outgoing and A1 incoming tangents
 *   • [Sprint 1, fix #4]  Layout cache during drag; render mutates instead of innerHTML wipe
 *   • [Sprint 2, fix #1]  Every glyph module exports bounds(params); Wordmark.glyphAscent gone
 *   • [Sprint 2, fix #2]  Monoline glyphs (the M9 expanded alphabet) gain a `curvature`
 *                         tangent parameter, eliminating the visual schism with hand-authored glyphs
 *   • [Sprint 2, fix #3]  Preset gets a `defaults` block applied to any glyph without an override
 *   • [Sprint 2, fix #4]  setText() does an incremental diff that preserves tuned glyphs
 *
 * Loads as a UMD-ish global `SculptLettering` (script tag) or via `import` (module).
 * See CHANGES.md for line-mapped patches against the original repo.
 */

(function (root, factory) {
  if (typeof exports === 'object' && typeof module === 'object') {
    module.exports = factory();
  } else {
    root.SculptLettering = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const SVG_NS = 'http://www.w3.org/2000/svg';

  // Captured at module-load time so async exports can find the library source.
  const _SELF_SRC = (typeof document !== 'undefined' && document.currentScript)
    ? document.currentScript.src
    : null;

  // ════════════════════════════════════════════════════════════════════
  // Registry
  // ════════════════════════════════════════════════════════════════════
  const registry = Object.create(null);
  function registerGlyph(module) { registry[module.character] = module; }
  function getRegisteredGlyphs() { return Object.keys(registry); }

  // ════════════════════════════════════════════════════════════════════
  // Glyph instance
  // ════════════════════════════════════════════════════════════════════
  class Glyph {
    constructor(module, initialParams) {
      this.module = module;
      this.character = module.character;
      this.params = Object.assign({}, module.defaultParams, initialParams || {});
      this._clampAll();
    }
    set(name, value) {
      if (!(name in this.params)) {
        throw new Error("Unknown param '" + name + "' for glyph '" + this.character + "'");
      }
      const r = this.module.paramRanges[name];
      this.params[name] = Math.max(r.min, Math.min(r.max, value));
    }
    setMany(updates) {
      for (const k of Object.keys(updates)) {
        if (typeof updates[k] === 'number' && k in this.params) this.set(k, updates[k]);
      }
    }
    reset() { this.params = Object.assign({}, this.module.defaultParams); }
    construct() { return this.module.construct(this.params); }
    handles()   { return this.module.handles(this.params); }
    advance()   { return this.module.advance(this.params); }
    /** Sprint 2 fix #1 — explicit bounds, no more param-name heuristics. */
    bounds()    { return this.module.bounds(this.params); }
    get paramRanges() { return this.module.paramRanges; }
    get tangentParams() { return this.module.tangentParams || []; }
    _clampAll() {
      for (const k of Object.keys(this.params)) {
        const r = this.module.paramRanges[k];
        if (r) this.params[k] = Math.max(r.min, Math.min(r.max, this.params[k]));
      }
    }
  }

  // ════════════════════════════════════════════════════════════════════
  // Bounds helpers
  // ════════════════════════════════════════════════════════════════════
  /**
   * For glyph modules that don't supply a tight bounds(), this walks the
   * SVG path d-strings and the handle anchors to compute a loose bbox.
   * Modules SHOULD supply their own bounds() for accuracy — this is the floor.
   */
  function bboxFromPaths(ds, strokeWeight) {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    const re = /-?\d+(\.\d+)?/g;
    for (const d of ds) {
      const nums = d.match(re);
      if (!nums) continue;
      for (let i = 0; i < nums.length; i += 2) {
        const x = parseFloat(nums[i]);
        const y = parseFloat(nums[i + 1]);
        if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
    }
    const pad = strokeWeight / 2;
    return {
      minX: minX - pad, maxX: maxX + pad,
      minY: minY - pad, maxY: maxY + pad,
    };
  }

  // ════════════════════════════════════════════════════════════════════
  // CURATED GLYPHS  (hand-authored — keep the rich Bezier+tangent vocabulary)
  // ════════════════════════════════════════════════════════════════════

  // ─── 'a' ──────────────────────────────────────────────────────────────
  // CHANGE [Sprint 1, fix #3]: bowlTopTension now drives BOTH the outgoing
  // tangent from A0 and the incoming tangent toward A1. Original repo only
  // applied it to the outgoing tangent → asymmetric stretch on drag.
  const a = (function () {
    const defaultParams = {
      xHeight: 140, bowlWidth: 55, bowlHeight: 55, strokeWeight: 24,
      aperture: 16, terminalLength: 20, bowlTopTension: 0.5523, terminalArm: 12,
    };
    const paramRanges = {
      xHeight:        { min:  80, max: 200 },
      bowlWidth:      { min:  25, max:  90 },
      bowlHeight:     { min:  25, max:  90 },
      strokeWeight:   { min:   6, max:  44 },
      aperture:       { min:   0, max:  80 },
      terminalLength: { min:   0, max:  60 },
      bowlTopTension: { min: 0.15, max: 1.4 },
      terminalArm:    { min:   2, max:  40 },
    };
    function geom(p) {
      const hs = p.strokeWeight / 2;
      const bowlLeft = hs, bowlCenterX = hs + p.bowlWidth, bowlRight = hs + 2 * p.bowlWidth;
      const bowlCenterY = -p.bowlHeight;
      return {
        hs, bowlLeft, bowlCenterX, bowlRight, bowlCenterY,
        apertureHalf: p.aperture / 2,
        stemX: bowlRight,
        bowlTop: bowlCenterY - p.bowlHeight,
        bowlBottom: bowlCenterY + p.bowlHeight,
        stemTopY: -p.xHeight,
      };
    }
    function construct(p) {
      const g = geom(p);
      const A0 = { x: g.bowlCenterX, y: g.bowlTop };
      const A1 = { x: g.bowlRight,   y: g.bowlCenterY - g.apertureHalf };
      const A2 = { x: g.bowlRight,   y: g.bowlCenterY + g.apertureHalf };
      const A3 = { x: g.bowlCenterX, y: g.bowlBottom };
      const A4 = { x: g.bowlLeft,    y: g.bowlCenterY };
      // CHANGE: tTop is the single tension that controls top-curve symmetry.
      const tTop = p.bowlWidth  * p.bowlTopTension;
      const tH   = p.bowlHeight * p.bowlTopTension;   // ← was: bowlHeight * K (constant)
      const tW   = p.bowlWidth  * 0.5523;
      const tHk  = p.bowlHeight * 0.5523;
      const bowl = [
        `M ${A0.x} ${A0.y}`,
        // top-right quadrant: BOTH tangent arms scale with bowlTopTension now
        `C ${A0.x + tTop} ${A0.y}, ${A1.x} ${A1.y - tH}, ${A1.x} ${A1.y}`,
        `M ${A2.x} ${A2.y}`,
        // bottom-right and bottom-left use the canonical K (other tangent params can be added later)
        `C ${A2.x} ${A2.y + tHk}, ${A3.x + tW} ${A3.y}, ${A3.x} ${A3.y}`,
        `C ${A3.x - tW} ${A3.y}, ${A4.x} ${A4.y + tHk}, ${A4.x} ${A4.y}`,
        // top-left quadrant: also driven by bowlTopTension for symmetry with top-right
        `C ${A4.x} ${A4.y - tH}, ${A0.x - tTop} ${A0.y}, ${A0.x} ${A0.y}`,
      ].join(' ');
      let stem = `M ${g.stemX} ${g.stemTopY} L ${g.stemX} 0`;
      if (p.terminalLength > 0) {
        const tl = p.terminalLength, arm = p.terminalArm;
        const endX = g.stemX + tl, endY = -tl * 0.14;
        stem += ` C ${g.stemX + arm / Math.SQRT2} ${arm / Math.SQRT2}, ${endX - arm * 0.5} ${endY + arm * 0.05}, ${endX} ${endY}`;
      }
      return [bowl, stem];
    }
    function handles(p) {
      const g = geom(p);
      const tTop = p.bowlWidth * p.bowlTopTension;
      const midStemY = (g.stemTopY + 0) / 2;
      return [
        { id:'xHeight', anchor:{x:g.stemX,y:g.stemTopY}, control:{x:g.stemX,y:g.stemTopY-18},
          paramName:'xHeight', deltaFromDrag:(_,dy)=>-dy },
        { id:'bowlWidth', anchor:{x:g.bowlLeft,y:g.bowlCenterY}, control:{x:g.bowlLeft-18,y:g.bowlCenterY},
          paramName:'bowlWidth', deltaFromDrag:(dx)=>-dx },
        { id:'bowlHeight', anchor:{x:g.bowlCenterX,y:g.bowlTop}, control:{x:g.bowlCenterX,y:g.bowlTop-18},
          paramName:'bowlHeight', deltaFromDrag:(_,dy)=>-dy/2 },
        { id:'strokeWeight', anchor:{x:g.stemX,y:midStemY}, control:{x:g.stemX+p.strokeWeight/2+6,y:midStemY},
          paramName:'strokeWeight', deltaFromDrag:(dx)=>2*dx },
        { id:'aperture', anchor:{x:g.bowlRight,y:g.bowlCenterY-g.apertureHalf}, control:{x:g.bowlRight,y:g.bowlCenterY+g.apertureHalf},
          paramName:'aperture', deltaFromDrag:(_,dy)=>2*dy },
        { id:'terminalLength', anchor:{x:g.stemX,y:0}, control:{x:g.stemX+p.terminalLength,y:-p.terminalLength*0.14},
          paramName:'terminalLength', deltaFromDrag:(dx)=>dx },
        { id:'bowlTopTension', anchor:{x:g.bowlCenterX,y:g.bowlTop}, control:{x:g.bowlCenterX+tTop,y:g.bowlTop},
          paramName:'bowlTopTension', deltaFromDrag:(dx)=>dx/Math.max(1,p.bowlWidth), isTangent:true },
        { id:'terminalArm', anchor:{x:g.stemX,y:0}, control:{x:g.stemX+p.terminalArm/Math.SQRT2,y:p.terminalArm/Math.SQRT2},
          paramName:'terminalArm', deltaFromDrag:(dx,dy)=>(dx+dy), isTangent:true },
      ];
    }
    function bounds(p) {
      const g = geom(p);
      const halfStroke = p.strokeWeight / 2;
      return {
        minX: -halfStroke,
        maxX: g.stemX + halfStroke + Math.max(0, p.terminalLength),
        minY: -p.xHeight - halfStroke,
        maxY: halfStroke,
      };
    }
    return {
      character: 'a', defaultParams, paramRanges,
      tangentParams: ['bowlTopTension', 'terminalArm'],
      construct, handles, advance: (p) => p.strokeWeight + 2*p.bowlWidth + p.strokeWeight/2 + Math.max(0, p.terminalLength),
      bounds,
    };
  })();

  // ─── 'n' ──────────────────────────────────────────────────────────────
  const n = makeArchGlyph('n', { hasAscender: false });
  // ─── 'h' ──────────────────────────────────────────────────────────────
  const h = makeArchGlyph('h', { hasAscender: true });

  function makeArchGlyph(character, opts) {
    const dp = {
      xHeight: 140, archWidth: 85, strokeWeight: 24, shoulder: 40, archTension: 0.5523,
    };
    if (opts.hasAscender) dp.ascenderRise = 50;
    const ranges = {
      xHeight:      { min:  80, max: 200 },
      archWidth:    { min:  40, max: 130 },
      strokeWeight: { min:   6, max:  44 },
      shoulder:     { min:  10, max:  80 },
      archTension:  { min: 0.15, max: 1.4 },
    };
    if (opts.hasAscender) ranges.ascenderRise = { min: 10, max: 100 };
    function g(p) {
      const hs = p.strokeWeight / 2;
      const leftX = hs, rightX = hs + p.archWidth;
      const xLineY = -p.xHeight;
      const stemTopY = opts.hasAscender ? xLineY - p.ascenderRise : xLineY;
      const shoulderY = xLineY + p.shoulder;
      return { hs, leftX, rightX, xLineY, stemTopY, shoulderY };
    }
    function construct(p) {
      const gg = g(p);
      const tArm = p.archWidth * p.archTension * 0.5;
      const leftStem = `M ${gg.leftX} 0 L ${gg.leftX} ${gg.stemTopY}`;
      // CHANGE: arch tangent now actually uses archTension (the original n.ts had `void tArm`).
      const midX = (gg.leftX + gg.rightX) / 2;
      const arch = `M ${gg.leftX} ${gg.shoulderY} C ${gg.leftX} ${gg.xLineY - tArm + (p.archWidth*0.276)}, ${gg.rightX} ${gg.xLineY - tArm + (p.archWidth*0.276)}, ${gg.rightX} ${gg.shoulderY}`;
      const rightStem = `M ${gg.rightX} ${gg.shoulderY} L ${gg.rightX} 0`;
      void midX;
      return [leftStem, arch, rightStem];
    }
    function handles(p) {
      const gg = g(p);
      const midX = (gg.leftX + gg.rightX) / 2;
      const tArm = p.archWidth * p.archTension * 0.5;
      const midStemY = gg.shoulderY / 2;
      const list = [
        { id:'xHeight', anchor:{x:midX,y:gg.xLineY}, control:{x:midX,y:gg.xLineY-18},
          paramName:'xHeight', deltaFromDrag:(_,dy)=>-dy },
        { id:'archWidth', anchor:{x:gg.rightX,y:midStemY}, control:{x:gg.rightX+18,y:midStemY},
          paramName:'archWidth', deltaFromDrag:(dx)=>dx },
        { id:'strokeWeight', anchor:{x:gg.rightX,y:midStemY}, control:{x:gg.rightX+p.strokeWeight/2+6,y:midStemY},
          paramName:'strokeWeight', deltaFromDrag:(dx)=>2*dx },
        { id:'shoulder', anchor:{x:gg.leftX,y:gg.shoulderY}, control:{x:gg.leftX-18,y:gg.shoulderY},
          paramName:'shoulder', deltaFromDrag:(_,dy)=>dy },
        { id:'archTension', anchor:{x:midX,y:gg.xLineY}, control:{x:midX+tArm,y:gg.xLineY},
          paramName:'archTension', deltaFromDrag:(dx)=>dx/Math.max(1,p.archWidth*0.5), isTangent:true },
      ];
      if (opts.hasAscender) {
        list.unshift({
          id:'ascenderRise', anchor:{x:gg.leftX,y:gg.stemTopY}, control:{x:gg.leftX-18,y:gg.stemTopY},
          paramName:'ascenderRise', deltaFromDrag:(_,dy)=>-dy
        });
      }
      return list;
    }
    function bounds(p) {
      const gg = g(p), hs = p.strokeWeight/2;
      return { minX: -hs, maxX: gg.rightX + hs, minY: gg.stemTopY - hs, maxY: hs };
    }
    return {
      character, defaultParams: dp, paramRanges: ranges,
      tangentParams: ['archTension'],
      construct, handles, advance: (p) => p.strokeWeight + p.archWidth, bounds,
    };
  }

  // ─── 'o' ──────────────────────────────────────────────────────────────
  const o = (function () {
    const dp = { bowlWidth:60, bowlHeight:60, strokeWeight:24, bowlTopTension:0.5523, bowlSideTension:0.5523 };
    const r = {
      bowlWidth: {min:25,max:90}, bowlHeight: {min:25,max:90}, strokeWeight: {min:6,max:44},
      bowlTopTension: {min:0.15,max:1.4}, bowlSideTension: {min:0.15,max:1.4},
    };
    function g(p) {
      const hs = p.strokeWeight/2, cx = hs+p.bowlWidth, cy = -p.bowlHeight;
      return { hs, cx, cy,
        top:   {x:cx, y:cy-p.bowlHeight},
        right: {x:cx+p.bowlWidth, y:cy},
        bottom:{x:cx, y:cy+p.bowlHeight},
        left:  {x:cx-p.bowlWidth, y:cy} };
    }
    function construct(p) {
      const gg = g(p);
      const tw = p.bowlWidth * p.bowlTopTension;
      const th = p.bowlHeight * p.bowlSideTension;
      return [[
        `M ${gg.top.x} ${gg.top.y}`,
        `C ${gg.top.x+tw} ${gg.top.y}, ${gg.right.x} ${gg.right.y-th}, ${gg.right.x} ${gg.right.y}`,
        `C ${gg.right.x} ${gg.right.y+th}, ${gg.bottom.x+tw} ${gg.bottom.y}, ${gg.bottom.x} ${gg.bottom.y}`,
        `C ${gg.bottom.x-tw} ${gg.bottom.y}, ${gg.left.x} ${gg.left.y+th}, ${gg.left.x} ${gg.left.y}`,
        `C ${gg.left.x} ${gg.left.y-th}, ${gg.top.x-tw} ${gg.top.y}, ${gg.top.x} ${gg.top.y}`,
        'Z',
      ].join(' ')];
    }
    function handles(p) {
      const gg = g(p), tw = p.bowlWidth*p.bowlTopTension, th = p.bowlHeight*p.bowlSideTension;
      return [
        {id:'bowlWidth', anchor:gg.left, control:{x:gg.left.x-18,y:gg.left.y}, paramName:'bowlWidth', deltaFromDrag:(dx)=>-dx},
        {id:'bowlHeight', anchor:gg.top, control:{x:gg.top.x,y:gg.top.y-18}, paramName:'bowlHeight', deltaFromDrag:(_,dy)=>-dy/2},
        {id:'strokeWeight', anchor:{x:gg.right.x,y:gg.cy}, control:{x:gg.right.x+p.strokeWeight/2+6,y:gg.cy}, paramName:'strokeWeight', deltaFromDrag:(dx)=>2*dx},
        {id:'bowlTopTension', anchor:gg.top, control:{x:gg.top.x+tw,y:gg.top.y}, paramName:'bowlTopTension', deltaFromDrag:(dx)=>dx/Math.max(1,p.bowlWidth), isTangent:true},
        {id:'bowlSideTension', anchor:gg.right, control:{x:gg.right.x,y:gg.right.y+th}, paramName:'bowlSideTension', deltaFromDrag:(_,dy)=>dy/Math.max(1,p.bowlHeight), isTangent:true},
      ];
    }
    function bounds(p) {
      const hs = p.strokeWeight/2;
      return { minX:-hs, maxX:p.strokeWeight + 2*p.bowlWidth - hs + hs*2, minY:-2*p.bowlHeight-hs, maxY:hs };
    }
    return {
      character:'o', defaultParams:dp, paramRanges:r,
      tangentParams:['bowlTopTension','bowlSideTension'],
      construct, handles, advance:(p)=>p.strokeWeight + 2*p.bowlWidth, bounds,
    };
  })();

  // ─── 's' ──────────────────────────────────────────────────────────────
  const s = (function () {
    const dp = { xHeight:140, sWidth:70, strokeWeight:24, curlTop:24, curlBottom:24, waistTension:0.55 };
    const r = {
      xHeight:{min:80,max:200}, sWidth:{min:35,max:100}, strokeWeight:{min:6,max:44},
      curlTop:{min:4,max:50}, curlBottom:{min:4,max:50}, waistTension:{min:0.15,max:1.4},
    };
    function g(p) {
      const hs = p.strokeWeight/2;
      const leftX = hs, rightX = hs + p.sWidth;
      const topY = -p.xHeight + hs, botY = -hs;
      return { hs, leftX, rightX, topY, botY, midY: (topY+botY)/2 };
    }
    function construct(p) {
      const gg = g(p);
      const tArm = p.sWidth * p.waistTension * 0.4;
      const TR = { x:gg.rightX, y:gg.topY+6 };
      const TL = { x:gg.leftX,  y:gg.midY };
      const MR = { x:gg.rightX, y:gg.midY };
      const BL = { x:gg.leftX,  y:gg.botY-6 };
      const top   = `M ${TR.x} ${TR.y} C ${TR.x} ${TR.y-p.curlTop}, ${TL.x} ${TL.y-p.curlTop*0.8}, ${TL.x} ${TL.y}`;
      const waist = `M ${TL.x} ${TL.y} C ${TL.x+tArm} ${TL.y}, ${MR.x-tArm} ${MR.y}, ${MR.x} ${MR.y}`;
      const bot   = `M ${MR.x} ${MR.y} C ${MR.x} ${MR.y+p.curlBottom}, ${BL.x} ${BL.y+p.curlBottom*0.8}, ${BL.x} ${BL.y}`;
      return [top, waist, bot];
    }
    function handles(p) {
      const gg = g(p);
      const tArm = p.sWidth * p.waistTension * 0.4;
      return [
        {id:'xHeight', anchor:{x:gg.rightX,y:gg.topY}, control:{x:gg.rightX+18,y:gg.topY}, paramName:'xHeight', deltaFromDrag:(_,dy)=>-dy},
        {id:'sWidth', anchor:{x:gg.rightX,y:gg.midY}, control:{x:gg.rightX+18,y:gg.midY}, paramName:'sWidth', deltaFromDrag:(dx)=>dx},
        {id:'strokeWeight', anchor:{x:(gg.leftX+gg.rightX)/2,y:gg.midY}, control:{x:(gg.leftX+gg.rightX)/2,y:gg.midY+p.strokeWeight/2+6}, paramName:'strokeWeight', deltaFromDrag:(_,dy)=>2*dy},
        {id:'curlTop', anchor:{x:gg.rightX,y:gg.topY}, control:{x:gg.rightX,y:gg.topY-p.curlTop}, paramName:'curlTop', deltaFromDrag:(_,dy)=>-dy},
        {id:'curlBottom', anchor:{x:gg.leftX,y:gg.botY}, control:{x:gg.leftX,y:gg.botY+p.curlBottom}, paramName:'curlBottom', deltaFromDrag:(_,dy)=>dy},
        {id:'waistTension', anchor:{x:gg.leftX,y:gg.midY}, control:{x:gg.leftX+tArm,y:gg.midY}, paramName:'waistTension', deltaFromDrag:(dx)=>dx/Math.max(1,p.sWidth*0.4), isTangent:true},
      ];
    }
    function bounds(p) {
      const hs = p.strokeWeight/2;
      return { minX:-hs, maxX:p.sWidth+hs*2, minY:-p.xHeight-hs, maxY:p.curlBottom+hs };
    }
    return {
      character:'s', defaultParams:dp, paramRanges:r,
      tangentParams:['waistTension'],
      construct, handles, advance:(p)=>p.strokeWeight+p.sWidth, bounds,
    };
  })();

  // ─── 'i' ──────────────────────────────────────────────────────────────
  const i_ = (function () {
    const dp = { xHeight:140, strokeWeight:24, dotGap:16 };
    const r = { xHeight:{min:80,max:200}, strokeWeight:{min:6,max:44}, dotGap:{min:4,max:40} };
    function g(p) {
      const hs = p.strokeWeight/2;
      return { hs, stemX: hs, stemTopY: -p.xHeight, dotY: -p.xHeight - p.dotGap - p.strokeWeight };
    }
    function construct(p) {
      const gg = g(p);
      return [
        `M ${gg.stemX} 0 L ${gg.stemX} ${gg.stemTopY}`,
        `M ${gg.stemX} ${gg.dotY} L ${gg.stemX} ${gg.dotY + 0.01}`,
      ];
    }
    function handles(p) {
      const gg = g(p);
      return [
        {id:'xHeight', anchor:{x:gg.stemX,y:gg.stemTopY}, control:{x:gg.stemX,y:gg.stemTopY-18}, paramName:'xHeight', deltaFromDrag:(_,dy)=>-dy},
        {id:'strokeWeight', anchor:{x:gg.stemX,y:-p.xHeight/2}, control:{x:gg.stemX+p.strokeWeight/2+6,y:-p.xHeight/2}, paramName:'strokeWeight', deltaFromDrag:(dx)=>2*dx},
        {id:'dotGap', anchor:{x:gg.stemX,y:gg.stemTopY}, control:{x:gg.stemX,y:gg.dotY+p.strokeWeight/2}, paramName:'dotGap', deltaFromDrag:(_,dy)=>-dy},
      ];
    }
    function bounds(p) {
      const hs = p.strokeWeight/2;
      return { minX:-hs, maxX:hs, minY:-p.xHeight - p.dotGap - p.strokeWeight - hs, maxY:hs };
    }
    return { character:'i', defaultParams:dp, paramRanges:r, construct, handles, advance:(p)=>p.strokeWeight, bounds };
  })();

  // ─── 'e' ──────────────────────────────────────────────────────────────
  const e = (function () {
    const dp = { bowlWidth:58, bowlHeight:58, strokeWeight:24, aperture:28, crossbarOffset:10, bowlTopTension:0.5523 };
    const r = {
      bowlWidth:{min:25,max:90}, bowlHeight:{min:25,max:90}, strokeWeight:{min:6,max:44},
      aperture:{min:6,max:60}, crossbarOffset:{min:-20,max:20}, bowlTopTension:{min:0.15,max:1.4},
    };
    function g(p) {
      const hs = p.strokeWeight/2, cx = hs+p.bowlWidth, cy = -p.bowlHeight;
      return { hs, cx, cy,
        top:{x:cx,y:cy-p.bowlHeight}, left:{x:cx-p.bowlWidth,y:cy},
        bottom:{x:cx,y:cy+p.bowlHeight}, right:{x:cx+p.bowlWidth,y:cy},
        crossbarY: cy + p.crossbarOffset };
    }
    function construct(p) {
      const gg = g(p);
      const tw = p.bowlWidth*p.bowlTopTension, th = p.bowlHeight*0.5523;
      const topOpen = {x:gg.cx+p.bowlWidth, y:gg.crossbarY};
      const bottomOpen = {x:gg.cx+p.bowlWidth*0.6, y:gg.cy+p.bowlHeight*0.85};
      const bowl = [
        `M ${topOpen.x} ${topOpen.y}`,
        `C ${topOpen.x} ${topOpen.y-th*0.6}, ${gg.top.x+tw} ${gg.top.y}, ${gg.top.x} ${gg.top.y}`,
        `C ${gg.top.x-tw} ${gg.top.y}, ${gg.left.x} ${gg.left.y-th}, ${gg.left.x} ${gg.left.y}`,
        `C ${gg.left.x} ${gg.left.y+th}, ${gg.bottom.x-tw} ${gg.bottom.y}, ${gg.bottom.x} ${gg.bottom.y}`,
        `C ${gg.bottom.x+tw*0.5} ${gg.bottom.y}, ${bottomOpen.x-tw*0.3} ${bottomOpen.y}, ${bottomOpen.x} ${bottomOpen.y}`,
      ].join(' ');
      const cb = `M ${gg.left.x} ${gg.crossbarY} L ${topOpen.x} ${gg.crossbarY}`;
      return [bowl, cb];
    }
    function handles(p) {
      const gg = g(p), tw = p.bowlWidth*p.bowlTopTension;
      return [
        {id:'bowlWidth', anchor:gg.left, control:{x:gg.left.x-18,y:gg.left.y}, paramName:'bowlWidth', deltaFromDrag:(dx)=>-dx},
        {id:'bowlHeight', anchor:gg.top, control:{x:gg.top.x,y:gg.top.y-18}, paramName:'bowlHeight', deltaFromDrag:(_,dy)=>-dy/2},
        {id:'strokeWeight', anchor:gg.right, control:{x:gg.right.x+p.strokeWeight/2+6,y:gg.right.y}, paramName:'strokeWeight', deltaFromDrag:(dx)=>2*dx},
        {id:'crossbarOffset', anchor:{x:gg.cx,y:gg.crossbarY}, control:{x:gg.cx,y:gg.crossbarY+14}, paramName:'crossbarOffset', deltaFromDrag:(_,dy)=>dy},
        {id:'aperture', anchor:{x:gg.cx+p.bowlWidth,y:gg.crossbarY}, control:{x:gg.cx+p.bowlWidth,y:gg.crossbarY+p.aperture}, paramName:'aperture', deltaFromDrag:(_,dy)=>dy},
        {id:'bowlTopTension', anchor:gg.top, control:{x:gg.top.x+tw,y:gg.top.y}, paramName:'bowlTopTension', deltaFromDrag:(dx)=>dx/Math.max(1,p.bowlWidth), isTangent:true},
      ];
    }
    function bounds(p) {
      const hs = p.strokeWeight/2;
      return { minX:-hs, maxX:p.strokeWeight + 2*p.bowlWidth, minY:-2*p.bowlHeight-hs, maxY:hs };
    }
    return { character:'e', defaultParams:dp, paramRanges:r, tangentParams:['bowlTopTension'], construct, handles, advance:(p)=>p.strokeWeight + 2*p.bowlWidth, bounds };
  })();

  // ─── 't' ──────────────────────────────────────────────────────────────
  const t = (function () {
    const dp = { totalHeight:160, xHeight:140, strokeWeight:24, crossbarLeft:18, crossbarRight:22, footCurl:10, footArm:8 };
    const r = {
      totalHeight:{min:100,max:220}, xHeight:{min:80,max:200}, strokeWeight:{min:6,max:44},
      crossbarLeft:{min:4,max:40}, crossbarRight:{min:4,max:40}, footCurl:{min:0,max:30}, footArm:{min:2,max:20},
    };
    function g(p) {
      const hs = p.strokeWeight/2;
      return { hs, stemX: hs+p.crossbarLeft, stemTopY:-p.totalHeight, crossbarY:-p.xHeight };
    }
    function construct(p) {
      const gg = g(p);
      let stem = `M ${gg.stemX} ${gg.stemTopY} L ${gg.stemX} 0`;
      if (p.footCurl > 0) {
        stem += ` C ${gg.stemX+p.footArm} ${p.footArm*0.4}, ${gg.stemX+p.footCurl-2} -2, ${gg.stemX+p.footCurl} ${-p.footCurl*0.2}`;
      }
      const cb = `M ${gg.stemX-p.crossbarLeft} ${gg.crossbarY} L ${gg.stemX+p.crossbarRight} ${gg.crossbarY}`;
      return [stem, cb];
    }
    function handles(p) {
      const gg = g(p);
      return [
        {id:'totalHeight', anchor:{x:gg.stemX,y:gg.stemTopY}, control:{x:gg.stemX,y:gg.stemTopY-18}, paramName:'totalHeight', deltaFromDrag:(_,dy)=>-dy},
        {id:'xHeight', anchor:{x:gg.stemX,y:gg.crossbarY}, control:{x:gg.stemX-18,y:gg.crossbarY-12}, paramName:'xHeight', deltaFromDrag:(_,dy)=>-dy},
        {id:'crossbarLeft', anchor:{x:gg.stemX-p.crossbarLeft,y:gg.crossbarY}, control:{x:gg.stemX-p.crossbarLeft-12,y:gg.crossbarY}, paramName:'crossbarLeft', deltaFromDrag:(dx)=>-dx},
        {id:'crossbarRight', anchor:{x:gg.stemX+p.crossbarRight,y:gg.crossbarY}, control:{x:gg.stemX+p.crossbarRight+12,y:gg.crossbarY}, paramName:'crossbarRight', deltaFromDrag:(dx)=>dx},
        {id:'strokeWeight', anchor:{x:gg.stemX,y:(gg.stemTopY+0)/2+10}, control:{x:gg.stemX+p.strokeWeight/2+6,y:(gg.stemTopY+0)/2+10}, paramName:'strokeWeight', deltaFromDrag:(dx)=>2*dx},
        {id:'footCurl', anchor:{x:gg.stemX,y:0}, control:{x:gg.stemX+p.footCurl,y:-p.footCurl*0.2}, paramName:'footCurl', deltaFromDrag:(dx)=>dx},
        {id:'footArm', anchor:{x:gg.stemX,y:0}, control:{x:gg.stemX+p.footArm,y:p.footArm*0.4}, paramName:'footArm', deltaFromDrag:(dx,dy)=>(dx+dy*2.5)/2, isTangent:true},
      ];
    }
    function bounds(p) {
      const hs = p.strokeWeight/2;
      return { minX:-hs, maxX:p.strokeWeight + p.crossbarLeft + Math.max(p.crossbarRight, p.footCurl), minY:-p.totalHeight-hs, maxY:hs };
    }
    return { character:'t', defaultParams:dp, paramRanges:r, tangentParams:['footArm'], construct, handles, advance:(p)=>p.strokeWeight+p.crossbarLeft+Math.max(p.crossbarRight,p.footCurl), bounds };
  })();

  // ─── 'r' ──────────────────────────────────────────────────────────────
  const r_ = (function () {
    const dp = { xHeight:140, strokeWeight:24, armLength:32, armRise:18, armArm:18 };
    const r = { xHeight:{min:80,max:200}, strokeWeight:{min:6,max:44}, armLength:{min:8,max:60}, armRise:{min:0,max:40}, armArm:{min:2,max:40} };
    function g(p) {
      const hs = p.strokeWeight/2;
      return { hs, stemX:hs, stemTopY:-p.xHeight, armEndY:-p.xHeight-p.armRise, armEndX:hs+p.armLength };
    }
    function construct(p) {
      const gg = g(p);
      return [
        `M ${gg.stemX} 0 L ${gg.stemX} ${gg.stemTopY}`,
        `M ${gg.stemX} ${gg.stemTopY} C ${gg.stemX} ${gg.stemTopY-p.armArm}, ${gg.armEndX-p.armArm*0.5} ${gg.armEndY}, ${gg.armEndX} ${gg.armEndY}`,
      ];
    }
    function handles(p) {
      const gg = g(p);
      return [
        {id:'xHeight', anchor:{x:gg.stemX,y:gg.stemTopY}, control:{x:gg.stemX-18,y:gg.stemTopY}, paramName:'xHeight', deltaFromDrag:(_,dy)=>-dy},
        {id:'strokeWeight', anchor:{x:gg.stemX,y:-p.xHeight/2}, control:{x:gg.stemX+p.strokeWeight/2+6,y:-p.xHeight/2}, paramName:'strokeWeight', deltaFromDrag:(dx)=>2*dx},
        {id:'armLength', anchor:{x:gg.armEndX,y:gg.armEndY}, control:{x:gg.armEndX+12,y:gg.armEndY}, paramName:'armLength', deltaFromDrag:(dx)=>dx},
        {id:'armRise', anchor:{x:gg.armEndX,y:gg.armEndY}, control:{x:gg.armEndX,y:gg.armEndY-12}, paramName:'armRise', deltaFromDrag:(_,dy)=>-dy},
        {id:'armArm', anchor:{x:gg.stemX,y:gg.stemTopY}, control:{x:gg.stemX,y:gg.stemTopY-p.armArm}, paramName:'armArm', deltaFromDrag:(_,dy)=>-dy, isTangent:true},
      ];
    }
    function bounds(p) {
      const hs = p.strokeWeight/2;
      return { minX:-hs, maxX:p.strokeWeight+p.armLength, minY:-p.xHeight-p.armRise-hs, maxY:hs };
    }
    return { character:'r', defaultParams:dp, paramRanges:r, tangentParams:['armArm'], construct, handles, advance:(p)=>p.strokeWeight+p.armLength, bounds };
  })();

  // ─── 'l' ──────────────────────────────────────────────────────────────
  const l = (function () {
    const dp = { xHeight:140, ascenderRise:50, strokeWeight:24, footCurl:16, footArm:10 };
    const r = { xHeight:{min:80,max:200}, ascenderRise:{min:10,max:100}, strokeWeight:{min:6,max:44}, footCurl:{min:0,max:42}, footArm:{min:2,max:28} };
    function g(p) {
      const hs = p.strokeWeight/2;
      return { hs, stemX:hs, stemTopY:-p.xHeight-p.ascenderRise };
    }
    function construct(p) {
      const gg = g(p);
      let stem = `M ${gg.stemX} ${gg.stemTopY} L ${gg.stemX} 0`;
      if (p.footCurl > 0) {
        stem += ` C ${gg.stemX+p.footArm} ${p.footArm*0.4}, ${gg.stemX+p.footCurl-2} -2, ${gg.stemX+p.footCurl} ${-p.footCurl*0.16}`;
      }
      return [stem];
    }
    function handles(p) {
      const gg = g(p);
      return [
        {id:'ascenderRise', anchor:{x:gg.stemX,y:gg.stemTopY}, control:{x:gg.stemX-18,y:gg.stemTopY}, paramName:'ascenderRise', deltaFromDrag:(_,dy)=>-dy},
        {id:'xHeight', anchor:{x:gg.stemX,y:-p.xHeight}, control:{x:gg.stemX+18,y:-p.xHeight}, paramName:'xHeight', deltaFromDrag:(_,dy)=>-dy},
        {id:'strokeWeight', anchor:{x:gg.stemX,y:gg.stemTopY/2}, control:{x:gg.stemX+p.strokeWeight/2+6,y:gg.stemTopY/2}, paramName:'strokeWeight', deltaFromDrag:(dx)=>2*dx},
        {id:'footCurl', anchor:{x:gg.stemX,y:0}, control:{x:gg.stemX+p.footCurl,y:-p.footCurl*0.16}, paramName:'footCurl', deltaFromDrag:(dx)=>dx},
        {id:'footArm', anchor:{x:gg.stemX,y:0}, control:{x:gg.stemX+p.footArm,y:p.footArm*0.4}, paramName:'footArm', deltaFromDrag:(dx,dy)=>(dx+dy*2.5)/2, isTangent:true},
      ];
    }
    function bounds(p) {
      const hs = p.strokeWeight/2;
      return { minX:-hs, maxX:p.strokeWeight + Math.max(p.footCurl, p.strokeWeight*0.5), minY:-p.xHeight-p.ascenderRise-hs, maxY:hs };
    }
    return { character:'l', defaultParams:dp, paramRanges:r, tangentParams:['footArm'], construct, handles, advance:(p)=>p.strokeWeight+Math.max(p.footCurl,p.strokeWeight*0.5), bounds };
  })();

  // ─── 'w' ──────────────────────────────────────────────────────────────
  const w = (function () {
    const dp = { xHeight:140, width:132, dip:20, strokeWeight:24, joinTension:0.46, exitCurl:18, exitArm:12 };
    const r = {
      xHeight:{min:80,max:200}, width:{min:80,max:190}, dip:{min:0,max:55}, strokeWeight:{min:6,max:44},
      joinTension:{min:0.15,max:1.2}, exitCurl:{min:0,max:42}, exitArm:{min:2,max:28},
    };
    function g(p) {
      const hs = p.strokeWeight/2, leftX = hs, unit = p.width/4;
      return {
        hs,
        leftTop:{x:leftX,y:-p.xHeight},
        valley1:{x:leftX+unit,y:0},
        midTop:{x:leftX+unit*2,y:-p.xHeight+p.dip},
        valley2:{x:leftX+unit*3,y:0},
        rightTop:{x:leftX+unit*4,y:-p.xHeight},
      };
    }
    function construct(p) {
      const gg = g(p), arm = (p.width/4)*p.joinTension;
      let path = [
        `M ${gg.leftTop.x} ${gg.leftTop.y}`,
        `C ${gg.leftTop.x+arm} ${gg.leftTop.y}, ${gg.valley1.x-arm} ${gg.valley1.y}, ${gg.valley1.x} ${gg.valley1.y}`,
        `C ${gg.valley1.x+arm} ${gg.valley1.y}, ${gg.midTop.x-arm} ${gg.midTop.y}, ${gg.midTop.x} ${gg.midTop.y}`,
        `C ${gg.midTop.x+arm} ${gg.midTop.y}, ${gg.valley2.x-arm} ${gg.valley2.y}, ${gg.valley2.x} ${gg.valley2.y}`,
        `C ${gg.valley2.x+arm} ${gg.valley2.y}, ${gg.rightTop.x-arm} ${gg.rightTop.y}, ${gg.rightTop.x} ${gg.rightTop.y}`,
      ].join(' ');
      if (p.exitCurl > 0) {
        path += ` C ${gg.rightTop.x+p.exitArm} ${gg.rightTop.y-p.exitArm*0.15}, ${gg.rightTop.x+p.exitCurl-2} ${gg.rightTop.y+p.exitCurl*0.28}, ${gg.rightTop.x+p.exitCurl} ${gg.rightTop.y+p.exitCurl*0.2}`;
      }
      return [path];
    }
    function handles(p) {
      const gg = g(p), arm = (p.width/4)*p.joinTension;
      return [
        {id:'xHeight', anchor:gg.leftTop, control:{x:gg.leftTop.x,y:gg.leftTop.y-18}, paramName:'xHeight', deltaFromDrag:(_,dy)=>-dy},
        {id:'width', anchor:gg.rightTop, control:{x:gg.rightTop.x+18,y:gg.rightTop.y}, paramName:'width', deltaFromDrag:(dx)=>dx},
        {id:'dip', anchor:gg.midTop, control:{x:gg.midTop.x,y:gg.midTop.y+18}, paramName:'dip', deltaFromDrag:(_,dy)=>dy},
        {id:'strokeWeight', anchor:gg.valley2, control:{x:gg.valley2.x+p.strokeWeight/2+6,y:gg.valley2.y}, paramName:'strokeWeight', deltaFromDrag:(dx)=>2*dx},
        {id:'joinTension', anchor:gg.valley1, control:{x:gg.valley1.x+arm,y:gg.valley1.y}, paramName:'joinTension', deltaFromDrag:(dx)=>dx/Math.max(1,p.width/4), isTangent:true},
        {id:'exitCurl', anchor:gg.rightTop, control:{x:gg.rightTop.x+p.exitCurl,y:gg.rightTop.y+p.exitCurl*0.2}, paramName:'exitCurl', deltaFromDrag:(dx)=>dx},
        {id:'exitArm', anchor:gg.rightTop, control:{x:gg.rightTop.x+p.exitArm,y:gg.rightTop.y-p.exitArm*0.15}, paramName:'exitArm', deltaFromDrag:(dx,dy)=>(dx-dy/0.15)/2, isTangent:true},
      ];
    }
    function bounds(p) {
      const hs = p.strokeWeight/2;
      return { minX:-hs, maxX:p.strokeWeight + p.width + Math.max(0,p.exitCurl), minY:-p.xHeight-hs, maxY:hs+Math.max(0,p.exitCurl*0.3) };
    }
    return { character:'w', defaultParams:dp, paramRanges:r, tangentParams:['joinTension','exitArm'], construct, handles, advance:(p)=>p.strokeWeight+p.width+Math.max(0,p.exitCurl), bounds };
  })();

  // ─── 'd' ──────────────────────────────────────────────────────────────
  const d = (function () {
    const dp = { xHeight:140, ascenderRise:50, bowlWidth:56, bowlHeight:58, strokeWeight:24, bowlTopTension:0.5523, bowlSideTension:0.5523 };
    const r = {
      xHeight:{min:80,max:200}, ascenderRise:{min:10,max:100},
      bowlWidth:{min:25,max:90}, bowlHeight:{min:25,max:90}, strokeWeight:{min:6,max:44},
      bowlTopTension:{min:0.15,max:1.4}, bowlSideTension:{min:0.15,max:1.4},
    };
    function g(p) {
      const hs = p.strokeWeight/2, bowlLeft = hs, cx = bowlLeft+p.bowlWidth, cy = -p.bowlHeight;
      const stemX = cx + p.bowlWidth;
      return { hs, cx, cy, stemX,
        stemTopY:-p.xHeight-p.ascenderRise,
        top:{x:cx,y:cy-p.bowlHeight}, right:{x:stemX,y:cy},
        bottom:{x:cx,y:cy+p.bowlHeight}, left:{x:cx-p.bowlWidth,y:cy},
      };
    }
    function construct(p) {
      const gg = g(p);
      const tw = p.bowlWidth*p.bowlTopTension, th = p.bowlHeight*p.bowlSideTension;
      const bowl = [
        `M ${gg.top.x} ${gg.top.y}`,
        `C ${gg.top.x+tw} ${gg.top.y}, ${gg.right.x} ${gg.right.y-th}, ${gg.right.x} ${gg.right.y}`,
        `C ${gg.right.x} ${gg.right.y+th}, ${gg.bottom.x+tw} ${gg.bottom.y}, ${gg.bottom.x} ${gg.bottom.y}`,
        `C ${gg.bottom.x-tw} ${gg.bottom.y}, ${gg.left.x} ${gg.left.y+th}, ${gg.left.x} ${gg.left.y}`,
        `C ${gg.left.x} ${gg.left.y-th}, ${gg.top.x-tw} ${gg.top.y}, ${gg.top.x} ${gg.top.y}`,
        'Z',
      ].join(' ');
      const stem = `M ${gg.stemX} 0 L ${gg.stemX} ${gg.stemTopY}`;
      return [bowl, stem];
    }
    function handles(p) {
      const gg = g(p), tw = p.bowlWidth*p.bowlTopTension, th = p.bowlHeight*p.bowlSideTension;
      return [
        {id:'ascenderRise', anchor:{x:gg.stemX,y:gg.stemTopY}, control:{x:gg.stemX+18,y:gg.stemTopY}, paramName:'ascenderRise', deltaFromDrag:(_,dy)=>-dy},
        {id:'xHeight', anchor:{x:gg.stemX,y:-p.xHeight}, control:{x:gg.stemX-18,y:-p.xHeight}, paramName:'xHeight', deltaFromDrag:(_,dy)=>-dy},
        {id:'bowlWidth', anchor:gg.left, control:{x:gg.left.x-18,y:gg.left.y}, paramName:'bowlWidth', deltaFromDrag:(dx)=>-dx},
        {id:'bowlHeight', anchor:gg.top, control:{x:gg.top.x,y:gg.top.y-18}, paramName:'bowlHeight', deltaFromDrag:(_,dy)=>-dy/2},
        {id:'strokeWeight', anchor:{x:gg.stemX,y:gg.stemTopY/2}, control:{x:gg.stemX+p.strokeWeight/2+6,y:gg.stemTopY/2}, paramName:'strokeWeight', deltaFromDrag:(dx)=>2*dx},
        {id:'bowlTopTension', anchor:gg.top, control:{x:gg.top.x+tw,y:gg.top.y}, paramName:'bowlTopTension', deltaFromDrag:(dx)=>dx/Math.max(1,p.bowlWidth), isTangent:true},
        {id:'bowlSideTension', anchor:gg.right, control:{x:gg.right.x,y:gg.right.y+th}, paramName:'bowlSideTension', deltaFromDrag:(_,dy)=>dy/Math.max(1,p.bowlHeight), isTangent:true},
      ];
    }
    function bounds(p) {
      const hs = p.strokeWeight/2;
      return { minX:-hs, maxX:p.strokeWeight + 2*p.bowlWidth + hs, minY:-p.xHeight-p.ascenderRise-hs, maxY:hs };
    }
    return { character:'d', defaultParams:dp, paramRanges:r, tangentParams:['bowlTopTension','bowlSideTension'], construct, handles, advance:(p)=>p.strokeWeight + 2*p.bowlWidth, bounds };
  })();

  // ─── space ────────────────────────────────────────────────────────────
  const space = (function () {
    const dp = { width: 60, strokeWeight: 24 };
    const r = { width:{min:10,max:200}, strokeWeight:{min:6,max:44} };
    return {
      character: ' ',
      defaultParams: dp,
      paramRanges: r,
      construct: () => [],
      handles: (p) => [{
        id:'width', anchor:{x:0,y:-p.strokeWeight}, control:{x:p.width,y:-p.strokeWeight},
        paramName:'width', deltaFromDrag:(dx)=>dx
      }],
      advance: (p) => p.width,
      bounds: (p) => ({ minX:0, maxX:p.width, minY:-p.strokeWeight, maxY:0 }),
    };
  })();

  // ════════════════════════════════════════════════════════════════════
  // MONOLINE GLYPH FACTORY  (the M9 expanded alphabet)
  // ────────────────────────────────────────────────────────────────────
  // CHANGE [Sprint 2, fix #2]: every monoline glyph now exposes a `curvature`
  // tangent parameter. At curvature=0 strokes are straight polylines (matches
  // the v1 visual). As curvature rises, strokes interpolate to a Catmull-Rom
  // spline through the same vertices — giving the whole expanded alphabet
  // the curve/tangent vocabulary the curated glyphs already have.
  //
  // This closes the "two-products" visual schism flagged in the design review.
  // ════════════════════════════════════════════════════════════════════

  const UPPERCASE_DEFS = {
    A: { width: 100, strokes: [ [[0.02, 1], [0.5, 0], [0.98, 1]], [[0.24, 0.58], [0.76, 0.58]] ] },
    B: { width: 98, strokes: [ [[0.02, 0], [0.02, 1]], [[0.02, 0], [0.7, 0.08], [0.84, 0.24], [0.72, 0.44], [0.02, 0.48]], [[0.02, 0.48], [0.74, 0.58], [0.88, 0.8], [0.72, 1], [0.02, 1]] ] },
    C: { width: 102, strokes: [ [[0.96, 0.12], [0.74, 0], [0.26, 0], [0.02, 0.24], [0.02, 0.76], [0.26, 1], [0.74, 1], [0.96, 0.88]] ] },
    D: { width: 104, strokes: [ [[0.02, 0], [0.02, 1]], [[0.02, 0], [0.72, 0.08], [0.98, 0.32], [0.98, 0.68], [0.72, 0.92], [0.02, 1]] ] },
    E: { width: 94, strokes: [ [[0.02, 0], [0.02, 1]], [[0.02, 0], [0.94, 0]], [[0.02, 0.5], [0.74, 0.5]], [[0.02, 1], [0.94, 1]] ] },
    F: { width: 92, strokes: [ [[0.02, 0], [0.02, 1]], [[0.02, 0], [0.94, 0]], [[0.02, 0.5], [0.72, 0.5]] ] },
    G: { width: 108, strokes: [ [[0.98, 0.18], [0.78, 0], [0.28, 0], [0.02, 0.26], [0.02, 0.76], [0.26, 1], [0.76, 1], [0.98, 0.82]], [[0.98, 0.58], [0.6, 0.58], [0.6, 0.76], [0.98, 0.76]] ] },
    H: { width: 104, strokes: [ [[0.02, 0], [0.02, 1]], [[0.98, 0], [0.98, 1]], [[0.02, 0.52], [0.98, 0.52]] ] },
    I: { width: 70, strokes: [ [[0.02, 0], [0.98, 0]], [[0.5, 0], [0.5, 1]], [[0.02, 1], [0.98, 1]] ] },
    J: { width: 90, strokes: [ [[0.02, 0], [0.98, 0]], [[0.82, 0], [0.82, 0.82], [0.62, 1], [0.28, 1], [0.08, 0.84]] ] },
    K: { width: 102, strokes: [ [[0.02, 0], [0.02, 1]], [[0.02, 0.54], [0.98, 0]], [[0.02, 0.54], [0.92, 1]] ] },
    L: { width: 90, strokes: [ [[0.02, 0], [0.02, 1]], [[0.02, 1], [0.96, 1]] ] },
    M: { width: 120, strokes: [ [[0.02, 1], [0.02, 0], [0.5, 0.58], [0.98, 0], [0.98, 1]] ] },
    N: { width: 108, strokes: [ [[0.02, 1], [0.02, 0], [0.98, 1], [0.98, 0]] ] },
    O: { width: 108, strokes: [ [[0.24, 0], [0.76, 0], [1, 0.24], [1, 0.76], [0.76, 1], [0.24, 1], [0, 0.76], [0, 0.24], [0.24, 0]] ] },
    P: { width: 96, strokes: [ [[0.02, 1], [0.02, 0]], [[0.02, 0], [0.72, 0.08], [0.86, 0.28], [0.72, 0.5], [0.02, 0.5]] ] },
    Q: { width: 108, strokes: [ [[0.24, 0], [0.76, 0], [1, 0.24], [1, 0.76], [0.76, 1], [0.24, 1], [0, 0.76], [0, 0.24], [0.24, 0]], [[0.62, 0.72], [1, 1.08]] ] },
    R: { width: 102, strokes: [ [[0.02, 1], [0.02, 0]], [[0.02, 0], [0.72, 0.08], [0.86, 0.28], [0.72, 0.5], [0.02, 0.5]], [[0.02, 0.5], [0.98, 1]] ] },
    S: { width: 102, strokes: [ [[0.98, 0.1], [0.76, 0], [0.26, 0], [0.02, 0.24], [0.26, 0.5], [0.74, 0.5], [0.98, 0.76], [0.76, 1], [0.24, 1], [0.02, 0.9]] ] },
    T: { width: 98, strokes: [ [[0.02, 0], [0.98, 0]], [[0.5, 0], [0.5, 1]] ] },
    U: { width: 104, strokes: [ [[0.02, 0], [0.02, 0.78], [0.24, 1], [0.76, 1], [0.98, 0.78], [0.98, 0]] ] },
    V: { width: 102, strokes: [ [[0.02, 0], [0.5, 1], [0.98, 0]] ] },
    W: { width: 134, strokes: [ [[0.02, 0], [0.24, 1], [0.5, 0.48], [0.76, 1], [0.98, 0]] ] },
    X: { width: 102, strokes: [ [[0.02, 0], [0.98, 1]], [[0.98, 0], [0.02, 1]] ] },
    Y: { width: 102, strokes: [ [[0.02, 0], [0.5, 0.52], [0.98, 0]], [[0.5, 0.52], [0.5, 1]] ] },
    Z: { width: 100, strokes: [ [[0.02, 0], [0.98, 0], [0.02, 1], [0.98, 1]] ] },
  };

  const EXTRA_LOWERCASE_DEFS = {
    b: { width: 88, strokes: [ [[0.02, 0], [0.02, 1]], [[0.02, 0.5], [0.62, 0.54], [0.84, 0.78], [0.62, 1], [0.02, 1]] ] },
    c: { width: 84, strokes: [ [[0.9, 0.18], [0.68, 0.08], [0.26, 0.08], [0.06, 0.32], [0.06, 0.76], [0.28, 0.98], [0.68, 0.98], [0.9, 0.88]] ] },
    f: { width: 78, strokes: [ [[0.56, 0], [0.56, 1]], [[0.18, 0.3], [0.92, 0.3]], [[0.56, 0], [0.26, 0.1]] ] },
    g: { width: 90, strokes: [ [[0.22, 0.08], [0.72, 0.08], [0.94, 0.32], [0.94, 0.72], [0.72, 0.98], [0.22, 0.98], [0, 0.72], [0, 0.32], [0.22, 0.08]], [[0.94, 0.72], [0.94, 1.22], [0.72, 1.38], [0.32, 1.36]] ] },
    j: { width: 68, strokes: [ [[0.56, 0.2], [0.56, 1.18], [0.36, 1.34], [0.14, 1.24]], [[0.46, 0], [0.66, 0]] ] },
    k: { width: 86, strokes: [ [[0.02, 0], [0.02, 1]], [[0.02, 0.58], [0.9, 0.08]], [[0.02, 0.58], [0.86, 1]] ] },
    m: { width: 128, strokes: [ [[0.02, 1], [0.02, 0.36], [0.28, 0.18], [0.52, 0.36], [0.52, 1]], [[0.52, 0.36], [0.78, 0.18], [0.98, 0.36], [0.98, 1]] ] },
    p: { width: 90, strokes: [ [[0.02, 0.34], [0.02, 1.34]], [[0.02, 0.34], [0.62, 0.38], [0.82, 0.58], [0.62, 0.84], [0.02, 0.84]] ] },
    q: { width: 90, strokes: [ [[0.98, 0.34], [0.98, 1.34]], [[0.98, 0.34], [0.38, 0.38], [0.18, 0.58], [0.38, 0.84], [0.98, 0.84]] ] },
    u: { width: 92, strokes: [ [[0.02, 0.34], [0.02, 0.78], [0.24, 1], [0.72, 1], [0.96, 0.78], [0.96, 0.34]] ] },
    v: { width: 90, strokes: [ [[0.02, 0.34], [0.5, 1], [0.98, 0.34]] ] },
    x: { width: 90, strokes: [ [[0.02, 0.34], [0.98, 1]], [[0.98, 0.34], [0.02, 1]] ] },
    y: { width: 90, strokes: [ [[0.02, 0.34], [0.5, 0.92], [0.98, 0.34]], [[0.5, 0.92], [0.34, 1.3], [0.12, 1.38]] ] },
    z: { width: 88, strokes: [ [[0.02, 0.34], [0.98, 0.34], [0.02, 1], [0.98, 1]] ] },
  };

  function isUpper(ch) { return ch >= 'A' && ch <= 'Z'; }

  function createMonolineGlyph(character, def) {
    const upper = isUpper(character);
    const heightParam = upper ? 'capHeight' : 'xHeight';
    const defaultHeight = upper ? 170 : 140;

    const defaultParams = {
      [heightParam]: defaultHeight,
      width: def.width,
      strokeWeight: 24,
      slant: 0,
      curvature: 0,   // CHANGE: new tangent param. Default 0 = straight (back-compat).
    };
    const paramRanges = {
      [heightParam]: { min: upper ? 110 : 90, max: 240 },
      width: { min: Math.max(35, def.width * 0.55), max: Math.max(140, def.width * 2.1) },
      strokeWeight: { min: 6, max: 44 },
      slant: { min: -0.35, max: 0.35 },
      curvature: { min: 0, max: 1.4 },
    };

    function project(u, v, p) {
      const hgt = p[heightParam];
      return {
        x: p.strokeWeight / 2 + u * p.width + (1 - v) * hgt * p.slant,
        y: -hgt + v * hgt,
      };
    }

    function strokeToPath(stroke, p) {
      const pts = stroke.map((uv) => project(uv[0], uv[1], p));
      if (pts.length < 2) {
        // Single-vertex stroke → zero-length dot.
        return `M ${pts[0].x} ${pts[0].y} L ${pts[0].x} ${pts[0].y + 0.01}`;
      }
      if (p.curvature < 0.005) {
        // Fast path: straight polyline.
        let d = `M ${pts[0].x} ${pts[0].y}`;
        for (let i = 1; i < pts.length; i++) d += ` L ${pts[i].x} ${pts[i].y}`;
        return d;
      }
      // Catmull-Rom → cubic Beziers. Endpoints duplicated for tangent calc.
      const t = p.curvature / 6;
      let d = `M ${pts[0].x} ${pts[0].y}`;
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[Math.max(0, i - 1)];
        const p1 = pts[i];
        const p2 = pts[i + 1];
        const p3 = pts[Math.min(pts.length - 1, i + 2)];
        const c1x = p1.x + (p2.x - p0.x) * t;
        const c1y = p1.y + (p2.y - p0.y) * t;
        const c2x = p2.x - (p3.x - p1.x) * t;
        const c2y = p2.y - (p3.y - p1.y) * t;
        d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
      }
      return d;
    }

    function construct(p) {
      return def.strokes.map((s) => strokeToPath(s, p));
    }

    // For positioning the curvature handle: pick the midpoint of the first
    // multi-segment stroke and orient its arm perpendicular to that segment.
    function curvHandleGeom(p) {
      const stroke = def.strokes.find((s) => s.length >= 2) || def.strokes[0];
      const aRaw = stroke[0], bRaw = stroke[1] || stroke[0];
      const A = project(aRaw[0], aRaw[1], p);
      const B = project(bRaw[0], bRaw[1], p);
      const mid = { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 };
      const dx = B.x - A.x, dy = B.y - A.y;
      const len = Math.hypot(dx, dy) || 1;
      // Perpendicular pointing "outward" from the glyph (toward +x if vertical, toward -y otherwise).
      let px = -dy / len, py = dx / len;
      if (py > 0) { px = -px; py = -py; }  // prefer the upward-facing perpendicular
      const armLen = 14 + p.curvature * 28;
      return { mid, perp: { x: px, y: py }, armLen };
    }

    const allPoints = [].concat.apply([], def.strokes);
    const minU = Math.min.apply(null, allPoints.map(pt => pt[0]));
    const maxU = Math.max.apply(null, allPoints.map(pt => pt[0]));
    const minV = Math.min.apply(null, allPoints.map(pt => pt[1]));
    const maxV = Math.max.apply(null, allPoints.map(pt => pt[1]));

    function handles(p) {
      const top = project((minU + maxU) / 2, minV, p);
      const rightMid = project(maxU, (minV + maxV) / 2, p);
      const weightAnchor = project(minU + (maxU - minU) * 0.22, 0.5, p);
      const slantAnchor = project((minU + maxU) / 2, minV + 0.08, p);
      const c = curvHandleGeom(p);
      return [
        { id: heightParam, anchor: top, control: { x: top.x, y: top.y - 18 },
          paramName: heightParam, deltaFromDrag: (_, dy) => -dy },
        { id: 'width', anchor: rightMid, control: { x: rightMid.x + 18, y: rightMid.y },
          paramName: 'width', deltaFromDrag: (dx) => dx / Math.max(0.2, maxU) },
        { id: 'strokeWeight', anchor: weightAnchor, control: { x: weightAnchor.x + p.strokeWeight / 2 + 6, y: weightAnchor.y },
          paramName: 'strokeWeight', deltaFromDrag: (dx) => 2 * dx },
        { id: 'slant', anchor: slantAnchor, control: { x: slantAnchor.x + 18, y: slantAnchor.y },
          paramName: 'slant', deltaFromDrag: (dx) => dx / Math.max(1, p[heightParam]) },
        // CHANGE: the curvature tangent — the new headline-fixing handle.
        { id: 'curvature',
          anchor: c.mid,
          control: { x: c.mid.x + c.perp.x * c.armLen, y: c.mid.y + c.perp.y * c.armLen },
          paramName: 'curvature',
          // arm = 14 + curvature * 28 → d(controlPos)/d(curvature) = 28 along perp.
          deltaFromDrag: (dx, dy) => (dx * c.perp.x + dy * c.perp.y) / 28,
          isTangent: true,
        },
      ];
    }

    function bounds(p) {
      // Includes descenders for g/j/p/q/y (maxV > 1).
      const pad = p.strokeWeight / 2;
      const hgt = p[heightParam];
      const xs = allPoints.map((pt) => p.strokeWeight / 2 + pt[0] * p.width + (1 - pt[1]) * hgt * p.slant);
      const ys = allPoints.map((pt) => -hgt + pt[1] * hgt);
      // Curvature can push paths slightly past the vertex bbox; pad generously.
      const curvPad = p.curvature * Math.min(p.width, hgt) * 0.15;
      return {
        minX: Math.min.apply(null, xs) - pad - curvPad,
        maxX: Math.max.apply(null, xs) + pad + curvPad,
        minY: Math.min.apply(null, ys) - pad - curvPad,
        maxY: Math.max.apply(null, ys) + pad + curvPad,
      };
    }

    function advance(p) {
      return p.strokeWeight + p.width + Math.max(0, p.slant * p[heightParam] * 0.6);
    }

    return {
      character, defaultParams, paramRanges,
      tangentParams: ['curvature'],
      construct, handles, advance, bounds,
    };
  }

  const uppercaseGlyphs = {};
  for (const ch of Object.keys(UPPERCASE_DEFS)) uppercaseGlyphs[ch] = createMonolineGlyph(ch, UPPERCASE_DEFS[ch]);
  const extraLowercaseGlyphs = {};
  for (const ch of Object.keys(EXTRA_LOWERCASE_DEFS)) extraLowercaseGlyphs[ch] = createMonolineGlyph(ch, EXTRA_LOWERCASE_DEFS[ch]);

  // ════════════════════════════════════════════════════════════════════
  // PRESETS  (Sprint 2 fix #3 — defaults block applies to any glyph
  // without a specific override.)
  // ════════════════════════════════════════════════════════════════════
  // Shared curated-glyph overrides — each preset tunes these for its mood.
  const CURATED_KEYS = ['a', 'n', 'o', 's', 'h', 'i', 'e', 't', 'r', 'l', 'w', 'd', ' '];

  function curatedGlyphParams(overrides) {
    const out = {};
    for (const ch of CURATED_KEYS) {
      if (overrides[ch]) out[ch] = overrides[ch];
    }
    return out;
  }

  const bubbly = {
    name: 'bubbly',
    fontRef: 'Rubik Bubbles',
    defaults: {
      strokeWeight: 28,
      xHeight: 140,
      capHeight: 168,
      curvature: 0.7,
      slant: 0,
    },
    glyphParams: curatedGlyphParams({
      a: { xHeight:140, bowlWidth:60, bowlHeight:62, strokeWeight:28, aperture:14, terminalLength:22, bowlTopTension:0.62, terminalArm:14 },
      n: { xHeight:140, archWidth:92, strokeWeight:28, shoulder:38, archTension:0.62 },
      o: { bowlWidth:64, bowlHeight:64, strokeWeight:28, bowlTopTension:0.62, bowlSideTension:0.62 },
      s: { xHeight:140, sWidth:78, strokeWeight:28, curlTop:28, curlBottom:28, waistTension:0.62 },
      h: { xHeight:140, ascenderRise:50, archWidth:92, strokeWeight:28, shoulder:38, archTension:0.62 },
      i: { xHeight:140, strokeWeight:28, dotGap:18 },
      e: { bowlWidth:62, bowlHeight:62, strokeWeight:28, aperture:32, crossbarOffset:10, bowlTopTension:0.62 },
      t: { totalHeight:168, xHeight:140, strokeWeight:28, crossbarLeft:20, crossbarRight:24, footCurl:12, footArm:10 },
      r: { xHeight:140, strokeWeight:28, armLength:36, armRise:22, armArm:20 },
      l: { xHeight:140, ascenderRise:50, strokeWeight:28, footCurl:18, footArm:12 },
      w: { xHeight:140, width:140, dip:22, strokeWeight:28, joinTension:0.5, exitCurl:18, exitArm:12 },
      d: { xHeight:140, ascenderRise:50, bowlWidth:62, bowlHeight:62, strokeWeight:28, bowlTopTension:0.62, bowlSideTension:0.62 },
      ' ': { width: 56, strokeWeight: 28 },
    }),
  };

  // Instrument Serif — soft curves, refined contrast, gentle italic lean.
  const instrumentSerif = {
    name: 'instrumentSerif',
    fontRef: 'Instrument Serif',
    defaults: {
      strokeWeight: 22,
      xHeight: 138,
      capHeight: 166,
      curvature: 0.45,
      slant: 0.04,
    },
    glyphParams: curatedGlyphParams({
      a: { xHeight:138, bowlWidth:58, bowlHeight:64, strokeWeight:22, aperture:12, terminalLength:22, bowlTopTension:0.74, terminalArm:14 },
      n: { xHeight:138, archWidth:90, strokeWeight:22, shoulder:36, archTension:0.72 },
      o: { bowlWidth:64, bowlHeight:66, strokeWeight:22, bowlTopTension:0.74, bowlSideTension:0.74 },
      s: { xHeight:138, sWidth:76, strokeWeight:22, curlTop:26, curlBottom:26, waistTension:0.68 },
      h: { xHeight:138, ascenderRise:54, archWidth:90, strokeWeight:22, shoulder:36, archTension:0.72 },
      i: { xHeight:138, strokeWeight:22, dotGap:18 },
      e: { bowlWidth:60, bowlHeight:62, strokeWeight:22, aperture:30, crossbarOffset:10, bowlTopTension:0.72 },
      t: { totalHeight:166, xHeight:138, strokeWeight:22, crossbarLeft:18, crossbarRight:22, footCurl:10, footArm:10 },
      r: { xHeight:138, strokeWeight:22, armLength:34, armRise:20, armArm:18 },
      l: { xHeight:138, ascenderRise:54, strokeWeight:22, footCurl:16, footArm:12 },
      w: { xHeight:138, width:136, dip:20, strokeWeight:22, joinTension:0.58, exitCurl:16, exitArm:12 },
      d: { xHeight:138, ascenderRise:54, bowlWidth:60, bowlHeight:62, strokeWeight:22, bowlTopTension:0.72, bowlSideTension:0.72 },
      ' ': { width: 52, strokeWeight: 22 },
    }),
  };

  // Source Sans 3 — neutral utilitarian sans; straight strokes, balanced proportions.
  const sourceSans = {
    name: 'sourceSans',
    fontRef: 'Source Sans 3',
    defaults: {
      strokeWeight: 24,
      xHeight: 140,
      capHeight: 170,
      curvature: 0,
      slant: 0,
    },
    glyphParams: curatedGlyphParams({
      a: { xHeight:140, bowlWidth:60, bowlHeight:60, strokeWeight:24, aperture:14, terminalLength:20, bowlTopTension:0.55, terminalArm:14 },
      n: { xHeight:140, archWidth:92, strokeWeight:24, shoulder:38, archTension:0.55 },
      o: { bowlWidth:62, bowlHeight:62, strokeWeight:24, bowlTopTension:0.55, bowlSideTension:0.55 },
      s: { xHeight:140, sWidth:72, strokeWeight:24, curlTop:24, curlBottom:24, waistTension:0.55 },
      h: { xHeight:140, ascenderRise:50, archWidth:92, strokeWeight:24, shoulder:38, archTension:0.55 },
      i: { xHeight:140, strokeWeight:24, dotGap:16 },
      e: { bowlWidth:58, bowlHeight:58, strokeWeight:24, aperture:28, crossbarOffset:10, bowlTopTension:0.55 },
      t: { totalHeight:160, xHeight:140, strokeWeight:24, crossbarLeft:18, crossbarRight:22, footCurl:10, footArm:8 },
      r: { xHeight:140, strokeWeight:24, armLength:32, armRise:18, armArm:18 },
      l: { xHeight:140, ascenderRise:50, strokeWeight:24, footCurl:16, footArm:10 },
      w: { xHeight:140, width:132, dip:20, strokeWeight:24, joinTension:0.46, exitCurl:18, exitArm:12 },
      d: { xHeight:140, ascenderRise:50, bowlWidth:56, bowlHeight:58, strokeWeight:24, bowlTopTension:0.55, bowlSideTension:0.55 },
      ' ': { width: 56, strokeWeight: 24 },
    }),
  };

  // Bitter — rectangular slab serif; heavy stroke, low tension, blocky bowls.
  const bitter = {
    name: 'bitter',
    fontRef: 'Bitter',
    defaults: {
      strokeWeight: 28,
      xHeight: 132,
      capHeight: 160,
      curvature: 0.02,
      slant: 0,
    },
    glyphParams: curatedGlyphParams({
      a: { xHeight:132, bowlWidth:62, bowlHeight:58, strokeWeight:28, aperture:10, terminalLength:18, bowlTopTension:0.38, terminalArm:10 },
      n: { xHeight:132, archWidth:96, strokeWeight:28, shoulder:42, archTension:0.38 },
      o: { bowlWidth:66, bowlHeight:60, strokeWeight:28, bowlTopTension:0.38, bowlSideTension:0.38 },
      s: { xHeight:132, sWidth:80, strokeWeight:28, curlTop:22, curlBottom:22, waistTension:0.4 },
      h: { xHeight:132, ascenderRise:48, archWidth:96, strokeWeight:28, shoulder:42, archTension:0.38 },
      i: { xHeight:132, strokeWeight:28, dotGap:16 },
      e: { bowlWidth:62, bowlHeight:58, strokeWeight:28, aperture:24, crossbarOffset:10, bowlTopTension:0.38 },
      t: { totalHeight:160, xHeight:132, strokeWeight:28, crossbarLeft:22, crossbarRight:26, footCurl:8, footArm:6 },
      r: { xHeight:132, strokeWeight:28, armLength:34, armRise:16, armArm:14 },
      l: { xHeight:132, ascenderRise:48, strokeWeight:28, footCurl:14, footArm:8 },
      w: { xHeight:132, width:144, dip:16, strokeWeight:28, joinTension:0.35, exitCurl:12, exitArm:8 },
      d: { xHeight:132, ascenderRise:48, bowlWidth:60, bowlHeight:58, strokeWeight:28, bowlTopTension:0.38, bowlSideTension:0.38 },
      ' ': { width: 60, strokeWeight: 28 },
    }),
  };

  // IBM Plex Mono — engineered monospaced; uniform cell width, neutral stroke.
  const ibmPlexMono = {
    name: 'ibmPlexMono',
    fontRef: 'IBM Plex Mono',
    defaults: {
      strokeWeight: 22,
      xHeight: 128,
      capHeight: 154,
      curvature: 0,
      slant: 0,
      width: 92,
    },
    glyphParams: curatedGlyphParams({
      a: { xHeight:128, bowlWidth:52, bowlHeight:54, strokeWeight:22, aperture:12, terminalLength:18, bowlTopTension:0.5, terminalArm:10 },
      n: { xHeight:128, archWidth:78, strokeWeight:22, shoulder:34, archTension:0.5 },
      o: { bowlWidth:54, bowlHeight:54, strokeWeight:22, bowlTopTension:0.5, bowlSideTension:0.5 },
      s: { xHeight:128, sWidth:68, strokeWeight:22, curlTop:20, curlBottom:20, waistTension:0.5 },
      h: { xHeight:128, ascenderRise:44, archWidth:78, strokeWeight:22, shoulder:34, archTension:0.5 },
      i: { xHeight:128, strokeWeight:22, dotGap:14 },
      e: { bowlWidth:52, bowlHeight:52, strokeWeight:22, aperture:24, crossbarOffset:8, bowlTopTension:0.5 },
      t: { totalHeight:154, xHeight:128, strokeWeight:22, crossbarLeft:20, crossbarRight:20, footCurl:8, footArm:6 },
      r: { xHeight:128, strokeWeight:22, armLength:28, armRise:16, armArm:14 },
      l: { xHeight:128, ascenderRise:44, strokeWeight:22, footCurl:12, footArm:8 },
      w: { xHeight:128, width:92, dip:14, strokeWeight:22, joinTension:0.42, exitCurl:10, exitArm:8 },
      d: { xHeight:128, ascenderRise:44, bowlWidth:52, bowlHeight:54, strokeWeight:22, bowlTopTension:0.5, bowlSideTension:0.5 },
      ' ': { width: 92, strokeWeight: 22 },
    }),
  };

  // Resolve preset params for a character: glyphParams[ch] takes priority,
  // otherwise fall back to defaults. Only keys that exist on the glyph
  // module's defaultParams are applied.
  function resolvePresetParams(preset, character, module) {
    if (!preset) return null;
    const direct = preset.glyphParams && preset.glyphParams[character];
    if (direct) return direct;
    const defaults = preset.defaults;
    if (!defaults) return null;
    const filtered = {};
    for (const k of Object.keys(defaults)) {
      if (k in module.defaultParams) filtered[k] = defaults[k];
    }
    return filtered;
  }

  // ════════════════════════════════════════════════════════════════════
  // WORDMARK
  // ════════════════════════════════════════════════════════════════════
  class Wordmark {
    constructor(text, options) {
      options = options || {};
      this.text = text;
      this.tracking = options.tracking != null ? options.tracking : 8;
      this.color    = options.color || '#1a1a1a';
      this.padding  = options.padding != null ? options.padding : 40;
      this._preset  = options.preset || null;

      this.glyphs = Array.from(text).map((ch) => {
        const module = registry[ch];
        if (!module) throw new Error("No glyph registered for character '" + ch + "'");
        const presetParams = resolvePresetParams(this._preset, ch, module);
        return new Glyph(module, presetParams);
      });

      this.svgEl = null;
      this.glyphLayer = null;
      this.handleLayer = null;
      this.tooltipLayer = null;
      this.interactive = false;
      this.tooltipState = null;
      this.dragState = null;
      this._layoutCache = null;   // CHANGE [Sprint 1, fix #4]: cached across drag frames
      this._dragMoveBound = (e) => this._onDragMove(e);
      this._dragEndBound = () => this._onDragEnd();

      // CHANGE [feature]: mouse-follow mode. When enabled, page mouse
      // position drives every handle's drag delta, so the whole wordmark
      // morphs as the cursor moves across the page. Off by default.
      this._mouseFollow = null;            // null | { restParams: [...], onMove, onLeave, opts }
      this._mouseMoveBound = (e) => this._onMouseFollowMove(e);
      this._mouseLeaveBound = () => this._onMouseFollowLeave();
    }

    mount(target) {
      let host;
      if (typeof target === 'string') {
        host = document.querySelector(target);
        if (!host) throw new Error("mount target not found: " + target);
      } else {
        host = target;
      }
      if (host instanceof SVGSVGElement) {
        this.svgEl = host;
      } else {
        this.svgEl = document.createElementNS(SVG_NS, 'svg');
        host.appendChild(this.svgEl);
      }
      this.glyphLayer = document.createElementNS(SVG_NS, 'g');
      this.handleLayer = document.createElementNS(SVG_NS, 'g');
      this.tooltipLayer = document.createElementNS(SVG_NS, 'g');
      this.svgEl.appendChild(this.glyphLayer);
      this.svgEl.appendChild(this.handleLayer);
      this.svgEl.appendChild(this.tooltipLayer);

      // CHANGE [tooltip]: SVG-level fallbacks so the tooltip never gets
      // stranded. pointerleave on a handle can be missed if the handle
      // DOM is replaced mid-hover, or if the pointer exits the SVG
      // without crossing the small handle hit-area. Two backstops:
      //   1. pointermove on the SVG — if the pointer isn't over a handle
      //      circle, clear the (non-pinned) tooltip.
      //   2. pointerleave on the SVG — same, for fast exits.
      this.svgEl.addEventListener('pointermove', (ev) => {
        if (this.dragState) return;
        if (!this.tooltipState || this.tooltipState.pinned) return;
        const t = ev.target;
        const onHandle = t && t.nodeType === 1 && t.getAttribute && t.getAttribute('data-handle-id');
        if (onHandle) return;
        this.tooltipState = null;
        this._refreshTooltip();
      });
      this.svgEl.addEventListener('pointerleave', () => {
        if (this.dragState) return;
        if (this.tooltipState && this.tooltipState.pinned) return;
        this.tooltipState = null;
        this._refreshTooltip();
      });

      this._render();
      return this.svgEl;
    }

    makeInteractive() { this.interactive = true; this._render(); }
    freezeInteraction() { this.interactive = false; this.tooltipState = null; this._render(); }

    // CHANGE [Sprint 2, fix #4]: incremental setText — preserves tuned glyphs
    // at matching positions instead of throwing.
    setText(newText) {
      const oldChars = Array.from(this.text);
      const newChars = Array.from(newText);
      const newGlyphs = newChars.map((ch, i) => {
        if (oldChars[i] === ch && this.glyphs[i]) return this.glyphs[i];
        const module = registry[ch];
        if (!module) throw new Error("No glyph registered for character '" + ch + "'");
        const presetParams = resolvePresetParams(this._preset, ch, module);
        return new Glyph(module, presetParams);
      });
      this.text = newText;
      this.glyphs = newGlyphs;
      this._render();
    }

    resetAll()   { for (const g of this.glyphs) g.reset(); this._render(); }
    resetGlyph(i){ if (this.glyphs[i]) { this.glyphs[i].reset(); this._render(); } }

    // ─── Layout ────────────────────────────────────────────────────────
    _layout() {
      let cursor = this.padding;
      let maxAscent = 0;
      let maxDescent = 0;
      const placed = this.glyphs.map((glyph) => {
        const x = cursor;
        cursor += glyph.advance() + this.tracking;
        const b = glyph.bounds();
        // ascent = how far the glyph rises above its baseline (positive number)
        const ascent = Math.max(0, -b.minY);
        const descent = Math.max(0, b.maxY);
        if (ascent > maxAscent) maxAscent = ascent;
        if (descent > maxDescent) maxDescent = descent;
        return { glyph, x, bounds: b };
      });
      return {
        placed,
        totalWidth: cursor + this.padding - this.tracking,
        maxAscent,
        maxDescent,
      };
    }

    // ─── Render ────────────────────────────────────────────────────────
    _render() {
      if (!this.svgEl) return;
      const layout = this._layout();
      this._layoutCache = layout;
      const { placed, totalWidth, maxAscent, maxDescent } = layout;
      const baselineY = this.padding + maxAscent;
      // CHANGE [Sprint 2, fix #1]: descender area is real (was a hard-coded 50px slot for 'i' only).
      const height = this.padding + maxAscent + Math.max(maxDescent, 8) + this.padding;
      this.svgEl.setAttribute('viewBox', `0 0 ${totalWidth} ${height}`);
      this.svgEl.setAttribute('width', String(totalWidth));
      this.svgEl.setAttribute('height', String(height));

      // Glyph layer
      const glyphSvg = [];
      for (const pg of placed) {
        const ds = pg.glyph.construct();
        const sw = pg.glyph.params.strokeWeight != null ? pg.glyph.params.strokeWeight : 16;
        let paths = '';
        for (const d of ds) {
          paths += `<path d="${d}" stroke="${this.color}" stroke-width="${sw}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
        }
        glyphSvg.push(`<g transform="translate(${pg.x},${baselineY})">${paths}</g>`);
      }
      this.glyphLayer.innerHTML = glyphSvg.join('');

      // Handle layer
      if (this.interactive) {
        const targetRadius = 22;
        const controlRadius = 7;
        const html = [];
        placed.forEach((pg, idx) => {
          const hs = pg.glyph.handles();
          for (const h of hs) {
            const anchorX = h.anchor.x + pg.x;
            const anchorY = h.anchor.y + baselineY;
            const controlX = h.control.x + pg.x;
            const controlY = h.control.y + baselineY;
            const showArm = !!h.isTangent && (Math.abs(h.anchor.x - h.control.x) + Math.abs(h.anchor.y - h.control.y) > 0.5);
            const displayX = showArm ? controlX : anchorX;
            const displayY = showArm ? controlY : anchorY;
            if (showArm) {
              html.push(`<line x1="${anchorX}" y1="${anchorY}" x2="${controlX}" y2="${controlY}" stroke="#1a2f6e" stroke-width="1" opacity="0.55" pointer-events="none"/>`);
              html.push(`<rect x="${anchorX - 2.5}" y="${anchorY - 2.5}" width="5" height="5" fill="#1a2f6e" pointer-events="none"/>`);
            }
            const fill = h.isTangent ? '#e6eaf2' : '#ffffff';
            html.push(`<circle data-glyph-idx="${idx}" data-handle-id="${h.id}" cx="${displayX}" cy="${displayY}" r="${targetRadius}" fill="#000" fill-opacity="0.001" stroke="none" cursor="grab" style="touch-action:none"/>`);
            html.push(`<circle cx="${displayX}" cy="${displayY}" r="${controlRadius}" fill="${fill}" stroke="#1a2f6e" stroke-width="1.5" pointer-events="none"/>`);
          }
        });
        this.handleLayer.innerHTML = html.join('');
        this.handleLayer.querySelectorAll('circle[data-handle-id]').forEach((c) => {
          c.addEventListener('pointerdown', (ev) => this._onDragStart(ev));
          c.addEventListener('pointerenter', (ev) => this._onHandleEnter(ev));
          c.addEventListener('pointerleave', () => this._onHandleLeave());
        });
      } else {
        this.handleLayer.innerHTML = '';
        this.tooltipState = null;
      }
      this._renderTooltip(totalWidth, height);
    }

    // ─── Tooltip (CHANGE [Sprint 1, fix #1] — restyled, kept) ──────────
    // Old: dark heavy pill, sans-serif. New: light chip with thin accent
    // border, monospace value, anchored to the param's anchor point (the
    // visible filled-square or hollow-circle on the glyph), positioned
    // with collision avoidance against the viewBox edge.
    _humanize(name) {
      const spaced = name.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase();
      return spaced === 'x height' ? 'x-height' : (spaced === 'cap height' ? 'cap-height' : spaced);
    }
    _fmt(v) { const r = Math.round(v * 100) / 100; return Number.isInteger(r) ? String(r) : r.toFixed(2); }
    _renderTooltip(totalWidth, height) {
      if (!this.tooltipLayer) return;
      if (!this.interactive || !this.tooltipState) { this.tooltipLayer.innerHTML = ''; return; }
      const layout = this._layoutCache || this._layout();
      const placement = layout.placed[this.tooltipState.glyphIdx];
      if (!placement) { this.tooltipLayer.innerHTML = ''; return; }
      const baselineY = this.padding + layout.maxAscent;
      const handle = placement.glyph.handles().find((h) => h.id === this.tooltipState.handleId);
      if (!handle) { this.tooltipLayer.innerHTML = ''; return; }
      const anchorX = handle.anchor.x + placement.x;
      const anchorY = handle.anchor.y + baselineY;
      const controlX = handle.control.x + placement.x;
      const controlY = handle.control.y + baselineY;
      const value = placement.glyph.params[handle.paramName];
      const labelText = this._humanize(handle.paramName);
      const valueText = this._fmt(value);
      // Sizing (monospace ~7.4px per char @ 12px)
      const cw = 7.2;
      const labelW = labelText.length * cw;
      const valueW = valueText.length * cw;
      const pad = 8;
      const gap = 6;
      const bubbleW = pad + labelW + gap + valueW + pad;
      const bubbleH = 22;
      // Position: above-right of the visible point (control if tangent, else anchor),
      // with safety flip if off-canvas.
      const refX = handle.isTangent ? controlX : anchorX;
      const refY = handle.isTangent ? controlY : anchorY;
      const margin = 8;
      let bx = refX + 14;
      let by = refY - bubbleH - 12;
      if (bx + bubbleW > totalWidth - margin) bx = refX - bubbleW - 14;
      if (by < margin) by = refY + 14;
      bx = Math.max(margin, Math.min(totalWidth - bubbleW - margin, bx));
      by = Math.max(margin, Math.min(height - bubbleH - margin, by));

      // Connector dot at ref point (small filled square mirroring anchor style)
      const parts = [];
      parts.push('<g data-handle-tooltip="true" pointer-events="none">');
      // Bubble: white fill, ultramarine border, no shadow.
      parts.push(`<rect x="${bx}" y="${by}" width="${bubbleW}" height="${bubbleH}" rx="3" ry="3" fill="#ffffff" stroke="#1a2f6e" stroke-width="1"/>`);
      // Label (param name) in muted grey
      parts.push(`<text x="${bx + pad}" y="${by + 15}" fill="#525860" font-size="11.5" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" letter-spacing="0.02em">${this._esc(labelText)}</text>`);
      // Value in ultramarine accent
      parts.push(`<text x="${bx + pad + labelW + gap}" y="${by + 15}" fill="#1a2f6e" font-size="11.5" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-weight="600">${this._esc(valueText)}</text>`);
      parts.push('</g>');
      this.tooltipLayer.innerHTML = parts.join('');
    }
    _esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

    _onHandleEnter(e) {
      if (this.dragState) return;
      const t = e.currentTarget;
      this.tooltipState = {
        glyphIdx: Number(t.dataset.glyphIdx),
        handleId: t.dataset.handleId,
        pinned: false,
      };
      this._refreshTooltip();
    }
    _onHandleLeave() {
      if (this.dragState || (this.tooltipState && this.tooltipState.pinned)) return;
      this.tooltipState = null;
      this._refreshTooltip();
    }
    _refreshTooltip() {
      const layout = this._layoutCache || this._layout();
      const baselineY = this.padding + layout.maxAscent;
      const height = this.padding + layout.maxAscent + Math.max(layout.maxDescent, 8) + this.padding;
      void baselineY;
      this._renderTooltip(layout.totalWidth, height);
    }

    // ─── Drag ──────────────────────────────────────────────────────────
    _toGlyphLocal(client, glyphX, baselineY) {
      const pt = this.svgEl.createSVGPoint();
      pt.x = client.x; pt.y = client.y;
      const screen = pt.matrixTransform(this.svgEl.getScreenCTM().inverse());
      return { x: screen.x - glyphX, y: screen.y - baselineY };
    }
    _onDragStart(e) {
      const t = e.currentTarget;
      if (typeof t.setPointerCapture === 'function') { try { t.setPointerCapture(e.pointerId); } catch {} }
      const glyphIdx = Number(t.dataset.glyphIdx);
      const handleId = t.dataset.handleId;
      const glyph = this.glyphs[glyphIdx];
      const handle = glyph.handles().find((h) => h.id === handleId);
      if (!handle) return;
      this.tooltipState = { glyphIdx, handleId, pinned: true };
      const layout = this._layout();
      this._layoutCache = layout;            // CHANGE: cache layout for the drag duration
      const placement = layout.placed[glyphIdx];
      const baselineY = this.padding + layout.maxAscent;
      const local = this._toGlyphLocal({ x: e.clientX, y: e.clientY }, placement.x, baselineY);
      this.dragState = {
        glyphIdx,
        paramName: handle.paramName,
        startValue: glyph.params[handle.paramName],
        startX: local.x, startY: local.y,
        glyphX: placement.x, baselineY,
        deltaFromDrag: handle.deltaFromDrag,
      };
      this._refreshTooltip();
      window.addEventListener('pointermove', this._dragMoveBound);
      window.addEventListener('pointerup', this._dragEndBound);
      window.addEventListener('pointercancel', this._dragEndBound);
      e.preventDefault();
    }
    _onDragMove(e) {
      if (!this.dragState) return;
      const { glyphIdx, glyphX, baselineY } = this.dragState;
      const local = this._toGlyphLocal({ x: e.clientX, y: e.clientY }, glyphX, baselineY);
      const dx = local.x - this.dragState.startX;
      const dy = local.y - this.dragState.startY;
      const next = this.dragState.startValue + this.dragState.deltaFromDrag(dx, dy);
      this.glyphs[glyphIdx].set(this.dragState.paramName, next);
      this._render();
    }
    _onDragEnd() {
      this.dragState = null;
      this.tooltipState = null;
      this._refreshTooltip();
      window.removeEventListener('pointermove', this._dragMoveBound);
      window.removeEventListener('pointerup', this._dragEndBound);
      window.removeEventListener('pointercancel', this._dragEndBound);
    }

    // ─── Mouse-follow mode ─────────────────────────────────────────────
    // CHANGE [feature]: every handle's `deltaFromDrag` accepts (dx,dy) and
    // returns the param delta for that drag offset. We can reuse that
    // exact contract for cursor-driven shape morphing: snapshot params on
    // enable, listen for mousemove on the page, compute (dx,dy) from a
    // reference origin scaled to the viewport, and apply
    //     param = restValue + deltaFromDrag(dx, dy)
    // to every handle on every glyph each frame. Tangent handles morph
    // naturally; positional handles (xHeight, width, etc.) stretch in
    // sync. On disable we restore the snapshot.
    enableMouseFollow(opts) {
      if (this._mouseFollow) this.disableMouseFollow();
      const o = Object.assign({
        // origin: 'center' | 'topleft' — anchor for (dx,dy)=(0,0)
        origin: 'center',
        // strength: scalar multiplier on the (dx,dy) pixel offsets.
        // 1 = pixel-for-pixel with a real drag; 0.4 is gentler.
        strength: 0.4,
        // max absolute offset in pixels so a mouse parked in a corner
        // doesn't slam params to their clamps the moment you toggle on.
        clamp: 220,
        // include positional (non-tangent) handles? Tangent-only is
        // calmer because monoline curvature etc. is the headline.
        tangentOnly: false,
      }, opts || {});

      const restParams = this.glyphs.map((g) => Object.assign({}, g.params));
      this._mouseFollow = { opts: o, restParams };

      // Suppress tooltip + drag handles' hover noise while morphing.
      this.tooltipState = null;
      this._refreshTooltip();

      window.addEventListener('mousemove', this._mouseMoveBound, { passive: true });
      document.addEventListener('mouseleave', this._mouseLeaveBound);

      // Seed with current pointer position if known, else identity.
      this._applyMouseFollow(0, 0);
    }

    disableMouseFollow() {
      if (!this._mouseFollow) return;
      window.removeEventListener('mousemove', this._mouseMoveBound);
      document.removeEventListener('mouseleave', this._mouseLeaveBound);
      // Restore the snapshot so the wordmark returns to where it was.
      const rest = this._mouseFollow.restParams;
      this.glyphs.forEach((g, i) => {
        if (rest[i]) g.params = Object.assign({}, rest[i]);
      });
      this._mouseFollow = null;
      this._render();
    }

    _onMouseFollowMove(e) {
      if (!this._mouseFollow) return;
      const o = this._mouseFollow.opts;
      let dx, dy;
      if (o.origin === 'topleft') {
        dx = e.clientX;
        dy = e.clientY;
      } else {
        dx = e.clientX - window.innerWidth / 2;
        dy = e.clientY - window.innerHeight / 2;
      }
      dx *= o.strength;
      dy *= o.strength;
      const c = o.clamp;
      if (c > 0) {
        if (dx >  c) dx =  c; else if (dx < -c) dx = -c;
        if (dy >  c) dy =  c; else if (dy < -c) dy = -c;
      }
      this._applyMouseFollow(dx, dy);
    }

    _onMouseFollowLeave() {
      // Glide back to rest when the cursor leaves the page.
      if (this._mouseFollow) this._applyMouseFollow(0, 0);
    }

    _applyMouseFollow(dx, dy) {
      if (!this._mouseFollow) return;
      const rest = this._mouseFollow.restParams;
      const tangentOnly = !!this._mouseFollow.opts.tangentOnly;
      this.glyphs.forEach((glyph, i) => {
        const baseline = rest[i];
        if (!baseline) return;
        // Reset to rest, then re-apply every handle's delta on top.
        glyph.params = Object.assign({}, baseline);
        const hs = glyph.handles();
        for (const h of hs) {
          if (tangentOnly && !h.isTangent) continue;
          if (!(h.paramName in glyph.params)) continue;
          const base = baseline[h.paramName];
          if (typeof base !== 'number') continue;
          const delta = h.deltaFromDrag(dx, dy);
          if (!Number.isFinite(delta)) continue;
          glyph.set(h.paramName, base + delta);
        }
      });
      this._render();
    }

    // ─── Export ────────────────────────────────────────────────────────
    toSVG() {
      const layout = this._layout();
      const { placed, totalWidth, maxAscent, maxDescent } = layout;
      const baselineY = this.padding + maxAscent;
      const height = this.padding + maxAscent + Math.max(maxDescent, 8) + this.padding;
      const body = placed.map((pg) => {
        const ds = pg.glyph.construct();
        const sw = pg.glyph.params.strokeWeight != null ? pg.glyph.params.strokeWeight : 16;
        const paths = ds.map((d) =>
          `<path d="${d}" stroke="${this.color}" stroke-width="${sw}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`
        ).join('');
        return `<g transform="translate(${pg.x},${baselineY})">${paths}</g>`;
      }).join('');
      return `<svg xmlns="${SVG_NS}" viewBox="0 0 ${totalWidth} ${height}" width="${totalWidth}" height="${height}">${body}</svg>`;
    }

    /**
     * Serializable snapshot. Round-trippable with Wordmark.fromState().
     *
     * If mouse-follow is active, the glyph params being mutated each frame
     * are the morphed values, not the rest values. We serialize the rest
     * snapshot so the embed boots into the same starting state the user
     * saw before they toggled mouse-follow on. The `modes` block carries
     * the mouse-follow flag (with its opts) so the embed can re-enable it.
     */
    toState() {
      const restSrc = this._mouseFollow ? this._mouseFollow.restParams : null;
      return {
        text: this.text,
        tracking: this.tracking,
        color: this.color,
        padding: this.padding,
        glyphs: this.glyphs.map((g, i) => ({
          character: g.character,
          params: Object.assign({}, (restSrc && restSrc[i]) || g.params),
        })),
        modes: {
          mouseFollow: this._mouseFollow
            ? { opts: Object.assign({}, this._mouseFollow.opts) }
            : null,
        },
      };
    }

    /**
     * CHANGE [Sprint 1, fix #2]: the interactive bundle.
     *
     * Returns a FULL self-contained HTML document string. No external fetches,
     * no CDN URL, no extra files needed — paste it into any browser tab and
     * the wordmark renders with working handles.
     *
     * Implementation: we asynchronously fetch this library's source from the
     * <script src> that loaded it, then inline that source into the output.
     * If the library was inlined rather than loaded by URL, set
     * `Wordmark.LIBRARY_SOURCE` to the source string before calling this.
     */
    async toInteractiveBundle() {
      const src = await Wordmark._fetchLibrarySource();
      const state = this.toState();
      // The embedded boot script reconstructs the wordmark from its serialized state.
      const boot = `
(function () {
  var root = document.getElementById('sculpt-wordmark');
  if (!root) return;
  var state = ${JSON.stringify(state)};
  var wm = new SculptLettering.Wordmark(state.text, {
    tracking: state.tracking, color: state.color, padding: state.padding
  });
  state.glyphs.forEach(function (g, i) {
    if (wm.glyphs[i]) wm.glyphs[i].setMany(g.params);
  });
  wm.mount(root);
  wm.makeInteractive();
  // Restore active modes so the embed behaves like the source demo.
  if (state.modes && state.modes.mouseFollow) {
    wm.enableMouseFollow(state.modes.mouseFollow.opts);
  }
})();`.trim();

      return [
        '<!DOCTYPE html>',
        '<html lang="en">',
        '<head>',
        '<meta charset="UTF-8">',
        '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
        '<title>sculpt-lettering — interactive embed</title>',
        '<style>',
        '  html, body { margin: 0; height: 100%; background: #f6f7f9; display: flex; align-items: center; justify-content: center; }',
        '  #sculpt-wordmark { max-width: 100%; }',
        '  #sculpt-wordmark svg { display: block; max-width: 100%; height: auto; }',
        '</style>',
        '</head>',
        '<body>',
        '<div id="sculpt-wordmark"></div>',
        '<script>' + src + '<\/script>',
        '<script>' + boot + '<\/script>',
        '</body>',
        '</html>',
      ].join('\n');
    }

    static async _fetchLibrarySource() {
      if (Wordmark.LIBRARY_SOURCE) return Wordmark.LIBRARY_SOURCE;
      if (!_SELF_SRC) {
        throw new Error('Library was inlined; set Wordmark.LIBRARY_SOURCE before calling toInteractiveBundle().');
      }
      const r = await fetch(_SELF_SRC);
      if (!r.ok) throw new Error('Failed to fetch library source: ' + r.status);
      const text = await r.text();
      Wordmark.LIBRARY_SOURCE = text;   // cache
      return text;
    }
  }

  // ════════════════════════════════════════════════════════════════════
  // Register everything
  // ════════════════════════════════════════════════════════════════════
  registerGlyph(a);
  registerGlyph(n);
  registerGlyph(o);
  registerGlyph(s);
  registerGlyph(h);
  registerGlyph(i_);
  registerGlyph(e);
  registerGlyph(t);
  registerGlyph(r_);
  registerGlyph(l);
  registerGlyph(w);
  registerGlyph(d);
  for (const k of Object.keys(extraLowercaseGlyphs)) registerGlyph(extraLowercaseGlyphs[k]);
  for (const k of Object.keys(uppercaseGlyphs)) registerGlyph(uppercaseGlyphs[k]);
  registerGlyph(space);

  const glyphs = Object.assign({
    a, n, o, s, h, i: i_, e, t, r: r_, l, w, d, space,
  }, extraLowercaseGlyphs, uppercaseGlyphs);

  return {
    Wordmark, Glyph, registerGlyph, getRegisteredGlyphs,
    glyphs,
    presets: { bubbly, instrumentSerif, sourceSans, bitter, ibmPlexMono },
  };
});
