import type { AssetClass } from "../types";
import { ASSET_CLASSES } from "../types";

/**
 * Approximate annual NOMINAL total returns 1973–2023 for major asset classes.
 * Sources are public (Damodaran data tables, MSCI EAFE/EM index returns,
 * Bloomberg US Aggregate, 3-month T-bill, World Gold Council).
 * Numbers are rounded and intended for survivability bootstrap, not for
 * back-testing precision. Edit this file to refine.
 *
 * `null` = no data for that class in that year — the bootstrap falls back
 * to a fresh GBM draw for that class only.
 */

interface Row {
  year: number;
  USStock: number | null;        // S&P 500 Total Return
  IntlDeveloped: number | null;  // MSCI EAFE (USD)
  IntlEmerging: number | null;   // MSCI EM (USD), starts 1988
  Bond: number | null;           // Bloomberg US Aggregate (synthetic 73-75)
  ShortBond: number | null;      // 3-month T-bill rolling
  HighYieldBond: number | null;  // Bloomberg US Corporate HY (starts 1984)
  Cash: number | null;           // 3-month T-bill (synthetic for cash sweeps)
  Gold: number | null;           // London PM fix
  Sector: number | null;         // S&P 500 (uses USStock as proxy)
  Other: number | null;          // 60/40 blend as catch-all
}

const HISTORY: Row[] = [
  // year, USStock, IntlDeveloped, IntlEmerging, Bond, ShortBond, HighYieldBond, Cash, Gold, Sector, Other
  { year: 1973, USStock: -0.1466, IntlDeveloped: -0.1473, IntlEmerging: null, Bond:  0.0226, ShortBond: 0.0699, HighYieldBond: null, Cash: 0.0699, Gold:  0.6610, Sector: -0.1466, Other: -0.0789 },
  { year: 1974, USStock: -0.2647, IntlDeveloped: -0.2244, IntlEmerging: null, Bond:  0.0014, ShortBond: 0.0800, HighYieldBond: null, Cash: 0.0800, Gold:  0.6620, Sector: -0.2647, Other: -0.1582 },
  { year: 1975, USStock:  0.3720, IntlDeveloped:  0.3754, IntlEmerging: null, Bond:  0.1265, ShortBond: 0.0580, HighYieldBond: null, Cash: 0.0580, Gold: -0.1956, Sector:  0.3720, Other:  0.2738 },
  { year: 1976, USStock:  0.2384, IntlDeveloped:  0.0379, IntlEmerging: null, Bond:  0.1575, ShortBond: 0.0508, HighYieldBond: null, Cash: 0.0508, Gold: -0.0410, Sector:  0.2384, Other:  0.2061 },
  { year: 1977, USStock: -0.0718, IntlDeveloped:  0.1855, IntlEmerging: null, Bond:  0.0303, ShortBond: 0.0512, HighYieldBond: null, Cash: 0.0512, Gold:  0.2240, Sector: -0.0718, Other: -0.0309 },
  { year: 1978, USStock:  0.0656, IntlDeveloped:  0.3256, IntlEmerging: null, Bond:  0.0140, ShortBond: 0.0718, HighYieldBond: null, Cash: 0.0718, Gold:  0.3712, Sector:  0.0656, Other:  0.0450 },
  { year: 1979, USStock:  0.1844, IntlDeveloped:  0.0498, IntlEmerging: null, Bond:  0.0191, ShortBond: 0.1038, HighYieldBond: null, Cash: 0.1038, Gold:  1.2666, Sector:  0.1844, Other:  0.1183 },
  { year: 1980, USStock:  0.3242, IntlDeveloped:  0.2238, IntlEmerging: null, Bond:  0.0271, ShortBond: 0.1124, HighYieldBond: null, Cash: 0.1124, Gold:  0.1525, Sector:  0.3242, Other:  0.2057 },
  { year: 1981, USStock: -0.0491, IntlDeveloped: -0.0203, IntlEmerging: null, Bond:  0.0625, ShortBond: 0.1471, HighYieldBond: null, Cash: 0.1471, Gold: -0.3265, Sector: -0.0491, Other:  0.0049 },
  { year: 1982, USStock:  0.2141, IntlDeveloped: -0.0188, IntlEmerging: null, Bond:  0.3263, ShortBond: 0.1054, HighYieldBond: null, Cash: 0.1054, Gold:  0.1487, Sector:  0.2141, Other:  0.2630 },
  { year: 1983, USStock:  0.2251, IntlDeveloped:  0.2381, IntlEmerging: null, Bond:  0.0832, ShortBond: 0.0880, HighYieldBond: null, Cash: 0.0880, Gold: -0.1648, Sector:  0.2251, Other:  0.1684 },
  { year: 1984, USStock:  0.0627, IntlDeveloped:  0.0747, IntlEmerging: null, Bond:  0.1515, ShortBond: 0.0985, HighYieldBond:  0.0859, Cash: 0.0985, Gold: -0.1932, Sector:  0.0627, Other:  0.1029 },
  { year: 1985, USStock:  0.3173, IntlDeveloped:  0.5640, IntlEmerging: null, Bond:  0.2210, ShortBond: 0.0772, HighYieldBond:  0.2647, Cash: 0.0772, Gold:  0.0521, Sector:  0.3173, Other:  0.2790 },
  { year: 1986, USStock:  0.1867, IntlDeveloped:  0.6920, IntlEmerging: null, Bond:  0.1530, ShortBond: 0.0616, HighYieldBond:  0.1635, Cash: 0.0616, Gold:  0.1909, Sector:  0.1867, Other:  0.1734 },
  { year: 1987, USStock:  0.0525, IntlDeveloped:  0.2466, IntlEmerging: null, Bond:  0.0276, ShortBond: 0.0547, HighYieldBond:  0.0467, Cash: 0.0547, Gold:  0.2260, Sector:  0.0525, Other:  0.0427 },
  { year: 1988, USStock:  0.1661, IntlDeveloped:  0.2829, IntlEmerging:  0.4019, Bond:  0.0789, ShortBond: 0.0635, HighYieldBond:  0.1273, Cash: 0.0635, Gold: -0.1556, Sector:  0.1661, Other:  0.1310 },
  { year: 1989, USStock:  0.3169, IntlDeveloped:  0.1085, IntlEmerging:  0.6504, Bond:  0.1422, ShortBond: 0.0837, HighYieldBond:  0.0050, Cash: 0.0837, Gold: -0.0269, Sector:  0.3169, Other:  0.2470 },
  { year: 1990, USStock: -0.0310, IntlDeveloped: -0.2317, IntlEmerging: -0.1066, Bond:  0.0896, ShortBond: 0.0781, HighYieldBond: -0.0457, Cash: 0.0781, Gold: -0.0303, Sector: -0.0310, Other:  0.0173 },
  { year: 1991, USStock:  0.3047, IntlDeveloped:  0.1250, IntlEmerging:  0.5917, Bond:  0.1610, ShortBond: 0.0560, HighYieldBond:  0.4623, Cash: 0.0560, Gold: -0.1042, Sector:  0.3047, Other:  0.2472 },
  { year: 1992, USStock:  0.0762, IntlDeveloped: -0.1217, IntlEmerging:  0.1141, Bond:  0.0740, ShortBond: 0.0351, HighYieldBond:  0.1577, Cash: 0.0351, Gold: -0.0556, Sector:  0.0762, Other:  0.0763 },
  { year: 1993, USStock:  0.1008, IntlDeveloped:  0.3258, IntlEmerging:  0.7475, Bond:  0.0975, ShortBond: 0.0290, HighYieldBond:  0.1747, Cash: 0.0290, Gold:  0.1730, Sector:  0.1008, Other:  0.1014 },
  { year: 1994, USStock:  0.0132, IntlDeveloped:  0.0778, IntlEmerging: -0.0723, Bond: -0.0292, ShortBond: 0.0390, HighYieldBond: -0.0103, Cash: 0.0390, Gold: -0.0178, Sector:  0.0132, Other: -0.0038 },
  { year: 1995, USStock:  0.3758, IntlDeveloped:  0.1121, IntlEmerging: -0.0568, Bond:  0.1847, ShortBond: 0.0560, HighYieldBond:  0.1976, Cash: 0.0560, Gold:  0.0093, Sector:  0.3758, Other:  0.2974 },
  { year: 1996, USStock:  0.2296, IntlDeveloped:  0.0613, IntlEmerging:  0.0626, Bond:  0.0364, ShortBond: 0.0521, HighYieldBond:  0.1135, Cash: 0.0521, Gold: -0.0489, Sector:  0.2296, Other:  0.1503 },
  { year: 1997, USStock:  0.3336, IntlDeveloped:  0.0178, IntlEmerging: -0.1154, Bond:  0.0964, ShortBond: 0.0526, HighYieldBond:  0.1276, Cash: 0.0526, Gold: -0.2152, Sector:  0.3336, Other:  0.2387 },
  { year: 1998, USStock:  0.2858, IntlDeveloped:  0.2003, IntlEmerging: -0.2541, Bond:  0.0869, ShortBond: 0.0486, HighYieldBond:  0.0258, Cash: 0.0486, Gold: -0.0011, Sector:  0.2858, Other:  0.2092 },
  { year: 1999, USStock:  0.2104, IntlDeveloped:  0.2696, IntlEmerging:  0.6647, Bond: -0.0082, ShortBond: 0.0468, HighYieldBond:  0.0239, Cash: 0.0468, Gold:  0.0086, Sector:  0.2104, Other:  0.1209 },
  { year: 2000, USStock: -0.0911, IntlDeveloped: -0.1402, IntlEmerging: -0.3060, Bond:  0.1163, ShortBond: 0.0589, HighYieldBond: -0.0574, Cash: 0.0589, Gold: -0.0571, Sector: -0.0911, Other: -0.0001 },
  { year: 2001, USStock: -0.1189, IntlDeveloped: -0.2142, IntlEmerging: -0.0254, Bond:  0.0843, ShortBond: 0.0383, HighYieldBond:  0.0532, Cash: 0.0383, Gold:  0.0258, Sector: -0.1189, Other: -0.0376 },
  { year: 2002, USStock: -0.2210, IntlDeveloped: -0.1580, IntlEmerging: -0.0594, Bond:  0.1026, ShortBond: 0.0163, HighYieldBond: -0.0156, Cash: 0.0163, Gold:  0.2455, Sector: -0.2210, Other: -0.0915 },
  { year: 2003, USStock:  0.2868, IntlDeveloped:  0.3859, IntlEmerging:  0.5582, Bond:  0.0410, ShortBond: 0.0102, HighYieldBond:  0.2898, Cash: 0.0102, Gold:  0.1942, Sector:  0.2868, Other:  0.1885 },
  { year: 2004, USStock:  0.1088, IntlDeveloped:  0.2025, IntlEmerging:  0.2592, Bond:  0.0434, ShortBond: 0.0120, HighYieldBond:  0.1113, Cash: 0.0120, Gold:  0.0535, Sector:  0.1088, Other:  0.0826 },
  { year: 2005, USStock:  0.0491, IntlDeveloped:  0.1354, IntlEmerging:  0.3454, Bond:  0.0243, ShortBond: 0.0298, HighYieldBond:  0.0274, Cash: 0.0298, Gold:  0.1735, Sector:  0.0491, Other:  0.0392 },
  { year: 2006, USStock:  0.1579, IntlDeveloped:  0.2634, IntlEmerging:  0.3214, Bond:  0.0433, ShortBond: 0.0479, HighYieldBond:  0.1180, Cash: 0.0479, Gold:  0.2305, Sector:  0.1579, Other:  0.1121 },
  { year: 2007, USStock:  0.0549, IntlDeveloped:  0.1117, IntlEmerging:  0.3954, Bond:  0.0697, ShortBond: 0.0466, HighYieldBond:  0.0190, Cash: 0.0466, Gold:  0.3098, Sector:  0.0549, Other:  0.0608 },
  { year: 2008, USStock: -0.3700, IntlDeveloped: -0.4338, IntlEmerging: -0.5333, Bond:  0.0524, ShortBond: 0.0153, HighYieldBond: -0.2611, Cash: 0.0153, Gold:  0.0530, Sector: -0.3700, Other: -0.2010 },
  { year: 2009, USStock:  0.2645, IntlDeveloped:  0.3178, IntlEmerging:  0.7851, Bond:  0.0593, ShortBond: 0.0014, HighYieldBond:  0.5849, Cash: 0.0014, Gold:  0.2580, Sector:  0.2645, Other:  0.1825 },
  { year: 2010, USStock:  0.1506, IntlDeveloped:  0.0775, IntlEmerging:  0.1881, Bond:  0.0654, ShortBond: 0.0013, HighYieldBond:  0.1518, Cash: 0.0013, Gold:  0.2974, Sector:  0.1506, Other:  0.1165 },
  { year: 2011, USStock:  0.0211, IntlDeveloped: -0.1214, IntlEmerging: -0.1853, Bond:  0.0784, ShortBond: 0.0006, HighYieldBond:  0.0498, Cash: 0.0006, Gold:  0.0964, Sector:  0.0211, Other:  0.0440 },
  { year: 2012, USStock:  0.1600, IntlDeveloped:  0.1732, IntlEmerging:  0.1839, Bond:  0.0421, ShortBond: 0.0008, HighYieldBond:  0.1563, Cash: 0.0008, Gold:  0.0681, Sector:  0.1600, Other:  0.1128 },
  { year: 2013, USStock:  0.3239, IntlDeveloped:  0.2278, IntlEmerging: -0.0260, Bond: -0.0202, ShortBond: 0.0007, HighYieldBond:  0.0741, Cash: 0.0007, Gold: -0.2810, Sector:  0.3239, Other:  0.1820 },
  { year: 2014, USStock:  0.1369, IntlDeveloped: -0.0490, IntlEmerging: -0.0218, Bond:  0.0596, ShortBond: 0.0005, HighYieldBond:  0.0245, Cash: 0.0005, Gold: -0.0156, Sector:  0.1369, Other:  0.1060 },
  { year: 2015, USStock:  0.0138, IntlDeveloped: -0.0081, IntlEmerging: -0.1492, Bond:  0.0055, ShortBond: 0.0021, HighYieldBond: -0.0468, Cash: 0.0021, Gold: -0.1056, Sector:  0.0138, Other:  0.0105 },
  { year: 2016, USStock:  0.1196, IntlDeveloped:  0.0143, IntlEmerging:  0.1118, Bond:  0.0265, ShortBond: 0.0027, HighYieldBond:  0.1713, Cash: 0.0027, Gold:  0.0858, Sector:  0.1196, Other:  0.0824 },
  { year: 2017, USStock:  0.2183, IntlDeveloped:  0.2503, IntlEmerging:  0.3728, Bond:  0.0354, ShortBond: 0.0084, HighYieldBond:  0.0747, Cash: 0.0084, Gold:  0.1349, Sector:  0.2183, Other:  0.1452 },
  { year: 2018, USStock: -0.0438, IntlDeveloped: -0.1379, IntlEmerging: -0.1457, Bond:  0.0001, ShortBond: 0.0186, HighYieldBond: -0.0208, Cash: 0.0186, Gold: -0.0193, Sector: -0.0438, Other: -0.0262 },
  { year: 2019, USStock:  0.3149, IntlDeveloped:  0.2203, IntlEmerging:  0.1842, Bond:  0.0872, ShortBond: 0.0207, HighYieldBond:  0.1432, Cash: 0.0207, Gold:  0.1834, Sector:  0.3149, Other:  0.2238 },
  { year: 2020, USStock:  0.1840, IntlDeveloped:  0.0782, IntlEmerging:  0.1831, Bond:  0.0751, ShortBond: 0.0036, HighYieldBond:  0.0717, Cash: 0.0036, Gold:  0.2433, Sector:  0.1840, Other:  0.1404 },
  { year: 2021, USStock:  0.2871, IntlDeveloped:  0.1126, IntlEmerging: -0.0254, Bond: -0.0154, ShortBond: 0.0005, HighYieldBond:  0.0530, Cash: 0.0005, Gold: -0.0381, Sector:  0.2871, Other:  0.1561 },
  { year: 2022, USStock: -0.1811, IntlDeveloped: -0.1445, IntlEmerging: -0.2014, Bond: -0.1301, ShortBond: 0.0146, HighYieldBond: -0.1119, Cash: 0.0146, Gold: -0.0036, Sector: -0.1811, Other: -0.1607 },
  { year: 2023, USStock:  0.2629, IntlDeveloped:  0.1824, IntlEmerging:  0.0985, Bond:  0.0553, ShortBond: 0.0506, HighYieldBond:  0.1304, Cash: 0.0506, Gold:  0.1314, Sector:  0.2629, Other:  0.1798 },
];

const CLASS_KEYS: AssetClass[] = ASSET_CLASSES;

// Cache: mapping year-index → array of returns (with nulls turned into NaN markers).
// We don't materialize null fallbacks here — caller uses them at sample time.
function rowReturns(row: Row): (number | null)[] {
  return CLASS_KEYS.map((c) => (row[c as keyof Row] as number | null) ?? null);
}

const CACHED: (number | null)[][] = HISTORY.map(rowReturns);

/**
 * Returns one year of asset-class returns drawn from history, indexed (mod length).
 * For any class with no history that year, calls fallback() and uses that class's draw.
 *
 * Caller passes the same fallback function across years so the missing-data classes
 * still get a single GBM trajectory per call (we don't accumulate; each year is independent).
 */
export function sampleBootstrapYear(yearIndex: number, fallback: () => number[]): number[] {
  const N = CACHED.length;
  const idx = ((yearIndex % N) + N) % N;
  const hist = CACHED[idx];
  let fb: number[] | null = null;
  const out = new Array(hist.length);
  for (let i = 0; i < hist.length; i++) {
    const v = hist[i];
    if (v === null) {
      if (!fb) fb = fallback();
      out[i] = fb[i];
    } else {
      out[i] = v;
    }
  }
  return out;
}

export const HISTORICAL_YEARS = HISTORY.map((r) => r.year);

/** Raw historical rows — used by cma.ts to derive empirical mu/sigma/correlations. */
export const HISTORICAL_ROWS = HISTORY;

