import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';

export default {
  input: 'src/index.js',
  output: {
    exports: 'named',
    file: 'cjs/index.cjs',
    format: 'cjs'
  },
  plugins: [resolve(), commonjs()]
};
