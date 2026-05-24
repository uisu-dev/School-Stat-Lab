import { jStat } from "jstat";

export type TTestResult = {
  t: number;
  df: number;
  p: number;
  meanDifference: number;
  confidenceInterval: [number, number];
  effectSize: number;
};

export type AnovaResult = {
  f: number;
  dfBetween: number;
  dfWithin: number;
  p: number;
  etaSquared: number;
  groupMeans: Record<string, number>;
};

export type TukeyComparison = {
  groupA: string;
  groupB: string;
  meanA: number;
  meanB: number;
  meanDifference: number;
  q: number;
  p: number;
  confidenceInterval: [number, number];
  significant: boolean;
};

export type ChiSquareResult = {
  chiSquare: number;
  df: number;
  p: number;
  cramersV: number;
  expected: number[][];
  lowExpectedCellCount: number;
};

export type DescriptiveStats = {
  count: number;
  mean: number;
  median: number;
  standardDeviation: number;
  standardError: number;
  min: number;
  q1: number;
  q3: number;
  max: number;
  ci95: [number, number];
};

export type FrequencyRow = {
  label: string;
  count: number;
  percent: number;
};

export type ReliabilityResult = {
  alpha: number;
  itemCount: number;
  responseCount: number;
  itemMeans: Record<string, number>;
};

export type CorrelationResult = {
  r: number;
  df: number;
  p: number;
  rSquared: number;
};

export type RegressionResult = CorrelationResult & {
  slope: number;
  intercept: number;
};

export type DistributionDiagnostics = {
  skewness: number;
  kurtosis: number;
  outlierCount: number;
  lowerFence: number;
  upperFence: number;
};

export function mean(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function variance(values: number[]) {
  const avg = mean(values);
  return (
    values.reduce((sum, value) => sum + (value - avg) ** 2, 0) /
    Math.max(values.length - 1, 1)
  );
}

export function standardDeviation(values: number[]) {
  return Math.sqrt(variance(values));
}

export function descriptiveStats(values: number[]): DescriptiveStats {
  const sorted = values.toSorted((a, b) => a - b);
  const avg = mean(sorted);
  const sd = standardDeviation(sorted);
  const standardError = sd / Math.sqrt(sorted.length);
  const df = sorted.length - 1;
  const critical = df > 0 ? jStat.studentt.inv(0.975, df) : 0;
  const margin = critical * standardError;

  return {
    count: sorted.length,
    mean: avg,
    median: quantile(sorted, 0.5),
    standardDeviation: sd,
    standardError,
    min: sorted[0],
    q1: quantile(sorted, 0.25),
    q3: quantile(sorted, 0.75),
    max: sorted[sorted.length - 1],
    ci95: [avg - margin, avg + margin],
  };
}

export function frequencyTable(values: string[]): FrequencyRow[] {
  const total = values.length;
  const counts = values.reduce<Record<string, number>>((acc, value) => {
    acc[value] = (acc[value] ?? 0) + 1;
    return acc;
  }, {});

  return Object.entries(counts)
    .map(([label, count]) => ({
      label,
      count,
      percent: total === 0 ? 0 : (count / total) * 100,
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export function cronbachAlpha(itemLabels: string[], rows: number[][]): ReliabilityResult {
  const completeRows = rows.filter(
    (row) => row.length === itemLabels.length && row.every((value) => Number.isFinite(value)),
  );
  const itemCount = itemLabels.length;

  if (itemCount < 2 || completeRows.length < 2) {
    return {
      alpha: 0,
      itemCount,
      responseCount: completeRows.length,
      itemMeans: {},
    };
  }

  const itemVariances = itemLabels.map((_, itemIndex) =>
    variance(completeRows.map((row) => row[itemIndex])),
  );
  const totalScores = completeRows.map((row) => row.reduce((sum, value) => sum + value, 0));
  const totalVariance = variance(totalScores);
  const alpha =
    totalVariance === 0
      ? 0
      : (itemCount / (itemCount - 1)) *
        (1 - itemVariances.reduce((sum, value) => sum + value, 0) / totalVariance);
  const itemMeans = Object.fromEntries(
    itemLabels.map((label, itemIndex) => [
      label,
      mean(completeRows.map((row) => row[itemIndex])),
    ]),
  );

  return {
    alpha,
    itemCount,
    responseCount: completeRows.length,
    itemMeans,
  };
}

export function pearsonCorrelation(xValues: number[], yValues: number[]): CorrelationResult {
  const pairs = pairNumericValues(xValues, yValues);
  const x = pairs.map(([xValue]) => xValue);
  const y = pairs.map(([, yValue]) => yValue);
  const df = pairs.length - 2;
  const denominator = standardDeviation(x) * standardDeviation(y);
  const r = denominator === 0 || df < 1 ? 0 : covariance(x, y) / denominator;
  const t = Math.abs(r) >= 1 ? Infinity : r * Math.sqrt(df / (1 - r ** 2));
  const p = Number.isFinite(t) ? twoTailedTProbability(t, df) : 0;

  return {
    r,
    df,
    p,
    rSquared: r ** 2,
  };
}

export function simpleLinearRegression(xValues: number[], yValues: number[]): RegressionResult {
  const pairs = pairNumericValues(xValues, yValues);
  const x = pairs.map(([xValue]) => xValue);
  const y = pairs.map(([, yValue]) => yValue);
  const xVariance = variance(x);
  const slope = xVariance === 0 ? 0 : covariance(x, y) / xVariance;
  const intercept = mean(y) - slope * mean(x);
  const correlation = pearsonCorrelation(x, y);

  return {
    ...correlation,
    slope,
    intercept,
  };
}

export function distributionDiagnostics(values: number[]): DistributionDiagnostics {
  const sorted = values.toSorted((a, b) => a - b);
  const avg = mean(sorted);
  const sd = standardDeviation(sorted);
  const q1 = quantile(sorted, 0.25);
  const q3 = quantile(sorted, 0.75);
  const iqr = q3 - q1;
  const lowerFence = q1 - 1.5 * iqr;
  const upperFence = q3 + 1.5 * iqr;
  const centered = sorted.map((value) => value - avg);
  const skewness =
    sd === 0 ? 0 : mean(centered.map((value) => value ** 3)) / sd ** 3;
  const kurtosis =
    sd === 0 ? 0 : mean(centered.map((value) => value ** 4)) / sd ** 4 - 3;

  return {
    skewness,
    kurtosis,
    lowerFence,
    upperFence,
    outlierCount:
      iqr === 0 ? 0 : sorted.filter((value) => value < lowerFence || value > upperFence).length,
  };
}

export function pairedTTest(before: number[], after: number[]): TTestResult {
  const n = Math.min(before.length, after.length);
  const differences = Array.from({ length: n }, (_, index) => after[index] - before[index]);
  const avgDiff = mean(differences);
  const sdDiff = standardDeviation(differences);
  const standardError = sdDiff / Math.sqrt(n);
  const t = standardError === 0 ? 0 : avgDiff / standardError;
  const df = n - 1;
  const p = twoTailedTProbability(t, df);
  const critical = jStat.studentt.inv(0.975, df);
  const margin = critical * standardError;

  return {
    t,
    df,
    p,
    meanDifference: avgDiff,
    confidenceInterval: [avgDiff - margin, avgDiff + margin],
    effectSize: sdDiff === 0 ? 0 : avgDiff / sdDiff,
  };
}

export function welchTTest(groupA: number[], groupB: number[]): TTestResult {
  const meanA = mean(groupA);
  const meanB = mean(groupB);
  const varianceA = variance(groupA);
  const varianceB = variance(groupB);
  const standardError = Math.sqrt(varianceA / groupA.length + varianceB / groupB.length);
  const t = standardError === 0 ? 0 : (meanA - meanB) / standardError;
  const numerator = (varianceA / groupA.length + varianceB / groupB.length) ** 2;
  const denominator =
    varianceA ** 2 / (groupA.length ** 2 * (groupA.length - 1)) +
    varianceB ** 2 / (groupB.length ** 2 * (groupB.length - 1));
  const df = numerator / denominator;
  const p = twoTailedTProbability(t, df);
  const critical = jStat.studentt.inv(0.975, df);
  const margin = critical * standardError;
  const pooledSd = Math.sqrt(
    ((groupA.length - 1) * varianceA + (groupB.length - 1) * varianceB) /
      (groupA.length + groupB.length - 2),
  );

  return {
    t,
    df,
    p,
    meanDifference: meanA - meanB,
    confidenceInterval: [meanA - meanB - margin, meanA - meanB + margin],
    effectSize: pooledSd === 0 ? 0 : (meanA - meanB) / pooledSd,
  };
}

export function oneWayAnova(groups: Record<string, number[]>): AnovaResult {
  const entries = Object.entries(groups).filter(([, values]) => values.length > 1);
  const allValues = entries.flatMap(([, values]) => values);
  const grandMean = mean(allValues);
  const groupMeans = Object.fromEntries(
    entries.map(([label, values]) => [label, mean(values)]),
  );
  const ssBetween = entries.reduce(
    (sum, [label, values]) => sum + values.length * (groupMeans[label] - grandMean) ** 2,
    0,
  );
  const ssWithin = entries.reduce(
    (sum, [label, values]) =>
      sum + values.reduce((innerSum, value) => innerSum + (value - groupMeans[label]) ** 2, 0),
    0,
  );
  const dfBetween = entries.length - 1;
  const dfWithin = allValues.length - entries.length;
  const msBetween = ssBetween / dfBetween;
  const msWithin = ssWithin / dfWithin;
  const f = msWithin === 0 ? 0 : msBetween / msWithin;
  const p = 1 - jStat.centralF.cdf(f, dfBetween, dfWithin);
  const etaSquared = ssBetween / (ssBetween + ssWithin);

  return {
    f,
    dfBetween,
    dfWithin,
    p,
    etaSquared,
    groupMeans,
  };
}

export function tukeyKramerPostHoc(
  groups: Record<string, number[]>,
  alpha = 0.05,
): TukeyComparison[] {
  const entries = Object.entries(groups).filter(([, values]) => values.length > 1);
  const allValues = entries.flatMap(([, values]) => values);
  const groupCount = entries.length;
  const dfWithin = allValues.length - groupCount;

  if (groupCount < 2 || dfWithin < 2) {
    return [];
  }

  const means = Object.fromEntries(entries.map(([label, values]) => [label, mean(values)]));
  const ssWithin = entries.reduce(
    (sum, [label, values]) =>
      sum + values.reduce((innerSum, value) => innerSum + (value - means[label]) ** 2, 0),
    0,
  );
  const msWithin = ssWithin / dfWithin;
  const pooledStandardDeviation = Math.sqrt(msWithin);
  const totalCount = allValues.length;
  const qCritical = jStat.tukey.inv(1 - alpha, groupCount, dfWithin);
  const comparisons: TukeyComparison[] = [];

  for (let i = 0; i < entries.length; i += 1) {
    for (let j = i + 1; j < entries.length; j += 1) {
      const [groupA, valuesA] = entries[i];
      const [groupB, valuesB] = entries[j];
      const meanA = means[groupA];
      const meanB = means[groupB];
      const meanDifference = meanA - meanB;
      const standardError = Math.sqrt((msWithin / 2) * (1 / valuesA.length + 1 / valuesB.length));
      const q = standardError === 0 ? 0 : Math.abs(meanDifference) / standardError;
      const p = jStat.qtest(
        meanA,
        meanB,
        valuesA.length,
        valuesB.length,
        pooledStandardDeviation,
        totalCount,
        groupCount,
      );
      const margin = qCritical * standardError;

      comparisons.push({
        groupA,
        groupB,
        meanA,
        meanB,
        meanDifference,
        q,
        p,
        confidenceInterval: [meanDifference - margin, meanDifference + margin],
        significant: p < alpha,
      });
    }
  }

  return comparisons.sort((a, b) => a.p - b.p);
}

export function chiSquareIndependence(observed: number[][]): ChiSquareResult {
  const rowTotals = observed.map((row) => row.reduce((sum, value) => sum + value, 0));
  const columnTotals = observed[0].map((_, columnIndex) =>
    observed.reduce((sum, row) => sum + row[columnIndex], 0),
  );
  const total = rowTotals.reduce((sum, value) => sum + value, 0);
  const expected = observed.map((row, rowIndex) =>
    row.map((_, columnIndex) => (rowTotals[rowIndex] * columnTotals[columnIndex]) / total),
  );
  const chiSquare = observed.reduce(
    (sum, row, rowIndex) =>
      sum +
      row.reduce((innerSum, value, columnIndex) => {
        const expectedValue = expected[rowIndex][columnIndex];
        return innerSum + (expectedValue === 0 ? 0 : (value - expectedValue) ** 2 / expectedValue);
      }, 0),
    0,
  );
  const df = (observed.length - 1) * (observed[0].length - 1);
  const p = 1 - jStat.chisquare.cdf(chiSquare, df);
  const cramersV = Math.sqrt(chiSquare / (total * Math.min(observed.length - 1, observed[0].length - 1)));

  return {
    chiSquare,
    df,
    p,
    cramersV,
    expected,
    lowExpectedCellCount: expected.flat().filter((value) => value < 5).length,
  };
}

export function formatPValue(p: number) {
  if (p < 0.001) return "< .001";
  return `= ${p.toFixed(3)}`;
}

export function round(value: number, digits = 2) {
  return Number(value.toFixed(digits));
}

function twoTailedTProbability(t: number, df: number) {
  return 2 * (1 - jStat.studentt.cdf(Math.abs(t), df));
}

function quantile(sortedValues: number[], q: number) {
  if (sortedValues.length === 1) return sortedValues[0];
  const position = (sortedValues.length - 1) * q;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  const weight = position - lower;
  return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
}

function covariance(xValues: number[], yValues: number[]) {
  const xMean = mean(xValues);
  const yMean = mean(yValues);
  const numerator = xValues.reduce(
    (sum, value, index) => sum + (value - xMean) * (yValues[index] - yMean),
    0,
  );
  return numerator / Math.max(xValues.length - 1, 1);
}

function pairNumericValues(xValues: number[], yValues: number[]) {
  return Array.from({ length: Math.min(xValues.length, yValues.length) }, (_, index) => [
    xValues[index],
    yValues[index],
  ] as const).filter(
    ([xValue, yValue]) => Number.isFinite(xValue) && Number.isFinite(yValue),
  );
}
