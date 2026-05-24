declare module "jstat" {
  export const jStat: {
    studentt: {
      cdf(value: number, degreesOfFreedom: number): number;
      inv(probability: number, degreesOfFreedom: number): number;
    };
    centralF: {
      cdf(value: number, numeratorDf: number, denominatorDf: number): number;
    };
    chisquare: {
      cdf(value: number, degreesOfFreedom: number): number;
    };
    tukey: {
      cdf(value: number, groupCount: number, degreesOfFreedom: number): number;
      inv(probability: number, groupCount: number, degreesOfFreedom: number): number;
    };
    qtest(
      meanA: number,
      meanB: number,
      sizeA: number,
      sizeB: number,
      pooledStandardDeviation: number,
      totalCount: number,
      groupCount: number,
    ): number;
  };
}
