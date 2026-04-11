import bodyChart from '@/assets/charts/body-chart.png';
import headChart from '@/assets/charts/head-chart.png';
import spineChart from '@/assets/charts/spine-chart.png';
import type { ChartType } from '@/types/clinicalTemplate';

export const chartImageMap: Record<ChartType, string> = {
  body: bodyChart,
  head: headChart,
  spine: spineChart,
};

export const chartLabel: Record<ChartType, string> = {
  body: 'Body Chart',
  head: 'Head Chart',
  spine: 'Spine Chart',
};
