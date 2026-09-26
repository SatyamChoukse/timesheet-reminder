const pad = (n) => String(n).padStart(2, '0');

// Local calendar day as 'YYYY-MM-DD'.
const dateKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const parseKey = (key) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const addDays = (date, n) => {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
};

const clockTime = (d = new Date()) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

module.exports = { dateKey, parseKey, addDays, clockTime };
