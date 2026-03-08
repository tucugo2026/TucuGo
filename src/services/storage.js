const KEY = 'tucugo_local_store_v2';

const EMPTY_STORE = {
  countries: [],
  cities: [],
  drivers: [],
  trips: []
};

export function readStore() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : { ...EMPTY_STORE };
  } catch {
    return { ...EMPTY_STORE };
  }
}

export function writeStore(store) {
  localStorage.setItem(KEY, JSON.stringify(store));
}

export function setCollection(name, rows) {
  const store = readStore();
  store[name] = rows;
  writeStore(store);
}

export function getCollection(name) {
  const store = readStore();
  return store[name] ?? [];
}
