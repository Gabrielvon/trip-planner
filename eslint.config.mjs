import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

const config = [
  ...nextVitals,
  ...nextTypescript,
  {
    ignores: [
      '.github/**',
      '.next/**',
      '.test-dist/**',
      'build/**',
      'next-env.d.ts',
      'out/**',
      'tests/load-ts-module.mjs',
    ],
  },
  {
    files: ['components/trip/trip-map.tsx', 'lib/trip/amap-js.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    files: ['components/trip/trip-map.tsx'],
    rules: {
      'react-hooks/set-state-in-effect': 'off',
    },
  },
];

export default config;
