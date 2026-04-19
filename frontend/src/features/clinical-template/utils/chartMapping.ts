import bodyChart from '@/assets/charts/body-chart.png';
import headChart from '@/assets/charts/head-chart.png';
import handChart from '@/assets/charts/hand-chart.png';
import feetChart from '@/assets/charts/feet-chart.png';
import spineChart from '@/assets/charts/spine-chart.png'; // kept for backward compat
import type { ChartType } from '@/types/clinicalTemplate';

export const chartImageMap: Record<ChartType, string> = {
  body: bodyChart,
  head: headChart,
  hand: handChart,
  feet: feetChart,
  spine: spineChart, // deprecated — existing records only
};

export const chartLabel: Record<ChartType, string> = {
  body: 'Body Chart',
  head: 'Head Chart',
  hand: 'Hand Chart',
  feet: 'Feet Chart',
  spine: 'Spine Chart (deprecated)',
};
