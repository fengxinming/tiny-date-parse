import isString from 'celia/es/isString';
import isNumber from 'celia/es/isNumber';
import isNil from 'celia/es/isNil';

const ASP_NET_JSON_RE = /^\/?Date\((-?\d+)/i;
const PARSE_RE = /^\s*((?:[+-]\d{6}|\d{4})[^0-9]*(?:\d{1,2}[^0-9]*\d{1,2}|\d{1,2})?)(?:[T ](\d{1,2}(?:[^0-9+-]*\d{1,2}(?:[^0-9]*\d{1,2}(?:[^0-9+-]*\d+)?)?)?)\s*([+-]\d\d(?:[^0-9]*\d\d)?|Z)?)?$/;
const PARSE_RE2 = /^\s*([+-]\d{6}|\d{4})(\d\d)?(\d\d)?(\d\d)?(\d\d)?(\d\d)?(\d+)?\s*(?:([+-]\d\d)[^0-9]*(\d\d)|(Z))?$/;
const DATE_RE = /^([+-]\d{6}|\d{4})[^0-9]*(\d{1,2})?[^0-9]*(\d{1,2})?$/;
const TIME_RE = /^(\d{1,2})[^0-9]*(\d{1,2})?[^0-9]*(\d{1,2})?[^0-9+-]*(\d+)?$/;
const TZ_RE = /^([+-]\d\d)[^0-9]*(\d\d)?$/;

function loop(start, end, callback) {
  for (; start < end; start++) {
    callback(start, end);
  }
}

/**
 * 将数组解析成date
 * @param {Array} arr
 */
function createDateFromArray(arr) {
  const isUTC = arr[7] === 'Z';
  const [year] = arr;
  let [, month, date, hours, minutes, seconds, ms] = arr;

  month = month || 0;
  date = isNil(date) ? 1 : date;
  hours = hours || 0;
  minutes = minutes || 0;
  seconds = seconds || 0;
  ms = ms || 0;

  if (isUTC) {
    return new Date(Date.UTC(year, month, date, hours, minutes, seconds, ms));
  }

  return new Date(year, month, date, hours, minutes, seconds, ms);
}

/**
 * 智能提取年月日时分秒
 * @param {string} input 时间字符串
 */
function extractFrom(input) {
  const arr = [];
  const match = PARSE_RE.exec(input);
  if (match) {
    const ymd = match[1];
    // 解析年月日
    const matchymd = DATE_RE.exec(ymd);
    loop(0, 3, i => {
      arr[i] = matchymd[i + 1];
    });
    if (!isNil(arr[1])) {
      arr[1] -= 1;
    }

    const hms = match[2];
    if (hms) {
      // 解析时分秒
      const matchhms = TIME_RE.exec(hms);
      loop(1, 5, i => {
        arr[i + 2] = matchhms[i];
      });
    }

    // 时区解析
    const offset = match[3];
    if (offset) {
      if (offset === 'Z') {
        arr[7] = 'Z';
      } else {
        const matchtz = TZ_RE.exec(offset);
        arr[4] = (arr[4] || 0) - matchtz[1] * 60 - (+matchtz[2] || 0);
        arr[7] = 'Z';
      }
    }

    return arr;
  } else {
    const match2 = PARSE_RE2.exec(input);
    if (match2) {
      loop(0, 7, i => {
        arr[i] = match2[i + 1];
      });

      arr[1] -= 1;

      if (match2[10] === 'Z') {
        arr[7] = 'Z';
      } else if (match2[8]) {
        arr[4] = (arr[4] || 0) - match2[8] * 60 - (+match2[9] || 0);
        arr[7] = 'Z';
      }

      return arr;
    }
  }
  return input;
}

/**
 * 解析字符串通过给定的字符串模版
 * @param {string|Array} input
 * @param {string} format
 */
function extractFromFormat(input, format) {
  const len = format.length;
  const arr = [];
  let isUTC;
  let tz;

  loop(0, len, i => {
    const ii = input[i];
    switch (format[i]) {
      case 'Y':
      case 'y':
        arr[0] = (arr[0] || '') + ii;
        break;
      case 'M':
        arr[1] = (arr[1] || '') + ii;
        break;
      case 'D':
      case 'd':
        arr[2] = (arr[2] || '') + ii;
        break;
      case 'H':
      case 'h':
        arr[3] = (arr[3] || '') + ii;
        break;
      case 'm':
        arr[4] = (arr[4] || '') + ii;
        break;
      case 's':
        arr[5] = (arr[5] || '') + ii;
        break;
      case 'S':
        arr[6] = (arr[6] || '') + ii;
        break;
      case 'Z':
        isUTC = true;
        if (!tz) {
          tz = input.slice(i);
        }
        break;
      default:
    }
  });

  if (isUTC) {
    const offsetMatches = TZ_RE.exec(tz);
    // 解析秒后面的时区
    if (offsetMatches) {
      const offset = offsetMatches[1];
      arr[4] = (arr[4] || 0) - offset * 60 - (+offsetMatches[2] || 0);
      arr[7] = 'Z';
    } else if (input.indexOf('Z') > -1) {
      arr[7] = 'Z';
    }
  }
  if (!isNil(arr[1])) {
    arr[1] -= 1;
  }

  return arr;
}

/**
 * 解析字符串或者数组成date
 * @param {string|Array} input
 * @param {string|boolean|undefined} format
 */
function createDateFromString(input, format) {
  if (isString(format)) {
    return createDateFromArray(extractFromFormat(input, format));
  } else {
    // 自动判断格式
    const arr = extractFrom(input);
    if (arr !== input) {
      return createDateFromArray(arr);
    }
  }

  const matched = ASP_NET_JSON_RE.exec(input);
  if (matched !== null) {
    return new Date(+matched[1]);
  }
  return new Date(input);
}

const { isArray } = Array;

export default function fastDateParse(input, format) {
  let time;
  if (isNil(input)) {
    // parse()
    input = new Date();
  } else if (isString(input)) {
    // parse('2020-01-01') or parse('2020-01-01', 'YYYY-MM-DD')
    input = createDateFromString(input, format);
  } else if (isArray(input) && input.length) {
    // [2020, 0, 1]
    input = createDateFromArray(input);
  } else if (isNumber(input)) {
    // timestamp
    input = new Date(input);
  // eslint-disable-next-line no-cond-assign
  } else if ((time = +input)) {
    // Date、moment
    input = new Date(time);
  } else {
    // input = [], {}, etc
    input = new Date();
  }
  return input;
}
