export const formatMetricNumber = (value: number): string => value.toLocaleString("zh-CN");

export const formatGigabytes = (value: number): string =>
  `${(value / 1024 / 1024 / 1024).toFixed(2)} GB`;

export const formatPercent = (numerator: number, denominator: number, digits = 1): string => {
  if (!denominator) {
    return "0%";
  }

  return `${((numerator / denominator) * 100).toFixed(digits)}%`;
};
