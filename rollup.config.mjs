import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import babel from '@rollup/plugin-babel'
import json from '@rollup/plugin-json'
import terser from '@rollup/plugin-terser'
import polyfillNode from 'rollup-plugin-polyfill-node'

export default {
  input: 'src/js-ast-tokenizer.js',
  output: [
    {
      file: 'dist/bundle.cjs.js',
      format: 'cjs',
      sourcemap: true,
    },
    {
      file: 'dist/bundle.esm.js',
      format: 'esm',
      sourcemap: true,
    },
    {
      file: 'dist/bundle.umd.js',
      format: 'umd',
      name: 'js-ast-tokenizer',
      sourcemap: true,
      plugins: [terser()],
    },
  ],
  plugins: [resolve(), commonjs(), json(), polyfillNode(), babel({ babelHelpers: 'bundled' })],
  onwarn: (warning, warn) => {
    if (
      warning.code === 'CIRCULAR_DEPENDENCY' ||
      warning.code === 'MISSING_GLOBAL_NAME' ||
      warning.code === 'MISSING_SHIM'
    ) {
      return
    }
    warn(warning)
  },
}
