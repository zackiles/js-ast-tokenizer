import { promises as fs } from 'node:fs'
import { resolve, isAbsolute, extname } from 'node:path'
import * as babelParser from '@babel/parser'
import _traverse from '@babel/traverse'
import _generate from '@babel/generator'
import nativeReferences from './native-references.json' with { type: 'json' }

const traverse = _traverse.default
const generate = _generate.default

const BABEL_PLUGINS = [
  'jsx',
  'classProperties',
  'optionalChaining',
  'nullishCoalescingOperator',
  'classPrivateProperties',
  'classStaticBlock',
  'typescript',
  'topLevelAwait',
]

const detectSourceType = (jsCode) =>
  /\b(import|export|require|module\.exports|exports)\b/.test(jsCode) ? 'module' : 'script'

const isNativeReference = (name) =>
  nativeReferences.nativeGlobals.includes(name) || nativeReferences.nodeBuiltIns.includes(name)

const generateCode = (node) => generate(node).code

const cleanWhitespace = (inputCode) => {
  let code = inputCode

  const patterns = [
    { regex: /(\s*\/\*[^*]*\*+([^/*][^*]*\*+)*\/\s*)/g, replacement: (match) => match.trim() },
    { regex: /(\s*\/\/[^\n]*\s*)/g, replacement: (match) => match.trim() },
    { regex: /(["'`])\s+/g, replacement: '$1 ' },
    { regex: /\s+(["'`])/g, replacement: ' $1' },
    { regex: />\s+</g, replacement: '><' },
    { regex: /(\{|\}|\[|\]|:|,)\s+/g, replacement: '$1 ' },
    { regex: /\s*(\{|\}|\[|\]|:|,)\s*/g, replacement: '$1' },
    { regex: /(\s*\(\s*)/g, replacement: ' (' },
    { regex: /(\s*\)\s*)/g, replacement: ') ' },
    { regex: /(\s*=>\s*)/g, replacement: '=>' },
    { regex: /(\s*)\(\s*/g, replacement: '(' },
    { regex: /\s+\)/g, replacement: ')' },
    { regex: /(\s*,\s*|\s*\:\s*|\s*\;\s*)/g, replacement: '$1' },
    { regex: /(\s*\})\s*\)/g, replacement: '})' },
    { regex: /\)\s*\}/g, replacement: '})' },
  ]

  for (const { regex, replacement } of patterns) {
    code = code.replace(regex, replacement)
  }

  return code.trim()
}

const getFullMemberExpression = (node) => {
  if (!node.object) {
    return ''
  }
  if (node.object.type === 'Identifier') {
    return `${node.object.name}.${node.property.name}`
  }
  return `${getFullMemberExpression(node.object)}.${node.property.name}`
}

const findEnclosingExpression = (path) => {
  const enclosingAwait = path.findParent((p) => p.isAwaitExpression())
  if (enclosingAwait) {
    return enclosingAwait
  }
  const enclosingCall = path.findParent((p) => p.isCallExpression())
  if (enclosingCall) {
    return enclosingCall
  }
  return null
}

const getFullExpression = (path) => {
  const enclosingExpression = findEnclosingExpression(path)
  return enclosingExpression ? generateCode(enclosingExpression.node) : generateCode(path.node)
}

const parseJavaScriptCode = async (code) => {
  const sourceType = detectSourceType(code)

  const ast = babelParser.parse(code, {
    sourceType,
    plugins: BABEL_PLUGINS,
    errorRecovery: true,
  })

  const parsedStructure = {
    imports: [],
    classes: [],
    globalVariables: [],
    globalFunctions: [],
    exports: [],
    externalReferences: [],
  }

  const definedIdentifiers = new Set()
  const seenMemberExpressions = new Set()

  traverse(ast, {
    ImportDeclaration(path) {
      parsedStructure.imports.push([path.node.source.value, cleanWhitespace(generateCode(path.node))])
    },

    ClassDeclaration(path) {
      parsedStructure.classes.push([path.node.id.name, cleanWhitespace(generateCode(path.node))])
    },

    VariableDeclaration(path) {
      for (const declaration of path.node.declarations) {
        const { id } = declaration
        if (id.type === 'Identifier' && !definedIdentifiers.has(id.name)) {
          definedIdentifiers.add(id.name)
          parsedStructure.globalVariables.push([id.name, cleanWhitespace(generateCode(path.node))])
        }
      }
    },

    FunctionDeclaration(path) {
      if (path.node.id && !definedIdentifiers.has(path.node.id.name)) {
        definedIdentifiers.add(path.node.id.name)
        parsedStructure.globalFunctions.push([path.node.id.name, cleanWhitespace(generateCode(path.node))])
      }
    },

    ExportNamedDeclaration(path) {
      const { declaration, specifiers } = path.node
      if (declaration?.id && !definedIdentifiers.has(declaration.id.name)) {
        definedIdentifiers.add(declaration.id.name)
        parsedStructure.exports.push([declaration.id.name, cleanWhitespace(generateCode(path.node))])
      } else if (specifiers) {
        for (const specifier of specifiers) {
          parsedStructure.exports.push([specifier.exported.name, cleanWhitespace(generateCode(path.node))])
        }
      }
    },

    ExportDefaultDeclaration(path) {
      parsedStructure.exports.push(['default', cleanWhitespace(generateCode(path.node))])
    },

    MemberExpression: {
      exit(path) {
        const node = path.node
        const fullMemberExpression = getFullMemberExpression(node)
        const objectName = node.object.name

        if (
          !definedIdentifiers.has(objectName) &&
          !seenMemberExpressions.has(fullMemberExpression) &&
          !isNativeReference(objectName)
        ) {
          seenMemberExpressions.add(fullMemberExpression)
          const fullExpression = cleanWhitespace(getFullExpression(path))
          parsedStructure.externalReferences.push([fullMemberExpression, fullExpression])
        }
      },
    },

    Identifier(path) {
      const { name, parent } = path.node
      if (
        !definedIdentifiers.has(name) &&
        !isNativeReference(name) &&
        !seenMemberExpressions.has(name) &&
        parent &&
        parent.type !== 'MemberExpression' &&
        parent.type !== 'Property'
      ) {
        parsedStructure.externalReferences.push([name, cleanWhitespace(generateCode(path.node))])
      }
    },
  })

  return parsedStructure
}

async function tokenizeFileOrCode(input) {
  const result = {
    file: null,
    nodes: null,
    content: input,
    length: 0,
  }

  const looksLikeFilePath = isAbsolute(input) || extname(input) || input.includes('/') || input.includes('\\')

  if (looksLikeFilePath) {
    const fullPath = resolve(input)

    try {
      await fs.stat(fullPath)
      const fileContent = await fs.readFile(fullPath, 'utf8')

      result.file = fullPath
      result.content = fileContent
    } catch (err) {
      console.error(err)
      // If the file doesn't exist or isn't readable, we treat the input as a string
      // No error handling needed because this is part of the expected flow
    }
  }

  result.nodes = await parseJavaScriptCode(result.content)
  result.length = [...result.content].length
  return result
}

export default tokenizeFileOrCode
