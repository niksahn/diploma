#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const Parser = require('tree-sitter')
const Go = require('tree-sitter-go')
const TsGrammars = require('tree-sitter-typescript')
const fg = require('fast-glob')

const ROOT = process.cwd()

const GO_KEYWORDS = new Set([
  'break', 'case', 'chan', 'const', 'continue', 'default', 'defer', 'else', 'fallthrough',
  'for', 'func', 'go', 'goto', 'if', 'import', 'interface', 'map', 'package', 'range',
  'return', 'select', 'struct', 'switch', 'type', 'var',
])

const TS_KEYWORDS = new Set([
  'as', 'async', 'await', 'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger',
  'default', 'delete', 'do', 'else', 'enum', 'export', 'extends', 'finally', 'for', 'from',
  'function', 'if', 'implements', 'import', 'in', 'instanceof', 'interface', 'let', 'new',
  'of', 'return', 'static', 'super', 'switch', 'throw', 'try', 'type', 'typeof', 'var',
  'void', 'while', 'yield',
])

const SYMBOL_OPERATORS = new Set([
  '=', ':=', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '<<=', '>>=', '&&=', '||=',
  '??=', '==', '!=', '===', '!==', '<', '<=', '>', '>=', '+', '-', '*', '/', '%', '&&',
  '||', '!', '&', '|', '^', '~', '<<', '>>', '++', '--', '?', ':', '=>', '.', '...', '<-',
])

const OPERAND_NODE_TYPES = new Set([
  'identifier', 'type_identifier', 'field_identifier', 'property_identifier', 'shorthand_property_identifier',
  'shorthand_property_identifier_pattern', 'nested_identifier', 'this', 'super', 'true', 'false',
  'null', 'undefined', 'nil', 'int_literal', 'float_literal', 'imaginary_literal', 'rune_literal',
  'raw_string_literal', 'interpreted_string_literal', 'string', 'string_fragment', 'template_string',
  'template_substitution', 'number', 'regex', 'private_property_identifier',
])

const LITERAL_NODE_TYPES = new Set([
  'int_literal', 'float_literal', 'imaginary_literal', 'rune_literal', 'raw_string_literal',
  'interpreted_string_literal', 'number', 'string', 'template_string', 'regex', 'true',
  'false', 'null', 'undefined', 'nil',
])

const FUNCTION_NODE_TYPES = new Set([
  'function_declaration', 'method_declaration', 'func_literal',
  'function_expression', 'arrow_function', 'generator_function_declaration',
  'generator_function', 'method_definition',
])

const CONTROL_NODE_TYPES = new Set([
  'if_statement', 'for_statement', 'for_in_statement', 'while_statement', 'do_statement',
  'switch_statement', 'switch_expression', 'case_clause', 'case_statement', 'ternary_expression',
])

const parserByExt = {
  '.go': (() => {
    const parser = new Parser()
    parser.setLanguage(Go)
    return parser
  })(),
  '.ts': (() => {
    const parser = new Parser()
    parser.setLanguage(TsGrammars.typescript)
    return parser
  })(),
  '.tsx': (() => {
    const parser = new Parser()
    parser.setLanguage(TsGrammars.tsx)
    return parser
  })(),
}

function main() {
  const files = fg.sync([
    'front/app/src/**/*.{ts,tsx}',
    'admin/src/**/*.{ts,tsx}',
    'server/src/**/*.go',
  ], {
    cwd: ROOT,
    absolute: true,
    onlyFiles: true,
    ignore: [
      '**/node_modules/**',
      '**/build/**',
      '**/dist/**',
      '**/docs/**',
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/*.spec.ts',
      '**/*.spec.tsx',
      '**/*.backup',
    ],
  }).sort()

  const analyses = files.map(analyzeFile)
  const totals = aggregateGroup('project', analyses)
  const groups = buildGroups(analyses)
  const payload = {
    generatedAt: new Date().toISOString(),
    scope: {
      files: analyses.length,
      included: [
        'front/app/src/**/*.{ts,tsx}',
        'admin/src/**/*.{ts,tsx}',
        'server/src/**/*.go',
      ],
      excluded: [
        'node_modules',
        'build',
        'dist',
        'docs',
        '*.test.*',
        '*.spec.*',
        '*.backup',
      ],
    },
    totals,
    groups,
    files: analyses,
  }

  if (process.argv.includes('--json')) {
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`)
    return
  }

  printReport(payload)
}

function analyzeFile(filePath) {
  const source = fs.readFileSync(filePath, 'utf8')
  const ext = path.extname(filePath)
  const parser = parserByExt[ext]
  if (!parser) {
    throw new Error(`Unsupported file extension: ${ext}`)
  }

  const tree = parser.parse(source)
  const relativePath = path.relative(ROOT, filePath)
  const halstead = collectHalstead(tree.rootNode, source)
  const chepin = collectChepin(tree.rootNode, source)
  const sloc = countSloc(source)

  return {
    path: relativePath,
    group: detectGroup(relativePath),
    language: ext === '.go' ? 'Go' : 'TypeScript',
    sloc,
    halstead,
    chepin,
  }
}

function countSloc(source) {
  let sloc = 0
  let inBlockComment = false

  for (const rawLine of source.split('\n')) {
    let line = rawLine
    let stripped = ''
    let i = 0

    while (i < line.length) {
      if (inBlockComment) {
        const end = line.indexOf('*/', i)
        if (end === -1) {
          i = line.length
          break
        }
        inBlockComment = false
        i = end + 2
        continue
      }

      const nextBlock = line.indexOf('/*', i)
      const nextLine = line.indexOf('//', i)
      const next = minPositive(nextBlock, nextLine)

      if (next === -1) {
        stripped += line.slice(i)
        break
      }

      stripped += line.slice(i, next)
      if (next === nextLine) {
        break
      }

      inBlockComment = true
      i = next + 2
    }

    if (stripped.trim() !== '') {
      sloc += 1
    }
  }

  return sloc
}

function collectHalstead(rootNode, source) {
  const operators = []
  const operands = []

  walk(rootNode, (node) => {
    if (shouldIgnoreForHalstead(node)) {
      return false
    }

    if (LITERAL_NODE_TYPES.has(node.type) && node.namedChildCount > 0) {
      operands.push(read(node, source))
      return false
    }

    if (isOperandNode(node) && !shouldIgnoreOperand(node)) {
      operands.push(read(node, source))
      return true
    }

    if (node.childCount !== 0) {
      return true
    }

    const token = read(node, source)
    if (SYMBOL_OPERATORS.has(token) || isKeywordOperator(node, token)) {
      operators.push(token)
    }
    return true
  })

  return buildHalsteadMetrics(operators, operands)
}

function collectChepin(rootNode, source) {
  const totals = { P: 0, M: 0, C: 0, T: 0, Q: 0, functions: 0 }

  walk(rootNode, (node) => {
    if (!FUNCTION_NODE_TYPES.has(node.type)) {
      return true
    }

    const roles = new Map()
    totals.functions += 1

    registerParameters(node, roles, source)
    registerVariables(node, roles, source)
    applyRoles(node, roles, source)

    for (const role of roles.values()) {
      const klass = classifyChepinRole(role)
      totals[klass] += 1
    }

    return false
  })

  totals.Q = round2(totals.P + (2 * totals.M) + (3 * totals.C) + (0.5 * totals.T))
  return totals
}

function registerParameters(functionNode, roles, source) {
  walk(functionNode, (node) => {
    if (node === functionNode) {
      return true
    }
    if (FUNCTION_NODE_TYPES.has(node.type)) {
      return false
    }
    if (node.type !== 'parameter_list' && node.type !== 'formal_parameters') {
      return true
    }

    for (const identifier of findIdentifiers(node, source, { includeFields: false })) {
      ensureRole(roles, identifier).input = true
    }

    return false
  })
}

function registerVariables(functionNode, roles, source) {
  walk(functionNode, (node) => {
    if (node === functionNode) {
      return true
    }
    if (FUNCTION_NODE_TYPES.has(node.type)) {
      return false
    }

    if (node.type === 'variable_declarator') {
      const nameNode = node.childForFieldName('name') || node.namedChildren[0]
      for (const identifier of findIdentifiers(nameNode, source, { includeFields: false })) {
        const role = ensureRole(roles, identifier)
        if (node.childForFieldName('value')) {
          role.modified = true
        }
      }
      return false
    }

    if (node.type === 'short_var_declaration' || node.type === 'range_clause') {
      const leftPart = node.childForFieldName('left') || node.namedChildren[0]
      for (const identifier of findIdentifiers(leftPart, source, { includeFields: false })) {
        ensureRole(roles, identifier).modified = true
      }
      return false
    }

    if (node.type === 'parameter_declaration' || node.type === 'var_spec') {
      for (const identifier of findIdentifiers(node, source, { includeFields: false })) {
        const role = ensureRole(roles, identifier)
        if (node.type === 'var_spec' && node.namedChildren.length > 1) {
          role.modified = true
        }
      }
      return false
    }

    return true
  })
}

function applyRoles(functionNode, roles, source) {
  walk(functionNode, (node) => {
    if (node === functionNode) {
      return true
    }
    if (FUNCTION_NODE_TYPES.has(node.type)) {
      return false
    }

    if (!isIdentifierLike(node)) {
      return true
    }

    if (shouldIgnoreChepinIdentifier(node)) {
      return true
    }

    const name = read(node, source)
    const role = roles.get(name)
    if (!role) {
      return true
    }

    role.used = true

    if (isControlIdentifier(node)) {
      role.control = true
    }

    if (isModifiedIdentifier(node)) {
      role.modified = true
    }

    return true
  })
}

function classifyChepinRole(role) {
  if (role.control) return 'C'
  if (role.modified) return 'M'
  if (role.input) return 'P'
  return 'T'
}

function ensureRole(roles, name) {
  if (!roles.has(name)) {
    roles.set(name, {
      input: false,
      modified: false,
      control: false,
      used: false,
    })
  }
  return roles.get(name)
}

function isModifiedIdentifier(node) {
  const parent = node.parent
  if (!parent) {
    return false
  }

  if (parent.type === 'update_expression' || parent.type === 'inc_statement' || parent.type === 'dec_statement') {
    return true
  }

  if (parent.type === 'assignment_expression') {
    const left = parent.childForFieldName('left') || parent.children[0]
    return containsNode(left, node)
  }

  if (parent.type === 'short_var_declaration') {
    const left = parent.childForFieldName('left') || parent.namedChildren[0]
    return containsNode(left, node)
  }

  if (parent.type === 'range_clause') {
    const left = parent.childForFieldName('left') || parent.namedChildren[0]
    return containsNode(left, node)
  }

  if (parent.type === 'variable_declarator') {
    const left = parent.childForFieldName('name') || parent.namedChildren[0]
    return containsNode(left, node) && Boolean(parent.childForFieldName('value'))
  }

  if (parent.type === 'var_spec') {
    return parent.namedChildren.length > 1
  }

  return false
}

function isControlIdentifier(node) {
  let current = node

  while (current.parent) {
    current = current.parent

    if (current.type === 'block' || current.type === 'statement_block') {
      return false
    }

    if (CONTROL_NODE_TYPES.has(current.type)) {
      return true
    }
  }

  return false
}

function shouldIgnoreChepinIdentifier(node) {
  if (!isIdentifierLike(node)) {
    return true
  }

  const parent = node.parent
  if (!parent) {
    return true
  }

  if (parent.type.startsWith('jsx_')) {
    return true
  }

  return new Set([
    'property_identifier',
    'field_identifier',
    'shorthand_property_identifier',
    'shorthand_property_identifier_pattern',
    'type_identifier',
    'package_identifier',
    'predefined_type',
    'type_annotation',
    'property_signature',
    'method_signature',
    'member_expression',
    'field_expression',
    'selector_expression',
    'import_spec',
    'import_clause',
    'export_clause',
    'namespace_import',
    'type_spec',
    'interface_declaration',
  ]).has(parent.type)
}

function isOperandNode(node) {
  return OPERAND_NODE_TYPES.has(node.type)
}

function shouldIgnoreOperand(node) {
  const parent = node.parent
  if (!parent) {
    return false
  }

  if (parent.type.startsWith('jsx_')) {
    return true
  }

  return new Set([
    'package_clause',
    'import_spec',
    'import_clause',
    'namespace_import',
    'export_clause',
    'type_annotation',
    'predefined_type',
    'type_spec',
    'interface_declaration',
    'property_signature',
    'method_signature',
  ]).has(parent.type)
}

function isKeywordOperator(node, token) {
  if (node.type !== token) {
    return false
  }
  return GO_KEYWORDS.has(token) || TS_KEYWORDS.has(token)
}

function shouldIgnoreForHalstead(node) {
  return node.type.startsWith('comment')
}

function isIdentifierLike(node) {
  return node.type === 'identifier' || node.type === 'nested_identifier'
}

function findIdentifiers(node, source, options = {}) {
  if (!node) {
    return []
  }

  const names = []
  walk(node, (current) => {
    if (FUNCTION_NODE_TYPES.has(current.type) && current !== node) {
      return false
    }
    if (!isIdentifierLike(current)) {
      return true
    }
    if (!options.includeFields && shouldIgnoreChepinIdentifier(current)) {
      return true
    }
    names.push(read(current, source))
    return true
  })
  return Array.from(new Set(names))
}

function containsNode(root, target) {
  if (!root) {
    return false
  }
  if (root.id === target.id) {
    return true
  }
  for (const child of root.children) {
    if (containsNode(child, target)) {
      return true
    }
  }
  return false
}

function buildHalsteadMetrics(operators, operands) {
  const distinctOperators = new Set(operators)
  const distinctOperands = new Set(operands)
  const n1 = distinctOperators.size
  const n2 = distinctOperands.size
  const N1 = operators.length
  const N2 = operands.length
  const vocabulary = n1 + n2
  const length = N1 + N2
  const volume = vocabulary === 0 ? 0 : length * Math.log2(vocabulary)
  const difficulty = n2 === 0 ? 0 : (n1 / 2) * (N2 / n2)
  const effort = volume * difficulty

  return {
    n1,
    n2,
    N1,
    N2,
    vocabulary,
    length,
    volume: round2(volume),
    difficulty: round2(difficulty),
    effort: round2(effort),
  }
}

function detectGroup(relativePath) {
  if (relativePath.startsWith('front/app/src/')) return 'front/app'
  if (relativePath.startsWith('admin/src/')) return 'admin'

  const match = relativePath.match(/^server\/src\/services\/([^/]+)/)
  if (match) {
    return `server/${match[1]}`
  }
  if (relativePath.startsWith('server/src/shared/')) return 'server/shared'
  if (relativePath.startsWith('server/src/cmd/')) return 'server/cmd'
  return 'other'
}

function buildGroups(analyses) {
  const grouped = new Map()
  for (const item of analyses) {
    if (!grouped.has(item.group)) {
      grouped.set(item.group, [])
    }
    grouped.get(item.group).push(item)
  }

  return Array.from(grouped.entries())
    .map(([name, items]) => aggregateGroup(name, items))
    .sort((a, b) => b.sloc - a.sloc)
}

function aggregateGroup(name, items) {
  const operatorSet = new Set()
  const operandSet = new Set()
  let N1 = 0
  let N2 = 0
  let sloc = 0
  let P = 0
  let M = 0
  let C = 0
  let T = 0
  let functions = 0

  for (const item of items) {
    sloc += item.sloc
    N1 += item.halstead.N1
    N2 += item.halstead.N2
    P += item.chepin.P
    M += item.chepin.M
    C += item.chepin.C
    T += item.chepin.T
    functions += item.chepin.functions

    for (const op of listDistinct(item.path, 'operator')) {
      operatorSet.add(op)
    }
    for (const operand of listDistinct(item.path, 'operand')) {
      operandSet.add(operand)
    }
  }

  const n1 = operatorSet.size
  const n2 = operandSet.size
  const vocabulary = n1 + n2
  const length = N1 + N2
  const volume = vocabulary === 0 ? 0 : length * Math.log2(vocabulary)
  const difficulty = n2 === 0 ? 0 : (n1 / 2) * (N2 / n2)
  const effort = volume * difficulty

  return {
    name,
    files: items.length,
    sloc,
    halstead: {
      n1,
      n2,
      N1,
      N2,
      vocabulary,
      length,
      volume: round2(volume),
      difficulty: round2(difficulty),
      effort: round2(effort),
    },
    chepin: {
      P,
      M,
      C,
      T,
      functions,
      Q: round2(P + (2 * M) + (3 * C) + (0.5 * T)),
    },
  }
}

const distinctCache = new Map()

function listDistinct(filePath, kind) {
  const key = `${filePath}:${kind}`
  if (!distinctCache.has(key)) {
    const absolutePath = path.join(ROOT, filePath)
    const source = fs.readFileSync(absolutePath, 'utf8')
    const ext = path.extname(filePath)
    const parser = parserByExt[ext]
    const tree = parser.parse(source)
    const entries = []

    walk(tree.rootNode, (node) => {
      if (shouldIgnoreForHalstead(node)) {
        return false
      }

      if (kind === 'operand') {
        if (LITERAL_NODE_TYPES.has(node.type) && node.namedChildCount > 0) {
          entries.push(read(node, source))
          return false
        }
        if (isOperandNode(node) && !shouldIgnoreOperand(node)) {
          entries.push(read(node, source))
        }
      } else if (node.childCount === 0) {
        const token = read(node, source)
        if (SYMBOL_OPERATORS.has(token) || isKeywordOperator(node, token)) {
          entries.push(token)
        }
      }

      return true
    })

    distinctCache.set(key, Array.from(new Set(entries)))
  }
  return distinctCache.get(key)
}

function read(node, source) {
  return source.slice(node.startIndex, node.endIndex)
}

function walk(node, visitor) {
  const proceed = visitor(node)
  if (proceed === false) {
    return
  }
  for (const child of node.children) {
    walk(child, visitor)
  }
}

function minPositive(a, b) {
  if (a === -1) return b
  if (b === -1) return a
  return Math.min(a, b)
}

function round2(value) {
  return Math.round(value * 100) / 100
}

function printReport(payload) {
  console.log('=== Metrics Report ===')
  console.log(`Generated at: ${payload.generatedAt}`)
  console.log(`Files analyzed: ${payload.scope.files}`)
  console.log(`Included: ${payload.scope.included.join(', ')}`)
  console.log(`Excluded: ${payload.scope.excluded.join(', ')}`)
  console.log('')
  console.log('Project totals:')
  printGroup(payload.totals)
  console.log('')
  console.log('By group:')
  for (const group of payload.groups) {
    printGroup(group)
    console.log('')
  }
}

function printGroup(group) {
  console.log(`- ${group.name}`)
  console.log(`  Files: ${group.files}`)
  console.log(`  SLOC: ${group.sloc}`)
  console.log(
    `  Halstead: n1=${group.halstead.n1}, n2=${group.halstead.n2}, N1=${group.halstead.N1}, N2=${group.halstead.N2}, ` +
    `vocabulary=${group.halstead.vocabulary}, length=${group.halstead.length}, volume=${group.halstead.volume}, ` +
    `difficulty=${group.halstead.difficulty}, effort=${group.halstead.effort}`
  )
  console.log(
    `  Chepin: P=${group.chepin.P}, M=${group.chepin.M}, C=${group.chepin.C}, T=${group.chepin.T}, ` +
    `Q=${group.chepin.Q}, functions=${group.chepin.functions}`
  )
}

main()
