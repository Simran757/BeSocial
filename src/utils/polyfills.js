/**
 * Proper localStorage polyfill for React Native
 */

if (typeof global.window === 'undefined') {
  global.window = global;
}

if (typeof global.localStorage === 'undefined') {
  const storage = {};

  global.localStorage = {
    setItem: function (key, value) {
      storage[key] = String(value);
    },
    getItem: function (key) {
      return storage.hasOwnProperty(key) ? storage[key] : null;
    },
    removeItem: function (key) {
      delete storage[key];
    },
    clear: function () {
      Object.keys(storage).forEach(key => delete storage[key]);
    },
  };
}

if (!window.localStorage) {
  window.localStorage = global.localStorage;
}

console.log('✅ localStorage polyfill ready');