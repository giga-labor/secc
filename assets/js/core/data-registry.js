/**
 * data-registry.js — DataRegistry
 *
 * Carica /data/registry/data-registry.json e risolve chiavi simboliche
 * (es. "algorithms.rankings_db") in path reali sul sito.
 *
 * Uso:
 *   const data = await DataRegistry.load("algorithms.rankings_db");
 *   const path = await DataRegistry.resolve("core.latest_draw");
 *
 * Il registry viene fetchato una sola volta e messo in cache in memoria.
 * Se il registry non è disponibile, load() fa fallback al path legacy
 * dichiarato in _LEGACY_FALLBACK (compatibilità backward durante migrazione).
 */
(function (global) {
  'use strict';

  var REGISTRY_URL = '/data/registry/data-registry.json';

  // Fallback legacy: path vecchi usati prima di SODA.
  // Rimossi dopo che tutti i JS sono migrati e il dual-write è cessato.
  var _LEGACY_FALLBACK = {
    'algorithms.rankings_db':    '/data/precomputed/ranking.json',
    'algorithms.algorithms_db':  '/data/precomputed/algorithms-data.json',
    'algorithms.sheets':         '/data/precomputed/algorithm-sheets.json',
    'algorithms.consensus':      '/data/precomputed/consensus.json',
    'algorithms.static_contract':'/data/precomputed/static-contract.json',
    'home.home_db':              '/data/precomputed/home-summary.json',
    'storico.numeri_stats':      '/data/numeri-stats.json',
    'storico.draws_frequency':   '/data/draws-frequency.json',
    'lab.lab_db':                '/data/precomputed/laboratorio-tecnico.json',
    'community.feed':            '/data/community-feed.json',
    'oracle.state':              '/data/oracle-state.json',
    'core.site_state':           '/data/next-draw.json',
    'core.latest_draw':          '/data/next-draw.json',
    'archive.draws':             '/archives/draws/draws.csv',
  };

  var _registry = null;
  var _loadPromise = null;

  function _fetchRegistry() {
    if (_loadPromise) return _loadPromise;
    _loadPromise = fetch(REGISTRY_URL, { cache: 'no-store' })
      .then(function (r) {
        if (!r.ok) throw new Error('DataRegistry: HTTP ' + r.status);
        return r.json();
      })
      .then(function (data) {
        _registry = data;
        return data;
      })
      .catch(function (err) {
        console.warn('[DataRegistry] registry non disponibile, uso fallback legacy.', err);
        _registry = { datasets: {} };
        return _registry;
      });
    return _loadPromise;
  }

  /**
   * Risolve una chiave simbolica nel path reale del file.
   * @param {string} key  es. "algorithms.rankings_db"
   * @returns {Promise<string>}
   */
  function resolve(key) {
    return _fetchRegistry().then(function (reg) {
      var entry = reg && reg.datasets && reg.datasets[key];
      if (entry && entry.path) return entry.path;
      var fallback = _LEGACY_FALLBACK[key];
      if (fallback) {
        console.warn('[DataRegistry] key "' + key + '" non in registry, uso legacy: ' + fallback);
        return fallback;
      }
      throw new Error('[DataRegistry] key "' + key + '" non trovata (nessun fallback).');
    });
  }

  /**
   * Carica e restituisce il contenuto del dataset.
   * Per file CSV restituisce la stringa grezza; per JSON il parsed object.
   * @param {string} key  es. "algorithms.rankings_db"
   * @returns {Promise<any>}
   */
  function load(key) {
    return _fetchRegistry().then(function (reg) {
      var entry = reg && reg.datasets && reg.datasets[key];
      var path = (entry && entry.path) || _LEGACY_FALLBACK[key];
      var fallback = (entry && entry.path && _LEGACY_FALLBACK[key]) ? _LEGACY_FALLBACK[key] : null;
      var type = (entry && entry.type) || 'json';

      if (!path) {
        return Promise.reject(new Error('[DataRegistry] key "' + key + '" senza path.'));
      }

      function _parse(r) {
        if (!r.ok) throw new Error('[DataRegistry] fetch ' + r.url + ' → HTTP ' + r.status);
        return type === 'csv' ? r.text() : r.json();
      }

      return fetch(path, { cache: 'no-store' }).then(_parse).catch(function (err) {
        if (fallback) {
          console.warn('[DataRegistry] ' + path + ' fallito, provo legacy: ' + fallback);
          return fetch(fallback, { cache: 'no-store' }).then(_parse);
        }
        throw err;
      });
    });
  }

  /**
   * Invalida la cache del registry (utile dopo aggiornamenti live).
   */
  function invalidate() {
    _registry = null;
    _loadPromise = null;
  }

  global.DataRegistry = { resolve: resolve, load: load, invalidate: invalidate };

})(typeof window !== 'undefined' ? window : this);
