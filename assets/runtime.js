/*
 * Avenyo UI – kevyt näkymämoottori.
 * Renderöi sivun <template id="dc-tpl"> -mallin: {{ polku }} -aukot, sc-for/sc-if
 * (muunnettu muotoon <template data-sc="for|if">), tapahtumat (onClick, onChange)
 * ja tila (setState). Päivitys tehdään DOM-vertailulla, joten esim. liukusäädin
 * säilyy raahattaessa.
 */
(function () {
  'use strict';

  var HOLE = /\{\{\s*([^}]+?)\s*\}\}/g;
  var WHOLE = /^\s*\{\{\s*([^}]+?)\s*\}\}\s*$/;
  var SVG_NS = 'http://www.w3.org/2000/svg';

  function lookup(scope, path) {
    if (path === 'true') return true;
    if (path === 'false') return false;
    if (path === 'null') return null;
    if (/^-?\d+(\.\d+)?$/.test(path)) return parseFloat(path);
    var parts = path.split('.');
    var v = scope;
    for (var i = 0; i < parts.length; i++) {
      if (v == null) return undefined;
      v = v[parts[i]];
    }
    return v;
  }

  function interp(str, scope) {
    return str.replace(HOLE, function (_, p) {
      var v = lookup(scope, p);
      return v == null ? '' : String(v);
    });
  }

  function child(scope, extra) {
    var s = Object.create(scope);
    for (var k in extra) s[k] = extra[k];
    return s;
  }

  // ---- rakenna uusi (irrallinen) puu mallista ----
  function build(node, scope, out) {
    if (node.nodeType === 3) {
      out.push(document.createTextNode(interp(node.nodeValue, scope)));
      return;
    }
    if (node.nodeType !== 1) return;
    var tag = node.localName;

    if (tag === 'template' && node.getAttribute('data-sc')) {
      var kind = node.getAttribute('data-sc');
      var kids = node.content.childNodes;
      if (kind === 'for') {
        var m = WHOLE.exec(node.getAttribute('list') || '');
        var list = m ? lookup(scope, m[1]) : null;
        var as = node.getAttribute('as') || 'item';
        (list || []).forEach(function (item, i) {
          var extra = { $index: i };
          extra[as] = item;
          var s = child(scope, extra);
          for (var j = 0; j < kids.length; j++) build(kids[j], s, out);
        });
      } else if (kind === 'if') {
        var mv = WHOLE.exec(node.getAttribute('value') || '');
        if (mv && lookup(scope, mv[1])) {
          for (var k = 0; k < kids.length; k++) build(kids[k], scope, out);
        }
      }
      return;
    }

    var ns = node.namespaceURI;
    var el = ns && ns !== 'http://www.w3.org/1999/xhtml' ? document.createElementNS(ns, tag) : document.createElement(tag);
    el.__h = {};
    var props = {};
    for (var a = 0; a < node.attributes.length; a++) {
      var at = node.attributes[a];
      var name = at.name, val = at.value;
      if (name.indexOf('hint-') === 0) continue;
      var whole = WHOLE.exec(val);
      if (name.indexOf('on') === 0 && whole) {
        var fn = lookup(scope, whole[1]);
        if (typeof fn === 'function') {
          var ev = name.slice(2).toLowerCase();
          if (ev === 'change') ev = 'input';
          el.__h[ev] = fn;
        }
        continue;
      }
      if (whole) {
        var v = lookup(scope, whole[1]);
        if (name === 'value' && tag === 'input') { props.value = v == null ? '' : String(v); }
        if (v === false || v == null) {
          if (name.indexOf('aria-') === 0 && v === false) el.setAttribute(name, 'false');
          continue;
        }
        el.setAttribute(name, v === true ? (name.indexOf('aria-') === 0 ? 'true' : '') : String(v));
      } else {
        var s2 = val.indexOf('{{') >= 0 ? interp(val, scope) : val;
        if (name === 'value' && tag === 'input') props.value = s2;
        el.setAttribute(name, s2);
      }
    }
    el.__props = props;
    var src = node.childNodes;
    var built = [];
    for (var c = 0; c < src.length; c++) build(src[c], scope, built);
    for (var b = 0; b < built.length; b++) el.appendChild(built[b]);
    out.push(el);
  }

  // ---- vertaa ja päivitä olemassa oleva DOM ----
  function bind(el) {
    el.__bound = el.__bound || {};
    for (var ev in el.__h) {
      if (!el.__bound[ev]) {
        el.__bound[ev] = true;
        (function (type) {
          el.addEventListener(type, function (e) {
            var f = el.__h && el.__h[type];
            if (f) f(e);
          });
        })(ev);
      }
    }
  }

  function same(a, b) {
    return a.nodeType === b.nodeType && (a.nodeType !== 1 || (a.localName === b.localName && a.namespaceURI === b.namespaceURI));
  }

  function bindTree(el) {
    if (el.nodeType !== 1) return;
    bind(el);
    if (el.__props && el.__props.value != null && 'value' in el) el.value = el.__props.value;
    for (var i = 0; i < el.childNodes.length; i++) bindTree(el.childNodes[i]);
  }

  function morphChildren(parent, fresh) {
    var old = parent.childNodes;
    for (var i = 0; i < fresh.length; i++) {
      var n = fresh[i];
      var o = old[i];
      if (!o) { parent.appendChild(n); bindTree(n); continue; }
      if (!same(o, n)) { parent.replaceChild(n, o); bindTree(n); continue; }
      if (o.nodeType === 3) { if (o.nodeValue !== n.nodeValue) o.nodeValue = n.nodeValue; continue; }
      // attribuutit
      var keep = {};
      for (var a = 0; a < n.attributes.length; a++) {
        var at = n.attributes[a];
        keep[at.name] = true;
        if (o.getAttribute(at.name) !== at.value) o.setAttribute(at.name, at.value);
      }
      for (var r = o.attributes.length - 1; r >= 0; r--) {
        if (!keep[o.attributes[r].name]) o.removeAttribute(o.attributes[r].name);
      }
      o.__h = n.__h;
      bind(o);
      if (n.__props && n.__props.value != null && 'value' in o && o.value !== n.__props.value) o.value = n.__props.value;
      morphChildren(o, Array.prototype.slice.call(n.childNodes));
    }
    while (old.length > fresh.length) parent.removeChild(parent.lastChild);
  }

  // ---- komponentti ----
  function DCLogic(props) {
    this.props = props || {};
    this.state = {};
  }
  DCLogic.prototype.setState = function (patch) {
    var p = typeof patch === 'function' ? patch(this.state, this.props) : patch;
    this.state = Object.assign({}, this.state, p);
    this.__schedule();
  };
  DCLogic.prototype.forceUpdate = function () { this.__schedule(); };

  function start() {
    var tpl = document.getElementById('dc-tpl');
    var root = document.getElementById('dc-root');
    var script = document.getElementById('dc-logic');
    if (!tpl || !root || !script) return;

    var defs = {};
    try { defs = JSON.parse(script.getAttribute('data-props') || '{}'); } catch (e) { defs = {}; }
    var props = {};
    var q = new URLSearchParams(location.search);
    Object.keys(defs).forEach(function (k) {
      if (k.charAt(0) === '$') return;
      if (q.has(k)) props[k] = q.get(k);
      else if (defs[k] && 'default' in defs[k]) props[k] = defs[k]['default'];
    });

    var Component = new Function('DCLogic', script.textContent + '\nreturn Component;')(DCLogic);
    var comp = new Component(props);
    if (!comp.props) comp.props = props;
    if (!comp.state) comp.state = {};

    var pending = false;
    function render() {
      pending = false;
      var vals = comp.renderVals ? comp.renderVals() : {};
      var out = [];
      var kids = tpl.content.childNodes;
      for (var i = 0; i < kids.length; i++) build(kids[i], vals, out);
      morphChildren(root, out);
    }
    comp.__schedule = function () {
      if (pending) return;
      pending = true;
      (window.requestAnimationFrame || setTimeout)(render);
    };
    render();
    if (comp.componentDidMount) comp.componentDidMount();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
